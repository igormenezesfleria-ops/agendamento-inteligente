
CREATE OR REPLACE FUNCTION public.decline_appointment(appointment_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow the currently assigned collaborator to decline
  IF NOT EXISTS (
    SELECT 1 FROM public.appointments
    WHERE id = appointment_id AND instructor_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to decline this appointment';
  END IF;

  UPDATE public.appointments
  SET instructor_id = NULL, status = 'pending'
  WHERE id = appointment_id;
END;
$$;
