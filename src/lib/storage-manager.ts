import { createClient } from '@/utils/supabase/client';

export const uploadWithOptimalStorage = async (
  file: File,
  path: string,
  options?: { tags?: string[]; transformation?: string; bucket?: string }
) => {
  const supabase = createClient();
  const bucket = options?.bucket || 'receipts'; // Default to receipts or general based on what is used
  const { data: uploadData, error: uploadError } = await supabase.storage.from(bucket).upload(path, file);
  if (uploadError) throw uploadError;
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(uploadData.path);
  return { url: urlData.publicUrl, provider: 'supabase' };
};

export const deleteFromOptimalStorage = async (url: string, publicId?: string, bucket?: string) => {
  const supabase = createClient();
  const targetBucket = bucket || 'receipts';
  
  if (url.includes('storage/v1/object/public/')) {
    const pathStart = url.indexOf('/public/') + 8;
    const fullPath = url.substring(pathStart);
    const firstSlashIndex = fullPath.indexOf('/');
    const extractedBucket = fullPath.substring(0, firstSlashIndex);
    const filePath = fullPath.substring(firstSlashIndex + 1);
    await supabase.storage.from(extractedBucket).remove([filePath]);
  }
};
