import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { resolveEffectiveTenantId } from "@/lib/revenue/resolve-tenant";
import { createAdminClient } from "@/utils/supabase/admin";
import { assertRevenueFeature } from "@/lib/revenue/tenant-access";

/** POST — 플래시 draft → sent/published 승인 (P3-U2) · PATCH 취소 */
export async function POST(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const tenantId = await resolveEffectiveTenantId(gate.supabase, gate.userId);
  if (!tenantId) return NextResponse.json({ error: "TENANT_REQUIRED" }, { status: 400 });

  let body: { campaignId?: string; action?: "approve" | "send_mock" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  if (!body.campaignId) return NextResponse.json({ error: "CAMPAIGN_ID_REQUIRED" }, { status: 400 });

  const db = createAdminClient() ?? gate.supabase;
  const flashGate = await assertRevenueFeature(db, tenantId, "flash_sale");
  if (!flashGate.ok) {
    return NextResponse.json({ error: flashGate.error }, { status: flashGate.status });
  }

  const { data: campaign, error } = await db
    .from("marketing_campaigns")
    .select("*")
    .eq("id", body.campaignId)
    .eq("tenant_id", tenantId)
    .eq("campaign_type", "flash_sale")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!campaign) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const meta = campaign.metadata as { message?: string; product_id?: string };
  const status = body.action === "send_mock" ? "degraded" : "sent";

  const { data: updated, error: upErr } = await db
    .from("marketing_campaigns")
    .update({
      status,
      executed_at: new Date().toISOString(),
      channel: "copy",
      metadata: { ...meta, approved_at: new Date().toISOString(), mode: "flash_manual" },
    })
    .eq("id", body.campaignId)
    .select("*")
    .single();

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  return NextResponse.json({
    campaign: updated,
    campaignCode: campaign.campaign_code,
    messagePreview: meta.message,
    attributionHint: `주문 UTM campaign=${campaign.campaign_code} 로 귀속됩니다.`,
    hint: "고객에게 알림톡/SMS 또는 SNS에 플래시 문구를 복사해 발송하세요.",
  });
}

export async function PATCH(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const tenantId = await resolveEffectiveTenantId(gate.supabase, gate.userId);
  if (!tenantId) return NextResponse.json({ error: "TENANT_REQUIRED" }, { status: 400 });

  let body: { campaignId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const db = createAdminClient() ?? gate.supabase;
  await db
    .from("marketing_campaigns")
    .update({ status: "cancelled" })
    .eq("id", body.campaignId)
    .eq("tenant_id", tenantId);

  return NextResponse.json({ cancelled: true });
}
