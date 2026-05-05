import { NextResponse } from "next/server";
import { effectiveIsSuperAdmin, requireAuthenticated } from "@/lib/auth-api-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import {
  errAdminForbidden,
  errAdminGalleryImageUrlRequired,
  errAdminGalleryMutationFailed,
  errAdminGalleryThemeIdRequired,
  errAdminJsonInvalid,
  errAdminServerMisconfigured,
} from "@/lib/admin/admin-api-errors";

function isHttpUrl(s: string) {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;
  const blGate = await hqApiUiBase(req);
  if (!effectiveIsSuperAdmin(gate.profile, gate.email)) {
    return NextResponse.json({ error: errAdminForbidden(blGate) }, { status: 403 });
  }

  let body: { theme_id?: string; image_url?: string; sort_order?: number; uiLocale?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: errAdminJsonInvalid(blGate) }, { status: 400 });
  }

  const bl = await hqApiUiBase(req, body.uiLocale);
  const theme_id = typeof body.theme_id === "string" ? body.theme_id.trim() : "";
  const image_url = typeof body.image_url === "string" ? body.image_url.trim() : "";
  if (!theme_id) return NextResponse.json({ error: errAdminGalleryThemeIdRequired(bl) }, { status: 400 });
  if (!image_url || !isHttpUrl(image_url)) {
    return NextResponse.json({ error: errAdminGalleryImageUrlRequired(bl) }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: errAdminServerMisconfigured(bl) }, { status: 500 });
  }

  let sort_order = 0;
  if (typeof body.sort_order === "number" && Number.isFinite(body.sort_order)) {
    sort_order = body.sort_order;
  } else {
    const { data: maxRow } = await admin
      .from("design_gallery_assets")
      .select("sort_order")
      .eq("theme_id", theme_id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    sort_order = (maxRow?.sort_order ?? -1) + 1;
  }

  const { data, error } = await admin
    .from("design_gallery_assets")
    .insert({ theme_id, image_url, sort_order })
    .select("*")
    .single();

  if (error) {
    console.error("design-gallery asset POST:", error);
    return NextResponse.json({ error: errAdminGalleryMutationFailed(bl) }, { status: 400 });
  }

  return NextResponse.json({ asset: data });
}
