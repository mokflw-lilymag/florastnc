import { cookies } from "next/headers";
import { LOCALE_COOKIE, resolveLocale } from "@/i18n/config";
import { MessagesProvider } from "@/i18n/messages-provider";
import { loadPublicMessagesAsync } from "@/i18n/loadMessages";
import type { AppMessages } from "@/i18n/types";
import { ElectronAppFrame } from "@/components/desktop/electron-app-frame";

export default async function LoginLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const messages = (await loadPublicMessagesAsync(locale)) as AppMessages;
  return (
    <MessagesProvider messages={messages}>
      <ElectronAppFrame>{children}</ElectronAppFrame>
    </MessagesProvider>
  );
}
