import { NextResponse } from "next/server";
import { effectiveIsSuperAdmin, requireAuthenticated } from "@/lib/auth-api-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import {
  errAdminForbidden,
  errAdminGalleryHttpUrlRequired,
  errAdminGalleryMutationFailed,
  errAdminGalleryNoPatchFields,
  errAdminGallerySortOrderInvalid,
  errAdminJsonInvalid,
  errAdminOperationFailed,
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

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;
  const blGate = await hqApiUiBase(req);
  if (!effectiveIsSuperAdmin(gate.profile, gate.email)) {
    return NextResponse.json({ error: errAdminForbidden(blGate) }, { status: 403 });
  }

  let body: Partial<{ image_url: string; sort_order: number; uiLocale?: string }>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: errAdminJsonInvalid(blGate) }, { status: 400 });
  }

  const bl = await hqApiUiBase(req, body.uiLocale);
  const patch: Record<string, unknown> = {};
  if (body.image_url !== undefined) {
    const image_url = String(body.image_url).trim();
    if (!image_url || !isHttpUrl(image_url)) {
      return NextResponse.json({ error: errAdminGalleryHttpUrlRequired(bl) }, { status: 400 });
    }
    patch.image_url = image_url;
  }
  if (body.sort_order !== undefined) {
    const n = Number(body.sort_order);
    if (!Number.isFinite(n)) return NextResponse.json({ error: errAdminGallerySortOrderInvalid(bl) }, { status: 400 });
    patch.sort_order = n;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: errAdminGalleryNoPatchFields(bl) }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: errAdminServerMisconfigured(bl) }, { status: 500 });
  }

  const { data, error } = await admin
    .from("design_gallery_assets")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("design-gallery asset PATCH:", error);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  return NextResponse.json({ asset: data });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;
  const bl = await hqApiUiBase(req, new URL(req.url).searchParams.get("uiLocale"));
  if (!effectiveIsSuperAdmin(gate.profile, gate.email)) {
    return NextResponse.json({ error: errAdminForbidden(bl) }, { status: 403 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: errAdminServerMisconfigured(bl) }, { status: 500 });
  }

  const { error } = await admin.from("design_gallery_assets").delete().eq("id", id);
  if (error) {
    console.error("design-gallery asset DELETE:", error);
    return NextResponse.json({ error: errAdminGalleryMutationFailed(bl) }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
