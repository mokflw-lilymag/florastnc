-- =============================================================================
-- 고정비 템플릿 (tenant 기준) — 지출 페이지 · 매장 일정 캘린더
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.fixed_cost_templates (
  id TEXT PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tenant_name TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fixed_cost_templates_tenant_unique UNIQUE (tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_fixed_cost_templates_tenant
  ON public.fixed_cost_templates(tenant_id);

COMMENT ON TABLE public.fixed_cost_templates IS '매장(tenant)별 고정비·공과금 템플릿. items는 FixedCostItem[] JSON.';

ALTER TABLE public.fixed_cost_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fixed_cost_templates_tenant_all" ON public.fixed_cost_templates;
CREATE POLICY "fixed_cost_templates_tenant_all" ON public.fixed_cost_templates
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR tenant_id = public.get_auth_user_tenant_id()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND COALESCE(p.org_work_tenant_id, p.tenant_id) = fixed_cost_templates.tenant_id
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR tenant_id = public.get_auth_user_tenant_id()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND COALESCE(p.org_work_tenant_id, p.tenant_id) = fixed_cost_templates.tenant_id
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fixed_cost_templates TO authenticated;
GRANT ALL ON public.fixed_cost_templates TO service_role;

NOTIFY pgrst, 'reload schema';
