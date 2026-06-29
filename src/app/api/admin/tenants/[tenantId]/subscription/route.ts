import { NextResponse } from "next/server";
import { effectiveIsSuperAdmin, requireAuthenticated } from "@/lib/auth-api-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import {
  errAdminForbidden,
  errAdminOperationFailed,
  errAdminServerMisconfigured,
} from "@/lib/admin/admin-api-errors";
import { recordSubscriptionEvent } from "@/lib/subscription/record-subscription-event";
import { monthsBetweenEnds } from "@/lib/subscription/subscription-events";
import type { Period } from "@/app/dashboard/subscription/plan-localized";
import { isBillingPeriod } from "@/lib/subscription/subscription-period";

type RouteCtx = { params: Promise<{ tenantId: string }> };

const ALLOWED_PLANS = new Set(["free", "ribbon_only", "light", "pro", "pro_plus"]);
const ALLOWED_STATUS = new Set(["active", "suspended"]);

export async function PATCH(req: Request, ctx: RouteCtx) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const bl = await hqApiUiBase(req);
  if (!effectiveIsSuperAdmin(gate.profile, gate.email)) {
    return NextResponse.json({ error: errAdminForbidden(bl) }, { status: 403 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: errAdminServerMisconfigured(bl) }, { status: 500 });
  }

  const { tenantId } = await ctx.params;
  if (!tenantId) {
    return NextResponse.json({ error: "tenantId required" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const plan = typeof body.plan === "string" ? body.plan : "";
  const status = typeof body.status === "string" ? body.status : "";
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  const grantKind = typeof body.grantKind === "string" ? body.grantKind : "manual";
  const periodRaw = typeof body.period === "string" ? body.period : null;

  if (!ALLOWED_PLANS.has(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }
  if (!ALLOWED_STATUS.has(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  if (!reason || reason.length < 2) {
    return NextResponse.json(
      { error: "변경 사유를 2자 이상 입력해 주세요." },
      { status: 400 },
    );
  }

  let subscriptionEnd: string | null;
  if (body.subscriptionEnd === null || body.subscriptionEnd === "") {
    subscriptionEnd = null;
  } else if (typeof body.subscriptionEnd === "string") {
    subscriptionEnd = body.subscriptionEnd;
  } else {
    return NextResponse.json({ error: "subscriptionEnd required" }, { status: 400 });
  }

  const period: Period | null =
    periodRaw && isBillingPeriod(periodRaw) ? periodRaw : null;

  const { data: before, error: fetchErr } = await admin
    .from("tenants")
    .select("id, name, plan, status, subscription_end")
    .eq("id", tenantId)
    .maybeSingle();

  if (fetchErr || !before) {
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 404 });
  }

  const subscriptionEndBefore = before.subscription_end ?? null;

  const { error: updateErr } = await admin
    .from("tenants")
    .update({
      plan,
      status,
      is_premium: plan === "pro_plus" || plan === "pro",
      subscription_end: subscriptionEnd,
      ...(subscriptionEnd ? { subscription_start: new Date().toISOString() } : {}),
    })
    .eq("id", tenantId);

  if (updateErr) {
    console.error("[admin subscription patch]", updateErr);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  const monthsGranted =
    typeof body.monthsGranted === "number"
      ? body.monthsGranted
      : monthsBetweenEnds(subscriptionEndBefore, subscriptionEnd);

  const event = await recordSubscriptionEvent({
    tenantId,
    eventType: "admin_grant",
    source: "admin",
    actorUserId: gate.userId,
    actorEmail: gate.email,
    planBefore: before.plan,
    planAfter: plan,
    period,
    monthsGranted,
    subscriptionEndBefore,
    subscriptionEndAfter: subscriptionEnd,
    reason,
    metadata: {
      grant_kind: grantKind,
      tenant_name: before.name,
      status_before: before.status,
      status_after: status,
    },
  });

  if (!event) {
    console.warn("[admin subscription patch] tenant updated but audit insert failed");
  }

  return NextResponse.json({
    ok: true,
    tenantId,
    subscription_end: subscriptionEnd,
    eventId: event?.id ?? null,
  });
}
