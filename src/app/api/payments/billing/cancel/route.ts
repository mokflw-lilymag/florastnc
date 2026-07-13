import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { pickUiText } from "@/i18n/pick-ui-text";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import { getStripe } from "@/lib/stripe/server";

export async function POST(request: NextRequest) {
  try {
    const bl = await hqApiUiBase(request);
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json({ message: "Tenant not found" }, { status: 403 });
    }

    const { data: tenant } = await supabase
      .from("tenants")
      .select("stripe_subscription_id, toss_billing_key")
      .eq("id", profile.tenant_id)
      .single();

    if (!tenant) {
      return NextResponse.json({ message: "Tenant not found" }, { status: 404 });
    }

    await supabase.from("tenants").update({
      cancel_at_period_end: true,
    }).eq("id", profile.tenant_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to cancel subscription:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
