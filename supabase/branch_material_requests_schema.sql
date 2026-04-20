-- =============================================================================
-- 지점 → 본사 자재 요청 (조직 연결 매장만)
-- organization_schema.sql · 기존 materials 테이블 이후 실행
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.branch_material_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'fulfilled', 'cancelled')),
  branch_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bmr_org ON public.branch_material_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_bmr_tenant ON public.branch_material_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bmr_created ON public.branch_material_requests(created_at DESC);

CREATE TABLE IF NOT EXISTS public.branch_material_request_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.branch_material_requests(id) ON DELETE CASCADE,
  material_id UUID REFERENCES public.materials(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  main_category TEXT NOT NULL,
  mid_category TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit TEXT NOT NULL DEFAULT 'ea',
  spec TEXT,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_bmrl_request ON public.branch_material_request_lines(request_id);

COMMENT ON TABLE public.branch_material_requests IS '조직 소속 지점이 본사에 올리는 자재 요청 헤더.';
COMMENT ON TABLE public.branch_material_request_lines IS '자재 요청 품목 줄(자재 마스터 선택 또는 수기).';

ALTER TABLE public.branch_material_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_material_request_lines ENABLE ROW LEVEL SECURITY;

-- 요청 헤더: 소속 지점 사용자는 본인 매장 건만 조회
DROP POLICY IF EXISTS "bmr_select_branch" ON public.branch_material_requests;
CREATE POLICY "bmr_select_branch" ON public.branch_material_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND COALESCE(p.org_work_tenant_id, p.tenant_id) = branch_material_requests.tenant_id
    )
  );

-- 조직 멤버(본사)는 같은 조직 요청 전체 조회
DROP POLICY IF EXISTS "bmr_select_org_member" ON public.branch_material_requests;
CREATE POLICY "bmr_select_org_member" ON public.branch_material_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.organization_id = branch_material_requests.organization_id
    )
  );

-- 슈퍼관리자
DROP POLICY IF EXISTS "bmr_select_super" ON public.branch_material_requests;
CREATE POLICY "bmr_select_super" ON public.branch_material_requests
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- 줄: 부모 요청과 동일한 주체(지점·조직 멤버·슈퍼)만 조회
DROP POLICY IF EXISTS "bmrl_select" ON public.branch_material_request_lines;
CREATE POLICY "bmrl_select" ON public.branch_material_request_lines
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.branch_material_requests r
      WHERE r.id = branch_material_request_lines.request_id
        AND (
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND COALESCE(p.org_work_tenant_id, p.tenant_id) = r.tenant_id
          )
          OR EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.user_id = auth.uid()
              AND om.organization_id = r.organization_id
          )
          OR public.is_super_admin()
        )
    )
  );

-- API에서 service role로 INSERT 하므로 클라이언트 직접 쓰기 정책은 생략 가능
-- (필요 시 별도 정책 추가)
--
-- 입고 확정 → 지점 재고·지출 연동: supabase/branch_material_request_fulfillment.sql 실행
