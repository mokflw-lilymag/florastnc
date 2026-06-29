import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import { pickUiText } from "@/i18n/pick-ui-text";
import { getStripe } from "@/lib/stripe/server";
import { applySubscriptionToTenant } from "@/lib/subscription/apply-subscription";
import { parseSubscriptionOrderId } from "@/lib/subscription/order-id";
import type { PlanId, Period } from "@/app/dashboard/subscription/plan-localized";

const inFlightSessions = new Set<string>();

function tr(bl: string, ko: string, en: string) {
  return pickUiText(bl, ko, en);
}

export async function POST(request: Request) {
  const bl = await hqApiUiBase(request);
  let sessionId: string | undefined;

  try {
    const body = await request.json();
    sessionId = typeof body?.sessionId === "string" ? body.sessionId.trim() : undefined;

    if (!sessionId) {
      return NextResponse.json(
        { message: tr(bl, "결제 세션 정보가 없습니다.", "Missing payment session.") },
        { status: 400 },
      );
    }

    if (inFlightSessions.has(sessionId)) {
      return NextResponse.json(
        {
          success: true,
          message: tr(
            bl,
            "이미 처리 중입니다. 잠시 후 대시보드를 확인해 주세요.",
            "Already processing. Check your dashboard shortly.",
          ),
        },
        { status: 202 },
      );
    }
    inFlightSessions.add(sessionId);

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        {
          message: tr(bl, "Stripe 설정이 없습니다.", "Stripe is not configured."),
          code: "STRIPE_CONFIG_MISSING",
        },
        { status: 503 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { message: tr(bl, "로그인이 필요합니다.", "Sign in required.") },
        { status: 401 },
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json(
        { message: tr(bl, "회원사 정보가 없습니다.", "Tenant profile is missing.") },
        { status: 403 },
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        {
          message: tr(bl, "결제가 완료되지 않았습니다.", "Payment is not completed."),
          status: session.payment_status,
        },
        { status: 400 },
      );
    }

    const metaTenant = session.metadata?.tenant_id;
    if (metaTenant && metaTenant !== profile.tenant_id) {
      return NextResponse.json(
        { message: tr(bl, "결제 대상 매장이 일치하지 않습니다.", "Tenant mismatch.") },
        { status: 403 },
      );
    }

    let planId = session.metadata?.plan_id as PlanId | undefined;
    let period = session.metadata?.period as Period | undefined;

    const orderId = session.metadata?.order_id;
    if ((!planId || !period) && orderId) {
      const parsed = parseSubscriptionOrderId(orderId);
      if (parsed) {
        planId = parsed.planId;
        period = parsed.period;
      }
    }

    if (!planId || !period) {
      return NextResponse.json(
        { message: tr(bl, "구독 정보를 확인할 수 없습니다.", "Could not resolve subscription.") },
        { status: 400 },
      );
    }

    const result = await applySubscriptionToTenant(
      supabase,
      profile.tenant_id,
      planId,
      period,
      {
        actorUserId: user.id,
        actorEmail: user.email ?? undefined,
        source: "stripe",
        externalRef: sessionId,
        amountCents: session.amount_total ?? undefined,
        currency: (session.currency ?? "usd").toUpperCase(),
        orderId: orderId ?? undefined,
      },
    );

    return NextResponse.json({
      success: true,
      message: tr(bl, "결제가 성공적으로 처리되었습니다.", "Payment was processed successfully."),
      plan: result.planId,
      expiry: result.expiry,
      monthsGranted: result.monthsGranted,
    });
  } catch (e) {
    console.error("[stripe/confirm]", e);
    return NextResponse.json(
      { message: tr(bl, "결제 확인 중 오류가 발생했습니다.", "Payment confirmation failed.") },
      { status: 500 },
    );
  } finally {
    if (sessionId) inFlightSessions.delete(sessionId);
  }
}
