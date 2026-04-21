-- 초기 마스터 시드 적용 감사 로그 (선택). 서비스 롤로 insert, RLS는 super_admin 조회 권장.
-- Supabase SQL Editor에서 한 번 실행.

CREATE TABLE IF NOT EXISTS public.tenant_master_seed_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  seed_version TEXT NOT NULL,
  applied_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  summary JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_master_seed_audit_tenant
  ON public.tenant_master_seed_audit(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_master_seed_audit_created
  ON public.tenant_master_seed_audit(created_at DESC);

ALTER TABLE public.tenant_master_seed_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins read seed audit" ON public.tenant_master_seed_audit;
CREATE POLICY "Super admins read seed audit"
  ON public.tenant_master_seed_audit FOR SELECT
  USING (public.is_super_admin());

COMMENT ON TABLE public.tenant_master_seed_audit IS '관리자 초기 기초자료 시드 적용 이력 (감사)';
