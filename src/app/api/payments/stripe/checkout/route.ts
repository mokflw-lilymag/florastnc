import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import { pickUiText } from "@/i18n/pick-ui-text";
import { getStripe } from "@/lib/stripe/server";
import { buildSubscriptionOrderId } from "@/lib/subscription/order-id";
import {
  PLAN_USD_TOTAL_CENTS,
  planDisplayName,
} from "@/lib/subscription/pricing";
import type { Period, PlanId } from "@/app/dashboard/subscription/plan-localized";
import { PERIOD_LABELS } from "@/app/dashboard/subscription/plan-localized";

function tr(
  bl: string,
  ko: string,
  en: string,
  vi?: string,
  ja?: string,
  zh?: string,
) {
  return pickUiText(bl, ko, en, vi, ja, zh);
}

export async function POST(request: Request) {
  const bl = await hqApiUiBase(request);
  try {
    const body = await request.json();
    const planId = body?.planId as PlanId | undefined;
    const period = body?.period as Period | undefined;
    const uiLocale = typeof body?.uiLocale === "string" ? body.uiLocale : null;

    if (!planId || !period || !["ribbon_only", "light", "pro", "pro_plus"].includes(planId)) {
      return NextResponse.json(
        { message: tr(bl, "플랜 정보가 올바르지 않습니다.", "Invalid plan.") },
        { status: 400 },
      );
    }
    if (!["1m", "12m"].includes(period)) {
      return NextResponse.json(
        { message: tr(bl, "기간 정보가 올바르지 않습니다.", "Invalid billing period.") },
        { status: 400 },
      );
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        {
          message: tr(
            bl,
            "해외 카드 결제(Stripe) 설정이 없습니다. 관리자에게 문의하세요.",
            "International card payments (Stripe) are not configured. Contact support.",
          ),
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

    const { data: tenant } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", profile.tenant_id)
      .maybeSingle();

    const amountCents = PLAN_USD_TOTAL_CENTS[planId][period];
    const orderId = buildSubscriptionOrderId(profile.tenant_id, planId, period);
    const origin = new URL(request.url).origin;

    const periodLabelEn = PERIOD_LABELS[period][1];
    const productName = `${planDisplayName(planId)} (${periodLabelEn})`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: profile.tenant_id,
      customer_email: user.email ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amountCents,
            product_data: {
              name: productName,
              description: "FloXync subscription",
            },
          },
        },
      ],
      metadata: {
        tenant_id: profile.tenant_id,
        plan_id: planId,
        period,
        order_id: orderId,
        ui_locale: uiLocale ?? "",
      },
      success_url: `${origin}/dashboard/subscription/success?provider=stripe&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard/subscription/fail?provider=stripe`,
    });

    if (!session.url) {
      return NextResponse.json(
        { message: tr(bl, "결제 페이지를 만들지 못했습니다.", "Could not create checkout session.") },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (e) {
    console.error("[stripe/checkout]", e);
    return NextResponse.json(
      { message: tr(bl, "결제 준비 중 오류가 발생했습니다.", "Failed to prepare payment.") },
      { status: 500 },
    );
  }
}
