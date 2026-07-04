import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";
import { resolveEnvSmtpConfig, resolveSmtpForHq, sendMailViaSmtp } from "@/lib/email/smtp-server";

const HQ_NOTIFY = process.env.SUPPORT_ADMIN_EMAIL || "admin@floxync.com";

async function sendHtml(to: string, subject: string, html: string) {
  const admin = createAdminClient();
  const smtp = admin ? await resolveSmtpForHq(admin) : resolveEnvSmtpConfig();
  if (!smtp) {
    console.info("[support-email] simulated", { to, subject });
    return;
  }
  await sendMailViaSmtp(smtp, { to, subject, html });
}

export async function notifyAdminNewTicket(opts: {
  ticketNo: string;
  title: string;
  storeName: string;
  category: string;
}) {
  const link = `${process.env.NEXT_PUBLIC_APP_URL || "https://floxync.com"}/dashboard/admin/support`;
  await sendHtml(
    HQ_NOTIFY,
    `[Floxync] 새 문의 — ${opts.storeName}`,
    `<p><strong>${opts.ticketNo}</strong> ${opts.title}</p>
     <p>카테고리: ${opts.category}</p>
     <p><a href="${link}">문의 관리 열기</a></p>`,
  );
}

export async function notifyAuthorReply(opts: {
  supabase: SupabaseClient;
  authorUserId: string;
  ticketNo: string;
  title: string;
  ticketId: string;
}) {
  const { data: profile } = await opts.supabase
    .from("profiles")
    .select("email")
    .eq("id", opts.authorUserId)
    .maybeSingle();

  const to = profile?.email;
  if (!to) return;

  const link = `${process.env.NEXT_PUBLIC_APP_URL || "https://floxync.com"}/dashboard/support/${opts.ticketId}`;
  await sendHtml(
    to,
    `[Floxync] 문의하신 내용에 답변이 등록되었습니다`,
    `<p>문의 <strong>${opts.ticketNo}</strong>: ${opts.title}</p>
     <p><a href="${link}">게시판에서 답변 확인</a></p>`,
  );
}
