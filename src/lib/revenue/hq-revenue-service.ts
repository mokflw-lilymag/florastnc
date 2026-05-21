import type { SupabaseClient } from "@supabase/supabase-js";
import { aggregateTenantRevenue } from "./attribution-service";

export interface HqBranchRevenueRow {
  tenant_id: string;
  tenant_name: string | null;
  total_attributed: number;
  attribution_count: number;
  campaign_count: number;
}

/** HQ 조직 소속 지점별 Floxync 귀속 매출 (P4-S4) */
export async function aggregateHqBranchRevenue(
  db: SupabaseClient,
  organizationId: string,
  periodStart: string,
  periodEnd: string
): Promise<HqBranchRevenueRow[]> {
  const { data: branches, error } = await db
    .from("tenants")
    .select("id, name")
    .eq("organization_id", organizationId);

  if (error) throw error;
  if (!branches?.length) return [];

  const branchIds = new Set(branches.map((b) => b.id as string));
  const all = await aggregateTenantRevenue(db, periodStart, periodEnd);

  return all
    .filter((t) => branchIds.has(t.tenant_id))
    .map((t) => ({
      tenant_id: t.tenant_id,
      tenant_name: t.tenant_name,
      total_attributed: t.total_attributed,
      attribution_count: t.attribution_count,
      campaign_count: t.campaign_count,
    }))
    .sort((a, b) => b.total_attributed - a.total_attributed);
}

export async function resolveUserOrganizationId(
  db: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data: profile } = await db.from("profiles").select("tenant_id").eq("id", userId).maybeSingle();
  if (!profile?.tenant_id) return null;

  const { data: tenant } = await db
    .from("tenants")
    .select("organization_id")
    .eq("id", profile.tenant_id)
    .maybeSingle();

  return (tenant?.organization_id as string) ?? null;
}
