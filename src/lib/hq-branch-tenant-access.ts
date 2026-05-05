import type { SupabaseClient } from "@supabase/supabase-js";
import { errAdminForbidden } from "@/lib/admin/admin-api-errors";
import { errHqBranchNotFound, errHqBranchOrgRequired } from "@/lib/hq/hq-branch-work-api-errors";

export type AccessResult =
  | { ok: true }
  | { ok: false; status: number; message: string };

/**
 * 본사(조직 멤버) 또는 슈퍼가 해당 지점 테넌트에 대해 HQ API를 쓸 수 있는지 검사합니다.
 */
export async function assertHqAccessToBranchTenant(
  admin: SupabaseClient,
  params: {
    branchTenantId: string;
    isSuperAdmin: boolean;
    orgIds: string[];
    /** `hqApiUiBase` 결과(베이스 로케일 문자열) */
    uiBase: string;
  }
): Promise<AccessResult> {
  const { branchTenantId, isSuperAdmin, orgIds, uiBase } = params;
  const { data: t, error } = await admin
    .from("tenants")
    .select("id, organization_id")
    .eq("id", branchTenantId)
    .maybeSingle();

  if (error || !t) {
    return { ok: false, status: 404, message: errHqBranchNotFound(uiBase) };
  }
  if (!t.organization_id) {
    return { ok: false, status: 403, message: errHqBranchOrgRequired(uiBase) };
  }
  if (isSuperAdmin) return { ok: true };
  if (!orgIds.length || !orgIds.includes(t.organization_id as string)) {
    return { ok: false, status: 403, message: errAdminForbidden(uiBase) };
  }
  return { ok: true };
}
