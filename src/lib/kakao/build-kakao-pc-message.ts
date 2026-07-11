import { resolveEmailShopName } from '@/lib/email/resolve-shop-name';
import { formatMarketingMessage } from '@/lib/marketing-helper';
import { getDefaultKakaoTemplates } from '@/lib/messenger/localized-templates';

type KakaoTemplateSettings = {
  kakaoTemplateProductionComplete?: string;
  kakaoTemplateDeliveryComplete?: string;
  smtpSenderName?: string;
  siteName?: string;
  pointRate?: number;
  minPointUsage?: number;
};

export function buildKakaoPcNotificationMessage(
  type: 'production' | 'delivery',
  settings: KakaoTemplateSettings,
  params: {
    customerName: string;
    tenantShopName?: string | null;
    photoUrl?: string | null;
    customerPoint?: number;
  },
): string {
  const shopName = resolveEmailShopName(settings, params.tenantShopName);
  const defaultTemplates = getDefaultKakaoTemplates('ko');
  const template =
    type === 'production'
      ? settings.kakaoTemplateProductionComplete || defaultTemplates.productionComplete
      : settings.kakaoTemplateDeliveryComplete || defaultTemplates.deliveryComplete;

  let message = formatMarketingMessage(template, {
    customerName: params.customerName,
    branchName: shopName,
    customerPoint: params.customerPoint || 0,
    pointRate: settings.pointRate,
    minPointUsage: settings.minPointUsage,
    isPlainText: true,
  });

  const photoUrl = params.photoUrl?.trim();
  if (photoUrl) {
    message = message.replace(/{사진링크}/g, `(완성 사진 확인: ${photoUrl})`);
  } else {
    message = message.replace(/{사진링크}/g, '');
  }

  return message.trim();
}
