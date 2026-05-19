import type { SupabaseClient } from "@supabase/supabase-js";
import type { Period, PlanId } from "@/app/dashboard/subscription/plan-localized";
import { subscriptionMonths } from "@/lib/subscription/order-id";

export async function applySubscriptionToTenant(
  supabase: SupabaseClient,
  tenantId: string,
  planId: PlanId,
  period: Period,
) {
  const months = subscriptionMonths(period);
  const now = new Date();
  const expiry = new Date(now);
  expiry.setMonth(expiry.getMonth() + months);

  const { error } = await supabase
    .from("tenants")
    .update({
      plan: planId,
      status: "active",
      subscription_start: new Date().toISOString(),
      subscription_end: expiry.toISOString(),
    })
    .eq("id", tenantId);

  if (error) throw error;

  return { planId, expiry: expiry.toISOString() };
}
