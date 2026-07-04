import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import { errHqBranchNotFound, errHqServiceRoleRequired } from "@/lib/hq/hq-branch-work-api-errors";
import { errAdminForbidden, errAdminOperationFailed, errAdminUnauthorized } from "@/lib/admin/admin-api-errors";
import { clearOrgWorkContext, setOrgWorkContext } from "@/lib/hq/set-org-work-context";
import { isWorkContextExpired } from "@/lib/hq/work-context-session";

/**
 * 본사(org_admin) / super_admin 이 지점 업무 화면으로 전환할 때 profiles.org_work_tenant_id 설정·해제
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const sp = new URL(req.url).searchParams;
  const bl = await hqApiUiBase(req, sp.get("uiLocale"));
  if (!user) {
    return NextResponse.json({ error: errAdminUnauthorized(bl) }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: errHqServiceRoleRequired(bl) }, { status: 500 });
  }

  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("org_work_tenant_id, org_work_context_at")
    .eq("id", user.id)
    .maybeSingle();

  let tenantId = (profile?.org_work_tenant_id as string | null) ?? null;
  let startedAt = (profile?.org_work_context_at as string | null) ?? null;

  if (profileErr?.message?.includes("org_work_context_at")) {
    const { data: fallback } = await admin
      .from("profiles")
      .select("org_work_tenant_id")
      .eq("id", user.id)
      .maybeSingle();
    tenantId = (fallback?.org_work_tenant_id as string | null) ?? null;
    startedAt = null;
  }

  if (tenantId && isWorkContextExpired(startedAt)) {
    await clearOrgWorkContext(admin, user.id);
    return NextResponse.json({ active: false, expired: true, tenantId: null });
  }

  return NextResponse.json({
    active: !!tenantId,
    expired: false,
    tenantId,
    startedAt,
  });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const body = await req.json().catch(() => ({}));
  const bl = await hqApiUiBase(req, body?.uiLocale as string | undefined);
  if (!user) {
    return NextResponse.json({ error: errAdminUnauthorized(bl) }, { status: 401 });
  }
  const raw = body?.tenantId;
  const tenantId =
    raw === null || raw === undefined || raw === "" ? null : String(raw);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: errHqServiceRoleRequired(bl) }, { status: 500 });
  }

  if (tenantId === null) {
    await clearOrgWorkContext(admin, user.id);
    return NextResponse.json({ ok: true, tenantId: null });
  }

  if (profile?.role === "super_admin") {
    const { data: t } = await admin.from("tenants").select("id").eq("id", tenantId).maybeSingle();
    if (!t) {
      return NextResponse.json({ error: errHqBranchNotFound(bl) }, { status: 404 });
    }
    const ctxResult = await setOrgWorkContext(admin, user.id, tenantId);
    if (!ctxResult.ok) {
      console.error("[hq/work-context] super set", ctxResult.error);
      return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
    }
    return NextResponse.json({ ok: true, tenantId });
  }

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id);

  if (!memberships?.length) {
    return NextResponse.json({ error: errAdminForbidden(bl) }, { status: 403 });
  }

  const orgIds = (memberships ?? []).map((m) => m.organization_id);
  const { data: branch } = await admin
    .from("tenants")
    .select("id, organization_id")
    .eq("id", tenantId)
    .maybeSingle();

  if (
    !branch?.organization_id ||
    !orgIds.includes(branch.organization_id)
  ) {
    return NextResponse.json({ error: errAdminForbidden(bl) }, { status: 403 });
  }

  const ctxResult = await setOrgWorkContext(admin, user.id, tenantId);
  if (!ctxResult.ok) {
    console.error("[hq/work-context] org_admin set", ctxResult.error);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  return NextResponse.json({ ok: true, tenantId });
}
