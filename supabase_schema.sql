-- ==============================================================================
-- Florasync SaaS Core Schema Setup
-- ==============================================================================

-- 1. 확장 기능 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tenants (구독 화원) 테이블 생성
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    plan TEXT DEFAULT 'free', -- 'free' (Print Only), 'erp_only', 'pro' (Print + ERP)
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Profiles (SaaS 사용자) 테이블 생성
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE RESTRICT, -- ✅ 삭제 방지 (RESTRICT)로 변경
    role TEXT DEFAULT 'tenant_admin', -- 'super_admin', 'tenant_admin', 'tenant_user'
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- ✅ 제약 조건: super_admin 외에는 tenant_id가 반드시 있어야 함
    CONSTRAINT tenant_id_required_for_non_admins CHECK (
        (role = 'super_admin') OR (tenant_id IS NOT NULL)
    )
);

-- RLS (Row Level Security) 활성화
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Helper Functions for RLS (Security Definer to prevent infinite recursion)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_auth_user_tenant_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$;

-- 최고 관리자는 모든 테넌트를 볼 수 있고, 일반 사용자는 자기 테넌트만 볼 수 있음
DROP POLICY IF EXISTS "Super Admins can access all tenants" ON public.tenants;
CREATE POLICY "Super Admins can access all tenants" ON public.tenants FOR ALL USING (
  public.is_super_admin()
);
DROP POLICY IF EXISTS "Tenants can view their own tenant" ON public.tenants;
CREATE POLICY "Tenants can view their own tenant" ON public.tenants FOR SELECT USING (
  id = public.get_auth_user_tenant_id()
);

DROP POLICY IF EXISTS "Super Admins can access all profiles" ON public.profiles;
CREATE POLICY "Super Admins can access all profiles" ON public.profiles FOR ALL USING (
  public.is_super_admin()
);
DROP POLICY IF EXISTS "Users can view users in same tenant" ON public.profiles;
CREATE POLICY "Users can view users in same tenant" ON public.profiles FOR SELECT USING (
  tenant_id = public.get_auth_user_tenant_id() OR id = auth.uid()
);

-- 4. 회원가입 시 자동 프로필 및 테넌트 생성 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_tenant_id UUID;
  v_role TEXT;
  v_shop_name TEXT;
BEGIN
  -- 클라이언트에서 넘겨준 shop_name 추출
  v_shop_name := new.raw_user_meta_data->>'shop_name';
  
  -- ✅ 요청하신 최고 관리자 이메일 하드코딩 지정
  IF new.email = 'lilymag0301@gmail.com' THEN
    v_role := 'super_admin';
  ELSE
    v_role := 'tenant_admin';
  END IF;

  -- 상호명(shop_name)이 있다면, 새로운 구독자(Tenant)를 자동 생성 (최고관리자는 테넌트 없이 가입 가능)
  IF v_shop_name IS NOT NULL THEN
    INSERT INTO public.tenants (name) VALUES (v_shop_name) RETURNING id INTO v_tenant_id;
  END IF;

  -- 프로필 생성
  INSERT INTO public.profiles (id, email, tenant_id, role)
  VALUES (new.id, new.email, v_tenant_id, v_role);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger 부착
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 완료

-- 5. Printer 관련 테이블 (custom_fonts, custom_phrases, subscriptions)
CREATE TABLE IF NOT EXISTS public.custom_fonts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    font_family TEXT NOT NULL,
    source TEXT NOT NULL, -- 'web' | 'local'
    web_url TEXT,
    storage_path TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.custom_phrases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    text TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan TEXT NOT NULL, -- 'free', 'monthly', etc.
    status TEXT NOT NULL, -- 'active', 'expired', etc.
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Printer 테이블 RLS 활성화
ALTER TABLE public.custom_fonts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_phrases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Printer 테이블 RLS Policies (단순화: 본인 데이터만 접근)
DROP POLICY IF EXISTS users_manage_fonts ON public.custom_fonts;
CREATE POLICY users_manage_fonts ON public.custom_fonts FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS users_manage_phrases ON public.custom_phrases;
CREATE POLICY users_manage_phrases ON public.custom_phrases FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS users_view_subscriptions ON public.subscriptions;
CREATE POLICY users_view_subscriptions ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

-- 완료
