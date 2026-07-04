-- 회원사 수발주 전역 플래그: 일반 매장도 읽기 가능 (메뉴 표시 여부)
-- 쓰기는 기존 super_admin 정책 유지 (platform_config_schema.sql)
--
-- Supabase SQL Editor에서 실행

DROP POLICY IF EXISTS "Authenticated read partner_orders flag" ON public.platform_config;

CREATE POLICY "Authenticated read partner_orders flag"
ON public.platform_config
FOR SELECT
TO authenticated
USING (key = 'partner_orders_enabled');

-- 기본값: 비공개(OFF). 슈퍼관리자 전역 설정에서 ON 가능
INSERT INTO public.platform_config (key, value, updated_at)
VALUES ('partner_orders_enabled', 'false'::jsonb, now())
ON CONFLICT (key) DO NOTHING;
