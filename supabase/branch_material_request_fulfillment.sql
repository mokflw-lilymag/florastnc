-- =============================================================================
-- 자재 요청 입고 확정 → 지점 지출·재고 연동
-- branch_material_requests_schema.sql 적용 후 실행
-- =============================================================================

ALTER TABLE public.branch_material_requests
  ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMPTZ;

COMMENT ON COLUMN public.branch_material_requests.fulfilled_at IS '본사 입고·지출 확정 처리 시각';

-- expenses: 자재요청 건별 추적 (한 요청에 품목 수만큼 행이 생길 수 있음)
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS related_branch_material_request_id UUID REFERENCES public.branch_material_requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_branch_material_request
  ON public.expenses(related_branch_material_request_id)
  WHERE related_branch_material_request_id IS NOT NULL;

COMMENT ON COLUMN public.expenses.related_branch_material_request_id IS '지점→본사 자재 요청으로 자동 생성된 지출';
