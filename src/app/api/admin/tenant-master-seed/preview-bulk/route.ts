import { NextResponse } from "next/server";
import { effectiveIsSuperAdmin, requireAuthenticated } from "@/lib/auth-api-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import { getTenantMasterSeed } from "@/lib/tenant-master-seed/registry";
import { resolveTenantIdsForMasterSeedBulk } from "@/lib/tenant-master-seed/bulk-resolve";
import { runTenantMasterSeedBulk } from "@/lib/tenant-master-seed/run-seed";

export async function POST(req: Request) {
  const gate = await requireAuthenticated();
  if (!gate.ok) return gate.response;
  if (!effectiveIsSuperAdmin(gate.profile, gate.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const versionId = body?.versionId as string | undefined;
  const organizationId = body?.organizationId as string | undefined;
  const tenantIdsBody = body?.tenantIds;

  if (!versionId?.trim()) {
    return NextResponse.json({ error: "versionId 가 필요합니다." }, { status: 400 });
  }

  const seed = getTenantMasterSeed(versionId);
  if (!seed) {
    return NextResponse.json({ error: "알 수 없는 시드 버전입니다." }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const resolved = await resolveTenantIdsForMasterSeedBulk(admin, { organizationId, tenantIds: tenantIdsBody });
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
    const msg = e instanceof Error ? e.message : "일괄 미리보기 실패";
    if (msg.startsWith("bulk_tenant_limit:")) {
      return NextResponse.json(
        { error: `매장 수가 너무 많습니다. 관리자에게 문의하세요. (${msg})` },
        { status: 400 }
      );
    }
    console.error("tenant-master-seed preview-bulk", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
