import { notFound } from "next/navigation";
import LoginPage from "@/app/login/page";
import { isSupportedLocale } from "@/i18n/config";

type Props = { params: Promise<{ locale: string }> };

export default async function LocaleLoginPage({ params }: Props) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  return <LoginPage />;
}
