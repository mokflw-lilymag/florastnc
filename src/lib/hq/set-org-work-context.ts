import type { SupabaseClient } from "@supabase/supabase-js";

/** org_work_tenant_id + 만료 시각 설정 (컬럼 없으면 tenant_id만 설정) */
export async function setOrgWorkContext(
  admin: SupabaseClient,
  userId: string,
  tenantId: string,
): Promise<{ ok: boolean; error?: string }> {
  const now = new Date().toISOString();
  const withTs = await admin
    .from("profiles")
    .update({ org_work_tenant_id: tenantId, org_work_context_at: now })
    .eq("id", userId);

  if (!withTs.error) return { ok: true };

  if (withTs.error.message?.includes("org_work_context_at")) {
    const fallback = await admin
      .from("profiles")
      .update({ org_work_tenant_id: tenantId })
      .eq("id", userId);
    if (fallback.error) return { ok: false, error: fallback.error.message };
    return { ok: true };
  }

  return { ok: false, error: withTs.error.message };
}

export async function clearOrgWorkContext(
  admin: SupabaseClient,
  userId: string,
): Promise<void> {
  const withTs = await admin
    .from("profiles")
    .update({ org_work_tenant_id: null, org_work_context_at: null })
    .eq("id", userId);

  if (withTs.error?.message?.includes("org_work_context_at")) {
    await admin.from("profiles").update({ org_work_tenant_id: null }).eq("id", userId);
  }
}
