ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS liability_accepted boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS liability_accepted_at timestamptz;