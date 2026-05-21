import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CreateAttributionInput,
  CreateCampaignInput,
  MarketingAttribution,
  MarketingCampaign,
  TenantRevenueSummary,
} from "./types";

function slugCampaignCode(prefix: string): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${ts}-${rand}`;
}

export function generateCampaignCode(prefix = "cmp"): string {
  return slugCampaignCode(prefix);
}

export async function listCampaigns(
  db: SupabaseClient,
  tenantId: string,
  opts?: { limit?: number; status?: string }
): Promise<MarketingCampaign[]> {
  let q = db
    .from("marketing_campaigns")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 50);

  if (opts?.status) q = q.eq("status", opts.status);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as MarketingCampaign[];
}

export async function createCampaign(
  db: SupabaseClient,
  tenantId: string,
  input: CreateCampaignInput
): Promise<MarketingCampaign> {
  const row = {
    tenant_id: tenantId,
    campaign_code: input.campaign_code || generateCampaignCode(input.campaign_type),
    campaign_type: input.campaign_type,
    channel: input.channel ?? "alimtalk",
    status: input.status ?? "draft",
    title: input.title ?? null,
    metadata: input.metadata ?? {},
    attribution_link: input.attribution_link ?? null,
    expected_revenue: input.expected_revenue ?? 0,
    customer_id: input.customer_id ?? null,
    order_id: input.order_id ?? null,
    scheduled_at: input.scheduled_at ?? null,
    executed_at: input.executed_at ?? null,
  };

  const { data, error } = await db.from("marketing_campaigns").insert(row).select("*").single();
  if (error) throw error;
  return data as MarketingCampaign;
}

export async function listAttributions(
  db: SupabaseClient,
  tenantId: string,
  opts?: { limit?: number; from?: string; to?: string }
): Promise<MarketingAttribution[]> {
  let q = db
    .from("marketing_attributions")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("matched_at", { ascending: false })
    .limit(opts?.limit ?? 100);

  if (opts?.from) q = q.gte("matched_at", opts.from);
  if (opts?.to) q = q.lte("matched_at", opts.to);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as MarketingAttribution[];
}

export async function createAttribution(
  db: SupabaseClient,
  tenantId: string,
  input: CreateAttributionInput
): Promise<MarketingAttribution> {
  const { data: campaign, error: campErr } = await db
    .from("marketing_campaigns")
    .select("id, tenant_id, campaign_code")
    .eq("id", input.campaign_id)
    .maybeSingle();

  if (campErr) throw campErr;
  if (!campaign || campaign.tenant_id !== tenantId) {
    throw new Error("CAMPAIGN_NOT_FOUND");
  }

  const row = {
    tenant_id: tenantId,
    campaign_id: input.campaign_id,
    order_id: input.order_id ?? null,
    customer_id: input.customer_id ?? null,
    attributed_amount: input.attributed_amount,
    currency: input.currency ?? "KRW",
    attribution_window_days: input.attribution_window_days ?? 7,
    utm_source: input.utm_source ?? "floxync",
    utm_medium: input.utm_medium ?? campaign.campaign_code,
    utm_campaign: input.utm_campaign ?? campaign.campaign_code,
    notes: input.notes ?? null,
  };

  const { data, error } = await db.from("marketing_attributions").insert(row).select("*").single();
  if (error) throw error;

  if (input.order_id) {
    await db
      .from("orders")
      .update({ attribution_campaign_id: input.campaign_id })
      .eq("id", input.order_id)
      .eq("tenant_id", tenantId);
  }

  return data as MarketingAttribution;
}

/** 슈퍼관리자: 기간별 테넌트 증분 매출 집계 */
export async function aggregateTenantRevenue(
  db: SupabaseClient,
  periodStart: string,
  periodEnd: string
): Promise<TenantRevenueSummary[]> {
  const { data: attributions, error } = await db
    .from("marketing_attributions")
    .select("tenant_id, attributed_amount, matched_at")
    .gte("matched_at", periodStart)
    .lte("matched_at", periodEnd);

  if (error) throw error;

  const byTenant = new Map<
    string,
    { total: number; count: number }
  >();

  for (const row of attributions ?? []) {
    const tid = row.tenant_id as string;
    const cur = byTenant.get(tid) ?? { total: 0, count: 0 };
    cur.total += Number(row.attributed_amount) || 0;
    cur.count += 1;
    byTenant.set(tid, cur);
  }

  const tenantIds = [...byTenant.keys()];
  let tenantNames = new Map<string, string>();

  if (tenantIds.length > 0) {
    const { data: tenants } = await db.from("tenants").select("id, name").in("id", tenantIds);
    tenantNames = new Map((tenants ?? []).map((t) => [t.id as string, (t.name as string) ?? null]));
  }

  const { data: campaignCounts } = await db
    .from("marketing_campaigns")
    .select("tenant_id")
    .gte("created_at", periodStart)
    .lte("created_at", periodEnd);

  const campByTenant = new Map<string, number>();
  for (const c of campaignCounts ?? []) {
    const tid = c.tenant_id as string;
    campByTenant.set(tid, (campByTenant.get(tid) ?? 0) + 1);
  }

  return tenantIds.map((tenant_id) => {
    const agg = byTenant.get(tenant_id)!;
    return {
      tenant_id,
      tenant_name: tenantNames.get(tenant_id) ?? null,
      total_attributed: agg.total,
      attribution_count: agg.count,
      campaign_count: campByTenant.get(tenant_id) ?? 0,
      period_start: periodStart,
      period_end: periodEnd,
    };
  }).sort((a, b) => b.total_attributed - a.total_attributed);
}

export async function getTenantAttributedTotal(
  db: SupabaseClient,
  tenantId: string,
  periodStart?: string,
  periodEnd?: string
): Promise<number> {
  let q = db
    .from("marketing_attributions")
    .select("attributed_amount")
    .eq("tenant_id", tenantId);

  if (periodStart) q = q.gte("matched_at", periodStart);
  if (periodEnd) q = q.lte("matched_at", periodEnd);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).reduce((sum, r) => sum + (Number(r.attributed_amount) || 0), 0);
}
