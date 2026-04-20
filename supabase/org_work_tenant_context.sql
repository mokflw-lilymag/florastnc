-- =============================================================================
-- 본사(org_admin) 지점 업무 컨텍스트: profiles.org_work_tenant_id
-- organization_schema.sql 적용 후 Supabase SQL Editor에서 실행
-- get_auth_user_tenant_id() 가 업무 중인 지점을 반환 → 기존 RLS 대부분 동작
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS org_work_tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_org_work_tenant_id ON public.profiles(org_work_tenant_id);

COMMENT ON COLUMN public.profiles.org_work_tenant_id IS '본사 계정이 특정 소속 지점 업무 화면으로 전환할 때 사용. NULL이면 홈 테넌트(tenant_id) 기준.';

-- 유효성: super_admin 은 존재하는 tenant면 허용. 그 외는 organization_members 소속 조직의 지점만 (profiles.role 무관)
CREATE OR REPLACE FUNCTION public.profiles_validate_org_work_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.org_work_tenant_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = NEW.org_work_tenant_id) THEN
    RAISE EXCEPTION 'org_work_tenant_id: tenant not found';
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id AND role = 'super_admin') THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.tenants t
    INNER JOIN public.organization_members om ON om.organization_id = t.organization_id
    WHERE t.id = NEW.org_work_tenant_id
      AND om.user_id = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'org_work_tenant_id: not allowed for this user';
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_org_work_tenant ON public.profiles;
CREATE TRIGGER trg_profiles_org_work_tenant
  BEFORE UPDATE OF org_work_tenant_id ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.profiles_validate_org_work_tenant();

-- 업무 테넌트 우선 (트리거로 잘못된 값 차단)
CREATE OR REPLACE FUNCTION public.get_auth_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT org_work_tenant_id FROM public.profiles WHERE id = auth.uid()),
    (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );
$$;

-- 포인트: profiles.tenant_id 직접 비교 → 업무 컨텍스트 반영
DROP POLICY IF EXISTS "Point transactions are viewable by tenant" ON public.point_transactions;
CREATE POLICY "Point transactions are viewable by tenant" ON public.point_transactions
  FOR SELECT USING (tenant_id = public.get_auth_user_tenant_id());

DROP POLICY IF EXISTS "Point transactions are insertable by tenant members" ON public.point_transactions;
CREATE POLICY "Point transactions are insertable by tenant members" ON public.point_transactions
  FOR INSERT WITH CHECK (tenant_id = public.get_auth_user_tenant_id());

-- Storage: receipts / chat_attachments 경로 = 업무 테넌트
DROP POLICY IF EXISTS "storage_receipts_tenant" ON storage.objects;
CREATE POLICY "storage_receipts_tenant"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'receipts'
  AND split_part(name, '/', 1) = public.get_auth_user_tenant_id()::text
)
WITH CHECK (
  bucket_id = 'receipts'
  AND split_part(name, '/', 1) = public.get_auth_user_tenant_id()::text
);

DROP POLICY IF EXISTS "storage_chat_attachments_tenant" ON storage.objects;
CREATE POLICY "storage_chat_attachments_tenant"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'chat_attachments'
  AND split_part(name, '/', 1) = public.get_auth_user_tenant_id()::text
)
WITH CHECK (
  bucket_id = 'chat_attachments'
  AND split_part(name, '/', 1) = public.get_auth_user_tenant_id()::text
);
