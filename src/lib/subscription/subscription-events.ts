import type { Period, PlanId } from "@/app/dashboard/subscription/plan-localized";

export type SubscriptionEventType = "payment" | "admin_grant" | "referral_reward";
export type SubscriptionEventSource = "toss" | "stripe" | "admin";

export interface TenantSubscriptionEventRow {
  id: string;
  tenant_id: string;
  event_type: SubscriptionEventType;
  source: SubscriptionEventSource;
  actor_user_id: string | null;
  actor_email: string | null;
  plan_before: string | null;
  plan_after: string | null;
  period: string | null;
  months_granted: number | null;
  amount_cents: number | null;
  currency: string | null;
  subscription_end_before: string | null;
  subscription_end_after: string | null;
  reason: string | null;
  external_ref: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface RecordSubscriptionEventInput {
  tenantId: string;
  eventType: SubscriptionEventType;
  source: SubscriptionEventSource;
  actorUserId?: string | null;
  actorEmail?: string | null;
  planBefore?: string | null;
  planAfter?: string | null;
  period?: Period | null;
  monthsGranted?: number | null;
  amountCents?: number | null;
  currency?: string | null;
  subscriptionEndBefore?: string | null;
  subscriptionEndAfter?: string | null;
  reason?: string | null;
  externalRef?: string | null;
  metadata?: Record<string, unknown>;
}

export function monthsBetweenEnds(before: string | null | undefined, after: string | null | undefined): number | null {
  if (!after) return null;
  const end = new Date(after);
  const base = before && new Date(before) > new Date() ? new Date(before) : new Date();
  const diffMs = end.getTime() - base.getTime();
  if (diffMs <= 0) return 0;
  return Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24 * 30.4375)));
}

export function eventTypeLabelKo(eventType: SubscriptionEventType, source: SubscriptionEventSource): string {
  if (eventType === "payment") {
    if (source === "toss") return "실결제 (토스)";
    if (source === "stripe") return "실결제 (Stripe)";
    return "실결제";
  }
  return "관리자 부여";
}

export function planIdLabel(plan: string | null | undefined): string {
  switch (plan) {
    case "ribbon_only":
      return "리본 라이센스";
    case "light":
      return "플로비서 라이트";
    case "pro":
      return "플로비서 프로";
    case "pro_plus":
      return "플로비서 프로+";
    case "free":
      return "무료 체험";
    default:
      return plan ?? "-";
  }
}

export function periodLabelKo(period: string | null | undefined): string {
  if (period === "1m") return "월간";
  if (period === "12m") return "연간";
  return period ?? "-";
}
