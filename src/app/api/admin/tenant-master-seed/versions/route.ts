import { NextResponse } from "next/server";
import { effectiveIsSuperAdmin, requireAuthenticated } from "@/lib/auth-api-guards";
import { listTenantMasterSeedVersions } from "@/lib/tenant-master-seed/registry";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import { errAdminForbidden } from "@/lib/admin/admin-api-errors";

export async function GET(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;
  const sp = new URL(req.url).searchParams;
  const bl = await hqApiUiBase(req, sp.get("uiLocale"));
  if (!effectiveIsSuperAdmin(gate.profile, gate.email)) {
    return NextResponse.json({ error: errAdminForbidden(bl) }, { status: 403 });
  }
  return NextResponse.json({ versions: listTenantMasterSeedVersions() });
}
