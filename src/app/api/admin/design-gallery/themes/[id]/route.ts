import { NextResponse } from "next/server";
import { effectiveIsSuperAdmin, requireAuthenticated } from "@/lib/auth-api-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import {
  errAdminForbidden,
  errAdminGalleryLabelEmpty,
  errAdminGalleryMutationFailed,
  errAdminGalleryNoPatchFields,
  errAdminGallerySlugRule,
  errAdminGallerySortOrderInvalid,
  errAdminJsonInvalid,
  errAdminServerMisconfigured,
} from "@/lib/admin/admin-api-errors";

const SLUG_RE = /^[a-z0-9_-]{1,64}$/;

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;
  const blGate = await hqApiUiBase(req);
  if (!effectiveIsSuperAdmin(gate.profile, gate.email)) {
    return NextResponse.json({ error: errAdminForbidden(blGate) }, { status: 403 });
  }

  let body: Partial<{ slug: string; label: string; sort_order: number; is_active: boolean; uiLocale?: string }>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: errAdminJsonInvalid(blGate) }, { status: 400 });
  }

  const bl = await hqApiUiBase(req, body.uiLocale);
  const patch: Record<string, unknown> = {};
  if (body.slug !== undefined) {
    const slug = String(body.slug).trim().toLowerCase();
    if (!SLUG_RE.test(slug)) {
      return NextResponse.json({ error: errAdminGallerySlugRule(bl) }, { status: 400 });
    }
    patch.slug = slug;
  }
  if (body.label !== undefined) {
    const label = String(body.label).trim();
    if (!label) return NextResponse.json({ error: errAdminGalleryLabelEmpty(bl) }, { status: 400 });
    patch.label = label;
  }
  if (body.sort_order !== undefined) {
    const n = Number(body.sort_order);
    if (!Number.isFinite(n)) return NextResponse.json({ error: errAdminGallerySortOrderInvalid(bl) }, { status: 400 });
    patch.sort_order = n;
  }
  if (body.is_active !== undefined) {
    patch.is_active = Boolean(body.is_active);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: errAdminGalleryNoPatchFields(bl) }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: errAdminServerMisconfigured(bl) }, { status: 500 });
  }

  const { data, error } = await admin
    .from("design_gallery_themes")
    .update(patch)
    .eq("id", id)
    .select("*, design_gallery_assets(*)")
    .single();

  if (error) {
    console.error("design-gallery theme PATCH:", error);
    return NextResponse.json({ error: errAdminGalleryMutationFailed(bl) }, { status: 400 });
  }

  return NextResponse.json({ theme: data });
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

  const { error } = await admin.from("design_gallery_themes").delete().eq("id", id);
  if (error) {
    console.error("design-gallery theme DELETE:", error);
    return NextResponse.json({ error: errAdminGalleryMutationFailed(bl) }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
