import {
  hashRemoteAssistCode,
  isValidRemoteAssistCode,
  normalizeRemoteAssistCode,
  verifyRemoteAssistCode,
} from "@/lib/support-tickets/remote-settings";

/** 확인용 비밀번호가 필요한 문의 카테고리 */
export const ASSIST_CODE_CATEGORIES = new Set(["remote-settings", "login-help"]);

export function categoryRequiresAssistCode(category: string): boolean {
  return ASSIST_CODE_CATEGORIES.has(category);
}

export {
  hashRemoteAssistCode,
  isValidRemoteAssistCode,
  normalizeRemoteAssistCode,
  verifyRemoteAssistCode,
};
