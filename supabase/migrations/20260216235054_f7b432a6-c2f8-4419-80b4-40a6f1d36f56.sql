
-- Add onboarding and business columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_onboarded boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hourly_rate numeric NULL,
  ADD COLUMN IF NOT EXISTS collaborator_rate numeric NULL,
  ADD COLUMN IF NOT EXISTS default_capacity integer NOT NULL DEFAULT 10;

-- Create class_schedules table
CREATE TABLE public.class_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  class_name text NOT NULL DEFAULT 'Musculação',
  capacity integer NOT NULL DEFAULT 10,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;

-- Instructors (admins) can manage their own schedules
CREATE POLICY "Instructors can manage own schedules"
  ON public.class_schedules
  FOR ALL
  TO authenticated
  USING (instructor_id = auth.uid())
  WITH CHECK (instructor_id = auth.uid());

-- Everyone authenticated can read schedules
CREATE POLICY "Authenticated users can view all schedules"
  ON public.class_schedules
  FOR SELECT
  TO authenticated
  USING (true);

-- Update handle_new_user to accept role from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role app_role;
BEGIN
  _role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::app_role,
    'student'::app_role
  );

  INSERT INTO public.profiles (id, role, name, is_onboarded)
  VALUES (
    NEW.id,
    _role,
    NEW.raw_user_meta_data->>'name',
    CASE WHEN _role = 'student' THEN true ELSE false END
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role);

  RETURN NEW;
END;
$$;
