import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * 본사(org_admin) / super_admin 이 지점 업무 화면으로 전환할 때 profiles.org_work_tenant_id 설정·해제
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
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
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY 가 필요합니다." },
      { status: 500 }
    );
  }

  if (tenantId === null) {
    const { error } = await admin
      .from("profiles")
      .update({ org_work_tenant_id: null })
      .eq("id", user.id);
    if (error) {
      console.error("[hq/work-context] clear", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, tenantId: null });
  }

  if (profile?.role === "super_admin") {
    const { data: t } = await admin.from("tenants").select("id").eq("id", tenantId).maybeSingle();
    if (!t) {
      return NextResponse.json({ error: "지점을 찾을 수 없습니다." }, { status: 404 });
    }
    const { error } = await admin
      .from("profiles")
      .update({ org_work_tenant_id: tenantId })
      .eq("id", user.id);
    if (error) {
      console.error("[hq/work-context] super set", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, tenantId });
  }

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id);

  if (!memberships?.length) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await admin
    .from("profiles")
    .update({ org_work_tenant_id: tenantId })
    .eq("id", user.id);

  if (error) {
    console.error("[hq/work-context] org_admin set", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, tenantId });
}
