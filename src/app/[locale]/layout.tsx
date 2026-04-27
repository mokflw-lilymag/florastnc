import { notFound } from "next/navigation";
import { isSupportedLocale, resolveLocale } from "@/i18n/config";

type Props = {
  children: React.ReactNode;
  params: Promise<any>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  const canonical = resolveLocale(locale);
  if (canonical !== locale || !isSupportedLocale(canonical)) notFound();
  return <>{children}</>;
}
