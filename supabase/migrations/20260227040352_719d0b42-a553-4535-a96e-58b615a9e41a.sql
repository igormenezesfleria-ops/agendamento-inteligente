
-- Enable pg_cron and pg_net for scheduled edge function invocation
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Table: recurring student schedules ("Aluno Fixo")
CREATE TABLE public.recurring_student_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL,
  business_owner_id uuid NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  time_slot text NOT NULL,
  class_schedule_id uuid REFERENCES public.class_schedules(id) ON DELETE CASCADE,
  instructor_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, day_of_week, time_slot)
);

-- RLS
ALTER TABLE public.recurring_student_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage recurring schedules"
  ON public.recurring_student_schedules FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND business_owner_id = auth.uid())
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND business_owner_id = auth.uid());

CREATE POLICY "Students can view own recurring schedules"
  ON public.recurring_student_schedules FOR SELECT
  USING (auth.uid() = student_id);

-- Updated_at trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.recurring_student_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
