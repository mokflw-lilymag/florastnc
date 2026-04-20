-- 본사 게시판 댓글 — 공지를 볼 수 있는 사용자(조직 멤버·소속 지점) 전원 조회·작성
-- 삭제: 본인 댓글, 또는 플랫폼 super_admin, 또는 해당 조직 org_admin
-- organization_announcements_schema.sql 적용 후 실행

CREATE TABLE IF NOT EXISTS public.organization_announcement_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES public.organization_announcements(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(trim(body)) > 0 AND char_length(body) <= 8000),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_ann_comments_ann_created
  ON public.organization_announcement_comments(announcement_id, created_at ASC);

ALTER TABLE public.organization_announcement_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_ann_comments_select_super" ON public.organization_announcement_comments;
DROP POLICY IF EXISTS "org_ann_comments_insert_super" ON public.organization_announcement_comments;
DROP POLICY IF EXISTS "org_ann_comments_delete_super" ON public.organization_announcement_comments;
DROP POLICY IF EXISTS "org_ann_comments_select_readers" ON public.organization_announcement_comments;
DROP POLICY IF EXISTS "org_ann_comments_insert_readers" ON public.organization_announcement_comments;
DROP POLICY IF EXISTS "org_ann_comments_delete_moderators" ON public.organization_announcement_comments;

CREATE POLICY "org_ann_comments_select_readers" ON public.organization_announcement_comments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_announcements oa
      WHERE oa.id = announcement_id
      AND (
        public.is_super_admin()
        OR oa.organization_id IN (
          SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid()
        )
        OR oa.organization_id IN (
          SELECT t.organization_id FROM public.tenants t
          WHERE t.id = public.get_auth_user_tenant_id() AND t.organization_id IS NOT NULL
        )
      )
    )
  );

CREATE POLICY "org_ann_comments_insert_readers" ON public.organization_announcement_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.organization_announcements oa
      WHERE oa.id = announcement_id
      AND (
        public.is_super_admin()
        OR oa.organization_id IN (
          SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid()
        )
        OR oa.organization_id IN (
          SELECT t.organization_id FROM public.tenants t
          WHERE t.id = public.get_auth_user_tenant_id() AND t.organization_id IS NOT NULL
        )
      )
    )
  );

CREATE POLICY "org_ann_comments_delete_moderators" ON public.organization_announcement_comments
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.organization_announcements oa
      INNER JOIN public.organization_members om
        ON om.organization_id = oa.organization_id
        AND om.user_id = auth.uid()
        AND om.role = 'org_admin'
      WHERE oa.id = announcement_id
    )
  );

COMMENT ON TABLE public.organization_announcement_comments IS '본사 게시물 댓글. 공지 열람 권한과 동일한 사용자가 읽기·작성. 삭제는 본인·super·해당 조직 org_admin.';
