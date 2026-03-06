
-- 1. Allow students to read ALL appointments from their same studio (for global capacity)
CREATE POLICY "Students can view same studio appointments"
ON public.appointments FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT p.id FROM public.profiles p
    WHERE p.business_owner_id = get_business_owner_id(auth.uid())
  )
);

-- 2. Allow students to read profiles of classmates in same studio (for names)
CREATE POLICY "Students can view studio classmate profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  business_owner_id IS NOT NULL
  AND business_owner_id = get_business_owner_id(auth.uid())
);
