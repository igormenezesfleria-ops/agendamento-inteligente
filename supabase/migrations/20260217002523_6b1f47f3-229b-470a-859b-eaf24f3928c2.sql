
-- Add multi-tenancy columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS studio_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS business_owner_id uuid REFERENCES public.profiles(id);

-- Create index for student lookups by business_owner_id
CREATE INDEX IF NOT EXISTS idx_profiles_business_owner ON public.profiles(business_owner_id);

-- Create a function to lookup studio code (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.get_business_owner_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT business_owner_id FROM public.profiles WHERE id = _user_id
$$;

-- Create a function to link student to trainer via studio code
CREATE OR REPLACE FUNCTION public.link_student_to_trainer(p_studio_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trainer_id uuid;
  v_student_role app_role;
BEGIN
  -- Verify caller is a student
  SELECT role INTO v_student_role FROM public.profiles WHERE id = auth.uid();
  IF v_student_role != 'student' THEN
    RETURN json_build_object('success', false, 'message', 'Apenas alunos podem se vincular.');
  END IF;

  -- Find trainer by studio code
  SELECT id INTO v_trainer_id FROM public.profiles
    WHERE studio_code = p_studio_code AND role = 'admin';
  
  IF v_trainer_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Código não encontrado. Verifique com seu personal.');
  END IF;

  -- Link student
  UPDATE public.profiles SET business_owner_id = v_trainer_id WHERE id = auth.uid();

  RETURN json_build_object('success', true, 'trainer_id', v_trainer_id);
END;
$$;

-- Update appointments RLS to support multi-tenancy
-- Drop old policies that need updating
DROP POLICY IF EXISTS "Admins can view all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can update all appointments" ON public.appointments;

-- Admins see appointments from their own students
CREATE POLICY "Admins can view own student appointments"
ON public.appointments FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') AND (
    instructor_id = auth.uid() OR
    student_id IN (SELECT id FROM public.profiles WHERE business_owner_id = auth.uid())
  )
);

CREATE POLICY "Admins can update own student appointments"
ON public.appointments FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') AND (
    instructor_id = auth.uid() OR
    student_id IN (SELECT id FROM public.profiles WHERE business_owner_id = auth.uid())
  )
);

-- Update class_schedules RLS (already scoped by instructor_id, which is fine)

-- Update profiles RLS: admins can see their linked students
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view own and linked profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') AND (
    id = auth.uid() OR business_owner_id = auth.uid()
  )
);
