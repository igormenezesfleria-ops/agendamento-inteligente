
CREATE TABLE public.sent_questionnaires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  result_score text,
  answers_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.sent_questionnaires ENABLE ROW LEVEL SECURITY;

-- Admins can select questionnaires for their linked students
CREATE POLICY "Admins can select sent_questionnaires"
  ON public.sent_questionnaires FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND student_id IN (SELECT id FROM public.profiles WHERE business_owner_id = auth.uid())
  );

-- Admins can insert questionnaires for their linked students
CREATE POLICY "Admins can insert sent_questionnaires"
  ON public.sent_questionnaires FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    AND student_id IN (SELECT id FROM public.profiles WHERE business_owner_id = auth.uid())
  );

-- Admins can update questionnaires for their linked students
CREATE POLICY "Admins can update sent_questionnaires"
  ON public.sent_questionnaires FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND student_id IN (SELECT id FROM public.profiles WHERE business_owner_id = auth.uid())
  );

-- Students can view their own questionnaires
CREATE POLICY "Students can select own questionnaires"
  ON public.sent_questionnaires FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

-- Students can update their own questionnaires (to submit answers)
CREATE POLICY "Students can update own questionnaires"
  ON public.sent_questionnaires FOR UPDATE
  TO authenticated
  USING (auth.uid() = student_id);
