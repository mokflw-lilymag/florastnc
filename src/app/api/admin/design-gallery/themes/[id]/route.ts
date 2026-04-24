import { NextResponse } from "next/server";
import { effectiveIsSuperAdmin, requireAuthenticated } from "@/lib/auth-api-guards";
import { createAdminClient } from "@/utils/supabase/admin";

const SLUG_RE = /^[a-z0-9_-]{1,64}$/;

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const gate = await requireAuthenticated();
  if (!gate.ok) return gate.response;
  if (!effectiveIsSuperAdmin(gate.profile, gate.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  let body: Partial<{ slug: string; label: string; sort_order: number; is_active: boolean }>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (body.slug !== undefined) {
    const slug = String(body.slug).trim().toLowerCase();
    if (!SLUG_RE.test(slug)) {
      return NextResponse.json(
        { error: "slug은 영문 소문자, 숫자, 하이픈, 밑줄만 1~64자입니다." },
        { status: 400 }
      );
    }
    patch.slug = slug;
  }
  if (body.label !== undefined) {
    const label = String(body.label).trim();
    if (!label) return NextResponse.json({ error: "label이 비어 있습니다." }, { status: 400 });
    patch.label = label;
  }
  if (body.sort_order !== undefined) {
    const n = Number(body.sort_order);
    if (!Number.isFinite(n)) return NextResponse.json({ error: "sort_order 오류" }, { status: 400 });
    patch.sort_order = n;
  }
  if (body.is_active !== undefined) {
    patch.is_active = Boolean(body.is_active);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "변경할 필드가 없습니다." }, { status: 400 });
  }

  const { data, error } = await admin
    .from("design_gallery_themes")
    .update(patch)
    .eq("id", id)
    .select("*, design_gallery_assets(*)")
    .single();

  if (error) {
    console.error("design-gallery theme PATCH:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ theme: data });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const gate = await requireAuthenticated();
  if (!gate.ok) return gate.response;
  if (!effectiveIsSuperAdmin(gate.profile, gate.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const { error } = await admin.from("design_gallery_themes").delete().eq("id", id);
  if (error) {
    console.error("design-gallery theme DELETE:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
