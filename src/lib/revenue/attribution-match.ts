import type { SupabaseClient } from "@supabase/supabase-js";
import { createAttribution } from "./attribution-service";

export interface MatchOrderAttributionInput {
  orderId: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  customerId?: string;
  attributedAmount: number;
}

/** UTM campaign_code → marketing_campaigns → marketing_attributions */
export async function matchOrderAttribution(
  db: SupabaseClient,
  tenantId: string,
  input: MatchOrderAttributionInput
) {
  const code = input.utmCampaign?.trim();
  if (!code) return { matched: false, reason: "no_utm_campaign" };

  const { data: existing } = await db
    .from("marketing_attributions")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("order_id", input.orderId)
    .limit(1);

  if ((existing?.length ?? 0) > 0) {
    return { matched: false, reason: "already_attributed" };
  }

  const { data: campaign, error } = await db
    .from("marketing_campaigns")
    .select("id, campaign_code, campaign_type, customer_id")
    .eq("tenant_id", tenantId)
    .eq("campaign_code", code)
    .maybeSingle();

  if (error) throw error;
  if (!campaign) return { matched: false, reason: "campaign_not_found" };

  const attribution = await createAttribution(db, tenantId, {
    campaign_id: campaign.id,
    order_id: input.orderId,
    customer_id: input.customerId ?? (campaign.customer_id as string | undefined),
    attributed_amount: input.attributedAmount,
    utm_source: input.utmSource ?? "floxync",
    utm_medium: input.utmMedium ?? campaign.campaign_type,
    utm_campaign: code,
    notes: "auto_match_from_order",
  });

  return { matched: true, attributionId: attribution.id, campaignId: campaign.id };
}
