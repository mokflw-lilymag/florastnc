import type { AppLocale } from "@/i18n/config";
import type { AppMessages } from "@/i18n/types";

export { loadMessagesAsync, loadPublicMessagesAsync } from "@/i18n/loadMessages";
export type { PublicMessages } from "@/i18n/loadMessages";

let installedMessages: AppMessages | null = null;

/** Client MessagesProvider가 SSR/CSR 모두에서 주입 */
export function installAppMessages(messages: AppMessages) {
  installedMessages = messages;
}

export function getInstalledMessages(): AppMessages | null {
  return installedMessages;
}

/**
 * 클라이언트 컴포넌트용 동기 접근 — MessagesProvider 아래에서만 사용.
 * 서버(RSC)에서는 getServerMessages / getPublicServerMessages 를 await 하세요.
 */
export function getMessages(_localeInput?: AppLocale | string): AppMessages {
  if (installedMessages) return installedMessages;
  throw new Error(
    "getMessages() requires MessagesProvider. On the server, use getServerMessages() or getPublicServerMessages().",
  );
}
