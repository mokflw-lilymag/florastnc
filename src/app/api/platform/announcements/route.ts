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
import type {
  PlatformAnnouncement,
  PlatformAnnouncementCategory,
  PlatformAnnouncementStatus,
} from "@/lib/platform-announcements/types";

function parseCategory(v: unknown): PlatformAnnouncementCategory {
  if (v === "maintenance" || v === "notice" || v === "important" || v === "update") return v;
  return "update";
}

function shouldSendEmail(
  row: { send_email: boolean; email_sent_at: string | null; status: string },
  nextStatus: PlatformAnnouncementStatus,
  sendEmailFlag: boolean,
): boolean {
  if (nextStatus !== "published") return false;
  if (!sendEmailFlag && !row.send_email) return false;
  if (row.email_sent_at) return false;
  return true;
}

export async function GET(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;
  const bl = await hqApiUiBase(req, new URL(req.url).searchParams.get("uiLocale"));
  if (!effectiveIsSuperAdmin(gate.profile, gate.email)) {
    return NextResponse.json({ error: errAdminForbidden(bl) }, { status: 403 });
  }

  const { data, error } = await gate.supabase
    .from("platform_announcements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[platform/announcements GET]", error);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  return NextResponse.json({ announcements: data ?? [] });
}

export async function POST(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;
  const body = await req.json().catch(() => null);
  const bl = await hqApiUiBase(req, body?.uiLocale as string | undefined);
  if (!effectiveIsSuperAdmin(gate.profile, gate.email)) {
    return NextResponse.json({ error: errAdminForbidden(bl) }, { status: 403 });
  }

  const title = (body?.title as string | undefined)?.trim();
  const content = (body?.body as string | undefined)?.trim();
  if (!title || !content) {
    return NextResponse.json({ error: errAdminInvalidBody(bl) }, { status: 400 });
  }

  const status: PlatformAnnouncementStatus = body?.status === "published" ? "published" : "draft";
  const sendEmail = Boolean(body?.sendEmail);
  const priority = body?.priority === "high" ? "high" : "normal";
  const category = parseCategory(body?.category);
  const expiresAt = (body?.expiresAt as string | undefined) || null;
  const targetCountries = parseTargetArray(body?.targetCountries);
  const targetPlans = parseTargetArray(body?.targetPlans);
  const now = new Date().toISOString();

  const { data: row, error } = await gate.supabase
    .from("platform_announcements")
    .insert({
      title,
      body: content,
      category,
      priority,
      status,
      send_email: sendEmail,
      published_at: status === "published" ? now : null,
      expires_at: expiresAt,
      target_countries: targetCountries,
      target_plans: targetPlans,
      created_by: gate.userId,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error || !row) {
    console.error("[platform/announcements POST]", error);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  let emailResult: { sent: number; simulated: boolean } | null = null;
  if (shouldSendEmail(row, status, sendEmail)) {
    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ error: errAdminServerMisconfigured(bl) }, { status: 500 });
    }
    try {
      emailResult = await broadcastPlatformAnnouncementEmail(admin, row as PlatformAnnouncement);
      await admin
        .from("platform_announcements")
        .update({
          email_sent_at: now,
          email_recipient_count: emailResult.sent,
          updated_at: now,
        })
        .eq("id", row.id);
      row.email_sent_at = now;
      row.email_recipient_count = emailResult.sent;
    } catch (e) {
      console.error("[platform/announcements POST email]", e);
    }
  }

  return NextResponse.json({
    announcement: row,
    email: emailResult,
  });
}
