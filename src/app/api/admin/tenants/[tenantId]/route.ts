import { NextResponse } from "next/server";
import { effectiveIsSuperAdmin, requireAuthenticated } from "@/lib/auth-api-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import {
  errAdminForbidden,
  errAdminOperationFailed,
  errAdminServerMisconfigured,
} from "@/lib/admin/admin-api-errors";

type RouteCtx = { params: Promise<{ tenantId: string }> };

export async function DELETE(req: Request, ctx: RouteCtx) {
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

  const { tenantId } = await ctx.params;
  if (!tenantId) {
    return NextResponse.json({ error: "tenantId required" }, { status: 400 });
  }

  // 1. 해당 매장에 속한 모든 사용자(profiles) 조회
  const { data: profiles, error: pErr } = await admin
    .from("profiles")
    .select("id")
    .eq("tenant_id", tenantId);

  if (pErr) {
    console.error("admin tenant delete - fetch profiles error:", pErr);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  // 2. Auth 에서 사용자들 영구 삭제 (CASCADE 로 profiles 테이블에서도 삭제됨)
  if (profiles && profiles.length > 0) {
    const deletePromises = profiles.map((p) => admin.auth.admin.deleteUser(p.id));
    const results = await Promise.allSettled(deletePromises);
    
    const failures = results.filter((r) => r.status === "rejected");
    if (failures.length > 0) {
      console.error("admin tenant delete - some users failed to delete:", failures);
      return NextResponse.json(
        { error: "매장에 속한 일부 사용자를 삭제하는 데 실패했습니다. 다시 시도해 주세요." },
        { status: 500 }
      );
    }
  }

  // 3. 매장(tenant) 삭제
  // (profiles 가 모두 지워졌으므로 ON DELETE RESTRICT 에 걸리지 않음)
  const { error: tErr } = await admin
    .from("tenants")
    .delete()
    .eq("id", tenantId);

  if (tErr) {
    console.error("admin tenant delete - delete tenant error:", tErr);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deletedProfiles: profiles?.length || 0 });
}
