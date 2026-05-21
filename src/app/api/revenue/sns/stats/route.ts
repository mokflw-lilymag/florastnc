import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { resolveEffectiveTenantId } from "@/lib/revenue/resolve-tenant";
import { createAdminClient } from "@/utils/supabase/admin";

/** GET — SNS 캠페인 vs 귀속 주문 (P2-U5) */
export async function GET(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const tenantId = await resolveEffectiveTenantId(gate.supabase, gate.userId);
  if (!tenantId) return NextResponse.json({ error: "TENANT_REQUIRED" }, { status: 400 });

  const db = createAdminClient() ?? gate.supabase;
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [campaignsRes, attrRes] = await Promise.all([
    db
      .from("marketing_campaigns")
      .select("id, campaign_type, status, created_at")
      .eq("tenant_id", tenantId)
      .in("campaign_type", ["sns_instagram", "sns_naver", "sns_copy"])
      .gte("created_at", since.toISOString()),
    db
      .from("marketing_attributions")
      .select("attributed_amount, utm_medium")
      .eq("tenant_id", tenantId)
      .gte("matched_at", since.toISOString()),
  ]);

  const campaigns = campaignsRes.data ?? [];
  const snsPublished = campaigns.filter((c) => c.status === "published" || c.status === "sent").length;
  const snsAttributed = (attrRes.data ?? []).filter((a) =>
    String(a.utm_medium ?? "").includes("sns") || String(a.utm_medium ?? "").includes("instagram")
  );
  const attributedTotal = snsAttributed.reduce((s, a) => s + Number(a.attributed_amount ?? 0), 0);

  return NextResponse.json({
    periodDays: 30,
    snsCampaignCount: campaigns.length,
    snsPublishedCount: snsPublished,
    snsAttributedOrderCount: snsAttributed.length,
    snsAttributedTotalKrw: attributedTotal,
  });
}
