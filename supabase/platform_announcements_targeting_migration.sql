-- 글로벌 공지: 나라·요금제 타겟 (NULL/빈 배열 = 전체)

ALTER TABLE public.platform_announcements
  ADD COLUMN IF NOT EXISTS target_countries TEXT[] DEFAULT NULL;

ALTER TABLE public.platform_announcements
  ADD COLUMN IF NOT EXISTS target_plans TEXT[] DEFAULT NULL;

COMMENT ON COLUMN public.platform_announcements.target_countries IS '대상 국가 코드 배열. NULL 또는 {} = 전체.';
COMMENT ON COLUMN public.platform_announcements.target_plans IS '대상 요금제 배열. NULL 또는 {} = 전체.';
