import { NextResponse } from "next/server";
import { effectiveIsSuperAdmin, requireAuthenticated } from "@/lib/auth-api-guards";
import { getTenantMasterSeed } from "@/lib/tenant-master-seed/registry";

/** 관리자가 고정 시드에 어떤 데이터가 들어 있는지 확인 (코드 기준 스냅샷) */
export async function GET(req: Request) {
  const gate = await requireAuthenticated();
  if (!gate.ok) return gate.response;
  if (!effectiveIsSuperAdmin(gate.profile, gate.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const versionId = new URL(req.url).searchParams.get("versionId");
  if (!versionId?.trim()) {
    return NextResponse.json({ error: "versionId 쿼리가 필요합니다." }, { status: 400 });
  }

  const seed = getTenantMasterSeed(versionId.trim());
  if (!seed) {
    return NextResponse.json({ error: "알 수 없는 시드 버전입니다." }, { status: 404 });
  }

  return NextResponse.json({
    version: seed.version,
    label: seed.label,
    notes: [
      "상품: 샘플·초안 (판매가 0원), 코드는 적용 시 FS-SEED-{버전}-{코드} 형태",
      "자재: 단가·재고 0, 메모에 FS-SEED|버전|M|순번",
      "거래처: 샘플명만 (실제 사업자 정보는 매장에서 수정)",
      "카테고리(상품·자재·지출): system_settings 에 덮어쓰기",
    ],
    counts: {
      productCategoryMains: seed.productCategories.main.length,
      materialCategoryMains: seed.materialCategories.main.length,
      expenseCategoryMains: seed.expenseCategories.main.length,
      suppliers: seed.suppliers.length,
      products: seed.products.length,
      materials: seed.materials.length,
    },
    productCategories: seed.productCategories,
    materialCategories: seed.materialCategories,
    expenseCategories: seed.expenseCategories,
    suppliers: seed.suppliers,
    products: seed.products,
    materials: seed.materials,
  });
}
