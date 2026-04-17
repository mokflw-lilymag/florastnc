-- ==============================================================================
-- FloraSync SaaS - Marketing & AI Promotion Schema
-- ==============================================================================

-- 1. 매장 마케팅 설정 테이블 (Shop Settings)
CREATE TABLE IF NOT EXISTS public.shop_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    auto_pilot_enabled BOOLEAN DEFAULT false,
    store_persona TEXT DEFAULT 'Trendy & Hip',
    marketing_theme TEXT DEFAULT '', -- 콤마로 구분된 테마 문자열
    target_platforms JSONB DEFAULT '[]'::jsonb, -- ['instagram', 'youtube', ...]
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id)
);

-- 2. SNS 인증 정보 테이블 (User Credentials)
CREATE TABLE IF NOT EXISTS public.user_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL, -- 'instagram', 'youtube', 'naver', 'tiktok'
    access_token TEXT,      -- 실제 연동 시 발급받을 토큰 (암호화 필요)
    refresh_token TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, provider)
);

-- RLS 활성화
ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can manage their own shop_settings" ON public.shop_settings;
CREATE POLICY "Users can manage their own shop_settings" 
    ON public.shop_settings FOR ALL 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own user_credentials" ON public.user_credentials;
CREATE POLICY "Users can manage their own user_credentials" 
    ON public.user_credentials FOR ALL 
    USING (auth.uid() = user_id);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_shop_settings_user_id ON public.shop_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_credentials_user_id ON public.user_credentials(user_id);
