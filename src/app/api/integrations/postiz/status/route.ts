import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { resolveEffectiveTenantId } from "@/lib/revenue/resolve-tenant";
import { createAdminClient } from "@/utils/supabase/admin";
import { getTenantPostizIntegration, syncTenantInstagramFromPostiz, loadPlatformPostizConfig } from "@/lib/revenue/postiz-service";

/** GET — 인스타 연결 상태 · POST — Postiz에서 integration 동기화 */
export async function GET(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const tenantId = await resolveEffectiveTenantId(gate.supabase, gate.userId);
  if (!tenantId) return NextResponse.json({ error: "TENANT_REQUIRED" }, { status: 400 });

  const db = createAdminClient() ?? gate.supabase;
  const integration = await getTenantPostizIntegration(db, tenantId);
  const postizConfigured = !!(await loadPlatformPostizConfig(db));

  return NextResponse.json({
    postizConfigured,
    instagramConnected: integration?.instagram_connected ?? false,
    integrationId: integration?.postiz_integration_id ?? null,
    connectedAt: integration?.connected_at ?? null,
  });
}

export async function POST(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const tenantId = await resolveEffectiveTenantId(gate.supabase, gate.userId);
  if (!tenantId) return NextResponse.json({ error: "TENANT_REQUIRED" }, { status: 400 });

  const db = createAdminClient() ?? gate.supabase;

  try {
    const result = await syncTenantInstagramFromPostiz(db, tenantId);
    if (!result.synced) {
      return NextResponse.json(result, { status: 503 });
    }
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "SYNC_FAILED" }, { status: 500 });
  }
}
