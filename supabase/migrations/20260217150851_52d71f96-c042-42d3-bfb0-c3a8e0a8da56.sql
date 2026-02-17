
-- 1. Add requires_approval to class_schedules
ALTER TABLE public.class_schedules ADD COLUMN requires_approval boolean NOT NULL DEFAULT true;

-- 2. Create avatars storage bucket (public)
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- 3. Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 4. Fix class_schedules RLS: Students should only see schedules from their trainer
DROP POLICY IF EXISTS "Authenticated users can view all schedules" ON public.class_schedules;

CREATE POLICY "Users can view relevant schedules"
ON public.class_schedules FOR SELECT
USING (
  -- Admins/Collaborators see their own or linked schedules
  instructor_id = auth.uid()
  OR instructor_id = get_business_owner_id(auth.uid())
);

-- 5. Fix profiles RLS: Allow admins to update their students' business_owner_id
CREATE POLICY "Admins can update linked student profiles"
ON public.profiles FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND business_owner_id = auth.uid()
);

-- 6. Fix collaborators visibility: admins need to see collaborators linked to them
-- Already covered by "Admins can view own and linked profiles" policy
