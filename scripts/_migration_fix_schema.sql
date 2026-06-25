-- Post-migration schema fixes (repo SQL overwrote some OpenAPI columns)
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS subscription_start TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS subscription_end TIMESTAMPTZ;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS can_receive_orders BOOLEAN DEFAULT false;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS partner_category TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS partner_description TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS partner_region TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS portfolio_url TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS portfolio_gdrive_id TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS gdrive_bouquet_id TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS gdrive_basket_id TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS gdrive_wreath_id TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS gdrive_plant_id TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS gdrive_orchid_id TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS gdrive_condolence_id TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS organization_id UUID;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS org_work_tenant_id UUID;

ALTER TABLE public.shop_integrations ADD COLUMN IF NOT EXISTS mall_id VARCHAR(255);
ALTER TABLE public.shop_integrations ADD COLUMN IF NOT EXISTS access_token TEXT;
ALTER TABLE public.shop_integrations ADD COLUMN IF NOT EXISTS refresh_token TEXT;

-- Tables with composite / missing PK from generator
DROP TABLE IF EXISTS public.organization_members CASCADE;
CREATE TABLE public.organization_members (
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'org_admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

DROP TABLE IF EXISTS public.user_roles CASCADE;
CREATE TABLE public.user_roles (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  email TEXT,
  role TEXT,
  permissions JSONB,
  branch_id TEXT,
  branch_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

DROP TABLE IF EXISTS public.system_settings CASCADE;
CREATE TABLE public.system_settings (
  tenant_id UUID PRIMARY KEY,
  settings JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
