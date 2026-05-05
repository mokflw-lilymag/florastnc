import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import {
  errAnnAnnouncementIdRequired,
  errAnnBranchAccountOnly,
  errAnnBulletinNotFound,
  errAnnExpired,
  errAnnOrgMismatch,
  errAnnReadsTableMissing,
  errAnnTenantOrgIdMissing,
} from "@/lib/hq/hq-announcements-api-errors";
import { errAdminOperationFailed, errAdminUnauthorized } from "@/lib/admin/admin-api-errors";

function isMissingReadsTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = String(error.message ?? "").toLowerCase();
  const code = String(error.code ?? "");
  return (
    code === "PGRST205" ||
    code === "42P01" ||
    msg.includes("does not exist") ||
    msg.includes("organization_announcement_reads") ||
    msg.includes("relation")
  );
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const body = await req.json().catch(() => ({}));
  const bl = await hqApiUiBase(req, body?.uiLocale as string | undefined);
  const { id: announcementId } = await context.params;
  if (!announcementId) {
    return NextResponse.json({ error: errAnnAnnouncementIdRequired(bl) }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: errAdminUnauthorized(bl) }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, full_name")
    .eq("id", user.id)
    .maybeSingle();

  const tenantId = profile?.tenant_id as string | null | undefined;
  if (!tenantId) {
    return NextResponse.json({ error: errAnnBranchAccountOnly(bl) }, { status: 403 });
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name, organization_id")
    .eq("id", tenantId)
    .maybeSingle();

  if (!tenant?.organization_id) {
    return NextResponse.json({ error: errAnnTenantOrgIdMissing(bl) }, { status: 403 });
  }

  const { data: ann } = await supabase
    .from("organization_announcements")
    .select("id, organization_id, expires_at")
    .eq("id", announcementId)
    .maybeSingle();

  if (!ann) {
    return NextResponse.json({ error: errAnnBulletinNotFound(bl) }, { status: 404 });
  }

  if (ann.organization_id !== tenant.organization_id) {
    return NextResponse.json({ error: errAnnOrgMismatch(bl) }, { status: 403 });
  }

  const exp = ann.expires_at ? new Date(ann.expires_at as string) : null;
  if (exp && exp.getTime() <= Date.now()) {
    return NextResponse.json({ error: errAnnExpired(bl) }, { status: 410 });
  }

  const row = {
    announcement_id: announcementId,
    user_id: user.id,
    tenant_id: tenantId,
    user_full_name: profile?.full_name ?? null,
    tenant_name: tenant.name ?? null,
  };

  const { error: insErr } = await supabase.from("organization_announcement_reads").insert(row);

  if (insErr?.code === "23505") {
    const { error: upErr } = await supabase
      .from("organization_announcement_reads")
      .update({
        read_at: new Date().toISOString(),
        user_full_name: profile?.full_name ?? null,
        tenant_name: tenant.name ?? null,
      })
      .eq("announcement_id", announcementId)
      .eq("user_id", user.id);
    if (upErr) {
      if (isMissingReadsTable(upErr)) {
        return NextResponse.json({ error: errAnnReadsTableMissing(bl) }, { status: 503 });
      }
      console.error("[hq/announcements read POST update]", upErr);
      return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (insErr) {
    if (isMissingReadsTable(insErr)) {
      return NextResponse.json({ error: errAnnReadsTableMissing(bl) }, { status: 503 });
    }
    console.error("[hq/announcements read POST]", insErr);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
