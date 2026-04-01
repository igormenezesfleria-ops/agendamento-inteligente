ALTER TABLE public.workout_exercises
  ADD COLUMN movement_pattern text DEFAULT '',
  ADD COLUMN selected_errors text[] DEFAULT '{}';