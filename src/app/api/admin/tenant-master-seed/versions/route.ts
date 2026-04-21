import { NextResponse } from "next/server";
import { effectiveIsSuperAdmin, requireAuthenticated } from "@/lib/auth-api-guards";
import { listTenantMasterSeedVersions } from "@/lib/tenant-master-seed/registry";

export async function GET() {
  const gate = await requireAuthenticated();
  if (!gate.ok) return gate.response;
  if (!effectiveIsSuperAdmin(gate.profile, gate.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ versions: listTenantMasterSeedVersions() });
}
