
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS emergency_contact text,
  ADD COLUMN IF NOT EXISTS main_objective text,
  ADD COLUMN IF NOT EXISTS has_injury boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS injury_details text,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS profile_completed boolean DEFAULT false;
