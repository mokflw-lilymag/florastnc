-- =============================================================================
-- 조직(본사) · 다매장 — 스키마 및 RLS
-- 적용: Supabase SQL Editor에서 실행 (기존 단일 매장 동작은 tenant_id·기존 정책 유지)
-- =============================================================================

-- 1) 조직
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) 조직 ↔ 사용자 (플랫폼 관리자가 멤버 배정)
CREATE TABLE IF NOT EXISTS public.organization_members (
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'org_admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON public.organization_members(user_id);

-- 3) 지점(tenants)에 소속 조직 (NULL = 기존과 동일 단독 매장)
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tenants_organization_id ON public.tenants(organization_id);

-- 4) org_admin 은 tenant_id 없이 가입 가능하도록 프로필 CHECK 갱신
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS tenant_id_required_for_non_admins;
ALTER TABLE public.profiles ADD CONSTRAINT tenant_id_required_for_non_admins CHECK (
  (role IN ('super_admin', 'org_admin')) OR (tenant_id IS NOT NULL)
);

COMMENT ON TABLE public.organizations IS '다매장 본사(브랜드) 단위. 지점은 tenants.organization_id로 연결.';
COMMENT ON TABLE public.organization_members IS '조직 접근 권한. 배정은 super_admin 전용.';

-- 5) RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organizations_super_all" ON public.organizations;
CREATE POLICY "organizations_super_all" ON public.organizations
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "organizations_member_select" ON public.organizations;
CREATE POLICY "organizations_member_select" ON public.organizations
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "organization_members_super_all" ON public.organization_members;
CREATE POLICY "organization_members_super_all" ON public.organization_members
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "organization_members_self_select" ON public.organization_members;
CREATE POLICY "organization_members_self_select" ON public.organization_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 조직 소속 지점 목록 조회 (기존 "자기 tenant만" 정책과 OR로 합쳐짐)
DROP POLICY IF EXISTS "Org members can view tenants in their organizations" ON public.tenants;
CREATE POLICY "Org members can view tenants in their organizations" ON public.tenants
  FOR SELECT TO authenticated
  USING (
    organization_id IS NOT NULL
    AND organization_id IN (
      SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid()
    )
  );
