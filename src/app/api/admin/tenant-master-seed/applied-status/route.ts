import { NextResponse } from "next/server";
import { effectiveIsSuperAdmin, requireAuthenticated } from "@/lib/auth-api-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import { resolveTenantSeedStatusMap } from "@/lib/tenant-master-seed/seed-audit-status";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import { errAdminForbidden, errAdminServerMisconfigured } from "@/lib/admin/admin-api-errors";

/** 매장별 최신 시드 적용 이력 (super_admin) */
export async function GET(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;
  const sp = new URL(req.url).searchParams;
  const bl = await hqApiUiBase(req, sp.get("uiLocale"));
  if (!effectiveIsSuperAdmin(gate.profile, gate.email)) {
    return NextResponse.json({ error: errAdminForbidden(bl) }, { status: 403 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: errAdminServerMisconfigured(bl) }, { status: 500 });
  }

  const { statuses, auditAvailable } = await resolveTenantSeedStatusMap(admin);
  return NextResponse.json({ statuses, auditAvailable });
}
