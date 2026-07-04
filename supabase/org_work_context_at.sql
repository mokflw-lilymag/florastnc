-- 원격 지원·지점 업무 모드 자동 만료용 (2시간)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS org_work_context_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.org_work_context_at IS
  'org_work_tenant_id 설정 시각. 2시간 경과 시 자동 해제.';
