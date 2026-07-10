-- 012_printer_devices.sql

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'printer_status') THEN
    CREATE TYPE printer_status AS ENUM ('in_stock', 'leased', 'repair', 'disposed');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.printer_devices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    device_type VARCHAR(20) NOT NULL CHECK (device_type IN ('pos', 'label')),
    model_name VARCHAR(100) NOT NULL,
    serial_number VARCHAR(100) NOT NULL UNIQUE,
    status printer_status NOT NULL DEFAULT 'in_stock',
    current_tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    leased_at TIMESTAMPTZ,
    memo TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.printer_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "printer_devices_super_admin_all" ON public.printer_devices;
CREATE POLICY "printer_devices_super_admin_all" ON public.printer_devices
  FOR ALL USING (
    public.is_super_admin()
  );

DROP POLICY IF EXISTS "printer_devices_tenant_read" ON public.printer_devices;
CREATE POLICY "printer_devices_tenant_read" ON public.printer_devices
  FOR SELECT USING (
    current_tenant_id = public.get_auth_user_tenant_id()
  );
