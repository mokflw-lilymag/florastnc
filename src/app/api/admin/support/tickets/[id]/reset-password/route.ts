import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import { errAdminInvalidBody, errAdminOperationFailed } from "@/lib/admin/admin-api-errors";
import { createAdminClient } from "@/utils/supabase/admin";
import { logSupportAudit, requireSuperAdmin } from "@/lib/support-tickets/db";
import { verifyRemoteAssistCode } from "@/lib/support-tickets/assist-code";
import { categoryRequiresAssistCode } from "@/lib/support-tickets/assist-code";
import { resolveSmtpForHq, sendMailViaSmtp } from "@/lib/email/smtp-server";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: RouteCtx) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const bl = await hqApiUiBase(req, body?.uiLocale as string | undefined);
  const adminGate = requireSuperAdmin(gate, bl);
  if (!adminGate.ok) return adminGate.response;

  const code = (body?.code as string | undefined)?.trim() ?? "";
  const newPassword = (body?.newPassword as string | undefined)?.trim() ?? "";
  const userId = body?.userId as string | undefined;
  const sendEmail = Boolean(body?.sendEmail);

  if (!code || !newPassword || !userId) {
    return NextResponse.json({ error: errAdminInvalidBody(bl) }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: "비밀번호는 6자 이상이어야 합니다." }, { status: 400 });
  }

  const { data: ticket, error: tErr } = await adminGate.admin
    .from("support_tickets")
    .select("id, ticket_no, category, remote_assist_code_hash, deleted_at")
    .eq("id", id)
    .maybeSingle();

  if (tErr || !ticket || ticket.deleted_at) {
    return NextResponse.json({ error: "문의를 찾을 수 없습니다." }, { status: 404 });
  }

  if (ticket.category !== "login-help") {
    return NextResponse.json({ error: "로그인·비밀번호 문의가 아닙니다." }, { status: 400 });
  }

  if (
    categoryRequiresAssistCode(ticket.category as string) &&
    !verifyRemoteAssistCode(id, code, ticket.remote_assist_code_hash as string | null)
  ) {
    await logSupportAudit(adminGate.admin, id, "remote_settings_unlock_failed", gate.userId, {
      ticket_no: ticket.ticket_no,
      action: "password_reset",
    });
    return NextResponse.json({ error: "확인용 비밀번호가 일치하지 않습니다." }, { status: 403 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  const { data: userRecord, error: userError } = await admin.auth.admin.getUserById(userId);
  if (userError || !userRecord?.user) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  const { error: pwErr } = await admin.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (pwErr) {
    return NextResponse.json({ error: pwErr.message }, { status: 500 });
  }

  if (sendEmail && userRecord.user.email) {
    const smtp = await resolveSmtpForHq(admin);
    if (smtp) {
      await sendMailViaSmtp(smtp, {
        to: userRecord.user.email,
        subject: "[Floxync] 임시 비밀번호 안내",
        html: `<p>임시 비밀번호: <strong>${newPassword}</strong></p><p>로그인 후 비밀번호를 변경해 주세요.</p>`,
      });
    }
  }

  await logSupportAudit(adminGate.admin, id, "password_reset", gate.userId, {
    ticket_no: ticket.ticket_no,
    user_id: userId,
    email: userRecord.user.email,
  });

  return NextResponse.json({ ok: true, email: userRecord.user.email });
}
