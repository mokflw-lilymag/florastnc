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
  actorUserId: string;
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

  const months = subscriptionMonths(planId, period);
  const now = new Date();

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
      actorUserId: paymentContext.actorUserId,
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
