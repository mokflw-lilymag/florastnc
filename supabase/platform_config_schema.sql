-- =============================================================================
-- platform_config: 플랫폼 전역 설정 (Meta/Google API 키, OpenAI 키 등)
-- 마케팅 관리 화면: src/app/dashboard/marketing/admin/page.tsx
--
-- 사전 요구: public.is_super_admin() 가 정의되어 있어야 함 (supabase_schema.sql)
--
-- 적용 방법: Supabase 대시보드 → SQL Editor → 이 파일 전체 실행
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.platform_config (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.platform_config IS '슈퍼관리자 전용 전역 설정. RLS로 쓰기/읽기 모두 super_admin 만 허용.';

ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

-- 기존 정책이 있으면 교체 (재실행 안전)
DROP POLICY IF EXISTS "Super admins full access platform_config" ON public.platform_config;

CREATE POLICY "Super admins full access platform_config"
ON public.platform_config
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());
