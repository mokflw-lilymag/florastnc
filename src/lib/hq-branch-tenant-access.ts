import type { SupabaseClient } from "@supabase/supabase-js";

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
  }
): Promise<AccessResult> {
  const { branchTenantId, isSuperAdmin, orgIds } = params;
  const { data: t, error } = await admin
    .from("tenants")
    .select("id, organization_id")
    .eq("id", branchTenantId)
    .maybeSingle();

  if (error || !t) {
    return { ok: false, status: 404, message: "지점을 찾을 수 없습니다." };
  }
  if (!t.organization_id) {
    return { ok: false, status: 403, message: "조직에 연결된 지점만 처리할 수 있습니다." };
  }
  if (isSuperAdmin) return { ok: true };
  if (!orgIds.length || !orgIds.includes(t.organization_id as string)) {
    return { ok: false, status: 403, message: "Forbidden" };
  }
  return { ok: true };
}
