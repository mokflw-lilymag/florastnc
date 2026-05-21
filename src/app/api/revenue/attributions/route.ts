import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  createAttribution,
  createCampaign,
  listAttributions,
  listCampaigns,
} from "@/lib/revenue/attribution-service";
import type { CreateAttributionInput, CreateCampaignInput } from "@/lib/revenue/types";
import { resolveEffectiveTenantId } from "@/lib/revenue/resolve-tenant";

/** GET — 테넌트 캠페인·귀속 목록 */
export async function GET(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const tenantId = await resolveEffectiveTenantId(gate.supabase, gate.userId);
  if (!tenantId) {
    return NextResponse.json({ error: "TENANT_REQUIRED" }, { status: 400 });
  }

  const sp = new URL(req.url).searchParams;
  const view = sp.get("view") ?? "attributions";
  const limit = Math.min(Number(sp.get("limit") ?? 50), 200);
  const from = sp.get("from") ?? undefined;
  const to = sp.get("to") ?? undefined;

  const db = createAdminClient() ?? gate.supabase;

  try {
    if (view === "campaigns") {
      const campaigns = await listCampaigns(db, tenantId, {
        limit,
        status: sp.get("status") ?? undefined,
      });
      return NextResponse.json({ campaigns });
    }

    const attributions = await listAttributions(db, tenantId, { limit, from, to });
    return NextResponse.json({ attributions });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    const status = msg.includes("does not exist") || msg.includes("PGRST205") ? 503 : 500;
    return NextResponse.json(
      { error: msg, hint: "Apply supabase/revenue_engine_schema.sql" },
      { status }
    );
  }
}

/** POST — 캠페인 생성 또는 귀속 기록 */
export async function POST(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const tenantId = await resolveEffectiveTenantId(gate.supabase, gate.userId);
  if (!tenantId) {
    return NextResponse.json({ error: "TENANT_REQUIRED" }, { status: 400 });
  }

  let body: { action?: string; campaign?: CreateCampaignInput; attribution?: CreateAttributionInput };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const db = createAdminClient() ?? gate.supabase;
  const action = body.action ?? (body.attribution ? "attribution" : "campaign");

  try {
    if (action === "attribution" && body.attribution) {
      const attribution = await createAttribution(db, tenantId, body.attribution);
      return NextResponse.json({ attribution }, { status: 201 });
    }

    if (body.campaign) {
      const campaign = await createCampaign(db, tenantId, body.campaign);
      return NextResponse.json({ campaign }, { status: 201 });
    }

    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    if (msg === "CAMPAIGN_NOT_FOUND") {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    const status = msg.includes("does not exist") || msg.includes("PGRST205") ? 503 : 500;
    return NextResponse.json(
      { error: msg, hint: "Apply supabase/revenue_engine_schema.sql" },
      { status }
    );
  }
}
