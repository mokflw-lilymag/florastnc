-- Add stripe_payment_method_id to tenants for off-session billing
ALTER TABLE public.tenants
ADD COLUMN stripe_payment_method_id text;
