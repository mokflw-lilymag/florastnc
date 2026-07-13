import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { pickUiText } from "@/i18n/pick-ui-text";
import { errAdminOperationFailed } from "@/lib/admin/admin-api-errors";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import { applySubscriptionToTenant } from "@/lib/subscription/apply-subscription";
import { parseSubscriptionOrderId } from "@/lib/subscription/order-id";
import { addMonths } from "date-fns";

const inFlightPayments = new Set<string>();

export async function POST(request: NextRequest) {
  let authKey: string | undefined;
  try {
    const bl = await hqApiUiBase(request);
    const tr = (
      ko: string,
      en: string,
      vi?: string,
      ja?: string,
      zh?: string,
      es?: string,
      pt?: string,
      fr?: string,
      de?: string,
      ru?: string
    ) => pickUiText(bl, ko, en, vi, ja, zh, es, pt, fr, de, ru);
    
    const payload = await request.json();
    authKey = payload?.authKey;
    const customerKey = payload?.customerKey;
    const orderId = payload?.orderId;
    const amount = payload?.amount;

    if (!authKey || !customerKey || !orderId || !amount) {
      return NextResponse.json(
        {
          message: tr(
            "결제 요청 정보가 누락되었습니다.",
            "Missing payment request information."
          ),
        },
        { status: 400 }
      );
    }

    if (inFlightPayments.has(authKey)) {
      return NextResponse.json(
        {
          success: true,
          message: tr(
            "이미 처리 중인 결제입니다. 잠시 후 상태를 확인해주세요.",
            "This payment is already being processed. Please check again shortly."
          ),
        },
        { status: 202 }
      );
    }
    inFlightPayments.add(authKey);

    const supabase = await createClient();
    
    // 1. Get logged in user and tenant
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: tr("로그인이 필요합니다.", "Sign in required.") }, { status: 401 });
    }

    // 2. Fetch profile to get tenant_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json(
        { message: tr("회원사 정보가 없습니다.", "Tenant profile is missing.") },
        { status: 403 }
      );
    }

    const widgetSecretKey = process.env.TOSS_SECRET_KEY;
    if (!widgetSecretKey) {
      console.error("[Payment Confirm][CONFIG_MISSING] TOSS_SECRET_KEY 누락");
      return NextResponse.json(
        {
          message: tr(
            "결제 서버 설정이 누락되었습니다.",
            "Payment server configuration is missing."
          ),
          code: "CONFIG_MISSING",
        },
        { status: 503 }
      );
    }
    const encryptedSecretKey = Buffer.from(widgetSecretKey + ":").toString("base64");

    // 3. Issue Billing Key
    const authResponse = await fetch("https://api.tosspayments.com/v1/billing/authorizations/issue", {
      method: "POST",
      headers: {
        Authorization: `Basic ${encryptedSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        authKey,
        customerKey,
      }),
    });

    const authData = await authResponse.json();

    if (!authResponse.ok) {
       console.error("Toss billing issue failed:", authData);
       return NextResponse.json(
        {
          message: tr(
            "결제 카드 등록에 실패했습니다. 카드를 확인해주세요.",
            "Card registration failed. Please check your card."
          ),
          code: (authData as { code?: string })?.code ?? "TOSS_BILLING_ISSUE_FAILED",
        },
        { status: authResponse.status }
      );
    }

    const billingKey = authData.billingKey;

    // 4. First payment using the issued billingKey
    const paymentResponse = await fetch(`https://api.tosspayments.com/v1/billing/${billingKey}`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${encryptedSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderId,
        amount,
        customerKey,
        orderName: `Subscription ${orderId}`,
        customerEmail: user.email,
      }),
    });

    const paymentData = await paymentResponse.json();

    if (!paymentResponse.ok) {
       console.error("Toss first billing payment failed:", paymentData);
       return NextResponse.json(
        {
          message: tr(
            "첫 결제 승인에 실패했습니다.",
            "First payment confirmation failed."
          ),
          code: (paymentData as { code?: string })?.code ?? "TOSS_CONFIRM_FAILED",
        },
        { status: paymentResponse.status }
      );
    }

    const parsed = parseSubscriptionOrderId(orderId);
    if (!parsed) {
      return NextResponse.json(
        {
          message: tr(
            "결제 주문번호 형식이 올바르지 않습니다. 다시 시도해주세요.",
            "Invalid payment order number format. Please try again."
          ),
        },
        { status: 400 }
      );
    }

    // Calculate months to grant
    const months = parsed.period === "12m" ? 12 : 1;

    // 5. Apply subscription first to get the correctly stacked expiry date
    const result = await applySubscriptionToTenant(
      supabase,
      profile.tenant_id,
      parsed.planId,
      parsed.period,
      {
        actorUserId: user.id,
        actorEmail: user.email ?? undefined,
        source: "toss",
        externalRef: paymentData.paymentKey,
        amountCents: Number(amount),
        currency: "KRW",
        orderId,
      },
    );

    // 6. Update tenant with billing info and correctly stacked next_billing_date
    await supabase.from("tenants").update({
      toss_billing_key: billingKey,
      auto_billing_enabled: true,
      next_billing_date: result.expiry,
      cancel_at_period_end: false,
    }).eq("id", profile.tenant_id);

    return NextResponse.json({
      success: true,
      message: tr("결제가 성공적으로 처리되었습니다.", "Payment was processed successfully."),
      plan: result.planId,
      expiry: result.expiry,
      monthsGranted: result.monthsGranted,
    });

  } catch (error: unknown) {
    console.error("Payment confirmation critical error:", error);
    const bl = await hqApiUiBase(request);
    return NextResponse.json({ message: errAdminOperationFailed(bl) }, { status: 500 });
  } finally {
    if (authKey) {
      inFlightPayments.delete(authKey);
    }
  }
}
