import { createClient } from "@/utils/supabase/client";
import { validateAndOptimizeImage } from "@/lib/image-optimizer";

export type UploadStorageResult = {
  url: string;
  provider: "supabase";
  originalSize: number;
  finalSize: number;
  compressionRatio: number;
};

export const uploadWithOptimalStorage = async (
  file: File,
  path: string,
  options?: { tags?: string[]; bucket?: string; optimize?: boolean },
): Promise<UploadStorageResult> => {
  const supabase = createClient();
  const bucket = options?.bucket || "receipts";
  const shouldOptimize = options?.optimize !== false;

  let uploadFile = file;
  let originalSize = file.size;
  let finalSize = file.size;
  let compressionRatio = 0;

  if (shouldOptimize && file.type.startsWith("image/")) {
    const optimized = await validateAndOptimizeImage(file);
    uploadFile = optimized.file;
    originalSize = optimized.originalSize;
    finalSize = optimized.optimizedSize;
    compressionRatio = optimized.compressionRatio;
  }

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, uploadFile, { upsert: true });
  if (uploadError) throw uploadError;
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(uploadData.path);
  return {
    url: urlData.publicUrl,
    provider: "supabase",
    originalSize,
    finalSize,
    compressionRatio,
  };
};

export const deleteFromOptimalStorage = async (url: string, _publicId?: string, bucket?: string) => {
  const supabase = createClient();
  if (url.includes("storage/v1/object/public/")) {
    const pathStart = url.indexOf("/public/") + 8;
    const fullPath = url.substring(pathStart);
    const firstSlashIndex = fullPath.indexOf("/");
    const extractedBucket = fullPath.substring(0, firstSlashIndex);
    const filePath = fullPath.substring(firstSlashIndex + 1);
    await supabase.storage.from(extractedBucket).remove([filePath]);
    return;
  }
  const targetBucket = bucket || "receipts";
  await supabase.storage.from(targetBucket).remove([url]);
};
