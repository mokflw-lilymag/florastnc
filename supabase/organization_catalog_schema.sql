-- =============================================================================
-- 본사 공유 상품(참고 카탈로그) → 지점 products 로 복사할 원본 행
-- organization_schema.sql 적용 후 실행
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.organization_catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  main_category TEXT,
  mid_category TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  code TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'sold_out')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_catalog_org ON public.organization_catalog_items(organization_id);

COMMENT ON TABLE public.organization_catalog_items IS '본사가 관리하는 브랜드 참고 상품. 지점 products에 복사(적용)할 때 사용.';

ALTER TABLE public.organization_catalog_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_catalog_select_members" ON public.organization_catalog_items;
CREATE POLICY "org_catalog_select_members" ON public.organization_catalog_items
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid()
    )
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "org_catalog_write_org_admin" ON public.organization_catalog_items;
CREATE POLICY "org_catalog_write_org_admin" ON public.organization_catalog_items
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_catalog_items.organization_id
        AND om.user_id = auth.uid()
        AND om.role = 'org_admin'
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_catalog_items.organization_id
        AND om.user_id = auth.uid()
        AND om.role = 'org_admin'
    )
  );
