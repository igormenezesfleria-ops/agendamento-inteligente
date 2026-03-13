
-- Function to auto-fill waitlist when an appointment is cancelled/deleted
CREATE OR REPLACE FUNCTION public.waitlist_auto_fill()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_next_waitlist RECORD;
  v_schedule RECORD;
  v_admin_id uuid;
  v_student_name text;
BEGIN
  -- Only act when an appointment is removed or status changes to cancelled/rejected
  -- For DELETE trigger: OLD has the removed row
  -- For UPDATE trigger: check status change
  
  IF TG_OP = 'DELETE' THEN
    -- Check if slot has waitlist entries
    IF OLD.class_schedule_id IS NULL THEN
      RETURN OLD;
    END IF;
    
    SELECT * INTO v_schedule FROM public.class_schedules WHERE id = OLD.class_schedule_id;
    IF NOT FOUND OR NOT v_schedule.waitlist_enabled THEN
      RETURN OLD;
    END IF;

    -- Get oldest waiting entry
    SELECT * INTO v_next_waitlist
    FROM public.waitlist
    WHERE class_schedule_id = OLD.class_schedule_id
      AND date = OLD.date
      AND status = 'waiting'
    ORDER BY created_at ASC
    LIMIT 1;

    IF NOT FOUND THEN
      RETURN OLD;
    END IF;

    SELECT business_owner_id INTO v_admin_id FROM public.profiles WHERE id = v_next_waitlist.student_id;
    SELECT name INTO v_student_name FROM public.profiles WHERE id = v_next_waitlist.student_id;

    IF v_schedule.requires_approval THEN
      -- Manual approval: notify admin
      INSERT INTO public.notifications (user_id, title, message, type, creator_id)
      VALUES (
        v_schedule.instructor_id,
        'Vaga Liberada - Fila de Espera',
        'Uma vaga foi liberada. ' || COALESCE(v_student_name, 'Um aluno') || ' está na fila. Deseja aprovar?',
        'waitlist_vacancy',
        v_next_waitlist.student_id
      );
    ELSE
      -- Auto-approve: create appointment and notify student
      INSERT INTO public.appointments (student_id, date, time_slot, class_schedule_id, status, instructor_id)
      VALUES (
        v_next_waitlist.student_id,
        v_next_waitlist.date,
        v_schedule.start_time::text,
        OLD.class_schedule_id,
        'confirmed',
        COALESCE(v_schedule.default_collaborator_id, v_schedule.instructor_id)
      );

      -- Update waitlist status
      UPDATE public.waitlist SET status = 'promoted' WHERE id = v_next_waitlist.id;

      -- Notify student
      INSERT INTO public.notifications (user_id, title, message, type, creator_id)
      VALUES (
        v_next_waitlist.student_id,
        'Você conseguiu a vaga! 🎉',
        'Uma vaga abriu e você foi promovido da fila de espera. Sua aula está confirmada!',
        'waitlist_promoted',
        v_schedule.instructor_id
      );
    END IF;

    RETURN OLD;
  END IF;

  -- UPDATE case: status changed to cancelled or rejected
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('cancelled', 'rejected') THEN
    IF NEW.class_schedule_id IS NULL THEN
      RETURN NEW;
    END IF;

    SELECT * INTO v_schedule FROM public.class_schedules WHERE id = NEW.class_schedule_id;
    IF NOT FOUND OR NOT v_schedule.waitlist_enabled THEN
      RETURN NEW;
    END IF;

    SELECT * INTO v_next_waitlist
    FROM public.waitlist
    WHERE class_schedule_id = NEW.class_schedule_id
      AND date = NEW.date
      AND status = 'waiting'
    ORDER BY created_at ASC
    LIMIT 1;

    IF NOT FOUND THEN
      RETURN NEW;
    END IF;

    SELECT business_owner_id INTO v_admin_id FROM public.profiles WHERE id = v_next_waitlist.student_id;
    SELECT name INTO v_student_name FROM public.profiles WHERE id = v_next_waitlist.student_id;

    IF v_schedule.requires_approval THEN
      INSERT INTO public.notifications (user_id, title, message, type, creator_id)
      VALUES (
        v_schedule.instructor_id,
        'Vaga Liberada - Fila de Espera',
        'Uma vaga foi liberada. ' || COALESCE(v_student_name, 'Um aluno') || ' está na fila. Deseja aprovar?',
        'waitlist_vacancy',
        v_next_waitlist.student_id
      );
    ELSE
      INSERT INTO public.appointments (student_id, date, time_slot, class_schedule_id, status, instructor_id)
      VALUES (
        v_next_waitlist.student_id,
        v_next_waitlist.date,
        v_schedule.start_time::text,
        NEW.class_schedule_id,
        'confirmed',
        COALESCE(v_schedule.default_collaborator_id, v_schedule.instructor_id)
      );

      UPDATE public.waitlist SET status = 'promoted' WHERE id = v_next_waitlist.id;

      INSERT INTO public.notifications (user_id, title, message, type, creator_id)
      VALUES (
        v_next_waitlist.student_id,
        'Você conseguiu a vaga! 🎉',
        'Uma vaga abriu e você foi promovido da fila de espera. Sua aula está confirmada!',
        'waitlist_promoted',
        v_schedule.instructor_id
      );
    END IF;

    RETURN NEW;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger on DELETE (student cancels by deleting)
CREATE TRIGGER trg_waitlist_auto_fill_delete
AFTER DELETE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.waitlist_auto_fill();

-- Trigger on UPDATE (admin rejects/cancels)
CREATE TRIGGER trg_waitlist_auto_fill_update
AFTER UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.waitlist_auto_fill();
