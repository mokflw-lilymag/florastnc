import { NextResponse } from "next/server";
import { effectiveIsSuperAdmin, requireAuthenticated } from "@/lib/auth-api-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import {
  errAdminForbidden,
  errAdminGalleryLabelRequired,
  errAdminGalleryMutationFailed,
  errAdminGallerySlugRule,
  errAdminJsonInvalid,
  errAdminServerMisconfigured,
} from "@/lib/admin/admin-api-errors";

const SLUG_RE = /^[a-z0-9_-]{1,64}$/;

export async function POST(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;
  const blGate = await hqApiUiBase(req);
  if (!effectiveIsSuperAdmin(gate.profile, gate.email)) {
    return NextResponse.json({ error: errAdminForbidden(blGate) }, { status: 403 });
  }

  let body: { slug?: string; label?: string; sort_order?: number; is_active?: boolean; uiLocale?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: errAdminJsonInvalid(blGate) }, { status: 400 });
  }

  const bl = await hqApiUiBase(req, body.uiLocale);
  const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ error: errAdminGallerySlugRule(bl) }, { status: 400 });
  }
  if (!label) {
    return NextResponse.json({ error: errAdminGalleryLabelRequired(bl) }, { status: 400 });
  }

  const sort_order = typeof body.sort_order === "number" && Number.isFinite(body.sort_order) ? body.sort_order : 0;
  const is_active = body.is_active !== false;

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: errAdminServerMisconfigured(bl) }, { status: 500 });
  }

  const { data, error } = await admin
    .from("design_gallery_themes")
    .insert({ slug, label, sort_order, is_active })
    .select("*, design_gallery_assets(*)")
    .single();

  if (error) {
    console.error("design-gallery theme POST:", error);
    return NextResponse.json({ error: errAdminGalleryMutationFailed(bl) }, { status: 400 });
  }

  return NextResponse.json({ theme: data });
}
