-- Drop the old unique constraint that blocks parallel classes at the same time
ALTER TABLE public.appointments DROP CONSTRAINT appointments_student_id_date_time_slot_key;

-- Add new unique constraint that only blocks duplicate bookings for the SAME class
ALTER TABLE public.appointments ADD CONSTRAINT appointments_student_id_date_class_schedule_key UNIQUE (student_id, date, class_schedule_id);