-- Allow students to delete both pending and confirmed appointments
DROP POLICY "Students can delete own pending appointments" ON public.appointments;
CREATE POLICY "Students can delete own pending or confirmed appointments"
  ON public.appointments
  FOR DELETE
  USING (auth.uid() = student_id AND status IN ('pending', 'confirmed'));