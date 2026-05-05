import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  requireAuthenticated,
  effectiveIsSuperAdmin,
  isOrgAdminForOrganization,
} from "@/lib/auth-api-guards";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import {
  errAnnCommentDeleteForbidden,
  errAnnCommentNotFound,
  errAnnIdsRequired,
  errAnnPostNotFound,
} from "@/lib/hq/hq-announcements-api-errors";
import { errAdminOperationFailed } from "@/lib/admin/admin-api-errors";

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string; commentId: string }> }
) {
  const bl = await hqApiUiBase(req, new URL(req.url).searchParams.get("uiLocale"));
  const { id: announcementId, commentId } = await context.params;
  if (!announcementId || !commentId) {
    return NextResponse.json({ error: errAnnIdsRequired(bl) }, { status: 400 });
  }

  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;
  const { supabase, userId, email, profile } = gate;

  const { data: c } = await supabase
    .from("organization_announcement_comments")
    .select("created_by, announcement_id")
    .eq("id", commentId)
    .eq("announcement_id", announcementId)
    .maybeSingle();

  if (!c) {
    return NextResponse.json({ error: errAnnCommentNotFound(bl) }, { status: 404 });
  }

  const { data: ann } = await supabase
    .from("organization_announcements")
    .select("organization_id")
    .eq("id", announcementId)
    .maybeSingle();
  if (!ann) {
    return NextResponse.json({ error: errAnnPostNotFound(bl) }, { status: 404 });
  }

  const orgId = ann.organization_id as string;
  const isOwn = c.created_by === userId;
  const superOk = effectiveIsSuperAdmin(profile, email);
  const orgMod = await isOrgAdminForOrganization(supabase, userId, orgId);

  if (!isOwn && !superOk && !orgMod) {
    return NextResponse.json({ error: errAnnCommentDeleteForbidden(bl) }, { status: 403 });
  }

  let client = supabase;
  if (!isOwn && superOk && profile?.role !== "super_admin") {
    const admin = createAdminClient();
    if (admin) client = admin;
  }

  const { error } = await client
    .from("organization_announcement_comments")
    .delete()
    .eq("id", commentId)
    .eq("announcement_id", announcementId);

  if (error) {
    console.error("[hq/announcements comments DELETE]", error);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
