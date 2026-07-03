-- materials / purchases / simple_expenses / customers / orders / delivery_fees
-- SELECT·INSERT·UPDATE·DELETE 정책 명시 분리 (products 010과 동일 패턴)
-- 사전 요구: 010_products_rls_delete_fix.sql 적용 권장 (공용 함수)

-- ── materials ──
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_all_materials" ON public.materials;
DROP POLICY IF EXISTS "Tenants manage own materials" ON public.materials;
DROP POLICY IF EXISTS "Super Admin access materials" ON public.materials;
DROP POLICY IF EXISTS "materials_tenant_select" ON public.materials;
DROP POLICY IF EXISTS "materials_tenant_insert" ON public.materials;
DROP POLICY IF EXISTS "materials_tenant_update" ON public.materials;
DROP POLICY IF EXISTS "materials_tenant_delete" ON public.materials;

CREATE POLICY "materials_tenant_select" ON public.materials
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_auth_user_tenant_id() OR public.is_super_admin());

CREATE POLICY "materials_tenant_insert" ON public.materials
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_auth_user_tenant_id() OR public.is_super_admin());

CREATE POLICY "materials_tenant_update" ON public.materials
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_auth_user_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.get_auth_user_tenant_id() OR public.is_super_admin());

CREATE POLICY "materials_tenant_delete" ON public.materials
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_auth_user_tenant_id() OR public.is_super_admin());

-- ── purchases ──
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_all_purchases" ON public.purchases;
DROP POLICY IF EXISTS "Tenants manage own purchases" ON public.purchases;
DROP POLICY IF EXISTS "Super Admin access purchases" ON public.purchases;
DROP POLICY IF EXISTS "purchases_tenant_select" ON public.purchases;
DROP POLICY IF EXISTS "purchases_tenant_insert" ON public.purchases;
DROP POLICY IF EXISTS "purchases_tenant_update" ON public.purchases;
DROP POLICY IF EXISTS "purchases_tenant_delete" ON public.purchases;

CREATE POLICY "purchases_tenant_select" ON public.purchases
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_auth_user_tenant_id() OR public.is_super_admin());

CREATE POLICY "purchases_tenant_insert" ON public.purchases
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_auth_user_tenant_id() OR public.is_super_admin());

CREATE POLICY "purchases_tenant_update" ON public.purchases
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_auth_user_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.get_auth_user_tenant_id() OR public.is_super_admin());

CREATE POLICY "purchases_tenant_delete" ON public.purchases
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_auth_user_tenant_id() OR public.is_super_admin());

-- ── simple_expenses ──
ALTER TABLE public.simple_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_all_simple_expenses" ON public.simple_expenses;
DROP POLICY IF EXISTS "Tenants manage own simple_expenses" ON public.simple_expenses;
DROP POLICY IF EXISTS "Super Admin access simple_expenses" ON public.simple_expenses;
DROP POLICY IF EXISTS "simple_expenses_tenant_select" ON public.simple_expenses;
DROP POLICY IF EXISTS "simple_expenses_tenant_insert" ON public.simple_expenses;
DROP POLICY IF EXISTS "simple_expenses_tenant_update" ON public.simple_expenses;
DROP POLICY IF EXISTS "simple_expenses_tenant_delete" ON public.simple_expenses;

CREATE POLICY "simple_expenses_tenant_select" ON public.simple_expenses
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_auth_user_tenant_id() OR public.is_super_admin());

CREATE POLICY "simple_expenses_tenant_insert" ON public.simple_expenses
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_auth_user_tenant_id() OR public.is_super_admin());

CREATE POLICY "simple_expenses_tenant_update" ON public.simple_expenses
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_auth_user_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.get_auth_user_tenant_id() OR public.is_super_admin());

CREATE POLICY "simple_expenses_tenant_delete" ON public.simple_expenses
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_auth_user_tenant_id() OR public.is_super_admin());

-- ── customers (soft delete = UPDATE) ──
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_all_customers" ON public.customers;
DROP POLICY IF EXISTS "Tenants manage own customers" ON public.customers;
DROP POLICY IF EXISTS "Super Admin access customers" ON public.customers;
DROP POLICY IF EXISTS "customers_tenant_select" ON public.customers;
DROP POLICY IF EXISTS "customers_tenant_insert" ON public.customers;
DROP POLICY IF EXISTS "customers_tenant_update" ON public.customers;
DROP POLICY IF EXISTS "customers_tenant_delete" ON public.customers;

CREATE POLICY "customers_tenant_select" ON public.customers
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_auth_user_tenant_id() OR public.is_super_admin());

CREATE POLICY "customers_tenant_insert" ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_auth_user_tenant_id() OR public.is_super_admin());

CREATE POLICY "customers_tenant_update" ON public.customers
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_auth_user_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.get_auth_user_tenant_id() OR public.is_super_admin());

CREATE POLICY "customers_tenant_delete" ON public.customers
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_auth_user_tenant_id() OR public.is_super_admin());

-- ── orders (이관 수주 지점 접근 유지 — 008) ──
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_all_orders" ON public.orders;
DROP POLICY IF EXISTS "Tenants manage own orders" ON public.orders;
DROP POLICY IF EXISTS "Super Admin access orders" ON public.orders;
DROP POLICY IF EXISTS "orders_tenant_select" ON public.orders;
DROP POLICY IF EXISTS "orders_tenant_insert" ON public.orders;
DROP POLICY IF EXISTS "orders_tenant_update" ON public.orders;
DROP POLICY IF EXISTS "orders_tenant_delete" ON public.orders;

CREATE POLICY "orders_tenant_select" ON public.orders
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR tenant_id = public.get_auth_user_tenant_id()
    OR (
      transfer_info IS NOT NULL
      AND (
        (transfer_info->>'processBranchId') = public.get_auth_user_tenant_id()::text
        OR (transfer_info->>'process_branch_id') = public.get_auth_user_tenant_id()::text
      )
      AND (transfer_info->>'status') IN ('pending', 'accepted', 'completed')
    )
  );

CREATE POLICY "orders_tenant_insert" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR tenant_id = public.get_auth_user_tenant_id()
  );

CREATE POLICY "orders_tenant_update" ON public.orders
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR tenant_id = public.get_auth_user_tenant_id()
    OR (
      transfer_info IS NOT NULL
      AND (
        (transfer_info->>'processBranchId') = public.get_auth_user_tenant_id()::text
        OR (transfer_info->>'process_branch_id') = public.get_auth_user_tenant_id()::text
      )
      AND (transfer_info->>'status') IN ('pending', 'accepted', 'completed')
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR tenant_id = public.get_auth_user_tenant_id()
    OR (
      transfer_info IS NOT NULL
      AND (
        (transfer_info->>'processBranchId') = public.get_auth_user_tenant_id()::text
        OR (transfer_info->>'process_branch_id') = public.get_auth_user_tenant_id()::text
      )
      AND (transfer_info->>'status') IN ('pending', 'accepted', 'completed')
    )
  );

CREATE POLICY "orders_tenant_delete" ON public.orders
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR tenant_id = public.get_auth_user_tenant_id()
    OR (
      transfer_info IS NOT NULL
      AND (
        (transfer_info->>'processBranchId') = public.get_auth_user_tenant_id()::text
        OR (transfer_info->>'process_branch_id') = public.get_auth_user_tenant_id()::text
      )
      AND (transfer_info->>'status') IN ('pending', 'accepted', 'completed')
    )
  );

-- ── delivery_fees_by_region ──
ALTER TABLE public.delivery_fees_by_region ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenants manage own delivery_fees" ON public.delivery_fees_by_region;
DROP POLICY IF EXISTS "Super Admin access delivery_fees" ON public.delivery_fees_by_region;
DROP POLICY IF EXISTS "delivery_fees_tenant_select" ON public.delivery_fees_by_region;
DROP POLICY IF EXISTS "delivery_fees_tenant_insert" ON public.delivery_fees_by_region;
DROP POLICY IF EXISTS "delivery_fees_tenant_update" ON public.delivery_fees_by_region;
DROP POLICY IF EXISTS "delivery_fees_tenant_delete" ON public.delivery_fees_by_region;

CREATE POLICY "delivery_fees_tenant_select" ON public.delivery_fees_by_region
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_auth_user_tenant_id() OR public.is_super_admin());

CREATE POLICY "delivery_fees_tenant_insert" ON public.delivery_fees_by_region
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_auth_user_tenant_id() OR public.is_super_admin());

CREATE POLICY "delivery_fees_tenant_update" ON public.delivery_fees_by_region
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_auth_user_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.get_auth_user_tenant_id() OR public.is_super_admin());

CREATE POLICY "delivery_fees_tenant_delete" ON public.delivery_fees_by_region
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_auth_user_tenant_id() OR public.is_super_admin());
