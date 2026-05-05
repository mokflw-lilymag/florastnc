import { NextResponse } from "next/server";
import { effectiveIsSuperAdmin, requireAuthenticated } from "@/lib/auth-api-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import { getTenantMasterSeed } from "@/lib/tenant-master-seed/registry";
import { resolveTenantIdsForMasterSeedBulk } from "@/lib/tenant-master-seed/bulk-resolve";
import { runTenantMasterSeedBulk } from "@/lib/tenant-master-seed/run-seed";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import {
  errAdminForbidden,
  errAdminSeedBulkPreviewFailedGeneric,
  errAdminSeedBulkTenantLimit,
  errAdminSeedUnknownVersion,
  errAdminSeedVersionRequired,
  errAdminServerMisconfigured,
} from "@/lib/admin/admin-api-errors";

export async function POST(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;
  const blGate = await hqApiUiBase(req);
  if (!effectiveIsSuperAdmin(gate.profile, gate.email)) {
    return NextResponse.json({ error: errAdminForbidden(blGate) }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const bl = await hqApiUiBase(req, body?.uiLocale as string | undefined);
  const versionId = body?.versionId as string | undefined;
  const organizationId = body?.organizationId as string | undefined;
  const tenantIdsBody = body?.tenantIds;

  if (!versionId?.trim()) {
    return NextResponse.json({ error: errAdminSeedVersionRequired(bl) }, { status: 400 });
  }

  const seed = getTenantMasterSeed(versionId);
  if (!seed) {
    return NextResponse.json({ error: errAdminSeedUnknownVersion(bl) }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: errAdminServerMisconfigured(bl) }, { status: 500 });
  }

  const resolved = await resolveTenantIdsForMasterSeedBulk(admin, { organizationId, tenantIds: tenantIdsBody }, bl);
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }
  const { tenantIds, organizationId: resolvedOrgId } = resolved;

  try {
    const result = await runTenantMasterSeedBulk(admin, tenantIds, seed, {
      dryRun: true,
      organizationId: resolvedOrgId,
    });
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.startsWith("bulk_tenant_limit:")) {
      return NextResponse.json({ error: errAdminSeedBulkTenantLimit(bl, msg) }, { status: 400 });
    }
    console.error("tenant-master-seed preview-bulk", e);
    return NextResponse.json({ error: errAdminSeedBulkPreviewFailedGeneric(bl) }, { status: 500 });
  }
}
