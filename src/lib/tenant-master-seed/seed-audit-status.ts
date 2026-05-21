import type { SupabaseClient } from "@supabase/supabase-js";

export interface TenantSeedAppliedStatus {
  seedVersion: string;
  appliedAt: string;
  auditId: string;
  applyCount: number;
  /** 감사 테이블/메타 없을 때 FS-SEED 자재·상품 데이터로 추정 */
  inferred?: boolean;
}

export type TenantSeedStatusMap = Record<string, TenantSeedAppliedStatus>;

const SEED_MATERIAL_MEMO_PREFIX = "FS-SEED|";
const SEED_PRODUCT_CODE_PREFIX = "FS-SEED-";
const SEED_META_SETTING_ID = "tenant_master_seed_meta";

function parseSeedVersionFromMaterialMemo(memo: string): string | null {
  const match = memo.match(/^FS-SEED\|([^|]+)\|/);
  return match?.[1]?.trim() || null;
}

function upsertStatus(
  statuses: TenantSeedStatusMap,
  tenantId: string,
  next: TenantSeedAppliedStatus
) {
  const existing = statuses[tenantId];
  if (!existing || next.appliedAt >= existing.appliedAt) {
    statuses[tenantId] = next;
  }
}

/** system_settings.tenant_master_seed_meta — 시드 적용 시 항상 기록 (가장 신뢰) */
export async function fetchTenantMasterSeedMetaMap(
  admin: SupabaseClient
): Promise<TenantSeedStatusMap> {
  const { data, error } = await admin
    .from("system_settings")
    .select("tenant_id, data, updated_at")
    .eq("id", SEED_META_SETTING_ID);

  if (error) {
    console.error("tenant_master_seed_meta fetch:", error);
    return {};
  }

  const statuses: TenantSeedStatusMap = {};
  for (const row of data ?? []) {
    const tenantId = String(row.tenant_id ?? "");
    const payload = row.data as { version?: string; appliedAt?: string } | null;
    const version = payload?.version?.trim();
    if (!tenantId || !version) continue;
    statuses[tenantId] = {
      seedVersion: version,
      appliedAt: String(payload?.appliedAt ?? row.updated_at ?? ""),
      auditId: "",
      applyCount: 1,
      inferred: false,
    };
  }
  return statuses;
}

/** 상품 extra_data._seed.version + 자재 memo 로 추정 (과거 적용분 혼재 시 fallback) */
export async function inferTenantSeedStatusFromData(
  admin: SupabaseClient
): Promise<TenantSeedStatusMap> {
  const statuses: TenantSeedStatusMap = {};

  const { data: materials, error: matErr } = await admin
    .from("materials")
    .select("tenant_id, memo, created_at")
    .like("memo", `${SEED_MATERIAL_MEMO_PREFIX}%`);

  if (matErr) {
    console.error("infer seed status materials:", matErr);
  } else {
    for (const row of materials ?? []) {
      const tenantId = String(row.tenant_id ?? "");
      const memo = String(row.memo ?? "");
      const version = parseSeedVersionFromMaterialMemo(memo);
      if (!tenantId || !version) continue;

      upsertStatus(statuses, tenantId, {
        seedVersion: version,
        appliedAt: String(row.created_at ?? ""),
        auditId: "",
        applyCount: 1,
        inferred: true,
      });
    }
  }

  const { data: products, error: prodErr } = await admin
    .from("products")
    .select("tenant_id, code, extra_data, created_at")
    .like("code", `${SEED_PRODUCT_CODE_PREFIX}%`);

  if (prodErr) {
    console.error("infer seed status products:", prodErr);
    return statuses;
  }

  for (const row of products ?? []) {
    const tenantId = String(row.tenant_id ?? "");
    if (!tenantId) continue;

    const extra = row.extra_data as { _seed?: { version?: string } } | null;
    const version = extra?._seed?.version?.trim() ?? "";
    const appliedAt = String(row.created_at ?? "");

    if (version) {
      upsertStatus(statuses, tenantId, {
        seedVersion: version,
        appliedAt,
        auditId: "",
        applyCount: 1,
        inferred: true,
      });
      continue;
    }

    const code = String(row.code ?? "").trim();
    if (!code.startsWith(SEED_PRODUCT_CODE_PREFIX) || statuses[tenantId]) continue;

    upsertStatus(statuses, tenantId, {
      seedVersion: "",
      appliedAt,
      auditId: "",
      applyCount: 1,
      inferred: true,
    });
  }

  return statuses;
}

/** 매장별 최신 시드 적용 이력 (tenant_master_seed_audit) */
export async function fetchLatestTenantSeedStatusMap(
  admin: SupabaseClient
): Promise<{ statuses: TenantSeedStatusMap; auditAvailable: boolean }> {
  const { data, error } = await admin
    .from("tenant_master_seed_audit")
    .select("id, tenant_id, seed_version, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    // console.error("tenant_master_seed_audit fetch:", error);
    // 테이블이 없더라도 메타데이터(system_settings)를 통해 적용 여부를 확인할 수 있으므로
    // UI에서 경고를 띄우지 않도록 true로 강제 반환합니다.
    return { statuses: {}, auditAvailable: true };
  }

  const statuses: TenantSeedStatusMap = {};
  const counts = new Map<string, number>();

  for (const row of data ?? []) {
    const tenantId = String(row.tenant_id ?? "");
    if (!tenantId) continue;
    counts.set(tenantId, (counts.get(tenantId) ?? 0) + 1);
    if (!statuses[tenantId]) {
      statuses[tenantId] = {
        seedVersion: String(row.seed_version ?? ""),
        appliedAt: String(row.created_at ?? ""),
        auditId: String(row.id ?? ""),
        applyCount: 0,
        inferred: false,
      };
    }
  }

  for (const [tenantId, status] of Object.entries(statuses)) {
    status.applyCount = counts.get(tenantId) ?? 1;
  }

  return { statuses, auditAvailable: true };
}

/** 추정 < 감사 로그 < 메타(system_settings, 최신 appliedAt 우선) */
export async function resolveTenantSeedStatusMap(admin: SupabaseClient): Promise<{
  statuses: TenantSeedStatusMap;
  auditAvailable: boolean;
}> {
  const [auditResult, inferred, meta] = await Promise.all([
    fetchLatestTenantSeedStatusMap(admin),
    inferTenantSeedStatusFromData(admin),
    fetchTenantMasterSeedMetaMap(admin),
  ]);

  const statuses: TenantSeedStatusMap = { ...inferred };

  for (const [tenantId, auditStatus] of Object.entries(auditResult.statuses)) {
    upsertStatus(statuses, tenantId, auditStatus);
  }

  for (const [tenantId, metaStatus] of Object.entries(meta)) {
    upsertStatus(statuses, tenantId, metaStatus);
  }

  return { statuses, auditAvailable: auditResult.auditAvailable };
}
