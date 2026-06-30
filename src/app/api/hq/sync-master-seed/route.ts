import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { createAdminClient } from "@/utils/supabase/admin";

export async function POST(req: Request) {
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
    console.error("[hq/sync-master-seed POST] profile error or no tenant_id:", profileErr);
    return NextResponse.json({ error: "Tenant not found or profile error" }, { status: 400 });
  }

  const hqTenantId = profileData.tenant_id;

  try {
    // 1. 본사 카테고리 데이터 로드
    const { data: hqSettings, error: hqSettingsErr } = await admin
      .from("system_settings")
      .select("id, data")
      .eq("tenant_id", hqTenantId)
      .in("id", ["product_categories", "material_categories", "expense_categories"]);

    if (hqSettingsErr) throw hqSettingsErr;

    // 2. 본사 자재 목록 로드
    const { data: hqMaterials, error: hqMaterialsErr } = await admin
      .from("materials")
      .select("name, unit, memo, price, main_category, mid_category")
      .eq("tenant_id", hqTenantId);

    if (hqMaterialsErr) throw hqMaterialsErr;

    // 3. 동기화 타겟 지점(본사를 제외한 모든 하위 지점) 목록 조회
    const { data: branches, error: branchErr } = await admin
      .from("tenants")
      .select("id, name")
      .neq("id", hqTenantId);

    if (branchErr) throw branchErr;

    const results = [];

    // 4. 지점별 벌크 배포 루프 기동
    for (const branch of branches) {
      try {
        // A. 카테고리 3종 세트 배포 (upsert)
        if (hqSettings && hqSettings.length > 0) {
          for (const setting of hqSettings) {
            const { error: setErr } = await admin
              .from("system_settings")
              .upsert({
                id: setting.id,
                tenant_id: branch.id,
                data: setting.data,
                updated_at: new Date().toISOString(),
              });
            if (setErr) throw setErr;
          }
        }

        // B. 자재 정보 지점 전파 배포 (지점용 materials 테이블 RLS 우회 인서트)
        if (hqMaterials && hqMaterials.length > 0) {
          // 기존 지점 자재 데이터 전량 소프트 리셋(삭제) 후 본사 마스터 자재 덮어쓰기
          const { error: delErr } = await admin
            .from("materials")
            .delete()
            .eq("tenant_id", branch.id);

          if (delErr) throw delErr;

          const toInsert = hqMaterials.map((mat) => ({
            tenant_id: branch.id,
            name: mat.name,
            main_category: mat.main_category || "기타",
            mid_category: mat.mid_category || "기타",
            unit: mat.unit || "개",
            memo: mat.memo || null,
            price: mat.price || 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));

          const { error: insErr } = await admin
            .from("materials")
            .insert(toInsert);

          if (insErr) throw insErr;
        }

        results.push({ name: branch.name, success: true });
      } catch (err: any) {
        console.error(`Failed to sync branch ${branch.name}:`, err);
        results.push({ name: branch.name, success: false, error: err.message });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (e: any) {
    console.error("[hq/sync-master-seed POST] error:", e);
    return NextResponse.json({ error: e.message || "Failed to sync" }, { status: 500 });
  }
}
