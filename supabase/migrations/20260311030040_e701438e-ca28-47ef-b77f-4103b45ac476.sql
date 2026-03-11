
-- Add waitlist_enabled to class_schedules
ALTER TABLE public.class_schedules ADD COLUMN IF NOT EXISTS waitlist_enabled boolean NOT NULL DEFAULT true;

-- Create waitlist table
CREATE TABLE public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_schedule_id uuid NOT NULL REFERENCES public.class_schedules(id) ON DELETE CASCADE,
  date date NOT NULL,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'waiting',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(class_schedule_id, date, student_id)
);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Students can insert themselves into waitlist
CREATE POLICY "Students can join waitlist"
ON public.waitlist FOR INSERT TO authenticated
WITH CHECK (student_id = auth.uid());

-- Students can view own waitlist entries
CREATE POLICY "Students can view own waitlist"
ON public.waitlist FOR SELECT TO authenticated
USING (student_id = auth.uid());

-- Students can delete own waitlist entries
CREATE POLICY "Students can leave waitlist"
ON public.waitlist FOR DELETE TO authenticated
USING (student_id = auth.uid());

-- Admins can view waitlist for their schedules
CREATE POLICY "Admins can view waitlist for own schedules"
ON public.waitlist FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) AND
  class_schedule_id IN (
    SELECT id FROM public.class_schedules WHERE instructor_id = auth.uid()
  )
);

-- Admins can update waitlist status (notify)
CREATE POLICY "Admins can update waitlist for own schedules"
ON public.waitlist FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) AND
  class_schedule_id IN (
    SELECT id FROM public.class_schedules WHERE instructor_id = auth.uid()
  )
);

-- Admins can delete waitlist entries
CREATE POLICY "Admins can delete waitlist for own schedules"
ON public.waitlist FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) AND
  class_schedule_id IN (
    SELECT id FROM public.class_schedules WHERE instructor_id = auth.uid()
  )
);
