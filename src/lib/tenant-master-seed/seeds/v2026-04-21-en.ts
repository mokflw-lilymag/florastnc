import {
  DEFAULT_EXPENSE_CATEGORIES_EN,
  DEFAULT_MATERIAL_CATEGORIES_EN,
  DEFAULT_PRODUCT_CATEGORIES_EN,
} from "@/lib/category-defaults-en";
import type { TenantMasterSeed } from "../types";
import { buildDistanceZoneDelivery } from "./delivery-distance-zones";
import { buildIntlStandardSeedBody } from "./intl-standard-seed-body";

const body = buildIntlStandardSeedBody("en");

/**
 * 표준 시드 v2026-04-21-en — 영문 카테고리 + 샘플 마스터 + 매장 기준 거리 구역 배송 템플릿.
 * 배송 금액·구역명은 설정 화면에서 매장 위치에 맞게 수정하세요.
 */
export const TENANT_MASTER_SEED_V2026_04_21_EN: TenantMasterSeed = {
  version: "v2026-04-21-en",
  label: "Standard setup (Global EN · categories + samples + distance zones)",
  locale: "en",
  targetCountries: [],
  deliveryTemplate: "distance_zones",
  productCategories: DEFAULT_PRODUCT_CATEGORIES_EN,
  materialCategories: DEFAULT_MATERIAL_CATEGORIES_EN,
  expenseCategories: DEFAULT_EXPENSE_CATEGORIES_EN,
  suppliers: body.suppliers,
  products: body.products,
  materials: body.materials,
  delivery: buildDistanceZoneDelivery("en"),
};
