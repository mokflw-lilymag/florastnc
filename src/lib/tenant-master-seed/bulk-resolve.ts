import type { SupabaseClient } from "@supabase/supabase-js";
import {
  errAdminOrganizationNotFound,
  errAdminSeedBulkMaxBranches,
  errAdminSeedBulkOrgOrBranchesRequired,
  errAdminSeedBulkOrgTenantExclusive,
  errAdminSeedBulkUnknownBranchIds,
  errAdminSeedOrgHasNoBranches,
  errAdminSeedOrgTooManyBranches,
} from "@/lib/admin/admin-api-errors";
import { TENANT_MASTER_SEED_BULK_MAX } from "./run-seed";

export type ResolveBulkTenantsInput = {
  organizationId?: string | undefined;
  tenantIds?: unknown;
};

export type ResolveBulkTenantsOk = {
  tenantIds: string[];
  organizationId?: string;
};

export type ResolveBulkTenantsErr = {
  error: string;
  status: number;
};

/**
 * 일괄 시드 대상 매장 ID를 결정합니다.
 * - `tenantIds`(비어 있지 않은 배열)가 있으면 조직 없이 직접 지정합니다. `organizationId`와 동시에 보낼 수 없습니다.
 * - 그렇지 않으면 `organizationId`로 조직에 연결된 매장을 조회합니다.
 */
export async function resolveTenantIdsForMasterSeedBulk(
  admin: SupabaseClient,
  input: ResolveBulkTenantsInput,
  uiBase: string
): Promise<ResolveBulkTenantsOk | ResolveBulkTenantsErr> {
  const orgRaw = typeof input.organizationId === "string" ? input.organizationId.trim() : "";
  const rawList = input.tenantIds;
  const fromList = Array.isArray(rawList)
    ? [...new Set(rawList.map((x) => String(x ?? "").trim()).filter(Boolean))]
    : [];

  if (fromList.length > 0) {
    if (orgRaw) {
      return {
        error: errAdminSeedBulkOrgTenantExclusive(uiBase),
        status: 400,
      };
    }
    if (fromList.length > TENANT_MASTER_SEED_BULK_MAX) {
      return {
        error: errAdminSeedBulkMaxBranches(uiBase, TENANT_MASTER_SEED_BULK_MAX),
        status: 400,
      };
    }
    const { data: rows, error } = await admin.from("tenants").select("id").in("id", fromList);
    if (error) {
      return { error: error.message, status: 500 };
    }
    const found = new Set((rows ?? []).map((r) => r.id as string));
    const missing = fromList.filter((id) => !found.has(id));
    if (missing.length > 0) {
      const sample = missing.slice(0, 3).join(", ");
      const more = missing.length > 3 ? " …" : "";
      return {
        error: errAdminSeedBulkUnknownBranchIds(uiBase, sample, more),
        status: 400,
      };
    }
    return { tenantIds: fromList };
  }

  if (!orgRaw) {
    return {
      error: errAdminSeedBulkOrgOrBranchesRequired(uiBase),
      status: 400,
    };
  }

  const { data: orgRow, error: orgErr } = await admin.from("organizations").select("id").eq("id", orgRaw).maybeSingle();
  if (orgErr) {
    return { error: orgErr.message, status: 500 };
  }
  if (!orgRow?.id) {
    return { error: errAdminOrganizationNotFound(uiBase), status: 404 };
  }

  const { data: tenantRows, error: tErr } = await admin.from("tenants").select("id").eq("organization_id", orgRaw);
  if (tErr) {
    return { error: tErr.message, status: 500 };
  }
  const tenantIds = (tenantRows ?? []).map((r) => r.id as string).filter(Boolean);
  if (tenantIds.length === 0) {
    return {
      error: errAdminSeedOrgHasNoBranches(uiBase),
      status: 400,
    };
  }
  if (tenantIds.length > TENANT_MASTER_SEED_BULK_MAX) {
    return {
      error: errAdminSeedOrgTooManyBranches(uiBase, TENANT_MASTER_SEED_BULK_MAX),
      status: 400,
    };
  }

  return { tenantIds, organizationId: orgRaw };
}
