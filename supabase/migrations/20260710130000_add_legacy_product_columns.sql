-- Add legacy columns (size, color, branch) to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS size TEXT,
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS branch TEXT;
