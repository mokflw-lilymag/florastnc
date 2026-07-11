-- Phase 2: 급여·휴가 (정직원/파트타임/프리랜서, 4대보험, 주휴수당)

CREATE TABLE IF NOT EXISTS public.staff_financials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  staff_id uuid NOT NULL REFERENCES public.tenant_staff(id) ON DELETE CASCADE,
  employment_type text NOT NULL DEFAULT '정직원'
    CHECK (employment_type IN ('정직원', '파트타임', '프리랜서')),
  salary_type text NOT NULL DEFAULT '월급'
    CHECK (salary_type IN ('월급', '시급')),
  base_salary numeric NOT NULL DEFAULT 0,
  meal_allowance_monthly numeric NOT NULL DEFAULT 200000,
  insurance_national_pension boolean NOT NULL DEFAULT true,
  insurance_health boolean NOT NULL DEFAULT true,
  insurance_employment boolean NOT NULL DEFAULT true,
  bank_name text,
  account_number text,
  tax_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, staff_id)
);

CREATE TABLE IF NOT EXISTS public.staff_salary_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  staff_id uuid NOT NULL REFERENCES public.tenant_staff(id) ON DELETE CASCADE,
  payment_year_month text NOT NULL,
  employment_type text NOT NULL,
  worked_minutes integer NOT NULL DEFAULT 0,
  weekly_holiday_minutes integer NOT NULL DEFAULT 0,
  base_pay numeric NOT NULL DEFAULT 0,
  overtime_pay numeric NOT NULL DEFAULT 0,
  weekly_holiday_pay numeric NOT NULL DEFAULT 0,
  meal_allowance numeric NOT NULL DEFAULT 0,
  other_allowance_name text,
  other_allowance numeric NOT NULL DEFAULT 0,
  gross_pay numeric NOT NULL DEFAULT 0,
  national_pension numeric NOT NULL DEFAULT 0,
  health_insurance numeric NOT NULL DEFAULT 0,
  long_term_care numeric NOT NULL DEFAULT 0,
  employment_insurance numeric NOT NULL DEFAULT 0,
  income_tax numeric NOT NULL DEFAULT 0,
  local_income_tax numeric NOT NULL DEFAULT 0,
  freelancer_tax numeric NOT NULL DEFAULT 0,
  total_deductions numeric NOT NULL DEFAULT 0,
  net_pay numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'sent')),
  emailed_at timestamptz,
  memo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, staff_id, payment_year_month)
);

CREATE TABLE IF NOT EXISTS public.staff_leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  staff_id uuid NOT NULL REFERENCES public.tenant_staff(id) ON DELETE CASCADE,
  leave_type text NOT NULL DEFAULT '연차'
    CHECK (leave_type IN ('연차', '반차', '병가', '무급', '기타')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  contact text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by uuid,
  approved_at timestamptz,
  reject_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_financials_tenant ON public.staff_financials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_salary_tenant_month ON public.staff_salary_statements(tenant_id, payment_year_month);
CREATE INDEX IF NOT EXISTS idx_staff_leave_tenant ON public.staff_leave_requests(tenant_id, status);

ALTER TABLE public.staff_financials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_salary_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admin manage staff_financials" ON public.staff_financials
  FOR ALL USING (
    tenant_id = public.get_auth_user_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('tenant_admin', 'super_admin', 'org_admin')
    )
  );

CREATE POLICY "Tenant read staff_financials" ON public.staff_financials
  FOR SELECT USING (tenant_id = public.get_auth_user_tenant_id());

CREATE POLICY "Tenant admin manage salary_statements" ON public.staff_salary_statements
  FOR ALL USING (
    tenant_id = public.get_auth_user_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('tenant_admin', 'super_admin', 'org_admin')
    )
  );

CREATE POLICY "Tenant read salary_statements" ON public.staff_salary_statements
  FOR SELECT USING (tenant_id = public.get_auth_user_tenant_id());

CREATE POLICY "Tenant manage leave_requests" ON public.staff_leave_requests
  FOR ALL USING (tenant_id = public.get_auth_user_tenant_id());

CREATE POLICY "Tenant read leave_requests" ON public.staff_leave_requests
  FOR SELECT USING (tenant_id = public.get_auth_user_tenant_id());
