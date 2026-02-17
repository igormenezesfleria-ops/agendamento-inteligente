
CREATE OR REPLACE FUNCTION public.delegate_appointment(appt_id UUID, target_instructor_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.appointments SET instructor_id = target_instructor_id, status = 'confirmed' WHERE id = appt_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.unlink_student(target_student_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.profiles SET business_owner_id = NULL WHERE id = target_student_id;
END;
$$;

-- Allow admins to delete expired appointments
CREATE POLICY "Admins can delete expired appointments"
ON public.appointments
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) AND (
  instructor_id = auth.uid() OR student_id IN (
    SELECT id FROM profiles WHERE business_owner_id = auth.uid()
  )
));
