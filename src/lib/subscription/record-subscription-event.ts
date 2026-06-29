import { createAdminClient } from "@/utils/supabase/admin";
import type { RecordSubscriptionEventInput, TenantSubscriptionEventRow } from "./subscription-events";

export async function findSubscriptionEventByExternalRef(
  externalRef: string,
): Promise<TenantSubscriptionEventRow | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from("tenant_subscription_events")
    .select("*")
    .eq("external_ref", externalRef)
    .maybeSingle();

  if (error) {
    console.error("[subscription-events] find by external_ref:", error.message);
    return null;
  }
  return (data as TenantSubscriptionEventRow | null) ?? null;
}

export async function recordSubscriptionEvent(
  input: RecordSubscriptionEventInput,
): Promise<TenantSubscriptionEventRow | null> {
  const admin = createAdminClient();
  if (!admin) {
    console.error("[subscription-events] admin client unavailable — event not recorded");
    return null;
  }

  const row = {
    tenant_id: input.tenantId,
    event_type: input.eventType,
    source: input.source,
    actor_user_id: input.actorUserId ?? null,
    actor_email: input.actorEmail ?? null,
    plan_before: input.planBefore ?? null,
    plan_after: input.planAfter ?? null,
    period: input.period ?? null,
    months_granted: input.monthsGranted ?? null,
    amount_cents: input.amountCents ?? null,
    currency: input.currency ?? null,
    subscription_end_before: input.subscriptionEndBefore ?? null,
    subscription_end_after: input.subscriptionEndAfter ?? null,
    reason: input.reason?.trim() || null,
    external_ref: input.externalRef ?? null,
    metadata: input.metadata ?? {},
  };

  const { data, error } = await admin
    .from("tenant_subscription_events")
    .insert(row)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505" && input.externalRef) {
      return findSubscriptionEventByExternalRef(input.externalRef);
    }
    console.error("[subscription-events] insert failed:", error.message);
    return null;
  }

  return data as TenantSubscriptionEventRow;
}

export async function listSubscriptionEventsForTenant(
  tenantId: string,
  limit = 50,
): Promise<TenantSubscriptionEventRow[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data, error } = await admin
    .from("tenant_subscription_events")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[subscription-events] list failed:", error.message);
    return [];
  }

  return (data as TenantSubscriptionEventRow[]) ?? [];
}

export interface ListSubscriptionEventsQuery {
  tenantId?: string;
  eventType?: "payment" | "admin_grant";
  source?: "toss" | "stripe" | "admin";
  limit?: number;
  offset?: number;
}

export interface SubscriptionEventWithTenant extends TenantSubscriptionEventRow {
  tenant_name?: string | null;
}

export async function listSubscriptionEvents(
  query: ListSubscriptionEventsQuery = {},
): Promise<{ events: SubscriptionEventWithTenant[]; total: number }> {
  const admin = createAdminClient();
  if (!admin) return { events: [], total: 0 };

  const limit = Math.min(Math.max(query.limit ?? 100, 1), 500);
  const offset = Math.max(query.offset ?? 0, 0);

  let q = admin
    .from("tenant_subscription_events")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (query.tenantId) q = q.eq("tenant_id", query.tenantId);
  if (query.eventType) q = q.eq("event_type", query.eventType);
  if (query.source) q = q.eq("source", query.source);

  const { data, error, count } = await q;

  if (error) {
    console.error("[subscription-events] global list failed:", error.message);
    return { events: [], total: 0 };
  }

  const events = (data as TenantSubscriptionEventRow[]) ?? [];
  const tenantIds = [...new Set(events.map((e) => e.tenant_id))];
  const nameByTenant = new Map<string, string>();

  if (tenantIds.length > 0) {
    const { data: tenants } = await admin.from("tenants").select("id, name").in("id", tenantIds);
    for (const t of tenants ?? []) {
      nameByTenant.set(t.id as string, String(t.name ?? ""));
    }
  }

  return {
    events: events.map((e) => ({
      ...e,
      tenant_name: nameByTenant.get(e.tenant_id) ?? null,
    })),
    total: count ?? events.length,
  };
}
