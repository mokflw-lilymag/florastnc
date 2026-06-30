-- Add transfer_info JSONB column to public.orders table
-- This holds metadata about branch order transfers.

ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS transfer_info JSONB;

COMMENT ON COLUMN public.orders.transfer_info IS '주문 지점 이관(수발주) 정보 메타데이터';
