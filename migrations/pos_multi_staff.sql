-- 1. Add full_name and pin_code to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS pin_code VARCHAR(4);

-- 2. Modify staff_attendance_logs RLS to allow the POS owner to insert logs for staff
DROP POLICY IF EXISTS "Staff can insert own attendance" ON public.staff_attendance_logs;
CREATE POLICY "Staff can insert own attendance" ON public.staff_attendance_logs FOR INSERT WITH CHECK (
  tenant_id = public.get_auth_user_tenant_id()
  -- Removed the condition: `profile_id = auth.uid()`
  -- because now the POS owner (auth.uid()) is inserting the log for a specific staff (profile_id).
);
