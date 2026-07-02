import { NextResponse } from "next/server";
import { effectiveIsSuperAdmin, requireAuthenticated } from "@/lib/auth-api-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import {
  errAdminForbidden,
  errAdminInvalidBody,
  errAdminOperationFailed,
  errAdminServerMisconfigured,
} from "@/lib/admin/admin-api-errors";
import { broadcastPlatformAnnouncementEmail } from "@/lib/platform-announcements/email-broadcast";
import { parseTargetArray } from "@/lib/platform-announcements/targeting";
import type { PlatformAnnouncement, PlatformAnnouncementCategory, PlatformAnnouncementStatus } from "@/lib/platform-announcements/types";

function parseCategory(v: unknown): PlatformAnnouncementCategory | undefined {
  if (v === "maintenance" || v === "notice" || v === "important" || v === "update") return v;
  return undefined;
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const body = await req.json().catch(() => null);
  const bl = await hqApiUiBase(req, body?.uiLocale as string | undefined);
  if (!effectiveIsSuperAdmin(gate.profile, gate.email)) {
    return NextResponse.json({ error: errAdminForbidden(bl) }, { status: 403 });
  }

  const { data: existing, error: loadErr } = await gate.supabase
    .from("platform_announcements")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (loadErr || !existing) {
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: loadErr ? 500 : 404 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body?.title === "string") patch.title = body.title.trim();
  if (typeof body?.body === "string") patch.body = body.body.trim();
  if (body?.priority === "high" || body?.priority === "normal") patch.priority = body.priority;
  const cat = parseCategory(body?.category);
  if (cat) patch.category = cat;
  if (body?.expiresAt !== undefined) patch.expires_at = body.expiresAt || null;
  if (typeof body?.sendEmail === "boolean") patch.send_email = body.sendEmail;
  if (body?.targetCountries !== undefined) patch.target_countries = parseTargetArray(body.targetCountries);
  if (body?.targetPlans !== undefined) patch.target_plans = parseTargetArray(body.targetPlans);

  const nextStatus: PlatformAnnouncementStatus | undefined =
    body?.status === "published" ? "published" : body?.status === "draft" ? "draft" : undefined;
  if (nextStatus) {
    patch.status = nextStatus;
    if (nextStatus === "published" && !existing.published_at) {
      patch.published_at = new Date().toISOString();
    }
    if (nextStatus === "draft") patch.published_at = null;
  }

  const { data: row, error } = await gate.supabase
    .from("platform_announcements")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !row) {
    console.error("[platform/announcements PATCH]", error);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  const finalStatus = (row.status as PlatformAnnouncementStatus) ?? "draft";
  const sendEmail = Boolean(row.send_email);
  let emailResult: { sent: number; simulated: boolean } | null = null;

  if (finalStatus === "published" && sendEmail && !row.email_sent_at) {
    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ error: errAdminServerMisconfigured(bl) }, { status: 500 });
    }
    try {
      emailResult = await broadcastPlatformAnnouncementEmail(admin, row as PlatformAnnouncement);
      const now = new Date().toISOString();
      await admin
        .from("platform_announcements")
        .update({
          email_sent_at: now,
          email_recipient_count: emailResult.sent,
          updated_at: now,
        })
        .eq("id", id);
      row.email_sent_at = now;
      row.email_recipient_count = emailResult.sent;
    } catch (e) {
      console.error("[platform/announcements PATCH email]", e);
    }
  }

  return NextResponse.json({ announcement: row, email: emailResult });
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const bl = await hqApiUiBase(req, new URL(req.url).searchParams.get("uiLocale"));
  if (!effectiveIsSuperAdmin(gate.profile, gate.email)) {
    return NextResponse.json({ error: errAdminForbidden(bl) }, { status: 403 });
  }

  const { error } = await gate.supabase.from("platform_announcements").delete().eq("id", id);
  if (error) {
    console.error("[platform/announcements DELETE]", error);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
