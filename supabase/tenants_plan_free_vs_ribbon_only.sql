-- plan 정리: 유료 PRINT CORE 구독자는 ribbon_only, 미구독 체험은 free 유지
-- Supabase SQL Editor에서 1회 실행

UPDATE tenants
SET plan = 'ribbon_only'
WHERE plan = 'free'
  AND subscription_end IS NOT NULL
  AND subscription_end::timestamptz > now();

-- (선택) 과거 premium/enterprise 수동 지정 → pro 통합
UPDATE tenants
SET plan = 'pro', is_premium = false
WHERE plan IN ('premium', 'enterprise', 'basic');
