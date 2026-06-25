import { resolveEmailShopName } from '@/lib/email/resolve-shop-name';
import { formatKakaoPcMessage } from '@/lib/kakaotalk-helper';
import {
  DEFAULT_KAKAO_TEMPLATE_DELIVERY_COMPLETE,
  DEFAULT_KAKAO_TEMPLATE_PRODUCTION_COMPLETE,
} from '@/lib/kakao/default-pc-templates';

type KakaoTemplateSettings = {
  kakaoTemplateProductionComplete?: string;
  kakaoTemplateDeliveryComplete?: string;
  smtpSenderName?: string;
  siteName?: string;
};

export function buildKakaoPcNotificationMessage(
  type: 'production' | 'delivery',
  settings: KakaoTemplateSettings,
  params: {
    customerName: string;
    tenantShopName?: string | null;
    photoUrl?: string | null;
  },
): string {
  const shopName = resolveEmailShopName(settings, params.tenantShopName);
  const template =
    type === 'production'
      ? settings.kakaoTemplateProductionComplete || DEFAULT_KAKAO_TEMPLATE_PRODUCTION_COMPLETE
      : settings.kakaoTemplateDeliveryComplete || DEFAULT_KAKAO_TEMPLATE_DELIVERY_COMPLETE;

  let message = formatKakaoPcMessage(template, {
    customerName: params.customerName,
    shopName,
  });

  const photoUrl = params.photoUrl?.trim();
  if (photoUrl) {
    message = message.replace(/{사진링크}/g, `(완성 사진 확인: ${photoUrl})`);
  } else {
    message = message.replace(/{사진링크}/g, '');
  }

  return message.replace(/\s{2,}/g, ' ').trim();
}
