-- 상품 삭제가 RLS 때문에 막히는 경우: 테넌트·슈퍼어드민 DELETE 허용
-- (이미 동일 정책이 있으면 DROP 후 재생성)

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenants delete own products" ON public.products;
CREATE POLICY "Tenants delete own products" ON public.products
  FOR DELETE
  USING (tenant_id = public.get_auth_user_tenant_id());

DROP POLICY IF EXISTS "Super admins delete all products" ON public.products;
CREATE POLICY "Super admins delete all products" ON public.products
  FOR DELETE
  USING (public.is_super_admin());
