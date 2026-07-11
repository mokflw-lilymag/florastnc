-- Create tenant_staff table
CREATE TABLE IF NOT EXISTS public.tenant_staff (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,
  pin_code text not null,
  role text not null default 'staff',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
ALTER TABLE public.tenant_staff ENABLE ROW LEVEL SECURITY;

-- Staff table policies
CREATE POLICY "Tenant admin can manage staff" ON public.tenant_staff
  FOR ALL
  USING (
    tenant_id = public.get_auth_user_tenant_id()
    AND (
      (auth.jwt() -> 'user_metadata' ->> 'role' IN ('tenant_admin', 'super_admin'))
      OR
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('tenant_admin', 'super_admin')
      )
    )
  );

CREATE POLICY "Anyone in tenant can read staff" ON public.tenant_staff
  FOR SELECT
  USING (tenant_id = public.get_auth_user_tenant_id());

-- Create staff_attendance_logs table
CREATE TABLE IF NOT EXISTS public.staff_attendance_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  staff_id uuid not null references public.tenant_staff(id) on delete cascade,
  type text not null check (type in ('clock_in', 'clock_out')),
  recorded_at timestamptz not null default now()
);

-- Enable RLS
ALTER TABLE public.staff_attendance_logs ENABLE ROW LEVEL SECURITY;

-- Attendance logs policies
CREATE POLICY "Anyone in tenant can insert their attendance" ON public.staff_attendance_logs
  FOR INSERT
  WITH CHECK (tenant_id = public.get_auth_user_tenant_id());

CREATE POLICY "Anyone in tenant can read attendance" ON public.staff_attendance_logs
  FOR SELECT
  USING (tenant_id = public.get_auth_user_tenant_id());
