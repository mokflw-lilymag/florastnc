import { notFound } from "next/navigation";
import { LuminousLanding } from "@/components/landing/LuminousLanding";
import { AppLocale, isSupportedLocale } from "@/i18n/config";

type Props = { params: Promise<{ locale: string }> };

export default async function LocalizedHome({ params }: Props) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const l = locale as AppLocale;
  return (
    <LuminousLanding locale={l} />
  );
}
