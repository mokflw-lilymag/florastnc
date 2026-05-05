import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import {
  errAnnUploadDefaultFailed,
  errAnnUploadHintBucket,
  errAnnUploadHintRls,
  errAnnUploadImagesOnly,
  errAnnUploadMax10mb,
  errAnnUploadOrgFileRequired,
} from "@/lib/hq/hq-announcements-api-errors";
import { errAdminForbidden, errAdminUnauthorized } from "@/lib/admin/admin-api-errors";

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const uiLocaleRaw = form?.get("uiLocale");
  const bl = await hqApiUiBase(req, typeof uiLocaleRaw === "string" ? uiLocaleRaw : null);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: errAdminUnauthorized(bl) }, { status: 401 });
  const organizationId = form?.get("organizationId") as string | null;
  const file = form?.get("file") as File | null;
  if (!organizationId?.trim() || !file?.size) {
    return NextResponse.json({ error: errAnnUploadOrgFileRequired(bl) }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: errAnnUploadMax10mb(bl) }, { status: 400 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const isSuper = profile?.role === "super_admin";

  if (!isSuper) {
    const { data: mem } = await supabase
      .from("organization_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", organizationId.trim())
      .maybeSingle();
    if (!mem || mem.role !== "org_admin") {
      return NextResponse.json({ error: errAdminForbidden(bl) }, { status: 403 });
    }
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: errAnnUploadImagesOnly(bl) }, { status: 400 });
  }

  const path = `${organizationId.trim()}/${crypto.randomUUID()}.jpg`;
  const buf = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from("org_announcements").upload(path, buf, {
    contentType: "image/jpeg",
    upsert: false,
  });

  if (error) {
    console.error("[hq/announcements/upload]", error);
    const raw = String(error.message ?? "");
    const hint =
      /bucket not found|not found/i.test(raw) || raw.includes("404")
        ? errAnnUploadHintBucket(bl)
        : /row-level security|rls|policy/i.test(raw)
          ? errAnnUploadHintRls(bl)
          : "";
    return NextResponse.json({ error: errAnnUploadDefaultFailed(bl) + hint }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("org_announcements").getPublicUrl(path);

  return NextResponse.json({ url: publicUrl });
}
