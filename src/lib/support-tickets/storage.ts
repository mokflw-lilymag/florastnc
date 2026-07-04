import type { SupabaseClient } from "@supabase/supabase-js";
import type { SupportAttachmentMeta } from "@/lib/support-tickets/types";

const BUCKET = "support-tickets";

function parseDataUrl(dataUrl: string): { mime: string; buffer: Buffer } {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("잘못된 이미지 데이터입니다.");
  return { mime: match[1], buffer: Buffer.from(match[2], "base64") };
}

export async function uploadSupportAttachments(
  admin: SupabaseClient,
  tenantId: string,
  ticketId: string,
  dataUrls: string[],
): Promise<SupportAttachmentMeta[]> {
  const out: SupportAttachmentMeta[] = [];
  let i = 0;
  for (const dataUrl of dataUrls) {
    if (!dataUrl?.startsWith("data:")) continue;
    const { mime, buffer } = parseDataUrl(dataUrl);
    const ext = mime.includes("webp") ? "webp" : mime.includes("png") ? "png" : "jpg";
    const path = `${tenantId}/${ticketId}/${Date.now()}-${i}.${ext}`;
    const { error } = await admin.storage.from(BUCKET).upload(path, buffer, {
      contentType: mime,
      upsert: false,
    });
    if (error) {
      console.error("[support-tickets] upload failed", error);
      continue;
    }
    out.push({ path, size: buffer.length, mime });
    i += 1;
  }
  return out;
}

export async function signedAttachmentUrls(
  admin: SupabaseClient,
  paths: SupportAttachmentMeta[],
  expiresIn = 3600,
): Promise<Array<SupportAttachmentMeta & { url: string }>> {
  const result: Array<SupportAttachmentMeta & { url: string }> = [];
  for (const p of paths) {
    const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(p.path, expiresIn);
    if (!error && data?.signedUrl) {
      result.push({ ...p, url: data.signedUrl });
    }
  }
  return result;
}

export async function removeStoragePaths(admin: SupabaseClient, paths: SupportAttachmentMeta[]) {
  if (!paths.length) return;
  await admin.storage.from(BUCKET).remove(paths.map((p) => p.path));
}
