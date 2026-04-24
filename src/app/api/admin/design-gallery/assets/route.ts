import { NextResponse } from "next/server";
import { effectiveIsSuperAdmin, requireAuthenticated } from "@/lib/auth-api-guards";
import { createAdminClient } from "@/utils/supabase/admin";

function isHttpUrl(s: string) {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

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

  let body: { theme_id?: string; image_url?: string; sort_order?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const theme_id = typeof body.theme_id === "string" ? body.theme_id.trim() : "";
  const image_url = typeof body.image_url === "string" ? body.image_url.trim() : "";
  if (!theme_id) return NextResponse.json({ error: "theme_id가 필요합니다." }, { status: 400 });
  if (!image_url || !isHttpUrl(image_url)) {
    return NextResponse.json({ error: "유효한 http(s) 이미지 URL이 필요합니다." }, { status: 400 });
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
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ asset: data });
}
