import { MessagesProvider } from "@/i18n/messages-provider";
import { loadMessagesAsync } from "@/i18n/loadMessages";
import type { AppLocale } from "@/i18n/config";
import type { AppMessages } from "@/i18n/types";

export async function AppMessagesProvider({
  locale,
  children,
}: {
  locale: AppLocale | string;
  children: React.ReactNode;
}) {
  const messages = (await loadMessagesAsync(locale)) as AppMessages;
  return <MessagesProvider messages={messages}>{children}</MessagesProvider>;
}
