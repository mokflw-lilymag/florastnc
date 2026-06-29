import { NextResponse } from "next/server";
import { effectiveIsSuperAdmin, requireAuthenticated } from "@/lib/auth-api-guards";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import { errAdminForbidden } from "@/lib/admin/admin-api-errors";
import { listSubscriptionEvents } from "@/lib/subscription/record-subscription-event";

export async function GET(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const bl = await hqApiUiBase(req);
  if (!effectiveIsSuperAdmin(gate.profile, gate.email)) {
    return NextResponse.json({ error: errAdminForbidden(bl) }, { status: 403 });
  }

  const sp = new URL(req.url).searchParams;
  const tenantId = sp.get("tenantId")?.trim() || undefined;
  const eventType = sp.get("eventType") as "payment" | "admin_grant" | null;
  const source = sp.get("source") as "toss" | "stripe" | "admin" | null;
  const limit = sp.get("limit") ? parseInt(sp.get("limit")!, 10) : 100;
  const offset = sp.get("offset") ? parseInt(sp.get("offset")!, 10) : 0;

  const { events, total } = await listSubscriptionEvents({
    tenantId,
    eventType: eventType ?? undefined,
    source: source ?? undefined,
    limit: Number.isFinite(limit) ? limit : 100,
    offset: Number.isFinite(offset) ? offset : 0,
  });

  return NextResponse.json({ events, total });
}
