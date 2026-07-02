-- FloXync 플랫폼 글로벌 공지 (슈퍼관리자 → 전체 사용자)
-- 알림 종 · /dashboard/announcements · 이메일 발송

CREATE TABLE IF NOT EXISTS public.platform_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'update'
    CHECK (category IN ('update', 'maintenance', 'notice', 'important')),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('normal', 'high')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  send_email BOOLEAN NOT NULL DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  email_recipient_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_announcement_reads (
  announcement_id UUID NOT NULL
    REFERENCES public.platform_announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_announcements_status_published
  ON public.platform_announcements(status, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_announcements_expires
  ON public.platform_announcements(expires_at)
  WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_platform_ann_reads_user
  ON public.platform_announcement_reads(user_id, read_at DESC);

ALTER TABLE public.platform_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_announcement_reads ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.profile_is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'super_admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.profile_is_super_admin() TO authenticated;

-- 공지 조회: 슈퍼는 전체, 일반 사용자는 게시·미만료만
DROP POLICY IF EXISTS "platform_ann_select" ON public.platform_announcements;
CREATE POLICY "platform_ann_select" ON public.platform_announcements
  FOR SELECT TO authenticated
  USING (
    public.profile_is_super_admin()
    OR (
      status = 'published'
      AND (expires_at IS NULL OR expires_at > now())
    )
  );

DROP POLICY IF EXISTS "platform_ann_insert" ON public.platform_announcements;
CREATE POLICY "platform_ann_insert" ON public.platform_announcements
  FOR INSERT TO authenticated
  WITH CHECK (public.profile_is_super_admin());

DROP POLICY IF EXISTS "platform_ann_update" ON public.platform_announcements;
CREATE POLICY "platform_ann_update" ON public.platform_announcements
  FOR UPDATE TO authenticated
  USING (public.profile_is_super_admin())
  WITH CHECK (public.profile_is_super_admin());

DROP POLICY IF EXISTS "platform_ann_delete" ON public.platform_announcements;
CREATE POLICY "platform_ann_delete" ON public.platform_announcements
  FOR DELETE TO authenticated
  USING (public.profile_is_super_admin());

DROP POLICY IF EXISTS "platform_ann_reads_select_own" ON public.platform_announcement_reads;
CREATE POLICY "platform_ann_reads_select_own" ON public.platform_announcement_reads
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.profile_is_super_admin());

DROP POLICY IF EXISTS "platform_ann_reads_insert_own" ON public.platform_announcement_reads;
CREATE POLICY "platform_ann_reads_insert_own" ON public.platform_announcement_reads
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "platform_ann_reads_update_own" ON public.platform_announcement_reads;
CREATE POLICY "platform_ann_reads_update_own" ON public.platform_announcement_reads
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE public.platform_announcements IS 'FloXync 플랫폼 글로벌 공지. 슈퍼관리자 작성, 전체 테넌트 알림·이메일.';
COMMENT ON TABLE public.platform_announcement_reads IS '글로벌 공지 읽음 기록.';
