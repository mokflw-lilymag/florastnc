import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { pickUiText } from "@/i18n/pick-ui-text";
import { errAdminOperationFailed } from "@/lib/admin/admin-api-errors";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";

const inFlightPayments = new Set<string>();

export async function POST(request: NextRequest) {
  let paymentKey: string | undefined;
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
    paymentKey = payload?.paymentKey;
    const orderId = payload?.orderId;
    const amount = payload?.amount;

    if (!paymentKey || !orderId || !amount) {
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

    if (inFlightPayments.has(paymentKey)) {
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
    inFlightPayments.add(paymentKey);

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

    // 3. Verify with Toss Payments Server API
    // Auth Header: Basic [Base64(SecretKey:)]
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

    const tossResponse = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: `Basic ${encryptedSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount,
      }),
    });

    const tossData = await tossResponse.json();

    if (!tossResponse.ok) {
       console.error("Toss verification failed:", tossData);
       return NextResponse.json(
        {
          message: tr(
            "결제 승인에 실패했습니다. 결제 정보를 확인한 뒤 다시 시도해주세요.",
            "Payment confirmation failed. Please verify payment details and try again."
          ),
          code: (tossData as { code?: string })?.code ?? "TOSS_CONFIRM_FAILED",
        },
        { status: tossResponse.status }
      );
    }

    // 4. Update Database
    // Parse planId from orderId (Expected format: tenantId_planId_period_timestamp)
    const orderParts = orderId.split("_");
    if (orderParts.length < 3) {
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
    const planId = orderParts[1];
    const period = orderParts[2];
    
    // Calculate new subscription_end date
    const months = period === "12m" ? 12 : period === "6m" ? 6 : period === "3m" ? 3 : 1;
    const now = new Date();
    const expiry = new Date(now.setMonth(now.getMonth() + months));

    const { error: updateError } = await supabase
      .from("tenants")
      .update({
        plan: planId,
        status: "active",
        subscription_start: new Date().toISOString(),
        subscription_end: expiry.toISOString(),
      })
      .eq("id", profile.tenant_id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ 
      success: true, 
      message: tr("결제가 성공적으로 처리되었습니다.", "Payment was processed successfully."),
      plan: planId,
      expiry: expiry.toISOString()
    });

  } catch (error: unknown) {
    console.error("Payment confirmation critical error:", error);
    const bl = await hqApiUiBase(request);
    return NextResponse.json({ message: errAdminOperationFailed(bl) }, { status: 500 });
  } finally {
    if (paymentKey) {
      inFlightPayments.delete(paymentKey);
    }
  }
}
