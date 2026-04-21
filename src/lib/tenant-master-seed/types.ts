import type { CategoryData } from "@/lib/category-defaults";

export interface TenantMasterSeedSupplierRow {
  name: string;
  memo?: string;
  supplier_type?: string;
}

export interface TenantMasterSeedProductRow {
  name: string;
  main_category: string;
  mid_category?: string;
  /** 비우면 자동 코드(FS-SEED-…) 부여 */
  code?: string;
  /** 시트·시드에 있으면 DB 상품 단가로 반영 */
  price?: number;
  stock?: number;
  status?: "active" | "inactive" | "sold_out";
}

export interface TenantMasterSeedMaterialRow {
  name: string;
  main_category: string;
  mid_category?: string;
  unit: string;
  spec?: string;
}

export interface TenantMasterSeed {
  version: string;
  label: string;
  productCategories: CategoryData;
  materialCategories: CategoryData;
  expenseCategories: CategoryData;
  suppliers: TenantMasterSeedSupplierRow[];
  products: TenantMasterSeedProductRow[];
  materials: TenantMasterSeedMaterialRow[];
}

export interface TenantMasterSeedResult {
  dryRun: boolean;
  tenantId: string;
  seedVersion: string;
  categories: { willWrite: boolean };
  suppliers: { toInsert: number; toSkip: number };
  products: { toInsert: number; toSkip: number };
  materials: { toInsert: number; toSkip: number };
  warnings: string[];
  auditId?: string | null;
}

/** 조직 등 다수 매장에 동일 시드 적용 시 매장별 결과 */
export interface TenantMasterSeedBulkTenantResult {
  tenantId: string;
  ok: boolean;
  result?: TenantMasterSeedResult;
  error?: string;
}

export interface TenantMasterSeedBulkResult {
  dryRun: boolean;
  seedVersion: string;
  organizationId?: string;
  tenantCount: number;
  okCount: number;
  failCount: number;
  tenants: TenantMasterSeedBulkTenantResult[];
}
