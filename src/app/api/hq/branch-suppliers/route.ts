import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { assertHqAccessToBranchTenant } from "@/lib/hq-branch-tenant-access";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import { errCatalogTenantIdRequired } from "@/lib/hq/hq-catalog-api-errors";
import {
  errAdminForbidden,
  errAdminOperationFailed,
  errAdminServerMisconfigured,
  errAdminUnauthorized,
} from "@/lib/admin/admin-api-errors";

/**
 * 본사 화면: 특정 지점(tenant)의 거래처 목록 — 자재요청 입고 확정 시 선택용
 */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const bl = await hqApiUiBase(req, sp.get("uiLocale"));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: errAdminUnauthorized(bl) }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const isSuper = profile?.role === "super_admin";

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id);
  const orgIds = [...new Set((memberships ?? []).map((m) => m.organization_id as string))];

  if (!isSuper && orgIds.length === 0) {
    return NextResponse.json({ error: errAdminForbidden(bl) }, { status: 403 });
  }

  const tenantId = sp.get("tenantId")?.trim();
  if (!tenantId) {
    return NextResponse.json({ error: errCatalogTenantIdRequired(bl) }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: errAdminServerMisconfigured(bl) }, { status: 500 });
  }

  const gate = await assertHqAccessToBranchTenant(admin, {
    branchTenantId: tenantId,
    isSuperAdmin: isSuper,
    orgIds,
    uiBase: bl,
  });
  if (!gate.ok) {
    return NextResponse.json({ error: gate.message }, { status: gate.status });
  }

  const { data: rows, error } = await admin
    .from("suppliers")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true });

  if (error) {
    if (error.code === "42P01" || error.message?.includes("does not exist")) {
      return NextResponse.json({ suppliers: [] });
    }
    console.error("[hq/branch-suppliers]", error);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  return NextResponse.json({ suppliers: rows ?? [] });
}
