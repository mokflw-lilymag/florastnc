-- 본사 공지 확인(읽음) 기록 — organization_announcements_schema.sql 적용 후 실행
-- 지점 직원이 확인하면 본사(org_admin)가 누가·어느 지점에서 봤는지 조회 가능

CREATE TABLE IF NOT EXISTS public.organization_announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES public.organization_announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  user_full_name TEXT,
  tenant_name TEXT,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_ann_reads_ann
  ON public.organization_announcement_reads(announcement_id);

CREATE INDEX IF NOT EXISTS idx_org_ann_reads_tenant
  ON public.organization_announcement_reads(tenant_id);

ALTER TABLE public.organization_announcement_reads ENABLE ROW LEVEL SECURITY;

-- 지점 계정: 자기 tenant가 해당 공지 조직과 연결된 경우에만 본인 행 삽입
DROP POLICY IF EXISTS "org_ann_reads_insert_branch" ON public.organization_announcement_reads;
CREATE POLICY "org_ann_reads_insert_branch" ON public.organization_announcement_reads
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND tenant_id = public.get_auth_user_tenant_id()
    AND public.get_auth_user_tenant_id() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.organization_announcements a
      JOIN public.tenants t ON t.id = public.get_auth_user_tenant_id()
      WHERE a.id = announcement_id
        AND t.organization_id IS NOT NULL
        AND t.organization_id = a.organization_id
    )
  );

-- 조회: 본인 확인 내역, 또는 해당 공지 조직의 org_admin / super_admin
DROP POLICY IF EXISTS "org_ann_reads_select" ON public.organization_announcement_reads;
CREATE POLICY "org_ann_reads_select" ON public.organization_announcement_reads
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      JOIN public.organization_announcements a ON a.id = announcement_id
      WHERE om.user_id = auth.uid()
        AND om.organization_id = a.organization_id
        AND om.role = 'org_admin'
    )
  );

-- 동일 공지 재확인 시 read_at 갱신
DROP POLICY IF EXISTS "org_ann_reads_update_own" ON public.organization_announcement_reads;
CREATE POLICY "org_ann_reads_update_own" ON public.organization_announcement_reads
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE public.organization_announcement_reads IS '지점 사용자 공지 확인 시각. user/tenant 이름은 기록 시점 스냅샷.';
