
CREATE OR REPLACE FUNCTION public.notify_workout_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_instructor_id uuid;
BEGIN
  -- Only trigger when status changes to 'completed' and attendance is still 'pending'
  IF OLD.status IS DISTINCT FROM NEW.status
     AND NEW.status = 'completed'
     AND (NEW.attendance IS NULL OR NEW.attendance = 'pending')
     AND NEW.instructor_id IS NOT NULL
  THEN
    v_instructor_id := NEW.instructor_id;

    -- Only insert if no recent similar notification exists (within last hour)
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = v_instructor_id
        AND type = 'workout_completed'
        AND created_at > now() - interval '1 hour'
    ) THEN
      INSERT INTO public.notifications (user_id, title, message, type, creator_id)
      VALUES (
        v_instructor_id,
        'Treino Finalizado',
        'Você tem aulas sem registro. Confirme a presença ou falta.',
        'workout_completed',
        NEW.student_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_notify_workout_completed
AFTER UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.notify_workout_completed();
