-- Workout session loads: tracks weight (kg) used per exercise per session date
CREATE TABLE public.workout_session_loads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  workout_id UUID NOT NULL,
  exercise_id UUID NOT NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  load_kg NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wsl_student_date ON public.workout_session_loads (student_id, session_date DESC);
CREATE INDEX idx_wsl_exercise ON public.workout_session_loads (exercise_id, session_date DESC);

ALTER TABLE public.workout_session_loads ENABLE ROW LEVEL SECURITY;

-- Students can insert/select/update their own loads
CREATE POLICY "Students insert own loads"
  ON public.workout_session_loads FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students view own loads"
  ON public.workout_session_loads FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Students update own loads"
  ON public.workout_session_loads FOR UPDATE TO authenticated
  USING (student_id = auth.uid());

-- Admins can view loads for their linked students
CREATE POLICY "Admins view linked student loads"
  ON public.workout_session_loads FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND student_id IN (SELECT id FROM public.profiles WHERE business_owner_id = auth.uid())
  );