-- 본사 게시판 확장: 만료일(기본 30일) + 이미지 URL 배열
-- 참고: organization_announcements_schema.sql 에 동일 보강이 포함되어 있습니다.
--       이미 구 테이블만 있고 전체 스키마를 다시 돌리기 어렵다면 이 파일만 실행해도 됩니다.

ALTER TABLE public.organization_announcements
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS attachment_urls JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.organization_announcements
SET expires_at = created_at + interval '30 days'
WHERE expires_at IS NULL;

ALTER TABLE public.organization_announcements
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '30 days'),
  ALTER COLUMN expires_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_org_announcements_expires
  ON public.organization_announcements(expires_at);

COMMENT ON COLUMN public.organization_announcements.expires_at IS '이 시각 이후 비노출·삭제 대상(기본 게시 시점 + 30일).';
COMMENT ON COLUMN public.organization_announcements.attachment_urls IS 'Supabase Storage 공개 URL 문자열 배열(JSON).';
