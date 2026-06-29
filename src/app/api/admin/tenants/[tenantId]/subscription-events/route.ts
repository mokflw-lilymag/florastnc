import { NextResponse } from "next/server";
import { effectiveIsSuperAdmin, requireAuthenticated } from "@/lib/auth-api-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import {
  errAdminDataLoadFailed,
  errAdminForbidden,
  errAdminOperationFailed,
  errAdminServerMisconfigured,
} from "@/lib/admin/admin-api-errors";
import { listSubscriptionEventsForTenant } from "@/lib/subscription/record-subscription-event";

type RouteCtx = { params: Promise<{ tenantId: string }> };

export async function GET(req: Request, ctx: RouteCtx) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const bl = await hqApiUiBase(req);
  if (!effectiveIsSuperAdmin(gate.profile, gate.email)) {
    return NextResponse.json({ error: errAdminForbidden(bl) }, { status: 403 });
  }

  const { tenantId } = await ctx.params;
  if (!tenantId) {
    return NextResponse.json({ error: "tenantId required" }, { status: 400 });
  }

  const events = await listSubscriptionEventsForTenant(tenantId, 100);
  return NextResponse.json({ events });
}
