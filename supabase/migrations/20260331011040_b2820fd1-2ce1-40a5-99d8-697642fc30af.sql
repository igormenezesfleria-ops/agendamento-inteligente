
-- Add AI biofeedback calibration columns to workout_exercises
ALTER TABLE public.workout_exercises
ADD COLUMN ai_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN ai_max_knee_flexion integer NULL,
ADD COLUMN ai_valgo_alert boolean NOT NULL DEFAULT false;

-- Technical note: Model must be forced to use MediaPipe Pose LITE model (modelComplexity: 0)
-- to ensure high FPS on mobile PWAs, applying these manual angle thresholds using basic trigonometry.
