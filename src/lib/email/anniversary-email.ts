import type { SupabaseClient } from '@supabase/supabase-js';
import { replaceTemplateVariables } from '@/lib/email-service';
import { resolveEmailShopName } from '@/lib/email/resolve-shop-name';
import { injectShopLogoIntoContent } from '@/lib/email/template-blocks';
import {
  loadTenantGeneralSettings,
  resolveSmtpForTenant,
  sendMailViaSmtp,
} from '@/lib/email/smtp-server';

export type AnniversaryEmailPayload = {
  tenantId: string;
  to: string;
  customerName: string;
  label: string;
  eventDateYmd: string;
  orderLink: string;
  shopName?: string;
  shopLogoUrl?: string;
};

function formatEventDateKorean(ymd: string): string {
  const [y, m, d] = ymd.split('-');
  if (!y || !m || !d) return ymd;
  return `${y}년 ${parseInt(m, 10)}월 ${parseInt(d, 10)}일`;
}

export async function sendAnniversaryD7Email(
  db: SupabaseClient,
  payload: AnniversaryEmailPayload,
): Promise<{ ok: boolean; simulated?: boolean; error?: string }> {
  const settings = await loadTenantGeneralSettings(db, payload.tenantId);

  if (!settings.autoEmailAnniversaryD7) {
    return { ok: false, error: 'auto_email_disabled' };
  }

  const smtp = await resolveSmtpForTenant(db, payload.tenantId);
  if (!smtp) {
    return { ok: false, error: 'smtp_not_configured' };
  }

  const siteName = resolveEmailShopName(settings, payload.shopName);
  let html = replaceTemplateVariables(settings.emailTemplateAnniversaryD7, {
    고객명: payload.customerName,
    회사명: siteName,
    기념일명: payload.label,
    기념일: formatEventDateKorean(payload.eventDateYmd),
    주문링크: payload.orderLink,
  });
  html = injectShopLogoIntoContent(html, payload.shopLogoUrl, siteName);

  try {
    await sendMailViaSmtp(smtp, {
      to: payload.to,
      subject: `${siteName} - ${payload.label} 안내 (7일 전)`,
      html,
    });
    return { ok: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'send_failed';
    return { ok: false, error: message };
  }
}
