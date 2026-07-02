import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  resolveEnvSmtpConfig,
  resolveSmtpForTenant,
  resolveSmtpForHq,
  sendMailViaSmtp,
} from '@/lib/email/smtp-server';

export async function POST(req: Request) {
  try {
    const { to, subject, content, tenantId } = await req.json();

    if (!to) {
      return NextResponse.json({ error: '수신자 이메일 주소가 없습니다.' }, { status: 400 });
    }

    let smtpConfig = null;

    if (tenantId && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
      );
      smtpConfig = await resolveSmtpForTenant(supabaseAdmin, tenantId);
    } else if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
      );
      smtpConfig = await resolveSmtpForHq(supabaseAdmin);
    } else {
      smtpConfig = resolveEnvSmtpConfig();
    }

    if (!smtpConfig) {
      return NextResponse.json(
        {
          message: 'SMTP 설정이 없어 이메일 전송을 시뮬레이션 했습니다.',
          simulated: true,
        },
        { status: 200 },
      );
    }

    const info = await sendMailViaSmtp(smtpConfig, {
      to,
      subject,
      html: content,
    });

    if ('simulated' in info) {
      return NextResponse.json({ message: '시뮬레이션', simulated: true });
    }

    return NextResponse.json({
      message: '이메일이 성공적으로 전송되었습니다.',
      messageId: info.messageId,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API send-email] Email API error:', error);
    return NextResponse.json(
      { error: '이메일 전송 중 오류가 발생했습니다.', details: message },
      { status: 500 },
    );
  }
}
