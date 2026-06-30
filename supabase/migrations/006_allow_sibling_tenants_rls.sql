-- Allow tenants within the same organization to view/select each other
-- This resolves the RLS issue where branch owners couldn't load sibling tenants for order transfers.

CREATE OR REPLACE FUNCTION public.get_auth_user_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM public.tenants 
  WHERE id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

DROP POLICY IF EXISTS "Allow tenants within same organization to select each other" ON public.tenants;
CREATE POLICY "Allow tenants within same organization to select each other" ON public.tenants
  FOR SELECT TO authenticated
  USING (
    organization_id IS NOT NULL 
    AND organization_id = public.get_auth_user_org_id()
  );
