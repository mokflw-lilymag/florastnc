import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { createAdminClient } from "@/utils/supabase/admin";

export async function GET(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  // profiles 테이블에서 tenant_id 가져오기
  const { data: profileData, error: profileErr } = await admin
    .from("profiles")
    .select("tenant_id")
    .eq("id", gate.userId)
    .maybeSingle();

  if (profileErr || !profileData?.tenant_id) {
    console.error("[hq/materials GET] profile error or no tenant_id:", profileErr);
    return NextResponse.json({ error: "Tenant not found or profile error" }, { status: 400 });
  }

  const hqTenantId = profileData.tenant_id;

  // 본사 테넌트에 해당하는 전체 자재 목록을 RLS 없이 긁어옵니다.
  const { data: materials, error } = await admin
    .from("materials")
    .select("*")
    .eq("tenant_id", hqTenantId)
    .order("name", { ascending: true });

  if (error) {
    console.error("[hq/materials GET] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ materials: materials || [] });
}

export async function POST(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const body = await req.json().catch(() => ({}));
  const { name, unit, memo } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  // profiles 테이블에서 tenant_id 가져오기
  const { data: profileData, error: profileErr } = await admin
    .from("profiles")
    .select("tenant_id")
    .eq("id", gate.userId)
    .maybeSingle();

  if (profileErr || !profileData?.tenant_id) {
    console.error("[hq/materials POST] profile error or no tenant_id:", profileErr);
    return NextResponse.json({ error: "Tenant not found or profile error" }, { status: 400 });
  }

  const hqTenantId = profileData.tenant_id;

  const now = new Date().toISOString();
  const { data: inserted, error } = await admin
    .from("materials")
    .insert([
      {
        tenant_id: hqTenantId,
        name,
        main_category: body.mainCategory || "기타",
        mid_category: body.midCategory || "기타",
        unit: unit || "개",
        memo: memo || null,
        created_at: now,
        updated_at: now,
      },
    ])
    .select()
    .maybeSingle();

  if (error) {
    console.error("[hq/materials POST] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, material: inserted });
}
