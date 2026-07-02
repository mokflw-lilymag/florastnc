-- Add receipt_url to expenses table
ALTER TABLE expenses ADD COLUMN receipt_url text;

-- Create storage bucket for receipts if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for the receipts bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'receipts' );

CREATE POLICY "Super Admins can insert receipts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'receipts' AND 
  (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('super_admin', '본사 관리자')))
);

CREATE POLICY "Super Admins can update receipts"
ON storage.objects FOR UPDATE
WITH CHECK (
  bucket_id = 'receipts' AND 
  (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('super_admin', '본사 관리자')))
);

CREATE POLICY "Super Admins can delete receipts"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'receipts' AND 
  (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('super_admin', '본사 관리자')))
);
