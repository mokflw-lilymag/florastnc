-- Migration to update handle_new_user for Referral System and auto-generate referral code for tenants

-- 1. Function to auto-generate referral code for tenants
CREATE OR REPLACE FUNCTION public.set_tenant_referral_code()
RETURNS trigger AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    -- Generate a simple 6-character uppercase code based on uuid
    NEW.referral_code := UPPER(SUBSTRING(MD5(NEW.id::text) FROM 1 FOR 6));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger on tenants to set referral code
DROP TRIGGER IF EXISTS trg_set_tenant_referral_code ON public.tenants;
CREATE TRIGGER trg_set_tenant_referral_code
  BEFORE INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_tenant_referral_code();

-- 2.5 Backfill existing tenants
UPDATE public.tenants 
SET referral_code = UPPER(SUBSTRING(MD5(id::text) FROM 1 FOR 6)) 
WHERE referral_code IS NULL;

-- 3. Update handle_new_user to process referrals
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_tenant_id UUID;
  v_role TEXT;
  v_shop_name TEXT;
  v_referred_by_code TEXT;
  v_referrer_tenant_id UUID;
  v_referrer_bonus_months INT := 1;
  v_referee_bonus_months INT := 1;
BEGIN
  -- 클라이언트에서 넘겨준 메타데이터 추출
  v_shop_name := new.raw_user_meta_data->>'shop_name';
  v_referred_by_code := new.raw_user_meta_data->>'referred_by_code';
  
  -- ✅ 요청하신 최고 관리자 이메일 하드코딩 지정
  IF lower(new.email) IN ('lilymag0301@gmail.com', 'mokflw@gmail.com') THEN
    v_role := 'super_admin';
  ELSIF new.raw_user_meta_data->>'role' IS NOT NULL THEN
    -- Admin API 등으로 강제 주입된 role이 있다면 우선 사용 (예: tenant_staff)
    v_role := new.raw_user_meta_data->>'role';
  ELSE
    v_role := 'tenant_admin';
  END IF;

  -- 상호명(shop_name)이 있다면, 새로운 구독자(Tenant)를 자동 생성 (최고관리자는 테넌트 없이 가입 가능)
  IF v_shop_name IS NOT NULL THEN
    INSERT INTO public.tenants (name) VALUES (v_shop_name) RETURNING id INTO v_tenant_id;
  ELSIF new.raw_user_meta_data->>'tenant_id' IS NOT NULL THEN
    -- 직원 생성 시 tenant_id를 강제로 주입받음
    v_tenant_id := (new.raw_user_meta_data->>'tenant_id')::uuid;
  END IF;

  -- 프로필 생성
  INSERT INTO public.profiles (id, email, tenant_id, role)
  VALUES (new.id, new.email, v_tenant_id, v_role);

  -- 추천인 처리 로직 (새로운 테넌트를 생성한 경우에만 적용)
  IF v_shop_name IS NOT NULL AND v_referred_by_code IS NOT NULL THEN
    -- 초대자 테넌트 찾기 (추천인 코드 혹은 이메일로 검색)
    SELECT t.id INTO v_referrer_tenant_id 
    FROM public.tenants t
    LEFT JOIN public.profiles p ON p.tenant_id = t.id
    WHERE t.referral_code = UPPER(v_referred_by_code)
       OR p.email = lower(v_referred_by_code)
    LIMIT 1;
    
    IF v_referrer_tenant_id IS NOT NULL THEN
      -- 테넌트 테이블에 추천인 저장
      UPDATE public.tenants 
      SET referred_by = v_referred_by_code 
      WHERE id = v_tenant_id;

      -- Referral Log 저장 (보상 미지급 상태로 대기)
      INSERT INTO public.referral_logs (referrer_tenant_id, referred_tenant_id, reward_granted, reward_type)
      VALUES (v_referrer_tenant_id, v_tenant_id, false, 'month_extension');
    END IF;
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
