import type { SystemSettings } from '@/hooks/use-settings';
import { resolveEmailShopName } from '@/lib/email/resolve-shop-name';
import {
  EMAIL_DELIVERY_IMAGE_PLACEHOLDER,
  injectShopLogoIntoContent,
} from '@/lib/email/template-blocks';

function isHtml(content: string): boolean {
  return (
    content.includes('<!DOCTYPE html') ||
    content.includes('<html') ||
    content.includes('<body') ||
    content.includes('<div') ||
    content.includes('<p') ||
    content.includes('<table')
  );
}

export function replaceTemplateVariables(
  template: string,
  variables: Record<string, string | number>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }
  return result;
}

function injectPhotoIntoContent(
  emailContent: string,
  photoUrl: string | undefined,
  label: string,
): string {
  if (photoUrl) {
    const photoHtml = `
        <div style="margin: 20px 0; text-align: center;">
          <p style="font-size: 13px; color: #666; font-weight: bold; margin-bottom: 8px;">${label}</p>
          <img src="${photoUrl}" alt="완성 사진" style="max-width: 100%; max-height: 450px; object-fit: contain; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
        </div>
      `;

    if (emailContent.includes(EMAIL_DELIVERY_IMAGE_PLACEHOLDER)) {
      return emailContent.replace(EMAIL_DELIVERY_IMAGE_PLACEHOLDER, photoHtml);
    }
    if (isHtml(emailContent)) {
      if (emailContent.includes('</body>')) {
        return emailContent.replace('</body>', photoHtml + '</body>');
      }
      return emailContent + photoHtml;
    }
    return `${emailContent}\n\n${label}: ${photoUrl}`;
  }

  return emailContent.replace(EMAIL_DELIVERY_IMAGE_PLACEHOLDER, '');
}

function finalizeEmailContent(
  content: string,
  options: {
    shopName: string;
    shopLogoUrl?: string | null;
    photoUrl?: string;
    photoLabel?: string;
  },
): string {
  let result = injectShopLogoIntoContent(content, options.shopLogoUrl, options.shopName);
  if (options.photoLabel) {
    result = injectPhotoIntoContent(result, options.photoUrl, options.photoLabel);
  }
  return result;
}

export async function sendProductionCompleteEmail(
  customerEmail: string,
  customerName: string,
  orderNumber: string,
  settings: SystemSettings,
  photoUrl?: string,
  tenantId?: string,
  forceSend = false,
  tenantShopName?: string | null,
  tenantLogoUrl?: string | null,
): Promise<boolean> {
  if (!forceSend && !settings.autoEmailProductionComplete) {
    return false;
  }

  const siteName = resolveEmailShopName(settings, tenantShopName);
  let emailContent = replaceTemplateVariables(settings.emailTemplateProductionComplete, {
    고객명: customerName,
    주문번호: orderNumber,
    회사명: siteName,
  });

  emailContent = finalizeEmailContent(emailContent, {
    shopName: siteName,
    shopLogoUrl: tenantLogoUrl,
    photoUrl,
    photoLabel: '📸 제작완료 사진',
  });

  await sendEmail(
    customerEmail,
    `${siteName} - 제작완료 알림`,
    emailContent,
    isHtml(emailContent),
    tenantId,
  );
  return true;
}

export async function sendDeliveryCompleteEmail(
  customerEmail: string,
  customerName: string,
  orderNumber: string,
  deliveryDate: string,
  settings: SystemSettings,
  completionPhotoUrl?: string,
  tenantId?: string,
  recipientName?: string,
  forceSend = false,
  tenantShopName?: string | null,
  tenantLogoUrl?: string | null,
): Promise<boolean> {
  if (!forceSend && !settings.autoEmailDeliveryComplete) {
    return false;
  }

  const siteName = resolveEmailShopName(settings, tenantShopName);
  let emailContent = replaceTemplateVariables(settings.emailTemplateDeliveryComplete, {
    고객명: customerName,
    주문번호: orderNumber,
    배송일: deliveryDate,
    회사명: siteName,
    수령인: recipientName || '고객님',
  });

  emailContent = finalizeEmailContent(emailContent, {
    shopName: siteName,
    shopLogoUrl: tenantLogoUrl,
    photoUrl: completionPhotoUrl,
    photoLabel: '📸 배송완료 사진',
  });

  await sendEmail(
    customerEmail,
    `${siteName} - 배송완료 알림`,
    emailContent,
    isHtml(emailContent),
    tenantId,
  );
  return true;
}

async function sendEmail(
  to: string,
  subject: string,
  content: string,
  isHtmlContent = false,
  tenantId?: string,
): Promise<void> {
  const response = await fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to,
      subject,
      content,
      isHtml: isHtmlContent,
      tenantId,
    }),
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.details || errJson.error || '이메일 발송 실패');
  }
}
