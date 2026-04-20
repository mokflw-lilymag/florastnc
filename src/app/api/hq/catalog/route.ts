import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

/** 본사 공유 상품 목록 (조직 멤버 조회 / org_admin·super 작성) */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id);

  const orgIds = [...new Set((memberships ?? []).map((m) => m.organization_id))];

  if (profile?.role !== "super_admin" && orgIds.length === 0) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let query = supabase
    .from("organization_catalog_items")
    .select("id, organization_id, name, main_category, mid_category, price, code, status, created_at")
    .order("created_at", { ascending: false });

  if (profile?.role !== "super_admin") {
    query = query.in("organization_id", orgIds);
  }

  const { data, error } = await query;
  if (error) {
    if (error.code === "42P01" || error.message?.includes("does not exist")) {
      return NextResponse.json({
        items: [],
        warning:
          "organization_catalog_schema.sql 을 Supabase에 적용하면 공유 상품 기능을 쓸 수 있습니다.",
      });
    }
    console.error("[hq/catalog GET]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const organizationId = body?.organizationId as string | undefined;
  const name = (body?.name as string | undefined)?.trim();
  const main_category = (body?.main_category as string | undefined)?.trim() || "";
  const mid_category = (body?.mid_category as string | undefined)?.trim() || "";
  const price = Number(body?.price ?? 0);
  if (!organizationId || !name) {
    return NextResponse.json({ error: "organizationId, name 은 필수입니다." }, { status: 400 });
  }
  if (!main_category || !mid_category) {
    return NextResponse.json(
      { error: "대분류(1차)·중분류(2차 카테고리)는 필수입니다." },
      { status: 400 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const { data: mem } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  const canWrite = profile?.role === "super_admin" || mem?.role === "org_admin";
  if (!canWrite) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const { data: row, error } = await admin
    .from("organization_catalog_items")
    .insert({
      organization_id: organizationId,
      name,
      price: Number.isFinite(price) ? price : 0,
      main_category,
      mid_category,
      code: body?.code ?? null,
      status: body?.status === "inactive" || body?.status === "sold_out" ? body.status : "active",
    })
    .select(
      "id, organization_id, name, main_category, mid_category, price, code, status, created_at"
    )
    .single();

  if (error) {
    console.error("[hq/catalog POST]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ item: row });
}
