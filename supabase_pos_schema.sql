-- ==============================================================================
-- FloraSync SaaS - POS Integration Schema
-- Phase 1: 기반 인프라
-- ==============================================================================

-- 1. POS 연동 설정 (매장별)
CREATE TABLE IF NOT EXISTS public.pos_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    pos_type TEXT NOT NULL CHECK (pos_type IN ('easycheck', 'toss', 'manual')),
    api_key TEXT,               -- 암호화 저장 권장
    api_secret TEXT,            -- 암호화 저장 권장
    store_code TEXT,            -- POS 측 매장 식별자
    webhook_secret TEXT,        -- Webhook HMAC-SHA256 검증 키
    is_active BOOLEAN DEFAULT true,
    auto_create_customer BOOLEAN DEFAULT false,  -- 비회원 자동 고객 등록 여부
    auto_point_rate NUMERIC(5,2) DEFAULT 1.0,    -- 포인트 적립률 (%)
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (tenant_id)
);

ALTER TABLE public.pos_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenants manage own pos_integrations" ON public.pos_integrations;
CREATE POLICY "Tenants manage own pos_integrations" ON public.pos_integrations
    FOR ALL USING (tenant_id = public.get_auth_user_tenant_id());

DROP POLICY IF EXISTS "Super admins access all pos_integrations" ON public.pos_integrations;
CREATE POLICY "Super admins access all pos_integrations" ON public.pos_integrations
    FOR ALL USING (public.is_super_admin());


-- 2. POS 원본 트랜잭션 로그 (롤백/감사용 원본 보존)
CREATE TABLE IF NOT EXISTS public.pos_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    pos_type TEXT NOT NULL,
    pos_transaction_id TEXT,            -- POS 측 고유 결제번호
    raw_payload JSONB NOT NULL,         -- 원본 Webhook 데이터 100% 보존
    mapped_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    matched_customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'mapped', 'failed', 'ignored', 'duplicate')),
    error_message TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (tenant_id, pos_transaction_id)  -- 중복 처리 방지
);

ALTER TABLE public.pos_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenants view own pos_transactions" ON public.pos_transactions;
CREATE POLICY "Tenants view own pos_transactions" ON public.pos_transactions
    FOR SELECT USING (tenant_id = public.get_auth_user_tenant_id());

DROP POLICY IF EXISTS "Super admins access all pos_transactions" ON public.pos_transactions;
CREATE POLICY "Super admins access all pos_transactions" ON public.pos_transactions
    FOR ALL USING (public.is_super_admin());


-- 3. orders 테이블에 POS 연동 출처 컬럼 추가
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'pos', 'online')),
    ADD COLUMN IF NOT EXISTS pos_transaction_id UUID REFERENCES public.pos_transactions(id) ON DELETE SET NULL;


-- 인덱스 (조회 성능)
CREATE INDEX IF NOT EXISTS idx_pos_transactions_tenant ON public.pos_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_status ON public.pos_transactions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_source ON public.orders(tenant_id, source);
