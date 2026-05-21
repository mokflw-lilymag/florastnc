import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { resolveEffectiveTenantId } from "@/lib/revenue/resolve-tenant";
import { createAdminClient } from "@/utils/supabase/admin";
import { suggestMarketingFromOrder } from "@/lib/revenue/suggest-from-order";
import { assertRevenueFeature } from "@/lib/revenue/tenant-access";

/** POST — 완료 주문 기반 인스타·네이버 초안 생성 */
export async function POST(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const tenantId = await resolveEffectiveTenantId(gate.supabase, gate.userId);
  if (!tenantId) return NextResponse.json({ error: "TENANT_REQUIRED" }, { status: 400 });

  let body: { orderId?: string; persona?: string; saveDrafts?: boolean; contentType?: string; promoTopicIndex?: number; abTest?: boolean; naverSeoTemplateId?: string; region?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  if (!body.orderId) {
    return NextResponse.json({ error: "ORDER_ID_REQUIRED" }, { status: 400 });
  }

  const db = createAdminClient() ?? gate.supabase;

  if (body.abTest) {
    const abGate = await assertRevenueFeature(db, tenantId, "sns_autopilot");
    if (!abGate.ok) return NextResponse.json({ error: abGate.error, feature: "ab_test" }, { status: abGate.status });
  }
  if (body.naverSeoTemplateId) {
    const seoGate = await assertRevenueFeature(db, tenantId, "naver_seo_pack");
    if (!seoGate.ok) return NextResponse.json({ error: seoGate.error, feature: "naver_seo_pack" }, { status: seoGate.status });
  }

  try {
    const result = await suggestMarketingFromOrder(db, tenantId, body.orderId, {
      persona: body.persona,
      saveDrafts: body.saveDrafts,
      contentType: body.contentType,
      promoTopicIndex: body.promoTopicIndex,
      abTest: body.abTest,
      naverSeoTemplateId: body.naverSeoTemplateId,
      region: body.region,
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    if (msg === "ORDER_NOT_FOUND") {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    if (msg.includes("Gemini API Key")) {
      return NextResponse.json({ error: "GEMINI_KEY_MISSING" }, { status: 503 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
