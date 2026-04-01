import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { paymentKey, orderId, amount } = await request.json();
    const supabase = await createClient();
    
    // 1. Get logged in user and tenant
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
    }

    // 2. Fetch profile to get tenant_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json({ message: "회원사 정보가 없습니다." }, { status: 403 });
    }

    // 3. Verify with Toss Payments Server API
    // Auth Header: Basic [Base64(SecretKey:)]
    const widgetSecretKey = process.env.TOSS_SECRET_KEY!;
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
       return NextResponse.json(tossData, { status: tossResponse.status });
    }

    // 4. Update Database
    // Parse planId from orderId (Expected format: tenantId_planId_period_timestamp)
    const [_, planId, period] = orderId.split("_");
    
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
      message: "결제가 성공적으로 처리되었습니다.",
      plan: planId,
      expiry: expiry.toISOString()
    });

  } catch (error: any) {
    console.error("Payment confirmation critical error:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
