import { NextResponse } from "next/server";
import { effectiveIsSuperAdmin, requireAuthenticated } from "@/lib/auth-api-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import { errAdminForbidden, errAdminServerMisconfigured } from "@/lib/admin/admin-api-errors";
import { sendMailViaSmtp, resolveEnvSmtpConfig, resolveSmtpForHq } from "@/lib/email/smtp-server";

export async function POST(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const sp = new URL(req.url).searchParams;
  const bl = await hqApiUiBase(req, sp.get("uiLocale"));

  if (!effectiveIsSuperAdmin(gate.profile, gate.email)) {
    return NextResponse.json({ error: errAdminForbidden(bl) }, { status: 403 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: errAdminServerMisconfigured(bl) }, { status: 500 });
  }

  try {
    const { userId, newPassword, sendEmail } = await req.json();

    if (!userId || !newPassword) {
      return NextResponse.json({ error: "userId and newPassword are required" }, { status: 400 });
    }

    const { data: userRecord, error: userError } = await admin.auth.admin.getUserById(userId);
    if (userError || !userRecord?.user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { data, error } = await admin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      console.error("Error resetting password:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 이메일 자동 전송
    if (sendEmail && userRecord.user.email) {
      const smtpConfig = await resolveSmtpForHq(admin);
      if (smtpConfig) {
        const htmlContent = `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h2 style="color: #111827; margin-bottom: 16px;">임시 비밀번호 발급 안내</h2>
            <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
              안녕하세요. 관리자에 의해 계정의 비밀번호가 초기화되었습니다.
            </p>
            <div style="background-color: #f3f4f6; padding: 16px; border-radius: 6px; margin: 20px 0; text-align: center;">
              <span style="font-size: 14px; color: #6b7280; display: block; margin-bottom: 8px;">새 임시 비밀번호</span>
              <strong style="font-size: 24px; color: #111827; letter-spacing: 2px;">${newPassword}</strong>
            </div>
            <p style="color: #ef4444; font-size: 13px;">
              보안을 위해 서비스에 로그인하신 후 반드시 비밀번호를 변경해 주세요.
            </p>
          </div>
        `;
        await sendMailViaSmtp(smtpConfig, {
          to: userRecord.user.email,
          subject: '[Floxync] 임시 비밀번호가 발급되었습니다.',
          html: htmlContent
        }).catch(err => console.error("이메일 발송 실패:", err));
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error in reset password endpoint:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
