import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { resolveEffectiveTenantId } from "@/lib/revenue/resolve-tenant";
import { createAdminClient } from "@/utils/supabase/admin";
import { matchOrderAttribution } from "@/lib/revenue/attribution-match";

/** POST — 주문 생성 후 UTM campaign_code 귀속 매칭 */
export async function POST(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const tenantId = await resolveEffectiveTenantId(gate.supabase, gate.userId);
  if (!tenantId) return NextResponse.json({ error: "TENANT_REQUIRED" }, { status: 400 });

  let body: {
    orderId?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    customerId?: string;
    attributedAmount?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  if (!body.orderId || body.attributedAmount == null) {
    return NextResponse.json({ error: "ORDER_ID_AND_AMOUNT_REQUIRED" }, { status: 400 });
  }

  const db = createAdminClient() ?? gate.supabase;

  try {
    const result = await matchOrderAttribution(db, tenantId, {
      orderId: body.orderId,
      utmSource: body.utmSource,
      utmMedium: body.utmMedium,
      utmCampaign: body.utmCampaign,
      customerId: body.customerId,
      attributedAmount: Number(body.attributedAmount),
    });
    return NextResponse.json(result, { status: result.matched ? 201 : 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
