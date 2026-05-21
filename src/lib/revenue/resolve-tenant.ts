import type { SupabaseClient } from "@supabase/supabase-js";

export async function resolveEffectiveTenantId(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, org_work_tenant_id")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) return null;
  return (profile.org_work_tenant_id as string | null) ?? (profile.tenant_id as string | null);
}
