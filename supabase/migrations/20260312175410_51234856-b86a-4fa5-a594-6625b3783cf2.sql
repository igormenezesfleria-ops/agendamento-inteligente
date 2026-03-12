
-- Add type column to notifications table
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'general';

-- Trigger function: notify on appointment status change
CREATE OR REPLACE FUNCTION public.notify_appointment_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_student_name text;
  v_admin_id uuid;
  v_student_id uuid;
BEGIN
  v_student_id := NEW.student_id;
  SELECT name INTO v_student_name FROM public.profiles WHERE id = v_student_id;
  SELECT business_owner_id INTO v_admin_id FROM public.profiles WHERE id = v_student_id;

  -- (a) Student: appointment confirmed
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'confirmed' THEN
    INSERT INTO public.notifications (user_id, title, message, type, creator_id)
    VALUES (v_student_id, 'Aula Confirmada!', 'Seu Personal confirmou o treino.', 'appointment_confirmed', v_admin_id);
  END IF;

  -- (b) Collaborator: appointment delegated
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'delegated' AND NEW.instructor_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, creator_id)
    VALUES (NEW.instructor_id, 'Novo Treino Delegado', 'Um novo treino foi delegado aguardando seu aceite.', 'appointment_delegated', v_admin_id);
  END IF;

  -- (c) Student: appointment rejected or cancelled
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('rejected', 'cancelled') THEN
    INSERT INTO public.notifications (user_id, title, message, type, creator_id)
    VALUES (v_student_id, 'Aula Recusada/Cancelada', 'Sua aula foi cancelada. Fale com seu Personal.', 'appointment_cancelled', v_admin_id);
  END IF;

  -- (e) Admin: collaborator declined (collaborator_status changed to declined)
  IF OLD.collaborator_status IS DISTINCT FROM NEW.collaborator_status AND NEW.collaborator_status = 'declined' THEN
    IF v_admin_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, creator_id)
      VALUES (v_admin_id, 'Colaborador Recusou', 'O colaborador recusou o treino. A solicitação retornou para a fila.', 'collaborator_declined', NEW.instructor_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger function: notify admin on new appointment request
CREATE OR REPLACE FUNCTION public.notify_new_appointment_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_student_name text;
  v_admin_id uuid;
BEGIN
  SELECT name INTO v_student_name FROM public.profiles WHERE id = NEW.student_id;
  SELECT business_owner_id INTO v_admin_id FROM public.profiles WHERE id = NEW.student_id;

  -- (d) Admin: new appointment request
  IF v_admin_id IS NOT NULL AND NEW.status = 'pending' THEN
    INSERT INTO public.notifications (user_id, title, message, type, creator_id)
    VALUES (v_admin_id, 'Nova Solicitação', COALESCE(v_student_name, 'Um aluno') || ' solicitou um novo agendamento.', 'new_request', NEW.student_id);
  END IF;

  RETURN NEW;
END;
$$;

-- Create triggers on appointments table
CREATE TRIGGER trg_appointment_status_change
  AFTER UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_appointment_status_change();

CREATE TRIGGER trg_new_appointment_request
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_appointment_request();
