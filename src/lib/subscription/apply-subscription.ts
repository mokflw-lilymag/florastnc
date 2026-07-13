import type { SupabaseClient } from "@supabase/supabase-js";
import { addMonths } from "date-fns";
import type { Period, PlanId } from "@/app/dashboard/subscription/plan-localized";
import { subscriptionMonths } from "@/lib/subscription/subscription-period";
import type { SubscriptionEventSource } from "@/lib/subscription/subscription-events";
import {
  findSubscriptionEventByExternalRef,
  recordSubscriptionEvent,
} from "@/lib/subscription/record-subscription-event";

export interface ApplySubscriptionPaymentContext {
  actorUserId?: string;
  actorEmail?: string;
  source: SubscriptionEventSource;
  externalRef: string;
  amountCents?: number;
  currency?: string;
  orderId?: string;
}

export interface ApplySubscriptionResult {
  planId: PlanId;
  period: Period;
  monthsGranted: number;
  expiry: string;
  alreadyProcessed?: boolean;
}

export async function applySubscriptionToTenant(
  supabase: SupabaseClient,
  tenantId: string,
  planId: PlanId,
  period: Period,
  paymentContext?: ApplySubscriptionPaymentContext,
): Promise<ApplySubscriptionResult> {
  if (paymentContext?.externalRef) {
    const existing = await findSubscriptionEventByExternalRef(paymentContext.externalRef);
    if (existing?.subscription_end_after) {
      return {
        planId: (existing.plan_after as PlanId) ?? planId,
        period,
        monthsGranted: existing.months_granted ?? subscriptionMonths(planId, period),
        expiry: existing.subscription_end_after,
        alreadyProcessed: true,
      };
    }
  }

  let months = subscriptionMonths(planId, period);
  const now = new Date();

  // --- Referral Reward Processing ---
  // Check if there is an ungranted referral reward for this tenant
  const { data: pendingReferral } = await supabase
    .from("referral_logs")
    .select("id, referrer_tenant_id")
    .eq("referred_tenant_id", tenantId)
    .eq("reward_granted", false)
    .maybeSingle();

  if (pendingReferral) {
    // Fetch reward configuration
    const { data: settings } = await supabase
      .from("system_settings")
      .select("data")
      .eq("id", "hq")
      .maybeSingle();

    const referrerBonus = Number((settings?.data as any)?.referralRewardMonthsReferrer ?? 1);
    const refereeBonus = Number((settings?.data as any)?.referralRewardMonthsReferee ?? 1);

    // Add bonus months to the referee (current user paying)
    months += refereeBonus;

    // Grant bonus to the referrer
    const { data: referrerTenant } = await supabase
      .from("tenants")
      .select("subscription_end, next_billing_date")
      .eq("id", pendingReferral.referrer_tenant_id)
      .maybeSingle();

    if (referrerTenant) {
      let referrerBase = now;
      if (referrerTenant.subscription_end) {
        const refEnd = new Date(referrerTenant.subscription_end);
        if (refEnd > now) referrerBase = refEnd;
      }
      const newReferrerEnd = addMonths(referrerBase, referrerBonus).toISOString();
      
      let newReferrerNextBilling = referrerTenant.next_billing_date;
      if (referrerTenant.next_billing_date) {
        const refNext = new Date(referrerTenant.next_billing_date);
        newReferrerNextBilling = addMonths(refNext > now ? refNext : now, referrerBonus).toISOString();
      }

      await supabase
        .from("tenants")
        .update({
          subscription_end: newReferrerEnd,
          next_billing_date: newReferrerNextBilling,
        })
        .eq("id", pendingReferral.referrer_tenant_id);
    }

    // Mark reward as granted
    await supabase
      .from("referral_logs")
      .update({ reward_granted: true })
      .eq("id", pendingReferral.id);
  }
  // ---------------------------------

  const { data: tenant } = await supabase
    .from("tenants")
    .select("plan, subscription_end")
    .eq("id", tenantId)
    .maybeSingle();

  const planBefore = (tenant?.plan as string | null) ?? null;
  const subscriptionEndBefore = tenant?.subscription_end ?? null;

  let base = now;
  if (tenant?.subscription_end) {
    const currentEnd = new Date(tenant.subscription_end);
    if (currentEnd > now) {
      base = currentEnd;
    }
  }

  const expiry = addMonths(base, months);

  const { error } = await supabase
    .from("tenants")
    .update({
      plan: planId,
      period: period,
      status: "active",
      subscription_start: now.toISOString(),
      subscription_end: expiry.toISOString(),
    })
    .eq("id", tenantId);

  if (error) throw error;

  const expiryIso = expiry.toISOString();

  if (paymentContext) {
    await recordSubscriptionEvent({
      tenantId,
      eventType: "payment",
      source: paymentContext.source,
      actorUserId: paymentContext.actorUserId ?? "system",
      actorEmail: paymentContext.actorEmail,
      planBefore,
      planAfter: planId,
      period,
      monthsGranted: months,
      amountCents: paymentContext.amountCents,
      currency: paymentContext.currency,
      subscriptionEndBefore,
      subscriptionEndAfter: expiryIso,
      externalRef: paymentContext.externalRef,
      metadata: {
        order_id: paymentContext.orderId ?? paymentContext.externalRef,
      },
    });
  }

  return { planId, period, monthsGranted: months, expiry: expiryIso };
}
