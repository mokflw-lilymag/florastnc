-- 국가별 연동 수요 집계 (슈퍼관리자 /dashboard/admin/regional-demand)
-- integration_notify_requests 테이블이 있어야 합니다.

CREATE OR REPLACE FUNCTION public.get_integration_demand()
RETURNS TABLE (
  country_code text,
  platform text,
  request_count bigint,
  last_requested_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.country_code,
    r.platform,
    COUNT(*)::bigint AS request_count,
    MAX(r.requested_at) AS last_requested_at
  FROM public.integration_notify_requests AS r
  WHERE public.is_super_admin()
  GROUP BY r.country_code, r.platform
  ORDER BY request_count DESC, last_requested_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_integration_demand() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_integration_demand() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_integration_demand() TO service_role;
