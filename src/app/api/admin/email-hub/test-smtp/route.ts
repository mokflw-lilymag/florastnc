import { NextResponse } from "next/server";
import { requireEmailHubAdmin } from "@/lib/admin/email-hub/guard";
import { resolveSmtpForHq, sendMailViaSmtp } from "@/lib/email/smtp-server";

export async function POST(req: Request) {
  const auth = await requireEmailHubAdmin(req);
  if (!auth.ok) return auth.response;

  let body: { to?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const to = (body.to || "").trim();
  if (!to) {
    return NextResponse.json({ error: "TO_REQUIRED" }, { status: 400 });
  }

  const smtp = await resolveSmtpForHq(auth.admin);
  if (!smtp) {
    return NextResponse.json({
      ok: true,
      simulated: true,
      message: "SMTP 미설정 — 실제 발송 없이 연결 테스트를 시뮬레이션했습니다.",
    });
  }

  try {
    const result = await sendMailViaSmtp(smtp, {
      to,
      subject: "[FloXync] SMTP 연결 테스트",
      html: `<p>SMTP 설정이 정상입니다. 발신: ${smtp.auth.user}</p><p>시각: ${new Date().toLocaleString("ko-KR")}</p>`,
    });
    return NextResponse.json({ ok: true, simulated: "simulated" in result, messageId: "messageId" in result ? result.messageId : null });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Send failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
