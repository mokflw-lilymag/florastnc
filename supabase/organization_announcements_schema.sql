-- 조직(본사) → 소속 지점 공지
-- organization_schema.sql 적용 후 실행

CREATE TABLE IF NOT EXISTS public.organization_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high')),
  attachment_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 기존 DB에 이미 organization_announcements 가 있으면 CREATE TABLE 은 건너뛰므로,
-- 아래로 expires_at·attachment_urls·created_by 가 없을 때만 보강합니다(42703 방지).
ALTER TABLE public.organization_announcements
  ADD COLUMN IF NOT EXISTS attachment_urls JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.organization_announcements
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.organization_announcements
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

UPDATE public.organization_announcements
SET expires_at = created_at + interval '30 days'
WHERE expires_at IS NULL;

ALTER TABLE public.organization_announcements
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '30 days');

ALTER TABLE public.organization_announcements
  ALTER COLUMN expires_at SET NOT NULL;

COMMENT ON COLUMN public.organization_announcements.expires_at IS '이 시각 이후 비노출·삭제 대상(기본 게시 시점 + 30일).';
COMMENT ON COLUMN public.organization_announcements.attachment_urls IS 'Supabase Storage 공개 URL 문자열 배열(JSON).';

CREATE INDEX IF NOT EXISTS idx_org_announcements_org_created
  ON public.organization_announcements(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_org_announcements_expires
  ON public.organization_announcements(expires_at);

ALTER TABLE public.organization_announcements ENABLE ROW LEVEL SECURITY;

-- 조회: 플랫폼 관리자, 조직 멤버, 또는 해당 조직 소속 매장(tenant) 직원
DROP POLICY IF EXISTS "org_announcements_select" ON public.organization_announcements;
CREATE POLICY "org_announcements_select" ON public.organization_announcements
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR organization_id IN (
      SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid()
    )
    OR organization_id IN (
      SELECT t.organization_id FROM public.tenants t
      WHERE t.id = public.get_auth_user_tenant_id() AND t.organization_id IS NOT NULL
    )
  );

-- 작성: super_admin 또는 해당 조직 org_admin
DROP POLICY IF EXISTS "org_announcements_insert" ON public.organization_announcements;
CREATE POLICY "org_announcements_insert" ON public.organization_announcements
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_id
        AND om.user_id = auth.uid()
        AND om.role = 'org_admin'
    )
  );

DROP POLICY IF EXISTS "org_announcements_update" ON public.organization_announcements;
CREATE POLICY "org_announcements_update" ON public.organization_announcements
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_announcements.organization_id
        AND om.user_id = auth.uid()
        AND om.role = 'org_admin'
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_id
        AND om.user_id = auth.uid()
        AND om.role = 'org_admin'
    )
  );

DROP POLICY IF EXISTS "org_announcements_delete" ON public.organization_announcements;
CREATE POLICY "org_announcements_delete" ON public.organization_announcements
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_announcements.organization_id
        AND om.user_id = auth.uid()
        AND om.role = 'org_admin'
    )
  );

COMMENT ON TABLE public.organization_announcements IS '본사→소속 지점 공지. RLS로 조직 멤버·소속 tenant 직원만 조회.';
