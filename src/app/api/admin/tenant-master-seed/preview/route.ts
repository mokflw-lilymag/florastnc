import { NextResponse } from "next/server";
import { effectiveIsSuperAdmin, requireAuthenticated } from "@/lib/auth-api-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import { getTenantMasterSeed } from "@/lib/tenant-master-seed/registry";
import { runTenantMasterSeed } from "@/lib/tenant-master-seed/run-seed";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import {
  errAdminForbidden,
  errAdminSeedPreviewFailedGeneric,
  errAdminSeedTenantAndVersionRequired,
  errAdminSeedTenantNotFound,
  errAdminSeedUnknownVersion,
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
  const tenantId = body?.tenantId as string | undefined;
  const versionId = body?.versionId as string | undefined;

  if (!tenantId || !versionId) {
    return NextResponse.json({ error: errAdminSeedTenantAndVersionRequired(bl) }, { status: 400 });
  }

  const seed = getTenantMasterSeed(versionId);
  if (!seed) {
    return NextResponse.json({ error: errAdminSeedUnknownVersion(bl) }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: errAdminServerMisconfigured(bl) }, { status: 500 });
  }

  try {
    const result = await runTenantMasterSeed(admin, tenantId, seed, { dryRun: true });
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "tenant_not_found") {
      return NextResponse.json({ error: errAdminSeedTenantNotFound(bl) }, { status: 404 });
    }
    console.error("tenant-master-seed preview", e);
    return NextResponse.json({ error: errAdminSeedPreviewFailedGeneric(bl) }, { status: 500 });
  }
}
