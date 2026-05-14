-- 디자인 스튜디오 갤러리 — 파일 업로드 지원 확장
-- 적용: Supabase SQL Editor 에 전체 복사·붙여넣기 후 RUN
--
-- 1) design_gallery_assets 에 thumb_url 컬럼 추가 (기존 행은 NULL 허용 — 화면용 폴백은 image_url)
-- 2) Storage 버킷 'design_gallery' 생성 + 정책 (모두 SELECT 가능, 슈퍼관리자만 INSERT/UPDATE/DELETE)
--    ※ Service Role(관리자 API)로는 RLS를 우회하므로 별도 정책 필요 X — 일반 사용자 SELECT만 정책으로 허용
-- 3) 기존 design_gallery 행에 대한 호환 (변경 없음)

-- (1) 컬럼 추가 (idempotent)
ALTER TABLE public.design_gallery_assets
  ADD COLUMN IF NOT EXISTS thumb_url TEXT;

COMMENT ON COLUMN public.design_gallery_assets.thumb_url IS
  '목록·미리보기용 저용량 썸네일 URL (WebP, 긴 변 600px). NULL 이면 image_url 로 폴백.';

-- (2) Storage 버킷 생성 — 이미 있으면 무시
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'design_gallery',
  'design_gallery',
  true,                                     -- 모든 매장에서 보는 공통 카탈로그 → public 권장
  10 * 1024 * 1024,                         -- 클라이언트가 압축해서 보내므로 1장당 10MB면 충분
  ARRAY['image/jpeg','image/webp','image/png']
)
ON CONFLICT (id) DO NOTHING;

-- (3) Storage 정책 — 객체 SELECT 만 인증 사용자에게 허용 (쓰기는 Service Role 만 사용)
DROP POLICY IF EXISTS "design_gallery_objects_select_auth" ON storage.objects;
CREATE POLICY "design_gallery_objects_select_auth"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'design_gallery');

-- public 버킷이라 익명에도 GET URL 이 열려 있지만, listing 등은 인증된 사용자에게만:
DROP POLICY IF EXISTS "design_gallery_objects_select_anon" ON storage.objects;
CREATE POLICY "design_gallery_objects_select_anon"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'design_gallery');

-- 쓰기 (INSERT/UPDATE/DELETE) 는 어떤 정책도 만들지 않음 → Service Role 만 가능
