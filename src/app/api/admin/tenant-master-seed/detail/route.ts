import { NextResponse } from "next/server";
import { effectiveIsSuperAdmin, requireAuthenticated } from "@/lib/auth-api-guards";
import { getTenantMasterSeed } from "@/lib/tenant-master-seed/registry";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import {
  errAdminForbidden,
  errAdminSeedUnknownVersion,
  errAdminSeedVersionQueryRequired,
  getTenantMasterSeedDetailNotes,
} from "@/lib/admin/admin-api-errors";

/** 관리자가 고정 시드에 어떤 데이터가 들어 있는지 확인 (코드 기준 스냅샷) */
export async function GET(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;
  const sp = new URL(req.url).searchParams;
  const bl = await hqApiUiBase(req, sp.get("uiLocale"));
  if (!effectiveIsSuperAdmin(gate.profile, gate.email)) {
    return NextResponse.json({ error: errAdminForbidden(bl) }, { status: 403 });
  }
  const versionId = sp.get("versionId");
  if (!versionId?.trim()) {
    return NextResponse.json({ error: errAdminSeedVersionQueryRequired(bl) }, { status: 400 });
  }

  const seed = getTenantMasterSeed(versionId.trim());
  if (!seed) {
    return NextResponse.json({ error: errAdminSeedUnknownVersion(bl) }, { status: 404 });
  }

  return NextResponse.json({
    version: seed.version,
    label: seed.label,
    notes: getTenantMasterSeedDetailNotes(bl, Boolean(seed.delivery?.districtDeliveryFees?.length)),
    counts: {
      productCategoryMains: seed.productCategories.main.length,
      materialCategoryMains: seed.materialCategories.main.length,
      expenseCategoryMains: seed.expenseCategories.main.length,
      suppliers: seed.suppliers.length,
      products: seed.products.length,
      materials: seed.materials.length,
      deliveryDistrictRows: seed.delivery?.districtDeliveryFees?.length ?? 0,
    },
    productCategories: seed.productCategories,
    materialCategories: seed.materialCategories,
    expenseCategories: seed.expenseCategories,
    suppliers: seed.suppliers,
    products: seed.products,
    materials: seed.materials,
  });
}
