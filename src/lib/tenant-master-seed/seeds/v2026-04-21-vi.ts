import {
  DEFAULT_EXPENSE_CATEGORIES_VI,
  DEFAULT_MATERIAL_CATEGORIES_VI,
  DEFAULT_PRODUCT_CATEGORIES_VI,
} from "@/lib/category-defaults-vi";
import type { TenantMasterSeed } from "../types";
import { buildDistanceZoneDelivery } from "./delivery-distance-zones";
import { buildIntlStandardSeedBody } from "./intl-standard-seed-body";

const body = buildIntlStandardSeedBody("vi");

/**
 * 표준 시드 v2026-04-21-vi — 베트남어 카테고리 + 샘플 마스터 + 매장 기준 거리 구역 배송 템플릿.
 */
export const TENANT_MASTER_SEED_V2026_04_21_VI: TenantMasterSeed = {
  version: "v2026-04-21-vi",
  label: "Thiết lập chuẩn (VN · danh mục + mẫu + vùng theo khoảng cách)",
  locale: "vi",
  targetCountries: ["VN"],
  deliveryTemplate: "distance_zones",
  productCategories: DEFAULT_PRODUCT_CATEGORIES_VI,
  materialCategories: DEFAULT_MATERIAL_CATEGORIES_VI,
  expenseCategories: DEFAULT_EXPENSE_CATEGORIES_VI,
  suppliers: body.suppliers,
  products: body.products,
  materials: body.materials,
  delivery: buildDistanceZoneDelivery("vi"),
};
