import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { resolveEffectiveTenantId } from "@/lib/revenue/resolve-tenant";
import { createAdminClient } from "@/utils/supabase/admin";
import { assertRevenueFeature } from "@/lib/revenue/tenant-access";

/** GET/PATCH 테넌트 Auto-Pilot 설정 */
export async function GET(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const tenantId = await resolveEffectiveTenantId(gate.supabase, gate.userId);
  if (!tenantId) return NextResponse.json({ error: "TENANT_REQUIRED" }, { status: 400 });

  const db = createAdminClient() ?? gate.supabase;
  const { data, error } = await db
    .from("revenue_autopilot_settings")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error && !error.message.includes("does not exist")) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    settings: data ?? {
      tenant_id: tenantId,
      anniversary_autopilot: false,
      order_followup_autopilot: false,
      sns_autopilot: false,
      flash_autopilot: false,
      sns_requires_approval: true,
      message_templates: {},
      marketing_persona: "warm",
      promo_topics: ["기념일 꽃다발", "감사 선물", "계절 추천 꽃"],
    },
  });
}

export async function PATCH(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const tenantId = await resolveEffectiveTenantId(gate.supabase, gate.userId);
  if (!tenantId) return NextResponse.json({ error: "TENANT_REQUIRED" }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const boolKeys = [
    "anniversary_autopilot",
    "order_followup_autopilot",
    "sns_autopilot",
    "flash_autopilot",
    "sns_requires_approval",
  ] as const;

  const db = createAdminClient() ?? gate.supabase;

  for (const [key, feature] of Object.entries({
    anniversary_autopilot: "anniversary_d7" as const,
    order_followup_autopilot: "order_followup" as const,
    sns_autopilot: "sns_autopilot" as const,
    flash_autopilot: "flash_sale" as const,
  })) {
    if (body[key] === true) {
      const gateFeature = await assertRevenueFeature(db, tenantId, feature);
      if (!gateFeature.ok) {
        return NextResponse.json({ error: gateFeature.error, feature }, { status: gateFeature.status });
      }
    }
  }

  const patch: Record<string, unknown> = { tenant_id: tenantId };
  for (const key of boolKeys) {
    if (typeof body[key] === "boolean") patch[key] = body[key];
  }
  if (typeof body.marketing_persona === "string") {
    patch.marketing_persona = body.marketing_persona;
  }
  if (Array.isArray(body.promo_topics)) {
    patch.promo_topics = body.promo_topics.filter((t) => typeof t === "string").slice(0, 10);
  }
  if (body.message_templates && typeof body.message_templates === "object") {
    patch.message_templates = body.message_templates;
  }
  patch.updated_at = new Date().toISOString();

  const { data, error } = await db
    .from("revenue_autopilot_settings")
    .upsert(patch, { onConflict: "tenant_id" })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ settings: data });
}
