-- 1. Auto-billing & Referral fields for tenants
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS auto_billing_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS toss_billing_key text,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS next_billing_date timestamptz,
ADD COLUMN IF NOT EXISTS period text,
ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by text;

-- 2. Referral Logs Table
CREATE TABLE IF NOT EXISTS public.referral_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
    referred_tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    reward_granted boolean DEFAULT false,
    reward_type text,
    created_at timestamptz DEFAULT now()
);

-- RLS for referral_logs
ALTER TABLE public.referral_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view their own referrals"
    ON public.referral_logs
    FOR SELECT
    USING (
      referrer_tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()) 
      OR 
      referred_tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    );
