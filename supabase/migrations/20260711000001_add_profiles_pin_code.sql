-- 사장님 PIN (작업자 전환·권한 복귀용)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS pin_code VARCHAR(4);

COMMENT ON COLUMN public.profiles.pin_code IS '사장님 4자리 PIN — 직원이 사장님 권한으로 전환할 때 사용';
