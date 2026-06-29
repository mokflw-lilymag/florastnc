-- 구독·결제 이력 (실결제 + 수퍼관리자 수동 부여)
-- Supabase SQL Editor에서 한 번 실행.

CREATE TABLE IF NOT EXISTS public.tenant_subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('payment', 'admin_grant')),
  source TEXT NOT NULL CHECK (source IN ('toss', 'stripe', 'admin')),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  plan_before TEXT,
  plan_after TEXT,
  period TEXT,
  months_granted INTEGER,
  amount_cents INTEGER,
  currency TEXT,
  subscription_end_before TIMESTAMPTZ,
  subscription_end_after TIMESTAMPTZ,
  reason TEXT,
  external_ref TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_subscription_events_external_ref
  ON public.tenant_subscription_events(external_ref)
  WHERE external_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tenant_subscription_events_tenant_created
  ON public.tenant_subscription_events(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tenant_subscription_events_created
  ON public.tenant_subscription_events(created_at DESC);

ALTER TABLE public.tenant_subscription_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins read subscription events" ON public.tenant_subscription_events;
CREATE POLICY "Super admins read subscription events"
  ON public.tenant_subscription_events FOR SELECT
  USING (public.is_super_admin());

COMMENT ON TABLE public.tenant_subscription_events IS '테넌트 구독 실결제·관리자 수동 부여 감사 이력';
