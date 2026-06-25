-- =============================================================
-- Floxync 필수 함수 & RLS 정책
-- DB 이전 후 반드시 Supabase SQL Editor에서 실행하세요.
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. 공용 함수
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_auth_user_tenant_id()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'tenant_id'),
    (auth.jwt() -> 'app_metadata' ->> 'tenant_id')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'is_super_admin')::boolean,
    (auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean,
    false
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- 2. print_jobs RLS
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_select_print_jobs" ON public.print_jobs;
DROP POLICY IF EXISTS "tenant_insert_print_jobs" ON public.print_jobs;
DROP POLICY IF EXISTS "tenant_update_print_jobs" ON public.print_jobs;
DROP POLICY IF EXISTS "tenant_delete_print_jobs" ON public.print_jobs;

CREATE POLICY "tenant_select_print_jobs" ON public.print_jobs
  FOR SELECT USING (
    tenant_id = public.get_auth_user_tenant_id()
    OR public.is_super_admin()
  );

CREATE POLICY "tenant_insert_print_jobs" ON public.print_jobs
  FOR INSERT WITH CHECK (
    tenant_id = public.get_auth_user_tenant_id()
    OR public.is_super_admin()
  );

CREATE POLICY "tenant_update_print_jobs" ON public.print_jobs
  FOR UPDATE USING (
    tenant_id = public.get_auth_user_tenant_id()
    OR public.is_super_admin()
  );

CREATE POLICY "tenant_delete_print_jobs" ON public.print_jobs
  FOR DELETE USING (
    tenant_id = public.get_auth_user_tenant_id()
    OR public.is_super_admin()
  );

-- ─────────────────────────────────────────────────────────────
-- 3. system_settings RLS
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_select_system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "tenant_insert_system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "tenant_update_system_settings" ON public.system_settings;

CREATE POLICY "tenant_select_system_settings" ON public.system_settings
  FOR SELECT USING (
    id = 'settings_' || public.get_auth_user_tenant_id()
    OR id LIKE 'global_%'
    OR public.is_super_admin()
  );

CREATE POLICY "tenant_insert_system_settings" ON public.system_settings
  FOR INSERT WITH CHECK (
    id = 'settings_' || public.get_auth_user_tenant_id()
    OR public.is_super_admin()
  );

CREATE POLICY "tenant_update_system_settings" ON public.system_settings
  FOR UPDATE USING (
    id = 'settings_' || public.get_auth_user_tenant_id()
    OR public.is_super_admin()
  );

-- ─────────────────────────────────────────────────────────────
-- 4. orders RLS
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_all_orders" ON public.orders;
CREATE POLICY "tenant_all_orders" ON public.orders
  FOR ALL USING (
    tenant_id = public.get_auth_user_tenant_id()
    OR public.is_super_admin()
  );

-- ─────────────────────────────────────────────────────────────
-- 5. customers RLS
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_all_customers" ON public.customers;
CREATE POLICY "tenant_all_customers" ON public.customers
  FOR ALL USING (
    tenant_id = public.get_auth_user_tenant_id()
    OR public.is_super_admin()
  );

-- ─────────────────────────────────────────────────────────────
-- 6. products RLS
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_all_products" ON public.products;
CREATE POLICY "tenant_all_products" ON public.products
  FOR ALL USING (
    tenant_id = public.get_auth_user_tenant_id()
    OR public.is_super_admin()
  );

-- ─────────────────────────────────────────────────────────────
-- 7. simple_expenses RLS
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.simple_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_all_simple_expenses" ON public.simple_expenses;
CREATE POLICY "tenant_all_simple_expenses" ON public.simple_expenses
  FOR ALL USING (
    tenant_id = public.get_auth_user_tenant_id()
    OR public.is_super_admin()
  );

-- ─────────────────────────────────────────────────────────────
-- 8. materials RLS
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_all_materials" ON public.materials;
CREATE POLICY "tenant_all_materials" ON public.materials
  FOR ALL USING (
    tenant_id = public.get_auth_user_tenant_id()
    OR public.is_super_admin()
  );

-- ─────────────────────────────────────────────────────────────
-- 9. purchases RLS
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_all_purchases" ON public.purchases;
CREATE POLICY "tenant_all_purchases" ON public.purchases
  FOR ALL USING (
    tenant_id = public.get_auth_user_tenant_id()
    OR public.is_super_admin()
  );
