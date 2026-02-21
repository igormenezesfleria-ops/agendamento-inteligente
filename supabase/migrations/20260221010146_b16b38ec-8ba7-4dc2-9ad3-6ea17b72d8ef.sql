
CREATE OR REPLACE FUNCTION public.decline_appointment(appointment_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only allow the currently assigned collaborator to decline
  IF NOT EXISTS (
    SELECT 1 FROM public.appointments
    WHERE id = appointment_id AND instructor_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to decline this appointment';
  END IF;

  UPDATE public.appointments
  SET instructor_id = NULL,
      status = 'pending',
      collaborator_status = 'declined'
  WHERE id = appointment_id;
END;
$function$;
