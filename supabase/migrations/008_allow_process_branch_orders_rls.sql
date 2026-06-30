-- 1. 기존 orders RLS 정책 삭제
DROP POLICY IF EXISTS "Tenants manage own orders" ON public.orders;
DROP POLICY IF EXISTS "tenant_all_orders" ON public.orders;

-- 2. 이관 수주받은 지점도 해당 주문을 조회 및 수정할 수 있도록 허용하는 RLS 정책 생성
CREATE POLICY "Tenants manage own orders" ON public.orders
FOR ALL USING (
  tenant_id = public.get_auth_user_tenant_id()
  OR (
    transfer_info IS NOT NULL 
    AND (
      (transfer_info->>'processBranchId') = public.get_auth_user_tenant_id()::text
      OR (transfer_info->>'process_branch_id') = public.get_auth_user_tenant_id()::text
    )
    AND (transfer_info->>'status') IN ('pending', 'accepted', 'completed')
  )
);
