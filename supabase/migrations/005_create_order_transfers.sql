-- Floxync Order Transfers Table Migration

CREATE TABLE IF NOT EXISTS public.order_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    order_branch_id UUID NOT NULL REFERENCES public.tenants(id),
    order_branch_name TEXT NOT NULL,
    process_branch_id UUID NOT NULL REFERENCES public.tenants(id),
    process_branch_name TEXT NOT NULL,
    transfer_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    transfer_reason TEXT,
    transfer_by UUID REFERENCES auth.users(id),
    transfer_by_user TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'completed', 'cancelled'
    amount_split JSONB NOT NULL DEFAULT '{"orderBranch": 100, "processBranch": 0}'::jsonb,
    original_order_amount BIGINT NOT NULL DEFAULT 0,
    notes TEXT,
    accepted_at TIMESTAMP WITH TIME ZONE,
    accepted_by UUID REFERENCES auth.users(id),
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejected_by UUID REFERENCES auth.users(id),
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID REFERENCES auth.users(id),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancelled_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE public.order_transfers ENABLE ROW LEVEL SECURITY;

-- 정책 생성 (편의상 인증된 모든 사용자에게 CRUD 허용하되 비즈니스 상 제어는 클라이언트/API에서 수행)
DROP POLICY IF EXISTS "order_transfers_select_policy" ON public.order_transfers;
CREATE POLICY "order_transfers_select_policy" ON public.order_transfers
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "order_transfers_all_policy" ON public.order_transfers;
CREATE POLICY "order_transfers_all_policy" ON public.order_transfers
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
