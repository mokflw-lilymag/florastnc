import type { SupabaseClient } from "@supabase/supabase-js";
import { createCampaign, generateCampaignCode } from "./attribution-service";
import {
  anniversaryMatchesD7,
  buildAnniversaryOrderLink,
  DEFAULT_ANNIVERSARY_EXPECTED_KRW,
  toKstYmd,
  addDaysToYmd,
} from "./anniversary-utils";
import { sendAnniversaryReminder } from "./messaging";
import { checkCampaignSendAllowed, capExpectedRevenue, loadCouponLimits } from "./coupon-limits";
import { loadTenantRevenueAccess, assertFreeCampaignQuota } from "./tenant-access";
import { hasRevenueFeature } from "./plan-access";
import {
  loadTenantMessageTemplates,
  renderAnniversaryMessageWithTemplate,
} from "./template-service";

export interface AnniversaryTarget {
  anniversaryId: string;
  tenantId: string;
  tenantName: string | null;
  tenantLogoUrl: string | null;
  customerId: string;
  customerName: string;
  contact: string;
  email?: string | null;
  label: string;
  anniversaryDate: string;
  recurringYearly: boolean;
  eventDateYmd: string;
}

export interface ProcessAnniversaryResult {
  anniversaryId: string;
  customerId: string;
  tenantId: string;
  status: "sent" | "skipped" | "failed";
  reason?: string;
  campaignId?: string;
  campaignCode?: string;
}

export async function listAnniversaryD7Targets(
  db: SupabaseClient,
  runAt: Date,
  opts?: { tenantId?: string }
): Promise<AnniversaryTarget[]> {
  const runYmd = toKstYmd(runAt);
  const eventYmd = addDaysToYmd(runYmd, 7);

  let autopilotQuery = db
    .from("revenue_autopilot_settings")
    .select("tenant_id")
    .eq("anniversary_autopilot", true);

  if (opts?.tenantId) {
    autopilotQuery = autopilotQuery.eq("tenant_id", opts.tenantId);
  }

  const { data: autopilotRows, error: apErr } = await autopilotQuery;
  if (apErr) throw apErr;

  const tenantIds = (autopilotRows ?? []).map((r) => r.tenant_id as string);
  if (tenantIds.length === 0) return [];

  const { data: rows, error } = await db
    .from("customer_anniversaries")
    .select(
      `
      id,
      tenant_id,
      customer_id,
      label,
      anniversary_date,
      recurring_yearly,
      customers!inner (
        id,
        name,
        contact,
        email,
        marketing_consent,
        is_deleted
      )
    `
    )
    .in("tenant_id", tenantIds);

  if (error) throw error;

  const tenantNames = new Map<string, string>();
  const tenantLogos = new Map<string, string>();
  const { data: tenants } = await db.from("tenants").select("id, name, logo_url").in("id", tenantIds);
  for (const t of tenants ?? []) {
    tenantNames.set(t.id as string, (t.name as string) ?? "");
    if (t.logo_url) tenantLogos.set(t.id as string, t.logo_url as string);
  }

  const targets: AnniversaryTarget[] = [];

  for (const row of rows ?? []) {
    const raw = row.customers;
    const customer = (Array.isArray(raw) ? raw[0] : raw) as {
      id: string;
      name: string;
      contact: string;
      email?: string | null;
      marketing_consent: boolean;
      is_deleted: boolean;
    } | null;

    if (!customer || customer.is_deleted) continue;
    if (!customer.marketing_consent) continue;
    if (!customer.contact?.trim() && !customer.email?.trim()) continue;

    const recurring = row.recurring_yearly !== false;
    if (!anniversaryMatchesD7(row.anniversary_date as string, runAt, recurring)) continue;

    targets.push({
      anniversaryId: row.id as string,
      tenantId: row.tenant_id as string,
      tenantName: tenantNames.get(row.tenant_id as string) ?? null,
      tenantLogoUrl: tenantLogos.get(row.tenant_id as string) ?? null,
      customerId: customer.id,
      customerName: customer.name,
      contact: customer.contact,
      email: customer.email ?? null,
      label: (row.label as string) || "기념일",
      anniversaryDate: row.anniversary_date as string,
      recurringYearly: recurring,
      eventDateYmd: eventYmd,
    });
  }

  return targets;
}

async function alreadySentToday(
  db: SupabaseClient,
  tenantId: string,
  customerId: string,
  eventDateYmd: string,
  runYmd: string
): Promise<boolean> {
  const { data } = await db
    .from("marketing_campaigns")
    .select("id, metadata")
    .eq("tenant_id", tenantId)
    .eq("campaign_type", "anniversary_d7")
    .eq("customer_id", customerId)
    .gte("created_at", `${runYmd}T00:00:00`)
    .lte("created_at", `${runYmd}T23:59:59`);

  return (data ?? []).some((c) => {
    const meta = c.metadata as Record<string, unknown> | null;
    return meta?.event_date === eventDateYmd;
  });
}

export async function processAnniversaryTarget(
  db: SupabaseClient,
  target: AnniversaryTarget,
  runAt: Date,
  opts?: { dryRun?: boolean; appUrl?: string }
): Promise<ProcessAnniversaryResult> {
  const runYmd = toKstYmd(runAt);
  const base: ProcessAnniversaryResult = {
    anniversaryId: target.anniversaryId,
    customerId: target.customerId,
    tenantId: target.tenantId,
    status: "skipped",
  };

  if (await alreadySentToday(db, target.tenantId, target.customerId, target.eventDateYmd, runYmd)) {
    return { ...base, reason: "already_sent_today" };
  }

  const access = await loadTenantRevenueAccess(db, target.tenantId);
  if (!hasRevenueFeature(access.ctx, "anniversary_d7")) {
    return { ...base, reason: "plan_upgrade_required" };
  }
  const quota = await assertFreeCampaignQuota(db, target.tenantId, access.plan);
  if (!quota.ok) {
    return { ...base, reason: "free_campaign_limit" };
  }

  const sendCheck = await checkCampaignSendAllowed(db, {
    tenantId: target.tenantId,
    customerId: target.customerId,
    campaignType: "anniversary_d7",
  });
  if (!sendCheck.allowed) {
    return { ...base, reason: sendCheck.reason ?? "send_cap" };
  }

  const customTemplates = await loadTenantMessageTemplates(db, target.tenantId);
  const limits = await loadCouponLimits(db);

  const campaignCode = generateCampaignCode("ann-d7");
  const appUrl = opts?.appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://floxync.com";
  const orderLink = buildAnniversaryOrderLink(appUrl, target.customerId, campaignCode);
  const message = renderAnniversaryMessageWithTemplate(customTemplates, {
    customerName: target.customerName,
    label: target.label,
    eventDateYmd: target.eventDateYmd,
    shopName: target.tenantName ?? undefined,
    orderLink,
  });

  if (opts?.dryRun) {
    return { ...base, status: "skipped", reason: "dry_run" };
  }

  const customerEmail = target.email?.trim();
  if (customerEmail) {
    const { sendAnniversaryD7Email } = await import("@/lib/email/anniversary-email");
    const emailResult = await sendAnniversaryD7Email(db, {
      tenantId: target.tenantId,
      to: customerEmail,
      customerName: target.customerName,
      label: target.label,
      eventDateYmd: target.eventDateYmd,
      orderLink,
      shopName: target.tenantName ?? undefined,
      shopLogoUrl: target.tenantLogoUrl ?? undefined,
    });

    if (emailResult.ok) {
      const campaign = await createCampaign(db, target.tenantId, {
        campaign_code: campaignCode,
        campaign_type: "anniversary_d7",
        channel: "email",
        status: "sent",
        title: `${target.customerName} · ${target.label} D-7 (이메일)`,
        customer_id: target.customerId,
        expected_revenue: capExpectedRevenue(DEFAULT_ANNIVERSARY_EXPECTED_KRW, limits),
        attribution_link: orderLink,
        executed_at: new Date().toISOString(),
        metadata: {
          anniversary_id: target.anniversaryId,
          event_date: target.eventDateYmd,
          d7_run_date: runYmd,
          send_mode: "email",
        },
      });

      return {
        ...base,
        status: "sent",
        campaignId: campaign.id,
        campaignCode: campaign.campaign_code,
      };
    }
  }

  const sent = await sendAnniversaryReminder(db, {
    tenantId: target.tenantId,
    to: target.contact,
    text: message,
    customerName: target.customerName,
  });

  if (!sent.ok) {
    return { ...base, status: "failed", reason: sent.error ?? "send_failed" };
  }

  const campaignChannel =
    sent.channel === "alimtalk" ? "alimtalk" : sent.channel === "sms" ? "sms" : "copy";

  const campaign = await createCampaign(db, target.tenantId, {
    campaign_code: campaignCode,
    campaign_type: "anniversary_d7",
    channel: campaignChannel,
    status: sent.channel === "log" ? "degraded" : "sent",
    title: `${target.customerName} · ${target.label} D-7`,
    customer_id: target.customerId,
    expected_revenue: capExpectedRevenue(DEFAULT_ANNIVERSARY_EXPECTED_KRW, limits),
    attribution_link: orderLink,
    executed_at: new Date().toISOString(),
    metadata: {
      anniversary_id: target.anniversaryId,
      event_date: target.eventDateYmd,
      d7_run_date: runYmd,
      message_preview: message.slice(0, 120),
      send_mode: sent.channel,
    },
  });

  return {
    ...base,
    status: "sent",
    campaignId: campaign.id,
    campaignCode: campaign.campaign_code,
  };
}

export async function runAnniversaryD7Batch(
  db: SupabaseClient,
  runAt: Date,
  opts?: { tenantId?: string; dryRun?: boolean; appUrl?: string }
) {
  const targets = await listAnniversaryD7Targets(db, runAt, { tenantId: opts?.tenantId });
  const results: ProcessAnniversaryResult[] = [];

  for (const target of targets) {
    const result = await processAnniversaryTarget(db, target, runAt, {
      dryRun: opts?.dryRun,
      appUrl: opts?.appUrl,
    });
    results.push(result);
  }

  return {
    runDate: toKstYmd(runAt),
    eventDate: addDaysToYmd(toKstYmd(runAt), 7),
    targetCount: targets.length,
    sent: results.filter((r) => r.status === "sent").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    failed: results.filter((r) => r.status === "failed").length,
    results,
  };
}
