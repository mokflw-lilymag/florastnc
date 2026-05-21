import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { resolveEffectiveTenantId } from "@/lib/revenue/resolve-tenant";
import { createAdminClient } from "@/utils/supabase/admin";
import { publishApprovedScheduledPost } from "@/lib/revenue/daily-autopilot-service";
import { assertRevenueFeature } from "@/lib/revenue/tenant-access";

/** GET — 승인 대기 목록 · POST — 승인/게시 · PATCH — 취소 */
export async function GET(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const tenantId = await resolveEffectiveTenantId(gate.supabase, gate.userId);
  if (!tenantId) return NextResponse.json({ error: "TENANT_REQUIRED" }, { status: 400 });

  const db = createAdminClient() ?? gate.supabase;
  const snsGate = await assertRevenueFeature(db, tenantId, "sns_autopilot");
  if (!snsGate.ok) {
    return NextResponse.json({ error: snsGate.error, posts: [] }, { status: snsGate.status });
  }

  const { data, error } = await db
    .from("marketing_scheduled_posts")
    .select("*")
    .eq("tenant_id", tenantId)
    .in("status", ["pending_approval", "approved"])
    .order("scheduled_at", { ascending: true })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ posts: data ?? [] });
}

export async function POST(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const tenantId = await resolveEffectiveTenantId(gate.supabase, gate.userId);
  if (!tenantId) return NextResponse.json({ error: "TENANT_REQUIRED" }, { status: 400 });

  let body: { id?: string; action?: "approve" | "publish" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ error: "ID_REQUIRED" }, { status: 400 });

  const db = createAdminClient() ?? gate.supabase;
  const snsGate = await assertRevenueFeature(db, tenantId, "sns_autopilot");
  if (!snsGate.ok) {
    return NextResponse.json({ error: snsGate.error }, { status: snsGate.status });
  }

  if (body.action === "approve" || body.action === "publish") {
    await db
      .from("marketing_scheduled_posts")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("id", body.id)
      .eq("tenant_id", tenantId);

    try {
      const result = await publishApprovedScheduledPost(db, body.id, tenantId);
      return NextResponse.json({ published: true, ...result });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "PUBLISH_FAILED";
      const { data: row } = await db
        .from("marketing_scheduled_posts")
        .select("content, title, campaign_id")
        .eq("id", body.id)
        .maybeSingle();
      const { triggerRevenueTask } = await import("@/lib/revenue/trigger-client");
      await triggerRevenueTask("revenue.postiz-fallback", {
        tenantId,
        campaignId: row?.campaign_id ?? undefined,
        caption: (row?.content as string) ?? "",
        title: row?.title ?? undefined,
        error: msg,
      });
      return NextResponse.json({ error: msg, fallback: true }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "INVALID_ACTION" }, { status: 400 });
}

export async function PATCH(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const tenantId = await resolveEffectiveTenantId(gate.supabase, gate.userId);
  if (!tenantId) return NextResponse.json({ error: "TENANT_REQUIRED" }, { status: 400 });

  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const db = createAdminClient() ?? gate.supabase;
  await db
    .from("marketing_scheduled_posts")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", body.id)
    .eq("tenant_id", tenantId);

  return NextResponse.json({ cancelled: true });
}
