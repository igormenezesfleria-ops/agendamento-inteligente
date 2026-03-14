-- Rewrite waitlist auto-fill to always mutate DB (insert appointment) before notifications
CREATE OR REPLACE FUNCTION public.waitlist_auto_fill()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_source RECORD;
  v_schedule RECORD;
  v_next_waitlist RECORD;
  v_student_name text;
  v_new_status public.appointment_status;
  v_new_instructor uuid;
BEGIN
  -- Trigger only when a slot is actually freed
  IF TG_OP = 'DELETE' THEN
    IF OLD.status NOT IN ('pending', 'confirmed', 'delegated') THEN
      RETURN OLD;
    END IF;
    v_source := OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NOT (
      OLD.status IS DISTINCT FROM NEW.status
      AND OLD.status IN ('pending', 'confirmed', 'delegated')
      AND NEW.status IN ('cancelled', 'rejected')
    ) THEN
      RETURN NEW;
    END IF;
    v_source := NEW;
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF v_source.class_schedule_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT id, instructor_id, default_collaborator_id, requires_approval, waitlist_enabled
  INTO v_schedule
  FROM public.class_schedules
  WHERE id = v_source.class_schedule_id;

  IF NOT FOUND OR NOT v_schedule.waitlist_enabled THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Fetch first student in active waitlist (oldest first)
  SELECT w.*
  INTO v_next_waitlist
  FROM public.waitlist w
  WHERE w.class_schedule_id = v_source.class_schedule_id
    AND w.date = v_source.date
    AND w.status = 'waiting'
  ORDER BY w.created_at ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT p.name
  INTO v_student_name
  FROM public.profiles p
  WHERE p.id = v_next_waitlist.student_id;

  -- Force DB mutation: ALWAYS insert appointment for the promoted student
  IF v_schedule.requires_approval THEN
    v_new_status := 'pending'::public.appointment_status;
    v_new_instructor := NULL;
  ELSE
    v_new_status := 'confirmed'::public.appointment_status;
    v_new_instructor := COALESCE(v_schedule.default_collaborator_id, v_schedule.instructor_id);
  END IF;

  INSERT INTO public.appointments (
    student_id,
    instructor_id,
    date,
    time_slot,
    class_schedule_id,
    status,
    collaborator_status
  )
  VALUES (
    v_next_waitlist.student_id,
    v_new_instructor,
    v_source.date,
    v_source.time_slot,
    v_source.class_schedule_id,
    v_new_status,
    CASE WHEN v_schedule.requires_approval THEN 'pending' ELSE 'accepted' END
  );

  -- Cleanup waitlist entry after successful INSERT
  UPDATE public.waitlist
  SET status = 'promoted'
  WHERE id = v_next_waitlist.id;

  -- Proper feedback notifications after INSERT + waitlist cleanup
  IF v_schedule.requires_approval THEN
    INSERT INTO public.notifications (user_id, title, message, type, creator_id)
    VALUES (
      v_schedule.instructor_id,
      'Fila de Espera',
      'Fila de Espera: A vaga liberou! ' || COALESCE(v_student_name, 'Um aluno') || ' foi movido para suas Solicitações Pendentes.',
      'waitlist_vacancy',
      v_next_waitlist.student_id
    );
  ELSE
    INSERT INTO public.notifications (user_id, title, message, type, creator_id)
    VALUES (
      v_schedule.instructor_id,
      'Fila de Espera',
      'Fila de Espera: Vaga preenchida automaticamente por ' || COALESCE(v_student_name, 'Um aluno') || '.',
      'waitlist_promoted',
      v_next_waitlist.student_id
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Ensure triggers exist and point to updated function
DROP TRIGGER IF EXISTS trg_waitlist_auto_fill_delete ON public.appointments;
CREATE TRIGGER trg_waitlist_auto_fill_delete
AFTER DELETE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.waitlist_auto_fill();

DROP TRIGGER IF EXISTS trg_waitlist_auto_fill_update ON public.appointments;
CREATE TRIGGER trg_waitlist_auto_fill_update
AFTER UPDATE OF status ON public.appointments
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('cancelled', 'rejected'))
EXECUTE FUNCTION public.waitlist_auto_fill();