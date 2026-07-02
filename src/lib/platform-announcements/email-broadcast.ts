import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveEnvSmtpConfig, sendMailViaSmtp } from "@/lib/email/smtp-server";
import type { PlatformAnnouncement } from "@/lib/platform-announcements/types";
import { PLATFORM_CATEGORY_LABELS } from "@/lib/platform-announcements/types";
import { announcementMatchesTenant } from "@/lib/platform-announcements/targeting";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://floxync.com";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildPlatformAnnouncementEmailHtml(ann: Pick<PlatformAnnouncement, "title" | "body" | "category">): string {
  const category = PLATFORM_CATEGORY_LABELS[ann.category] ?? ann.category;
  const bodyHtml = escapeHtml(ann.body).replace(/\n/g, "<br/>");
  return `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
      <p style="color:#6366f1;font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;margin:0 0 8px;">FloXync · ${category}</p>
      <h1 style="font-size:20px;color:#0f172a;margin:0 0 16px;">${escapeHtml(ann.title)}</h1>
      <div style="color:#334155;font-size:14px;line-height:1.6;">${bodyHtml}</div>
      <p style="margin-top:24px;">
        <a href="${APP_URL}/dashboard/notifications" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600;">
          FloXync에서 보기
        </a>
      </p>
      <p style="color:#94a3b8;font-size:11px;margin-top:24px;">본 메일은 FloXync 플랫폼 공지 알림입니다.</p>
    </div>
  `;
}

export async function broadcastPlatformAnnouncementEmail(
  admin: SupabaseClient,
  ann: PlatformAnnouncement,
): Promise<{ sent: number; simulated: boolean }> {
  const smtp = resolveEnvSmtpConfig();
  const subject = `[FloXync] ${ann.title}`;
  const html = buildPlatformAnnouncementEmailHtml(ann);

  const { data: profiles, error } = await admin
    .from("profiles")
    .select("email, tenant_id, tenants(country, plan)")
    .not("email", "is", null);

  if (error) throw new Error(error.message);

  const emails = [
    ...new Set(
      (profiles ?? [])
        .filter((p) => {
          const tenantRaw = p.tenants as { country?: string; plan?: string } | { country?: string; plan?: string }[] | null;
          const tenant = Array.isArray(tenantRaw) ? tenantRaw[0] : tenantRaw;
          return announcementMatchesTenant(ann, tenant ?? null);
        })
        .map((p) => (p.email as string)?.trim().toLowerCase())
        .filter((e): e is string => Boolean(e && e.includes("@"))),
    ),
  ];

  if (!smtp) {
    console.warn("[platform-announcements] SMTP 없음 — 이메일 시뮬레이션", emails.length);
    return { sent: emails.length, simulated: true };
  }

  let sent = 0;
  const batchSize = 5;
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    await Promise.allSettled(
      batch.map(async (to) => {
        await sendMailViaSmtp(smtp, { to, subject, html });
        sent += 1;
      }),
    );
  }

  return { sent, simulated: false };
}
