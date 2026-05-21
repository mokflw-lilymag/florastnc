-- 포인트 거래 직후 잔액 (히스토리 표시용)
ALTER TABLE point_transactions
  ADD COLUMN IF NOT EXISTS balance_after INTEGER;
