ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS gsheet_expenses_webhook_url TEXT; ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS gsheet_expenses_sheet_url TEXT;
