
-- Create workouts table
CREATE TABLE public.workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create workout_exercises table
CREATE TABLE public.workout_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  name text NOT NULL,
  sets text NOT NULL DEFAULT '',
  reps text NOT NULL DEFAULT '',
  rest text NOT NULL DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for workouts
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage own workouts" ON public.workouts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') AND admin_id = auth.uid())
  WITH CHECK (has_role(auth.uid(), 'admin') AND admin_id = auth.uid());

CREATE POLICY "Students can view own workouts" ON public.workouts
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- RLS for workout_exercises
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage exercises of own workouts" ON public.workout_exercises
  FOR ALL TO authenticated
  USING (workout_id IN (SELECT id FROM public.workouts WHERE admin_id = auth.uid()))
  WITH CHECK (workout_id IN (SELECT id FROM public.workouts WHERE admin_id = auth.uid()));

CREATE POLICY "Students can view own workout exercises" ON public.workout_exercises
  FOR SELECT TO authenticated
  USING (workout_id IN (SELECT id FROM public.workouts WHERE student_id = auth.uid()));
