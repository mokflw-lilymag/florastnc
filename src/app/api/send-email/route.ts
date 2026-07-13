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
    const { to, subject, content, tenantId, isMarketing } = await req.json();

    if (!to) {
      return NextResponse.json({ error: '수신자 이메일 주소가 없습니다.' }, { status: 400 });
    }

    let smtpConfig = null;

    if (tenantId && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
      );

      // Check marketing consent
      if (isMarketing) {
        const { data: customerData } = await supabaseAdmin
          .from('customers')
          .select('marketing_consent')
          .eq('tenant_id', tenantId)
          .eq('email', to)
          .single();
        
        if (customerData && customerData.marketing_consent === false) {
          return NextResponse.json({ 
            error: '수신자가 마케팅 정보 수신을 거부했습니다.',
            code: 'MARKETING_OPT_OUT'
          }, { status: 403 });
        }
      }

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
