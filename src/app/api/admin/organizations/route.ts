import { NextResponse } from "next/server";
import { effectiveIsSuperAdmin, requireAuthenticated } from "@/lib/auth-api-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import {
  errAdminDataLoadFailed,
  errAdminForbidden,
  errAdminServerMisconfigured,
} from "@/lib/admin/admin-api-errors";

/**
 * 다매장 조직 목록 + 소속 tenants.organization_id 가 있는 매장 수 (super_admin)
 */
export async function GET(req: Request) {
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

  const { data: orgs, error: oErr } = await admin
    .from("organizations")
    .select("id, name")
    .order("name", { ascending: true });

  if (oErr) {
    console.error("admin organizations list:", oErr);
    return NextResponse.json({ error: errAdminDataLoadFailed(bl) }, { status: 500 });
  }

  const { data: tenants, error: tErr } = await admin
    .from("tenants")
    .select("id, organization_id")
    .not("organization_id", "is", null);

  if (tErr) {
    console.error("admin organizations tenants:", tErr);
    return NextResponse.json({ error: errAdminDataLoadFailed(bl) }, { status: 500 });
  }

  const countByOrg = new Map<string, number>();
  for (const t of tenants ?? []) {
    const oid = t.organization_id as string | null;
    if (!oid) continue;
    countByOrg.set(oid, (countByOrg.get(oid) ?? 0) + 1);
  }

  const organizations = (orgs ?? []).map((o) => ({
    id: o.id as string,
    name: String(o.name ?? ""),
    tenantCount: countByOrg.get(o.id as string) ?? 0,
  }));

  return NextResponse.json({ organizations });
}
