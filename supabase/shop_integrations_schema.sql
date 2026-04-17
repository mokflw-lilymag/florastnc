-- 외부 쇼핑몰 연동(API 키 관리) 테이블 생성 스크립트

-- 기존 테이블이 있다면 안전하게 삭제 (개발 환경 편의용)
DROP TABLE IF EXISTS public.shop_integrations;

CREATE TABLE public.shop_integrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id UUID NOT NULL, -- 꽃집(tenant) 고유 식별자 임시로 UUID
    platform VARCHAR(50) NOT NULL, -- 'naver_commerce', 'cafe24' 등
    client_id VARCHAR(255) NOT NULL, -- 외부 쇼핑몰에서 발급받은 Public Key
    client_secret TEXT NOT NULL, -- 외부 쇼핑몰에서 발급받은 Secret Key
    is_active BOOLEAN DEFAULT false, -- 연동 활성화 상태
    last_sync_at TIMESTAMP WITH TIME ZONE, -- 마지막으로 주문을 가져온 시간
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(shop_id, platform) -- 한 상점당 네이버 하나, 카페24 하나만 등록되도록 제한
);

-- RLS (Row Level Security) 설정
ALTER TABLE public.shop_integrations ENABLE ROW LEVEL SECURITY;

-- 사장님은 본인 꽃집의 연동 정보만 보고 수정할 수 있도록 정책 생성
CREATE POLICY "Select own shop integrations" 
ON public.shop_integrations FOR SELECT 
TO authenticated 
USING (shop_id = auth.uid()); -- 실제 Auth 스키마 연동 시 수정 필요

CREATE POLICY "Insert own shop integrations" 
ON public.shop_integrations FOR INSERT 
TO authenticated 
WITH CHECK (shop_id = auth.uid());

CREATE POLICY "Update own shop integrations" 
ON public.shop_integrations FOR UPDATE 
TO authenticated 
USING (shop_id = auth.uid());

-- 업데이트 트리거 (updated_at 자동 갱신)
-- CREATE OR REPLACE FUNCTION update_modified_column()
-- RETURNS TRIGGER AS $$
-- BEGIN
--    NEW.updated_at = now();
--    RETURN NEW;
-- END;
-- $$ language 'plpgsql';

-- CREATE TRIGGER update_shop_integrations_modtime
-- BEFORE UPDATE ON public.shop_integrations
-- FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- 초기 테스트용 더미 데이터 삽입
-- INSERT INTO public.shop_integrations (shop_id, platform, client_id, client_secret, is_active)
-- VALUES ('550e8400-e29b-41d4-a716-446655440000', 'naver_commerce', 'test_naver_client_123', 'test_naver_secret_xyz', true);
