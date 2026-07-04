-- 환경설정 대리 문의: 확인용 비밀번호(해시) · 동의 시각
-- Supabase SQL Editor에서 실행 (support_tickets_schema.sql 적용 후)

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS remote_assist_code_hash TEXT,
  ADD COLUMN IF NOT EXISTS remote_assist_consent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.support_tickets.remote_assist_code_hash IS '환경설정 대리 문의 확인용 비밀번호 SHA-256 해시';
COMMENT ON COLUMN public.support_tickets.remote_assist_consent_at IS '환경설정 대리 동의 시각';
