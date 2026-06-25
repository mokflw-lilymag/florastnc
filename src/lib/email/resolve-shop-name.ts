/** 이메일 {회사명}·발신인 표시에 쓸 매장명 (SMTP 발신명 → 로그인 매장명 → 사이트명 순) */
export function resolveEmailShopName(
  settings: { smtpSenderName?: string; siteName?: string },
  tenantShopName?: string | null,
): string {
  const smtp = settings.smtpSenderName?.trim();
  if (smtp) return smtp;

  const tenant = tenantShopName?.trim();
  if (tenant) return tenant;

  const site = settings.siteName?.trim();
  if (site) return site;

  return 'FloXync';
}
