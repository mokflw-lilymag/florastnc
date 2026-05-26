/** Floxync Revenue Engine — shared types (Phase 0+) */

export const CAMPAIGN_TYPES = [
  "anniversary_d7",
  "order_followup_d1",
  "order_followup_d7",
  "order_followup_d30",
  "flash_sale",
  "sns_instagram",
  "sns_naver",
  "sns_copy",
  "alimtalk",
  "sms",
  "other",
] as const;

export type CampaignType = (typeof CAMPAIGN_TYPES)[number];

export const CAMPAIGN_CHANNELS = [
  "alimtalk",
  "sms",
  "instagram",
  "naver_blog",
  "copy",
  "push",
  "other",
] as const;

export type CampaignChannel = (typeof CAMPAIGN_CHANNELS)[number];

export const CAMPAIGN_STATUSES = [
  "draft",
  "scheduled",
  "sent",
  "published",
  "degraded",
  "failed",
  "cancelled",
] as const;

export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export interface MarketingCampaign {
  id: string;
  tenant_id: string;
  campaign_code: string;
  campaign_type: CampaignType;
  channel: CampaignChannel;
  status: CampaignStatus;
  title: string | null;
  metadata: Record<string, unknown>;
  attribution_link: string | null;
  expected_revenue: number;
  customer_id: string | null;
  order_id: string | null;
  scheduled_at: string | null;
  executed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketingAttribution {
  id: string;
  tenant_id: string;
  campaign_id: string;
  order_id: string | null;
  customer_id: string | null;
  attributed_amount: number;
  currency: string;
  attribution_window_days: number;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  matched_at: string;
  notes: string | null;
  created_at: string;
}

export interface CreateCampaignInput {
  campaign_code?: string;
  campaign_type: CampaignType;
  channel?: CampaignChannel;
  title?: string;
  metadata?: Record<string, unknown>;
  attribution_link?: string;
  expected_revenue?: number;
  customer_id?: string;
  order_id?: string;
  scheduled_at?: string;
  status?: CampaignStatus;
  executed_at?: string;
}

export interface CreateAttributionInput {
  campaign_id: string;
  order_id?: string;
  customer_id?: string;
  attributed_amount: number;
  currency?: string;
  attribution_window_days?: number;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  notes?: string;
}

export interface TenantRevenueSummary {
  tenant_id: string;
  tenant_name: string | null;
  total_attributed: number;
  attribution_count: number;
  campaign_count: number;
  period_start: string;
  period_end: string;
}

export const REVENUE_INTEGRATIONS_KEY = "revenue_integrations";

export interface RevenueIntegrationsConfig {
  postiz_api_url?: string;
  postiz_api_key?: string;
  postiz_api_key_set?: boolean;
  trigger_project_ref?: string;
  trigger_env?: "DEVELOPMENT" | "STAGING" | "PRODUCTION";
  n8n_deprecated?: boolean;
}

export const REVENUE_COUPON_LIMITS_KEY = "revenue_coupon_limits";

export interface RevenueCouponLimitsConfig {
  max_campaigns_per_customer_per_month: number;
  max_expected_revenue_krw: number;
  min_resend_interval_days: number;
}
