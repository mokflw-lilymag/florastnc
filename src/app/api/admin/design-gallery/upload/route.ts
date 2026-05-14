import { NextResponse } from "next/server";
import { effectiveIsSuperAdmin, requireAuthenticated } from "@/lib/auth-api-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import {
  errAdminForbidden,
  errAdminGalleryUploadBucketHint,
  errAdminGalleryUploadFailed,
  errAdminGalleryUploadFileRequired,
  errAdminGalleryUploadOnlyImage,
  errAdminGalleryUploadTooLarge,
  errAdminServerMisconfigured,
} from "@/lib/admin/admin-api-errors";

const MAX_BYTES = 10 * 1024 * 1024;
const BUCKET = "design_gallery";

const EXT_BY_MIME: Record<string, "jpg" | "png" | "webp"> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function isBucketMissing(message: string) {
  return /bucket not found|not_found|the resource was not found|404/i.test(message);
}

/**
 * 디자인 갤러리 파일 업로드 — 슈퍼관리자 전용.
 *
 * 클라이언트가 보내는 FormData:
 *   - file:  인쇄용 원본 (긴 변 2400px, JPEG 92% 또는 투명 PNG)
 *   - thumb: 목록용 썸네일 (긴 변 600px, WebP 80%)
 *   - uiLocale (선택)
 *
 * 응답: { image_url: string, thumb_url: string }
 *  → 호출자가 이걸로 /api/admin/design-gallery/assets 에 row 삽입까지 처리.
 */
export async function POST(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;
  const blGate = await hqApiUiBase(req);
  if (!effectiveIsSuperAdmin(gate.profile, gate.email)) {
    return NextResponse.json({ error: errAdminForbidden(blGate) }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  const uiLocaleRaw = form?.get("uiLocale");
  const bl = await hqApiUiBase(
    req,
    typeof uiLocaleRaw === "string" ? uiLocaleRaw : null,
  );

  const file = form?.get("file");
  const thumb = form?.get("thumb");
  if (!(file instanceof File) || !(thumb instanceof File) || !file.size || !thumb.size) {
    return NextResponse.json(
      { error: errAdminGalleryUploadFileRequired(bl) },
      { status: 400 },
    );
  }

  if (file.size > MAX_BYTES || thumb.size > MAX_BYTES) {
    return NextResponse.json({ error: errAdminGalleryUploadTooLarge(bl) }, { status: 400 });
  }
  if (!file.type.startsWith("image/") || !thumb.type.startsWith("image/")) {
    return NextResponse.json({ error: errAdminGalleryUploadOnlyImage(bl) }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: errAdminServerMisconfigured(bl) }, { status: 500 });
  }

  const id = crypto.randomUUID();
  const originalExt = EXT_BY_MIME[file.type] ?? "jpg";
  const thumbExt = EXT_BY_MIME[thumb.type] ?? "webp";
  const originalPath = `assets/${id}.${originalExt}`;
  const thumbPath = `thumbs/${id}.${thumbExt}`;

  const [originalBuf, thumbBuf] = await Promise.all([
    file.arrayBuffer().then((b) => Buffer.from(b)),
    thumb.arrayBuffer().then((b) => Buffer.from(b)),
  ]);

  const up1 = await admin.storage.from(BUCKET).upload(originalPath, originalBuf, {
    contentType: file.type,
    upsert: false,
  });
  if (up1.error) {
    console.error("design-gallery upload (original):", up1.error);
    const hint = isBucketMissing(up1.error.message) ? errAdminGalleryUploadBucketHint(bl) : undefined;
    return NextResponse.json({ error: errAdminGalleryUploadFailed(bl, hint) }, { status: 500 });
  }

  const up2 = await admin.storage.from(BUCKET).upload(thumbPath, thumbBuf, {
    contentType: thumb.type,
    upsert: false,
  });
  if (up2.error) {
    console.error("design-gallery upload (thumb):", up2.error);
    // 원본 롤백 — 썸네일 실패 시 의미 없는 객체 남기지 않기
    await admin.storage.from(BUCKET).remove([originalPath]).catch(() => undefined);
    const hint = isBucketMissing(up2.error.message) ? errAdminGalleryUploadBucketHint(bl) : undefined;
    return NextResponse.json({ error: errAdminGalleryUploadFailed(bl, hint) }, { status: 500 });
  }

  const { data: orig } = admin.storage.from(BUCKET).getPublicUrl(originalPath);
  const { data: th } = admin.storage.from(BUCKET).getPublicUrl(thumbPath);

  return NextResponse.json({
    image_url: orig.publicUrl,
    thumb_url: th.publicUrl,
  });
}
