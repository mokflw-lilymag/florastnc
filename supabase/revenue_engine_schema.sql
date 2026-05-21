-- =============================================================================
-- Floxync Revenue Engine — Phase 0 Schema
-- Attribution · Campaigns · Anniversaries · Auto-Pilot · Drafts
--
-- 사전 요구: public.tenants, public.orders, public.customers,
--            public.get_auth_user_tenant_id(), public.is_super_admin()
--
-- 적용: Supabase SQL Editor → 전체 실행
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. marketing_campaigns — Floxync가 실행한 매출 캠페인 단위
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  campaign_code TEXT NOT NULL,
  campaign_type TEXT NOT NULL CHECK (
    campaign_type IN (
      'anniversary_d7',
      'order_followup_d1',
      'order_followup_d7',
      'order_followup_d30',
      'flash_sale',
      'sns_instagram',
      'sns_naver',
      'sns_copy',
      'alimtalk',
      'sms',
      'other'
    )
  ),
  channel TEXT NOT NULL DEFAULT 'alimtalk' CHECK (
    channel IN ('alimtalk', 'sms', 'instagram', 'naver_blog', 'copy', 'push', 'other')
  ),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'scheduled', 'sent', 'published', 'degraded', 'failed', 'cancelled')
  ),
  title TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  attribution_link TEXT,
  expected_revenue NUMERIC(14, 2) DEFAULT 0,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, campaign_code)
);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_tenant
  ON public.marketing_campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_type_status
  ON public.marketing_campaigns(tenant_id, campaign_type, status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_scheduled
  ON public.marketing_campaigns(scheduled_at)
  WHERE scheduled_at IS NOT NULL;

COMMENT ON TABLE public.marketing_campaigns IS
  'Floxync 매출 캠페인. campaign_code = Attribution·UTM 식별자.';

-- ---------------------------------------------------------------------------
-- 2. marketing_attributions — 캠페인 → 주문 귀속 (증분 매출)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  attributed_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'KRW',
  attribution_window_days INT NOT NULL DEFAULT 7,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  matched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_attributions_tenant
  ON public.marketing_attributions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_marketing_attributions_campaign
  ON public.marketing_attributions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_marketing_attributions_order
  ON public.marketing_attributions(order_id)
  WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_marketing_attributions_matched
  ON public.marketing_attributions(tenant_id, matched_at DESC);

COMMENT ON TABLE public.marketing_attributions IS
  'Floxync 귀속 매출. 북극성 KPI 집계의 핵심 테이블.';

-- ---------------------------------------------------------------------------
-- 3. customer_anniversaries — 기념일 (Phase 1 Trigger 입력)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_anniversaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT '기념일',
  anniversary_date DATE NOT NULL,
  recurring_yearly BOOLEAN NOT NULL DEFAULT true,
  preferred_flowers TEXT,
  allergies TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_anniversaries_tenant
  ON public.customer_anniversaries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_anniversaries_date
  ON public.customer_anniversaries(tenant_id, anniversary_date);

-- ---------------------------------------------------------------------------
-- 4. revenue_autopilot_settings — 테넌트 Auto-Pilot 스위치
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.revenue_autopilot_settings (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  anniversary_autopilot BOOLEAN NOT NULL DEFAULT false,
  order_followup_autopilot BOOLEAN NOT NULL DEFAULT false,
  sns_autopilot BOOLEAN NOT NULL DEFAULT false,
  flash_autopilot BOOLEAN NOT NULL DEFAULT false,
  sns_requires_approval BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.revenue_autopilot_settings IS
  '매장별 Auto-Pilot ON/OFF. Phase 1 UI에서 토글.';

-- ---------------------------------------------------------------------------
-- 5. marketing_drafts — AI 초안 (인스타 캡션 · 네이버 블로그)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL,
  draft_type TEXT NOT NULL CHECK (
    draft_type IN ('instagram_caption', 'naver_blog', 'flash_copy', 'alimtalk', 'other')
  ),
  title TEXT,
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (
    status IN ('draft', 'ready', 'copied', 'published', 'archived')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_drafts_tenant
  ON public.marketing_drafts(tenant_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 6. customers.marketing_consent (Phase 1 Compliance)
-- ---------------------------------------------------------------------------
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.customers.marketing_consent IS
  '마케팅·기념일 알림 수신 동의 (opt-in).';

-- ---------------------------------------------------------------------------
-- 7. orders.attribution_campaign_id (선택적 역참조)
-- ---------------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS attribution_campaign_id UUID
    REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_attribution_campaign
  ON public.orders(attribution_campaign_id)
  WHERE attribution_campaign_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 8. platform_config seed keys (문서용 — 값은 Admin UI에서 설정)
-- ---------------------------------------------------------------------------
-- revenue_integrations: {
--   "postiz_api_url": "https://postiz.example.com",
--   "postiz_api_key_set": true,
--   "trigger_project_ref": "proj_xxx",
--   "trigger_env": "PRODUCTION",
--   "n8n_deprecated": true
-- }

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_anniversaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_autopilot_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_drafts ENABLE ROW LEVEL SECURITY;

-- marketing_campaigns
DROP POLICY IF EXISTS "Tenants manage own marketing_campaigns" ON public.marketing_campaigns;
CREATE POLICY "Tenants manage own marketing_campaigns"
  ON public.marketing_campaigns FOR ALL TO authenticated
  USING (tenant_id = public.get_auth_user_tenant_id())
  WITH CHECK (tenant_id = public.get_auth_user_tenant_id());

DROP POLICY IF EXISTS "Super admin marketing_campaigns" ON public.marketing_campaigns;
CREATE POLICY "Super admin marketing_campaigns"
  ON public.marketing_campaigns FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- marketing_attributions
DROP POLICY IF EXISTS "Tenants manage own marketing_attributions" ON public.marketing_attributions;
CREATE POLICY "Tenants manage own marketing_attributions"
  ON public.marketing_attributions FOR ALL TO authenticated
  USING (tenant_id = public.get_auth_user_tenant_id())
  WITH CHECK (tenant_id = public.get_auth_user_tenant_id());

DROP POLICY IF EXISTS "Super admin marketing_attributions" ON public.marketing_attributions;
CREATE POLICY "Super admin marketing_attributions"
  ON public.marketing_attributions FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- customer_anniversaries
DROP POLICY IF EXISTS "Tenants manage own customer_anniversaries" ON public.customer_anniversaries;
CREATE POLICY "Tenants manage own customer_anniversaries"
  ON public.customer_anniversaries FOR ALL TO authenticated
  USING (tenant_id = public.get_auth_user_tenant_id())
  WITH CHECK (tenant_id = public.get_auth_user_tenant_id());

DROP POLICY IF EXISTS "Super admin customer_anniversaries" ON public.customer_anniversaries;
CREATE POLICY "Super admin customer_anniversaries"
  ON public.customer_anniversaries FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- revenue_autopilot_settings
DROP POLICY IF EXISTS "Tenants manage own revenue_autopilot_settings" ON public.revenue_autopilot_settings;
CREATE POLICY "Tenants manage own revenue_autopilot_settings"
  ON public.revenue_autopilot_settings FOR ALL TO authenticated
  USING (tenant_id = public.get_auth_user_tenant_id())
  WITH CHECK (tenant_id = public.get_auth_user_tenant_id());

DROP POLICY IF EXISTS "Super admin revenue_autopilot_settings" ON public.revenue_autopilot_settings;
CREATE POLICY "Super admin revenue_autopilot_settings"
  ON public.revenue_autopilot_settings FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- marketing_drafts
DROP POLICY IF EXISTS "Tenants manage own marketing_drafts" ON public.marketing_drafts;
CREATE POLICY "Tenants manage own marketing_drafts"
  ON public.marketing_drafts FOR ALL TO authenticated
  USING (tenant_id = public.get_auth_user_tenant_id())
  WITH CHECK (tenant_id = public.get_auth_user_tenant_id());

DROP POLICY IF EXISTS "Super admin marketing_drafts" ON public.marketing_drafts;
CREATE POLICY "Super admin marketing_drafts"
  ON public.marketing_drafts FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- updated_at triggers (reuse if exists)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_marketing_campaigns_updated ON public.marketing_campaigns;
CREATE TRIGGER trg_marketing_campaigns_updated
  BEFORE UPDATE ON public.marketing_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_customer_anniversaries_updated ON public.customer_anniversaries;
CREATE TRIGGER trg_customer_anniversaries_updated
  BEFORE UPDATE ON public.customer_anniversaries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_marketing_drafts_updated ON public.marketing_drafts;
CREATE TRIGGER trg_marketing_drafts_updated
  BEFORE UPDATE ON public.marketing_drafts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_revenue_autopilot_settings_updated ON public.revenue_autopilot_settings;
CREATE TRIGGER trg_revenue_autopilot_settings_updated
  BEFORE UPDATE ON public.revenue_autopilot_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Phase 1 extensions — 메시지 템플릿 · 페르소나 · 홍보 주제
-- ---------------------------------------------------------------------------
ALTER TABLE public.revenue_autopilot_settings
  ADD COLUMN IF NOT EXISTS message_templates JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.revenue_autopilot_settings
  ADD COLUMN IF NOT EXISTS marketing_persona TEXT;

ALTER TABLE public.revenue_autopilot_settings
  ADD COLUMN IF NOT EXISTS promo_topics JSONB NOT NULL DEFAULT '["기념일 꽃다발","감사 선물","계절 추천 꽃"]'::jsonb;

COMMENT ON COLUMN public.revenue_autopilot_settings.message_templates IS
  '커스텀 메시지 템플릿. 키: anniversary_d7, order_followup_d1|d7|d30';

-- platform_config seed (수퍼관리자 UI에서 설정)
-- revenue_coupon_limits: {
--   "max_campaigns_per_customer_per_month": 8,
--   "max_expected_revenue_krw": 500000,
--   "min_resend_interval_days": 3
-- }

-- ---------------------------------------------------------------------------
-- Phase 2 — Postiz 연동 · SNS 예약 게시
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_postiz_integrations (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  postiz_integration_id TEXT,
  instagram_connected BOOLEAN NOT NULL DEFAULT false,
  channel_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  connected_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketing_scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'instagram',
  title TEXT,
  content TEXT NOT NULL,
  media_url TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (
    status IN ('pending_approval', 'approved', 'published', 'failed', 'cancelled')
  ),
  postiz_post_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_scheduled_posts_tenant
  ON public.marketing_scheduled_posts(tenant_id, scheduled_at DESC);

ALTER TABLE public.tenant_postiz_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_scheduled_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenants manage own tenant_postiz_integrations" ON public.tenant_postiz_integrations;
CREATE POLICY "Tenants manage own tenant_postiz_integrations"
  ON public.tenant_postiz_integrations FOR ALL TO authenticated
  USING (tenant_id = public.get_auth_user_tenant_id())
  WITH CHECK (tenant_id = public.get_auth_user_tenant_id());

DROP POLICY IF EXISTS "Super admin tenant_postiz_integrations" ON public.tenant_postiz_integrations;
CREATE POLICY "Super admin tenant_postiz_integrations"
  ON public.tenant_postiz_integrations FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Tenants manage own marketing_scheduled_posts" ON public.marketing_scheduled_posts;
CREATE POLICY "Tenants manage own marketing_scheduled_posts"
  ON public.marketing_scheduled_posts FOR ALL TO authenticated
  USING (tenant_id = public.get_auth_user_tenant_id())
  WITH CHECK (tenant_id = public.get_auth_user_tenant_id());

DROP POLICY IF EXISTS "Super admin marketing_scheduled_posts" ON public.marketing_scheduled_posts;
CREATE POLICY "Super admin marketing_scheduled_posts"
  ON public.marketing_scheduled_posts FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP TRIGGER IF EXISTS trg_tenant_postiz_integrations_updated ON public.tenant_postiz_integrations;
CREATE TRIGGER trg_tenant_postiz_integrations_updated
  BEFORE UPDATE ON public.tenant_postiz_integrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_marketing_scheduled_posts_updated ON public.marketing_scheduled_posts;
CREATE TRIGGER trg_marketing_scheduled_posts_updated
  BEFORE UPDATE ON public.marketing_scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
