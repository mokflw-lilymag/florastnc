-- 포인트 트랜잭션 테이블 (이력 관리 전용)
CREATE TABLE IF NOT EXISTS point_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,          -- 양수(적립), 음수(차감)
    type TEXT NOT NULL,                -- 'earn' | 'use' | 'cancel' | 'manual'
    source TEXT NOT NULL,              -- 'pos' | 'order' | 'system' | 'manual'
    description TEXT,                  -- 상세 사유 (예: "POS 결제 적립 - TEST-1234")
    related_id UUID,                   -- 연관된 주문 ID 등 (선택)
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS 정책 설정
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Point transactions are viewable by tenant" ON point_transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.tenant_id = point_transactions.tenant_id
        )
    );

CREATE POLICY "Point transactions are insertable by tenant members" ON point_transactions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.tenant_id = point_transactions.tenant_id
        )
    );

-- 인덱스 생성 (조회 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_point_tx_customer ON point_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_point_tx_tenant ON point_transactions(tenant_id);
