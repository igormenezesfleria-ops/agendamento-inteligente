
-- 1. Create expenses table
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  is_paid boolean NOT NULL DEFAULT false,
  category text NOT NULL DEFAULT 'outros',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Strict admin-only RLS: only the admin who owns the expense
CREATE POLICY "Admins can select own expenses"
ON public.expenses FOR SELECT TO authenticated
USING (admin_id = auth.uid() AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert own expenses"
ON public.expenses FOR INSERT TO authenticated
WITH CHECK (admin_id = auth.uid() AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update own expenses"
ON public.expenses FOR UPDATE TO authenticated
USING (admin_id = auth.uid() AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete own expenses"
ON public.expenses FOR DELETE TO authenticated
USING (admin_id = auth.uid() AND has_role(auth.uid(), 'admin'::app_role));

-- 2. Add fixed_monthly_rate column to profiles for the new contract type
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fixed_monthly_rate numeric DEFAULT 0;
