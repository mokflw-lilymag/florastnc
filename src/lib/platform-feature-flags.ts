/** platform_config.key — 협력사 수발주 메뉴·기능 전역 스위치 */
export const PARTNER_ORDERS_ENABLED_KEY = "partner_orders_enabled";

export function parsePlatformConfigBoolean(
  value: unknown,
  defaultValue = false,
): boolean {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  if (value === 1 || value === "1") return true;
  if (value === 0 || value === "0") return false;
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    if ("enabled" in o) return parsePlatformConfigBoolean(o.enabled, defaultValue);
    if ("value" in o) return parsePlatformConfigBoolean(o.value, defaultValue);
  }
  return defaultValue;
}
