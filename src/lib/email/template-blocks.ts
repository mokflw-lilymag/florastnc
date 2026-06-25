export const EMAIL_SHOP_LOGO_PLACEHOLDER = '{{shop_logo}}';
export const EMAIL_DELIVERY_IMAGE_PLACEHOLDER = '{{delivery_image}}';

export function buildShopLogoHtml(logoUrl: string, altText: string): string {
  const safeAlt = altText.replace(/"/g, '&quot;');
  const safeUrl = logoUrl.replace(/"/g, '&quot;');
  return `<div style="margin: 0 0 16px 0; text-align: center;">
  <img src="${safeUrl}" alt="${safeAlt}" style="max-height: 72px; max-width: 220px; width: auto; height: auto; object-fit: contain; display: inline-block;" />
</div>`;
}

export function injectShopLogoIntoContent(
  content: string,
  logoUrl: string | null | undefined,
  shopName = '매장',
): string {
  if (!content.includes(EMAIL_SHOP_LOGO_PLACEHOLDER)) return content;
  const replacement = logoUrl?.trim()
    ? buildShopLogoHtml(logoUrl.trim(), shopName)
    : '';
  return content.split(EMAIL_SHOP_LOGO_PLACEHOLDER).join(replacement);
}

export function buildDeliveryImagePreviewPlaceholder(): string {
  return `<div style="margin:16px 0;text-align:center;padding:12px;background:#f5f5f5;border-radius:8px;color:#888;font-size:12px;">📸 완성/배송 사진 영역</div>`;
}
