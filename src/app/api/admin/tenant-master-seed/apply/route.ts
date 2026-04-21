import { NextResponse } from "next/server";
import { effectiveIsSuperAdmin, requireAuthenticated } from "@/lib/auth-api-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import { getTenantMasterSeed } from "@/lib/tenant-master-seed/registry";
import { runTenantMasterSeed } from "@/lib/tenant-master-seed/run-seed";

export async function POST(req: Request) {
  const gate = await requireAuthenticated();
  if (!gate.ok) return gate.response;
  if (!effectiveIsSuperAdmin(gate.profile, gate.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const tenantId = body?.tenantId as string | undefined;
  const versionId = body?.versionId as string | undefined;
  const confirm = body?.confirm === true;

  if (!confirm) {
    return NextResponse.json({ error: "confirm: true 가 필요합니다." }, { status: 400 });
  }
  if (!tenantId || !versionId) {
    return NextResponse.json({ error: "tenantId, versionId 가 필요합니다." }, { status: 400 });
  }

  const seed = getTenantMasterSeed(versionId);
  if (!seed) {
    return NextResponse.json({ error: "알 수 없는 시드 버전입니다." }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  try {
    const result = await runTenantMasterSeed(admin, tenantId, seed, {
      dryRun: false,
      appliedByUserId: gate.userId,
    });
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "시드 적용 실패";
    if (msg === "tenant_not_found") {
      return NextResponse.json({ error: "테넌트를 찾을 수 없습니다." }, { status: 404 });
    }
    console.error("tenant-master-seed apply", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
