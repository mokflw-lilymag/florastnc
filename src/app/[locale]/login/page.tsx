import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LoginPage from "@/app/login/page";
import { AppLocale, isSupportedLocale } from "@/i18n/config";
import { getPublicServerMessages } from "@/i18n/getMessages.server";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) {
    const L = (await getPublicServerMessages("en")).login;
    return { title: `${L.metaTitle} · Floxync` };
  }
  const L = (await getPublicServerMessages(locale as AppLocale)).login;
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
