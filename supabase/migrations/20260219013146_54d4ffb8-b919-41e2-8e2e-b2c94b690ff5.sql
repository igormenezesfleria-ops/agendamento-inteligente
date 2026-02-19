
-- Add class_schedule_id to appointments to link each booking to a specific class
ALTER TABLE public.appointments ADD COLUMN class_schedule_id uuid REFERENCES public.class_schedules(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_appointments_class_schedule_id ON public.appointments(class_schedule_id);
