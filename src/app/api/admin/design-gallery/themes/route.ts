import { NextResponse } from "next/server";
import { effectiveIsSuperAdmin, requireAuthenticated } from "@/lib/auth-api-guards";
import { createAdminClient } from "@/utils/supabase/admin";

const SLUG_RE = /^[a-z0-9_-]{1,64}$/;

export async function POST(req: Request) {
  const gate = await requireAuthenticated();
  if (!gate.ok) return gate.response;
  if (!effectiveIsSuperAdmin(gate.profile, gate.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  let body: { slug?: string; label?: string; sort_order?: number; is_active?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json(
      { error: "slug은 영문 소문자, 숫자, 하이픈, 밑줄만 1~64자입니다." },
      { status: 400 }
    );
  }
  if (!label) {
    return NextResponse.json({ error: "label이 필요합니다." }, { status: 400 });
  }

  const sort_order = typeof body.sort_order === "number" && Number.isFinite(body.sort_order) ? body.sort_order : 0;
  const is_active = body.is_active !== false;

  const { data, error } = await admin
    .from("design_gallery_themes")
    .insert({ slug, label, sort_order, is_active })
    .select("*, design_gallery_assets(*)")
    .single();

  if (error) {
    console.error("design-gallery theme POST:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ theme: data });
}
