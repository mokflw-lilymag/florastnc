-- =============================================================================
-- Supabase Storage: 앱에서 사용하는 버킷 생성 + RLS
-- 대시보드 SQL 편집기에서 한 번 실행하거나, 마이그레이션으로 적용하세요.
-- 오류: StorageApiError "Bucket not found" → 아래 buckets 가 없을 때 발생
-- =============================================================================

-- 1) 버킷 (공개 URL용 getPublicUrl 사용 시 public = true)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
  ('receipts', 'receipts', true, 52428800),
  ('chat_attachments', 'chat_attachments', true, 52428800),
  ('user-assets', 'user-assets', true, 52428800),
  ('org_announcements', 'org_announcements', true, 10485760)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;

-- 2) 기존 정책 제거 후 재생성 (재실행 안전)
DROP POLICY IF EXISTS "storage_receipts_tenant" ON storage.objects;
DROP POLICY IF EXISTS "storage_chat_attachments_tenant" ON storage.objects;
DROP POLICY IF EXISTS "storage_user_assets_uid" ON storage.objects;
DROP POLICY IF EXISTS "storage_org_announcements_public_read" ON storage.objects;
DROP POLICY IF EXISTS "storage_org_announcements_hq_upload" ON storage.objects;
DROP POLICY IF EXISTS "storage_org_announcements_hq_delete" ON storage.objects;

-- receipts: 경로 첫 세그먼트 = profiles.tenant_id (지출 영수증 등)
CREATE POLICY "storage_receipts_tenant"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'receipts'
  AND split_part(name, '/', 1) = (
    SELECT p.tenant_id::text FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1
  )
)
WITH CHECK (
  bucket_id = 'receipts'
  AND split_part(name, '/', 1) = (
    SELECT p.tenant_id::text FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1
  )
);

-- chat_attachments: 경로 첫 세그먼트 = tenant_id
CREATE POLICY "storage_chat_attachments_tenant"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'chat_attachments'
  AND split_part(name, '/', 1) = (
    SELECT p.tenant_id::text FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1
  )
)
WITH CHECK (
  bucket_id = 'chat_attachments'
  AND split_part(name, '/', 1) = (
    SELECT p.tenant_id::text FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1
  )
);

-- user-assets: 경로 첫 세그먼트 = auth.uid() (custom_fonts 등과 맞춤)
CREATE POLICY "storage_user_assets_uid"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'user-assets'
  AND split_part(name, '/', 1) = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'user-assets'
  AND split_part(name, '/', 1) = auth.uid()::text
);

-- org_announcements: 공개 읽기. 업로드·삭제는 본사(super / 해당 조직 org_admin) 세션으로만(API가 세션 클라이언트 사용).
CREATE POLICY "storage_org_announcements_public_read"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'org_announcements');

CREATE POLICY "storage_org_announcements_hq_upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'org_announcements'
  AND (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.organization_id::text = split_part(name, '/', 1)
        AND om.role = 'org_admin'
    )
  )
);

CREATE POLICY "storage_org_announcements_hq_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'org_announcements'
  AND (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.organization_id::text = split_part(name, '/', 1)
        AND om.role = 'org_admin'
    )
  )
);
