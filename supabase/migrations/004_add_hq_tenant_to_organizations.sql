-- =============================================================================
-- organizations 테이블에 hq_tenant_id (대표 매장 ID) 컬럼 추가
-- =============================================================================

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS hq_tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.organizations.hq_tenant_id IS '조직(본사)의 대표 매장(본점) 테넌트 ID';
