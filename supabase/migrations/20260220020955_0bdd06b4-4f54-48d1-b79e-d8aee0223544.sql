
-- Add action_window_hours to class_schedules (hours before class for booking/cancellation)
ALTER TABLE public.class_schedules
  ADD COLUMN action_window_hours integer NOT NULL DEFAULT 2;

-- Add default_collaborator_id to class_schedules (fixed collaborator auto-assigned)
ALTER TABLE public.class_schedules
  ADD COLUMN default_collaborator_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
