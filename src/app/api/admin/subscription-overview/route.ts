import { NextResponse } from "next/server";
import { effectiveIsSuperAdmin, requireAuthenticated } from "@/lib/auth-api-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import {
  errAdminDataLoadFailed,
  errAdminForbidden,
  errAdminServerMisconfigured,
} from "@/lib/admin/admin-api-errors";
import { buildSubscriptionOverview } from "@/lib/subscription/subscription-tenure";

export async function GET(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const bl = await hqApiUiBase(req);
  if (!effectiveIsSuperAdmin(gate.profile, gate.email)) {
    return NextResponse.json({ error: errAdminForbidden(bl) }, { status: 403 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: errAdminServerMisconfigured(bl) }, { status: 500 });
  }

  const { data: tenants, error: tErr } = await admin
    .from("tenants")
    .select("id, name, plan, status, subscription_start, subscription_end, created_at")
    .order("subscription_end", { ascending: true, nullsFirst: false });

  if (tErr) {
    console.error("subscription-overview tenants:", tErr);
    return NextResponse.json({ error: errAdminDataLoadFailed(bl) }, { status: 500 });
  }

  const { data: profiles } = await admin
    .from("profiles")
    .select("email, tenant_id, role")
    .not("tenant_id", "is", null);

  const emailByTenant = new Map<string, string>();
  for (const p of profiles ?? []) {
    const tid = p.tenant_id as string;
    if (!tid || emailByTenant.has(tid)) continue;
    if (p.role === "tenant_admin" || !emailByTenant.has(tid)) {
      emailByTenant.set(tid, String(p.email ?? ""));
    }
  }

  const merged = (tenants ?? []).map((t) => ({
    ...t,
    profiles: emailByTenant.has(t.id)
      ? [{ email: emailByTenant.get(t.id)! }]
      : [],
  }));

  const overview = buildSubscriptionOverview(merged);

  return NextResponse.json({ overview, tenants: merged });
}
