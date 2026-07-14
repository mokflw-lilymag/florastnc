-- Add columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS memo_image_url TEXT,
ADD COLUMN IF NOT EXISTS memo_image_path TEXT;

-- Create order-memos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('order-memos', 'order-memos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for order-memos bucket
CREATE POLICY "Public Access for order-memos" ON storage.objects
FOR SELECT USING (bucket_id = 'order-memos');

CREATE POLICY "Authenticated Users can insert order-memos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'order-memos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated Users can update order-memos" ON storage.objects
FOR UPDATE USING (bucket_id = 'order-memos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated Users can delete order-memos" ON storage.objects
FOR DELETE USING (bucket_id = 'order-memos' AND auth.role() = 'authenticated');
