import { createHash, timingSafeEqual } from "node:crypto";

/** 환경설정 대리 문의 전용 카테고리 */
export const REMOTE_SETTINGS_CATEGORY_ID = "remote-settings" as const;

export function isRemoteSettingsCategory(category: string): boolean {
  return category === REMOTE_SETTINGS_CATEGORY_ID;
}

export const REMOTE_SETTINGS_DEFAULT_TITLE = "환경설정 대리 요청";

export const REMOTE_SETTINGS_REQUEST_PLACEHOLDER = `예: ppBridge 연결, 영수증 언어, 토스 결제, 솔라피 알림톡…`;

export function buildRemoteSettingsTicketBody(requestNotes: string, consentAtIso: string): string {
  const notes = requestNotes.trim() || "(아래에 도움 받고 싶은 내용을 적어 주세요)";
  return `[환경설정 대리 동의]
Floxync 관리자가 제 매장 환경설정을 대신 해주는 것에 동의합니다.
동의 일시: ${consentAtIso}

[확인용 비밀번호]
문의 접수 시 설정한 4~6자리 숫자입니다. (관리자가 환경설정을 열 때 입력합니다)

[도움 받고 싶은 내용]
${notes}`;
}

const PEPPER = process.env.SUPPORT_REMOTE_CODE_PEPPER || "floxync-remote-assist-v1";

export function normalizeRemoteAssistCode(raw: string): string {
  return raw.trim().replace(/\s/g, "");
}

/** 4~6자리 숫자 */
export function isValidRemoteAssistCode(code: string): boolean {
  return /^\d{4,6}$/.test(normalizeRemoteAssistCode(code));
}

export function hashRemoteAssistCode(ticketId: string, code: string): string {
  const normalized = normalizeRemoteAssistCode(code);
  return createHash("sha256")
    .update(`${PEPPER}:${ticketId}:${normalized}`)
    .digest("hex");
}

export function verifyRemoteAssistCode(
  ticketId: string,
  code: string,
  storedHash: string | null | undefined,
): boolean {
  if (!storedHash) return false;
  const computed = hashRemoteAssistCode(ticketId, code);
  try {
    return timingSafeEqual(Buffer.from(computed, "utf8"), Buffer.from(storedHash, "utf8"));
  } catch {
    return false;
  }
}
