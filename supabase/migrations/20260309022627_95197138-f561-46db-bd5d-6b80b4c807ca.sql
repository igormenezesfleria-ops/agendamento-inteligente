ALTER TABLE public.membership_plans
  ADD COLUMN classes_per_week integer,
  ADD COLUMN validity_months integer,
  ADD COLUMN accepts_pix boolean NOT NULL DEFAULT true,
  ADD COLUMN accepts_credit boolean NOT NULL DEFAULT true;