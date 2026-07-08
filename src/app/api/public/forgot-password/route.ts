import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendMailViaSmtp, resolveSmtpForHq } from "@/lib/email/smtp-server";

function generateRandomPassword(length = 8) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let pwd = "";
  for (let i = 0; i < length; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // 1. Find user by email in profiles
    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    if (profileErr || !profile) {
      // For security, do not reveal if the user exists or not, just return success
      return NextResponse.json({ success: true });
    }

    // 2. Generate new password
    const newPassword = generateRandomPassword(10);

    // 3. Update user password
    const { error: updateError } = await admin.auth.admin.updateUserById(profile.id, {
      password: newPassword,
    });

    if (updateError) {
      console.error("[forgot-password] Update error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 4. Send email
    const smtpConfig = await resolveSmtpForHq(admin);
    if (smtpConfig) {
      const htmlContent = `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #111827; margin-bottom: 16px;">임시 비밀번호 발급 안내</h2>
          <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
            요청하신 임시 비밀번호가 발급되었습니다.
          </p>
          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 6px; margin: 20px 0; text-align: center;">
            <span style="font-size: 14px; color: #6b7280; display: block; margin-bottom: 8px;">새 임시 비밀번호</span>
            <strong style="font-size: 24px; color: #111827; letter-spacing: 2px;">${newPassword}</strong>
          </div>
          <p style="color: #ef4444; font-size: 13px;">
            보안을 위해 서비스에 로그인하신 후 반드시 비밀번호를 즉시 변경해 주세요.
          </p>
        </div>
      `;
      await sendMailViaSmtp(smtpConfig, {
        to: profile.email,
        subject: '[Floxync] 임시 비밀번호가 발급되었습니다.',
        html: htmlContent
      }).catch(err => console.error("[forgot-password] Email send failed:", err));
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[forgot-password] Internal Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
