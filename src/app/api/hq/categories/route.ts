import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  DEFAULT_PRODUCT_CATEGORIES,
  DEFAULT_MATERIAL_CATEGORIES,
  DEFAULT_EXPENSE_CATEGORIES,
} from "@/lib/category-defaults";

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
    console.error("[hq/categories GET] profile error or no tenant_id:", profileErr);
    return NextResponse.json({ error: "Tenant not found or profile error" }, { status: 400 });
  }

  const hqTenantId = profileData.tenant_id;

  // 1. 본사 테넌트의 카테고리 설정 로드
  const { data: settings, error } = await admin
    .from("system_settings")
    .select("id, data")
    .eq("tenant_id", hqTenantId)
    .in("id", ["product_categories", "material_categories", "expense_categories"]);

  if (error) {
    console.error("[hq/categories GET] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let productCats = settings?.find((s) => s.id === "product_categories")?.data;
  let materialCats = settings?.find((s) => s.id === "material_categories")?.data;
  let expenseCats = settings?.find((s) => s.id === "expense_categories")?.data;

  const updatesToSave = [];

  // 2. 만약 DB에 기존 데이터가 비어있다면, category-defaults 표준 값을 기본 주입하고 본사 DB에 upsert 백업 저장
  if (!productCats || !productCats.main || productCats.main.length === 0) {
    productCats = DEFAULT_PRODUCT_CATEGORIES;
    updatesToSave.push({ id: "product_categories", tenant_id: hqTenantId, data: productCats });
  }
  if (!materialCats || !materialCats.main || materialCats.main.length === 0) {
    materialCats = DEFAULT_MATERIAL_CATEGORIES;
    updatesToSave.push({ id: "material_categories", tenant_id: hqTenantId, data: materialCats });
  }
  if (!expenseCats || !expenseCats.main || expenseCats.main.length === 0) {
    expenseCats = DEFAULT_EXPENSE_CATEGORIES;
    updatesToSave.push({ id: "expense_categories", tenant_id: hqTenantId, data: expenseCats });
  }

  // 비동기로 디폴트 설정을 본사 설정에 영구 보관해 둠
  if (updatesToSave.length > 0) {
    for (const item of updatesToSave) {
      await admin.from("system_settings").upsert({
        ...item,
        updated_at: new Date().toISOString(),
      });
    }
  }

  return NextResponse.json({
    productCategories: productCats,
    materialCategories: materialCats,
    expenseCategories: expenseCats,
  });
}

export async function POST(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const body = await req.json().catch(() => ({}));
  const { categoryType, data } = body;

  if (!categoryType || !data) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  let settingId = "product_categories";
  if (categoryType === "material") {
    settingId = "material_categories";
  } else if (categoryType === "expense") {
    settingId = "expense_categories";
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
    console.error("[hq/categories POST] profile error or no tenant_id:", profileErr);
    return NextResponse.json({ error: "Tenant not found or profile error" }, { status: 400 });
  }

  const hqTenantId = profileData.tenant_id;

  try {
    // 클라이언트가 편집 완료 후 던진 완성형 CategoryData 객체를 system_settings 에 upsert 저장
    const { error: saveErr } = await admin
      .from("system_settings")
      .upsert({
        id: settingId,
        tenant_id: hqTenantId,
        data: data,
        updated_at: new Date().toISOString(),
      });

    if (saveErr) throw saveErr;

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("[hq/categories POST] error:", e);
    return NextResponse.json({ error: e.message || "Failed to update category" }, { status: 500 });
  }
}
