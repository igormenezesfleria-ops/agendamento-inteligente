
-- Add collaborator_status column to appointments
ALTER TABLE public.appointments
ADD COLUMN collaborator_status text NOT NULL DEFAULT 'accepted';

-- Update delegate_appointment to accept class_schedule_id for smart status logic
CREATE OR REPLACE FUNCTION public.delegate_appointment(appt_id uuid, target_instructor_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_class_schedule_id uuid;
  v_default_collab uuid;
  v_requires_approval boolean;
  v_collab_status text;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Get the class_schedule_id from the appointment
  SELECT class_schedule_id INTO v_class_schedule_id
  FROM public.appointments WHERE id = appt_id;

  -- Determine collaborator_status based on schedule config
  v_collab_status := 'pending';

  IF v_class_schedule_id IS NOT NULL THEN
    SELECT default_collaborator_id, requires_approval
    INTO v_default_collab, v_requires_approval
    FROM public.class_schedules
    WHERE id = v_class_schedule_id;

    -- Auto-accept if fixed collaborator matches OR schedule doesn't require approval
    IF (v_default_collab IS NOT NULL AND v_default_collab = target_instructor_id)
       OR (v_requires_approval = false) THEN
      v_collab_status := 'accepted';
    END IF;
  END IF;

  UPDATE public.appointments
  SET instructor_id = target_instructor_id,
      status = 'delegated',
      collaborator_status = v_collab_status
  WHERE id = appt_id;
END;
$function$;
