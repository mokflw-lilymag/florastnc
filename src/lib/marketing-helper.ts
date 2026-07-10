import { injectShopLogoIntoContent } from './email/template-blocks';

export function formatMarketingMessage(
  template: string,
  data: {
    customerName: string;
    anniversaryName?: string;
    branchName?: string;
    customerPoint?: number;
    description?: string;
    shopLogoUrl?: string;
    pointRate?: number;
    minPointUsage?: number;
    isPlainText?: boolean;
  }
) {
  if (!template) return '';
  
  let result = template;
  result = result.replace(/\{고객명\}/g, data.customerName || '');
  if (data.anniversaryName) result = result.replace(/\{기념일명\}/g, data.anniversaryName);
  if (data.branchName) result = result.replace(/\{매장명\}|\{회사명\}|\{지점명\}/g, data.branchName);
  
  const hasPointsFeature = (data.pointRate !== undefined && data.pointRate > 0) || (data.pointRate === undefined && data.customerPoint !== undefined && data.customerPoint > 0);
  const minUsage = data.minPointUsage || 5000;

  if (hasPointsFeature) {
    const cp = data.customerPoint || 0;
    result = result.replace(/\{보유포인트\}/g, cp.toLocaleString() + 'P');
    if (data.isPlainText) {
      result = result.replace(/\{포인트안내\}/g, `\n🎁 [고객님 혜택 안내]\n현재 보유하신 포인트는 ${cp.toLocaleString()}점입니다!\n${minUsage.toLocaleString()}점부터 현금처럼 즉시 사용 가능하니, 소멸되기 전에 얼른 사용하러 오세요! 🏃‍♀️💨\n`);
    } else {
      result = result.replace(/\{포인트안내\}/g, `<div style="margin: 32px 0; padding: 28px 20px; background: linear-gradient(135deg, #fff1f2 0%, #fce7f3 100%); border-radius: 16px; text-align: center; border: 1px solid #fbcfe8; box-shadow: 0 4px 12px rgba(244, 114, 182, 0.1);"><p style="margin: 0; font-size: 15px; color: #be185d; font-weight: bold;">고객님의 소중한 혜택 🎁</p><p style="margin: 16px 0; font-size: 28px; color: #e11d48; font-weight: 900; letter-spacing: -0.5px; line-height: 1.2;"><span style="font-size: 13px; color: #9f1239; font-weight: bold; display: block; margin-bottom: 4px;">현재 보유 포인트</span>${cp.toLocaleString()}점</p><p style="margin: 0; font-size: 14px; color: #881337; font-weight: 600; line-height: 1.6;">${minUsage.toLocaleString()}점부터 현금처럼 즉시 사용 가능합니다.<br/><span style="color: #e11d48; font-weight: bold; text-decoration: underline;">소멸되기 전에 얼른 사용하러 오세요! 🏃‍♀️💨</span></p></div>`);
    }
  } else {
    result = result.replace(/\{보유포인트\}/g, '0P');
    result = result.replace(/\{포인트안내\}/g, '');
  }

  if (data.description) result = result.replace(/\{설명\}/g, data.description);
  
  if (data.shopLogoUrl !== undefined && result.includes('{{shop_logo}}')) {
    result = injectShopLogoIntoContent(result, data.shopLogoUrl, data.branchName || '매장');
  }

  return result;
}

export async function sendMarketingEmail(
  to: string,
  subject: string,
  content: string,
  tenantId: string
) {
  const response = await fetch('/api/send-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to,
      subject,
      content,
      tenantId,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to send marketing email');
  }

  return response.json();
}
