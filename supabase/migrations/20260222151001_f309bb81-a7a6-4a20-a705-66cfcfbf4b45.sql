
-- Add payroll fields to profiles table for collaborators
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS pay_type text DEFAULT 'per_class',
ADD COLUMN IF NOT EXISTS base_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS no_show_rate numeric DEFAULT 0;
