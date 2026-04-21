-- ==============================================================================
-- Floxync SaaS - Delivery Booking Schema Extensions
-- ==============================================================================

-- 1. 매장별 배달 설정(Store Settings) 테이블 생성
-- 각 매장(tenant)별 카카오T API 키 및 자동화 설정을 저장
CREATE TABLE IF NOT EXISTS public.store_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    -- 카카오T 연동 정보 (추후 Oauth 토큰 또는 파트너스 API Key)
    kakaot_api_key TEXT,
    kakaot_business_id TEXT,
    
    -- 자동 배송 설정 플래그
    auto_delivery_booking BOOLEAN DEFAULT false,
    
    -- 기본 등록 결제수단 (카드 ID 등)
    default_payment_method_id TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE (tenant_id)
);

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- 정책: 관리자는 전부 접근, 테넌트 관리자는 자기 것만 접근
DROP POLICY IF EXISTS "Super Admins can access all store settings" ON public.store_settings;
CREATE POLICY "Super Admins can access all store settings" ON public.store_settings FOR ALL USING (public.is_super_admin());

DROP POLICY IF EXISTS "Tenants can manage their own settings" ON public.store_settings;
CREATE POLICY "Tenants can manage their own settings" ON public.store_settings FOR ALL USING (tenant_id = public.get_auth_user_tenant_id());


-- 2. Orders 테이블 기능 확장 (배달 API 관련 컬럼)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS delivery_provider TEXT,               -- 'kakao_t', 'manual' 등 외부 프로바이더 이름
ADD COLUMN IF NOT EXISTS delivery_tracking_id TEXT,            -- 외부 배달 서비스에서 발급한 Tracking ID(배차 번호)
ADD COLUMN IF NOT EXISTS delivery_provider_status TEXT,        -- 'pending', 'assigned', 'picked_up', 'delivered', 'failed' 등
ADD COLUMN IF NOT EXISTS delivery_provider_fee NUMERIC(10, 2), -- 픽스된 배달 비용
ADD COLUMN IF NOT EXISTS delivery_tracking_url TEXT;           -- 기사 실시간 추적 URL


-- 3. Webhook 처리를 위한 트리거 또는 Edge Function 연동 준비
-- (참고: Edge Function 배포 후 해당 엔드포인트를 카카오T 관리자 센터의 웹훅 URL로 등록합니다.)

-- 완료
