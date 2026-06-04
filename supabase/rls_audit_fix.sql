-- 1. RLS 강제 활성화 (만약 꺼져있다면 켭니다)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_fees_by_region ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;

-- 2. 기존 정책 삭제 (충돌 방지)
DROP POLICY IF EXISTS "Tenants manage own orders" ON public.orders;
DROP POLICY IF EXISTS "Tenants manage own customers" ON public.customers;
DROP POLICY IF EXISTS "Tenants manage own products" ON public.products;
DROP POLICY IF EXISTS "Tenants manage own delivery_fees" ON public.delivery_fees_by_region;
DROP POLICY IF EXISTS "Tenants manage own print_jobs" ON public.print_jobs;

-- 3. Super Admin 정책 삭제 (충돌 방지)
DROP POLICY IF EXISTS "Super Admin access orders" ON public.orders;
DROP POLICY IF EXISTS "Super Admin access customers" ON public.customers;
DROP POLICY IF EXISTS "Super Admin access products" ON public.products;
DROP POLICY IF EXISTS "Super Admin access delivery_fees" ON public.delivery_fees_by_region;
DROP POLICY IF EXISTS "Super Admin access print_jobs" ON public.print_jobs;

-- 4. 새로운 강력한 RLS 정책 생성 (Tenant 전용)
CREATE POLICY "Tenants manage own orders" ON public.orders
FOR ALL USING (tenant_id = public.get_auth_user_tenant_id());

CREATE POLICY "Tenants manage own customers" ON public.customers
FOR ALL USING (tenant_id = public.get_auth_user_tenant_id());

CREATE POLICY "Tenants manage own products" ON public.products
FOR ALL USING (tenant_id = public.get_auth_user_tenant_id());

CREATE POLICY "Tenants manage own delivery_fees" ON public.delivery_fees_by_region
FOR ALL USING (tenant_id = public.get_auth_user_tenant_id());

CREATE POLICY "Tenants manage own print_jobs" ON public.print_jobs
FOR ALL USING (tenant_id = public.get_auth_user_tenant_id());

-- 5. Super Admin 정책 생성 (public.is_super_admin() 함수 사용)
CREATE POLICY "Super Admin access orders" ON public.orders
FOR ALL USING (public.is_super_admin());

CREATE POLICY "Super Admin access customers" ON public.customers
FOR ALL USING (public.is_super_admin());

CREATE POLICY "Super Admin access products" ON public.products
FOR ALL USING (public.is_super_admin());

CREATE POLICY "Super Admin access delivery_fees" ON public.delivery_fees_by_region
FOR ALL USING (public.is_super_admin());

CREATE POLICY "Super Admin access print_jobs" ON public.print_jobs
FOR ALL USING (public.is_super_admin());
