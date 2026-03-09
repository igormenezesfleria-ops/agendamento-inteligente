
-- Add payment fields to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS asaas_api_key text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payments_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS available_credits integer NOT NULL DEFAULT 0;

-- Create plan_type enum
DO $$ BEGIN
  CREATE TYPE public.plan_type AS ENUM ('monthly', 'yearly', 'class_pack');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create membership_plans table
CREATE TABLE public.membership_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  plan_type plan_type NOT NULL DEFAULT 'monthly',
  credits_amount integer DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;

-- RLS: Admins manage own plans
CREATE POLICY "Admins can manage own plans" ON public.membership_plans
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND admin_id = auth.uid())
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND admin_id = auth.uid());

-- RLS: Students can view active plans from their trainer
CREATE POLICY "Students can view active plans" ON public.membership_plans
  FOR SELECT TO authenticated
  USING (is_active = true AND admin_id = get_business_owner_id(auth.uid()));
