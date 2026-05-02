import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LoginPage from "@/app/login/page";
import { AppLocale, isSupportedLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/getMessages";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) {
    return { title: "Floxync" };
  }
  const L = getMessages(locale as AppLocale).login;
  return {
    title: `${L.metaTitle} · Floxync`,
    description: L.metaDescription,
  };
}

export default async function LocaleLoginPage({ params }: Props) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  return <LoginPage />;
}
