import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { resolveEffectiveTenantId } from "@/lib/revenue/resolve-tenant";
import { createAdminClient } from "@/utils/supabase/admin";

/** GET — marketing_drafts 목록 · PATCH — status 갱신 (copied 등) */
export async function GET(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const tenantId = await resolveEffectiveTenantId(gate.supabase, gate.userId);
  if (!tenantId) return NextResponse.json({ error: "TENANT_REQUIRED" }, { status: 400 });

  const sp = new URL(req.url).searchParams;
  const limit = Math.min(Number(sp.get("limit") ?? 20), 100);
  const draftType = sp.get("draft_type");

  const db = createAdminClient() ?? gate.supabase;
  let q = db
    .from("marketing_drafts")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (draftType) q = q.eq("draft_type", draftType);

  const { data, error } = await q;
  if (error) {
    const status = error.message.includes("does not exist") ? 503 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ drafts: data ?? [] });
}

export async function PATCH(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const tenantId = await resolveEffectiveTenantId(gate.supabase, gate.userId);
  if (!tenantId) return NextResponse.json({ error: "TENANT_REQUIRED" }, { status: 400 });

  let body: { id?: string; status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  if (!body.id) return NextResponse.json({ error: "ID_REQUIRED" }, { status: 400 });

  const allowed = ["draft", "ready", "copied", "published", "archived"];
  if (!body.status || !allowed.includes(body.status)) {
    return NextResponse.json({ error: "INVALID_STATUS" }, { status: 400 });
  }

  const db = createAdminClient() ?? gate.supabase;
  const { data, error } = await db
    .from("marketing_drafts")
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq("id", body.id)
    .eq("tenant_id", tenantId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  return NextResponse.json({ draft: data });
}
