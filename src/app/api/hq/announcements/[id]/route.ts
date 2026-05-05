import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { publicUrlToOrgAnnouncementStoragePath } from "@/lib/org-announcement-assets";
import {
  requireAuthenticated,
  effectiveIsSuperAdmin,
  isOrgAdminForOrganization,
} from "@/lib/auth-api-guards";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import { errAnnDeleteForbidden, errAnnPostNotFound } from "@/lib/hq/hq-announcements-api-errors";
import { errAdminOperationFailed } from "@/lib/admin/admin-api-errors";

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const bl = await hqApiUiBase(req, new URL(req.url).searchParams.get("uiLocale"));
  const { id } = await context.params;
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;
  const { supabase, userId, email, profile } = gate;

  const { data: row } = await supabase
    .from("organization_announcements")
    .select("attachment_urls, organization_id")
    .eq("id", id)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: errAnnPostNotFound(bl) }, { status: 404 });
  }

  const orgId = row.organization_id as string;
  const superOk = effectiveIsSuperAdmin(profile, email);
  const orgAdminOk = await isOrgAdminForOrganization(supabase, userId, orgId);
  if (!superOk && !orgAdminOk) {
    return NextResponse.json({ error: errAnnDeleteForbidden(bl) }, { status: 403 });
  }

  let delClient = supabase;
  if (superOk && profile?.role !== "super_admin") {
    const admin = createAdminClient();
    if (admin) delClient = admin;
  }

  const { error } = await delClient.from("organization_announcements").delete().eq("id", id);

  if (error) {
    console.error("[hq/announcements DELETE]", error);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  const raw = row?.attachment_urls;
  const urls = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
  const paths = urls.map(publicUrlToOrgAnnouncementStoragePath).filter((p): p is string => !!p);
  if (paths.length > 0) {
    const storageClient = superOk && profile?.role !== "super_admin" ? createAdminClient() ?? supabase : supabase;
    const { error: userRmErr } = await storageClient.storage.from("org_announcements").remove(paths);
    if (userRmErr) {
      const admin = createAdminClient();
      if (admin) {
        const { error: rmErr } = await admin.storage.from("org_announcements").remove(paths);
        if (rmErr) console.warn("[hq/announcements DELETE] storage", rmErr.message);
      } else {
        console.warn("[hq/announcements DELETE] storage", userRmErr.message);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
