import { notFound } from "next/navigation";
import { isSupportedLocale, resolveLocale, type AppLocale } from "@/i18n/config";
import { MessagesProvider } from "@/i18n/messages-provider";
import { loadPublicMessagesAsync } from "@/i18n/loadMessages";
import type { AppMessages } from "@/i18n/types";
import { LocaleElectronFrame } from "@/components/desktop/locale-electron-frame";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  const canonical = resolveLocale(locale);
  if (canonical !== locale || !isSupportedLocale(canonical)) notFound();

  const messages = (await loadPublicMessagesAsync(canonical as AppLocale)) as AppMessages;

  return (
    <MessagesProvider messages={messages}>
      <LocaleElectronFrame>{children}</LocaleElectronFrame>
    </MessagesProvider>
  );
}
