import type { SupabaseClient } from "@supabase/supabase-js";
import { createCampaign, generateCampaignCode } from "./attribution-service";
import { buildAnniversaryOrderLink } from "./anniversary-utils";
import {
  FOLLOWUP_DELAYS_DAYS,
  ORDER_FOLLOWUP_TEMPLATES,
  type FollowupMessageContext,
} from "./order-followup-templates";
import type { CampaignType } from "./types";
import { sendAnniversaryReminder } from "./messaging";
import { checkCampaignSendAllowed, capExpectedRevenue, loadCouponLimits } from "./coupon-limits";
import { loadTenantRevenueAccess } from "./tenant-access";
import { hasRevenueFeature } from "./plan-access";
import {
  loadTenantMessageTemplates,
  renderFollowupMessageWithTemplate,
} from "./template-service";

export interface OrderFollowupPayload {
  orderId: string;
  tenantId: string;
  deliveredAt?: string;
}

async function loadOrderContext(db: SupabaseClient, orderId: string, tenantId: string) {
  const { data: order, error } = await db
    .from("orders")
    .select("id, tenant_id, order_number, orderer, items, status")
    .eq("id", orderId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) throw error;
  if (!order) return null;

  const orderer = order.orderer as { id?: string; name?: string; contact?: string };
  const contact = orderer?.contact?.trim();
  if (!contact) return null;

  let marketingConsent = false;
  let customerId = orderer.id ?? null;

  if (customerId) {
    const { data: cust } = await db
      .from("customers")
      .select("id, marketing_consent")
      .eq("id", customerId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (cust) {
      marketingConsent = cust.marketing_consent === true;
      customerId = cust.id as string;
    }
  } else if (contact) {
    const { data: cust } = await db
      .from("customers")
      .select("id, marketing_consent")
      .eq("tenant_id", tenantId)
      .eq("contact", contact)
      .eq("is_deleted", false)
      .maybeSingle();
    if (cust) {
      marketingConsent = cust.marketing_consent === true;
      customerId = cust.id as string;
    }
  }

  const { data: tenant } = await db.from("tenants").select("name").eq("id", tenantId).maybeSingle();
  const items = (order.items as { name?: string }[]) ?? [];
  const productSummary = items.map((i) => i.name).filter(Boolean).slice(0, 2).join(", ");

  return {
    order,
    customerId,
    contact,
    customerName: orderer?.name ?? "고객",
    shopName: (tenant?.name as string) ?? undefined,
    productSummary,
    marketingConsent,
  };
}

async function followupAlreadySent(
  db: SupabaseClient,
  tenantId: string,
  orderId: string,
  campaignType: CampaignType
): Promise<boolean> {
  const { data } = await db
    .from("marketing_campaigns")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("order_id", orderId)
    .eq("campaign_type", campaignType)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

export async function sendOrderFollowupStep(
  db: SupabaseClient,
  params: {
    orderId: string;
    tenantId: string;
    step: keyof typeof ORDER_FOLLOWUP_TEMPLATES;
    appUrl?: string;
  }
) {
  const { data: settings } = await db
    .from("revenue_autopilot_settings")
    .select("order_followup_autopilot")
    .eq("tenant_id", params.tenantId)
    .maybeSingle();

  if (!settings?.order_followup_autopilot) {
    return { status: "skipped" as const, reason: "autopilot_off" };
  }

  const access = await loadTenantRevenueAccess(db, params.tenantId);
  if (!hasRevenueFeature(access.ctx, "order_followup")) {
    return { status: "skipped" as const, reason: "plan_upgrade_required" };
  }

  const ctx = await loadOrderContext(db, params.orderId, params.tenantId);
  if (!ctx) return { status: "skipped" as const, reason: "order_not_found" };
  if (!ctx.marketingConsent) return { status: "skipped" as const, reason: "no_consent" };

  const template = ORDER_FOLLOWUP_TEMPLATES[params.step];

  if (ctx.customerId) {
    const sendCheck = await checkCampaignSendAllowed(db, {
      tenantId: params.tenantId,
      customerId: ctx.customerId,
      campaignType: template.campaignType,
    });
    if (!sendCheck.allowed) {
      return { status: "skipped" as const, reason: sendCheck.reason ?? "send_cap" };
    }
  }

  if (await followupAlreadySent(db, params.tenantId, params.orderId, template.campaignType)) {
    return { status: "skipped" as const, reason: "already_sent" };
  }

  const customTemplates = await loadTenantMessageTemplates(db, params.tenantId);
  const limits = await loadCouponLimits(db);

  const campaignCode = generateCampaignCode("ord-fu");
  const appUrl = params.appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://floxync.com";
  const orderLink = ctx.customerId
    ? buildAnniversaryOrderLink(appUrl, ctx.customerId, campaignCode)
    : undefined;

  const messageCtx: FollowupMessageContext = {
    customerName: ctx.customerName,
    orderNumber: ctx.order.order_number as string,
    shopName: ctx.shopName,
    productSummary: ctx.productSummary,
    orderLink,
  };

  const text = renderFollowupMessageWithTemplate(params.step, customTemplates, messageCtx);
  const sent = await sendAnniversaryReminder(db, {
    tenantId: params.tenantId,
    to: ctx.contact,
    text,
    customerName: ctx.customerName,
  });

  if (!sent.ok) {
    return { status: "failed" as const, reason: sent.error };
  }

  const channel = sent.channel === "alimtalk" ? "alimtalk" : sent.channel === "sms" ? "sms" : "copy";

  const campaign = await createCampaign(db, params.tenantId, {
    campaign_code: campaignCode,
    campaign_type: template.campaignType,
    channel,
    status: sent.channel === "log" ? "degraded" : "sent",
    title: `${ctx.customerName} · ${template.label}`,
    customer_id: ctx.customerId ?? undefined,
    order_id: params.orderId,
    expected_revenue: capExpectedRevenue(template.expectedRevenueKrw, limits),
    attribution_link: orderLink,
    executed_at: new Date().toISOString(),
    metadata: {
      order_id: params.orderId,
      step: params.step,
      delay_days: FOLLOWUP_DELAYS_DAYS[params.step],
      send_mode: sent.channel,
    },
  });

  return { status: "sent" as const, campaignId: campaign.id, campaignCode };
}

export async function startOrderFollowupChain(
  db: SupabaseClient,
  payload: OrderFollowupPayload,
  opts?: { appUrl?: string; immediateOnly?: boolean }
) {
  const ctx = await loadOrderContext(db, payload.orderId, payload.tenantId);
  if (!ctx) return { started: false, reason: "order_not_found" };

  if (opts?.immediateOnly) {
    const r = await sendOrderFollowupStep(db, {
      orderId: payload.orderId,
      tenantId: payload.tenantId,
      step: "order_followup_d1",
      appUrl: opts.appUrl,
    });
    return { started: true, immediate: r };
  }

  return {
    started: true,
    orderId: payload.orderId,
    tenantId: payload.tenantId,
    deliveredAt: payload.deliveredAt ?? new Date().toISOString(),
  };
}
