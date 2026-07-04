import { REMOTE_SETTINGS_REQUEST_PLACEHOLDER } from "@/lib/support-tickets/remote-settings";

export const LOGIN_HELP_DEFAULT_TITLE = "로그인·비밀번호 도움 요청";
export const SUBSCRIPTION_HELP_DEFAULT_TITLE = "구독·결제 도움 요청";

export const LOGIN_HELP_BODY_PLACEHOLDER = `예: 비밀번호를 잊었어요 / 로그인이 안 돼요 / 이메일을 바꾸고 싶어요`;

export const SUBSCRIPTION_HELP_BODY_PLACEHOLDER = `예: 결제했는데 만료로 나와요 / 플랜 업그레이드 / 영수증·세금계산서`;

export function buildLoginHelpBody(requestNotes: string, consentAtIso: string): string {
  const notes = requestNotes.trim() || LOGIN_HELP_BODY_PLACEHOLDER;
  return `[로그인·비밀번호 대리 지원 동의]
Floxync 관리자가 계정 확인·임시 비밀번호 발급을 도와주는 것에 동의합니다.
동의 일시: ${consentAtIso}

[확인용 비밀번호]
문의 접수 시 설정한 4~6자리 숫자입니다.

[상황 설명]
${notes}`;
}

export function buildSubscriptionHelpBody(requestNotes: string): string {
  const notes = requestNotes.trim() || SUBSCRIPTION_HELP_BODY_PLACEHOLDER;
  return `[구독·결제 문의]

[상황 설명]
${notes}

※ 결제 영수증·카드사 문자 캡처를 첨부해 주시면 더 빠르게 처리됩니다.`;
}

export function defaultTitleForCategory(category: string): string | null {
  switch (category) {
    case "remote-settings":
      return "환경설정 대리 요청";
    case "login-help":
      return LOGIN_HELP_DEFAULT_TITLE;
    case "subscription-help":
      return SUBSCRIPTION_HELP_DEFAULT_TITLE;
    default:
      return null;
  }
}

export function bodyPlaceholderForCategory(category: string): string | null {
  switch (category) {
    case "remote-settings":
      return REMOTE_SETTINGS_REQUEST_PLACEHOLDER;
    case "login-help":
      return LOGIN_HELP_BODY_PLACEHOLDER;
    case "subscription-help":
      return SUBSCRIPTION_HELP_BODY_PLACEHOLDER;
    default:
      return null;
  }
}

export function categoryNeedsConsent(category: string): boolean {
  return category === "remote-settings" || category === "login-help";
}
