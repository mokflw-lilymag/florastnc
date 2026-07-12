-- 013_printer_device_logs.sql
-- 기기별 입출고/임대/반납/AS 이력 로그 테이블

CREATE TABLE IF NOT EXISTS public.printer_device_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    device_id UUID NOT NULL REFERENCES public.printer_devices(id) ON DELETE CASCADE,
    event_type VARCHAR(20) NOT NULL CHECK (
        event_type IN ('registered', 'leased', 'returned', 'repair_in', 'repair_out', 'disposed')
    ),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    memo TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_printer_device_logs_device_id ON public.printer_device_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_printer_device_logs_created_at ON public.printer_device_logs(created_at DESC);

-- RLS
ALTER TABLE public.printer_device_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "printer_device_logs_super_admin_all" ON public.printer_device_logs;
CREATE POLICY "printer_device_logs_super_admin_all" ON public.printer_device_logs
  FOR ALL USING (public.is_super_admin());

-- 기기 등록 시 자동으로 'registered' 이벤트 삽입하는 트리거
CREATE OR REPLACE FUNCTION public.log_printer_device_registered()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.printer_device_logs (device_id, event_type, memo)
  VALUES (NEW.id, 'registered', NEW.memo);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_printer_device_registered ON public.printer_devices;
CREATE TRIGGER trg_printer_device_registered
  AFTER INSERT ON public.printer_devices
  FOR EACH ROW EXECUTE FUNCTION public.log_printer_device_registered();

-- 상태 변경 시 자동 이벤트 로그 트리거
CREATE OR REPLACE FUNCTION public.log_printer_device_status_change()
RETURNS TRIGGER AS $$
DECLARE
  evt VARCHAR(20);
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  evt := CASE NEW.status
    WHEN 'leased'   THEN 'leased'
    WHEN 'in_stock' THEN 'returned'
    WHEN 'repair'   THEN 'repair_in'
    WHEN 'disposed' THEN 'disposed'
    ELSE NULL
  END;

  IF evt IS NOT NULL THEN
    INSERT INTO public.printer_device_logs (device_id, event_type, tenant_id, memo)
    VALUES (NEW.id, evt, NEW.current_tenant_id, NEW.memo);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_printer_device_status_change ON public.printer_devices;
CREATE TRIGGER trg_printer_device_status_change
  AFTER UPDATE ON public.printer_devices
  FOR EACH ROW EXECUTE FUNCTION public.log_printer_device_status_change();
