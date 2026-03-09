
-- Create promo_codes table
CREATE TABLE public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code text NOT NULL,
  discount_percentage numeric NOT NULL DEFAULT 0,
  max_uses_per_student integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create promo_code_usages table
CREATE TABLE public.promo_code_usages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  used_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS for promo_codes
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage own promo codes"
  ON public.promo_codes FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND admin_id = auth.uid())
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND admin_id = auth.uid());

CREATE POLICY "Students can view active promo codes from their trainer"
  ON public.promo_codes FOR SELECT
  TO authenticated
  USING (is_active = true AND admin_id = get_business_owner_id(auth.uid()));

-- RLS for promo_code_usages
ALTER TABLE public.promo_code_usages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view usages of own codes"
  ON public.promo_code_usages FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND promo_code_id IN (
    SELECT id FROM public.promo_codes WHERE admin_id = auth.uid()
  ));

CREATE POLICY "Students can insert own usages"
  ON public.promo_code_usages FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can view own usages"
  ON public.promo_code_usages FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());
