-- products DELETE RLS 정합성 수정
-- 1) get_auth_user_tenant_id → profiles 기반 UUID (org_work_tenant_id 우선)
-- 2) is_super_admin → profiles.role + JWT 메타데이터
-- 3) products 정책을 SELECT/INSERT/UPDATE/DELETE로 명시 분리

-- ── 공용 함수 (org_work_tenant_context.sql 과 동일) ──
CREATE OR REPLACE FUNCTION public.get_auth_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT org_work_tenant_id FROM public.profiles WHERE id = auth.uid()),
    (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
    OR COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'is_super_admin')::boolean,
      (auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean,
      false
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_auth_user_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- ── products RLS 재정의 ──
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_all_products" ON public.products;
DROP POLICY IF EXISTS "Tenants manage own products" ON public.products;
DROP POLICY IF EXISTS "Super Admin access products" ON public.products;
DROP POLICY IF EXISTS "Tenants delete own products" ON public.products;
DROP POLICY IF EXISTS "Super admins delete all products" ON public.products;
DROP POLICY IF EXISTS "products_tenant_select" ON public.products;
DROP POLICY IF EXISTS "products_tenant_insert" ON public.products;
DROP POLICY IF EXISTS "products_tenant_update" ON public.products;
DROP POLICY IF EXISTS "products_tenant_delete" ON public.products;

CREATE POLICY "products_tenant_select" ON public.products
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_auth_user_tenant_id()
    OR public.is_super_admin()
  );

CREATE POLICY "products_tenant_insert" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_auth_user_tenant_id()
    OR public.is_super_admin()
  );

CREATE POLICY "products_tenant_update" ON public.products
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_auth_user_tenant_id()
    OR public.is_super_admin()
  )
  WITH CHECK (
    tenant_id = public.get_auth_user_tenant_id()
    OR public.is_super_admin()
  );

CREATE POLICY "products_tenant_delete" ON public.products
  FOR DELETE TO authenticated
  USING (
    tenant_id = public.get_auth_user_tenant_id()
    OR public.is_super_admin()
  );
