import { isElectronClient } from "@/lib/electron-env";

export const FLOXYNC_DESKTOP_CLIENT_HEADER = "x-floxync-client";
export const FLOXYNC_DESKTOP_CLIENT_VALUE = "desktop";

/** 출퇴근 API 요청 시 데스크톱 앱이면 식별 헤더 포함 */
export function getPosClientHeaders(): HeadersInit {
  if (typeof window === "undefined" || !isElectronClient()) {
    return {};
  }
  return {
    [FLOXYNC_DESKTOP_CLIENT_HEADER]: FLOXYNC_DESKTOP_CLIENT_VALUE,
  };
}

/** 서버: 출퇴근용 POS로 허용된 클라이언트인지 (쿠키 지정 또는 Floxync 데스크톱 앱) */
export function isDesignatedPosClient(
  cookieHeader: string | null,
  tenantId: string,
  requestHeaders: Headers,
): boolean {
  const cookies = cookieHeader || "";
  if (cookies.includes(`designated_pos_tenant_id=${tenantId}`)) {
    return true;
  }
  const client = requestHeaders.get(FLOXYNC_DESKTOP_CLIENT_HEADER);
  return client === FLOXYNC_DESKTOP_CLIENT_VALUE;
}
