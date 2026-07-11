-- 년봉·보수 모델 (글로벌 급여 확장)
ALTER TABLE public.staff_financials
  ADD COLUMN IF NOT EXISTS compensation_model text NOT NULL DEFAULT 'annual'
    CHECK (compensation_model IN ('annual', 'monthly', 'hourly', 'project')),
  ADD COLUMN IF NOT EXISTS annual_salary numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.staff_financials.compensation_model IS 'annual=년봉, monthly=월급, hourly=시급, project=건당/프리랜서';
COMMENT ON COLUMN public.staff_financials.annual_salary IS '정직원 년봉 (KRW 등). 월 환산: floor(annual_salary/12)';
