import { NextResponse } from "next/server";
import { effectiveIsSuperAdmin, requireAuthenticated } from "@/lib/auth-api-guards";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * 플랫폼 슈퍼(이메일 기준)는 클라이언트에서 isSuperAdmin 이지만
 * DB profiles.role 이 아직 super_admin 이 아닐 수 있어 RLS 로 tenants + profiles 조인이 실패할 수 있음.
 * 관리자 화면 전용: 세션 검증 후 서비스 롤로 목록 반환.
 */
export async function GET() {
  const gate = await requireAuthenticated();
  if (!gate.ok) return gate.response;
  if (!effectiveIsSuperAdmin(gate.profile, gate.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const { data: tenants, error: tErr } = await admin
    .from("tenants")
    .select(
      "id, name, plan, status, subscription_start, subscription_end, created_at, organization_id"
    )
    .order("created_at", { ascending: false });

  if (tErr) {
    console.error("admin tenants list:", tErr);
    return NextResponse.json({ error: tErr.message }, { status: 500 });
  }

  const { data: profiles, error: pErr } = await admin
    .from("profiles")
    .select("email, role, tenant_id")
    .not("tenant_id", "is", null);

  if (pErr) {
    console.error("admin tenants profiles:", pErr);
    return NextResponse.json({ error: pErr.message }, { status: 500 });
  }

  const byTenant = new Map<string, { email: string; role: string }[]>();
  for (const p of profiles ?? []) {
    const tid = p.tenant_id as string;
    if (!tid) continue;
    const list = byTenant.get(tid) ?? [];
    list.push({ email: String(p.email ?? ""), role: String(p.role ?? "") });
    byTenant.set(tid, list);
  }

  const merged = (tenants ?? []).map((t) => ({
    ...t,
    profiles: byTenant.get(t.id) ?? [],
  }));

  return NextResponse.json({ tenants: merged });
}
