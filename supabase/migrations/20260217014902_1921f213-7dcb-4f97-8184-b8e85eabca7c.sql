
-- Add creator_id to notifications for multi-tenant isolation
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS creator_id uuid;

-- Backfill existing broadcasts with user_id as creator if available
UPDATE public.notifications SET creator_id = user_id WHERE creator_id IS NULL AND user_id IS NOT NULL;

-- Drop old RLS policies on notifications
DROP POLICY IF EXISTS "Admins can manage all notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;

-- New isolated RLS policies
CREATE POLICY "Admins can insert own announcements"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) AND creator_id = auth.uid()
);

CREATE POLICY "Admins can manage own notifications"
ON public.notifications FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) AND creator_id = auth.uid()
);

CREATE POLICY "Users can view own direct notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Students see broadcasts from their trainer"
ON public.notifications FOR SELECT
TO authenticated
USING (
  is_broadcast = true 
  AND creator_id = get_business_owner_id(auth.uid())
);

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);
