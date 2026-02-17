
-- Add attendance and private_notes columns to appointments
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS attendance text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS private_notes text;

-- Add a check-like validation trigger for attendance values
CREATE OR REPLACE FUNCTION public.validate_attendance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.attendance NOT IN ('present', 'absent', 'pending') THEN
    RAISE EXCEPTION 'Invalid attendance value: %', NEW.attendance;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_attendance_trigger
BEFORE INSERT OR UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.validate_attendance();
