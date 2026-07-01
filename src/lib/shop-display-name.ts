const DEFAULT_SITE_NAME = "FloXync";

/** 대시보드 인사말·헤더 등에 쓸 매장 표시명 (꽃집명 우선) */
export function resolveShopDisplayName(opts: {
  tenantName?: string | null;
  siteName?: string | null;
  fullName?: string | null;
  fallback?: string;
}): string {
  const { tenantName, siteName, fullName, fallback = "사용자" } = opts;
  const trimmedTenant = tenantName?.trim();
  if (trimmedTenant) return trimmedTenant;

  const trimmedSite = siteName?.trim();
  if (trimmedSite && trimmedSite !== DEFAULT_SITE_NAME) return trimmedSite;

  const trimmedFull = fullName?.trim();
  if (trimmedFull) return trimmedFull;

  if (trimmedSite) return trimmedSite;

  return fallback;
}
