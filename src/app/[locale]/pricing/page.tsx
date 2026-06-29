import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppLocale, isSupportedLocale, toBaseLocale } from "@/i18n/config";
import { PublicPricingView } from "@/components/pricing/PublicPricingView";
import { buildPublicPricingPageCopy } from "@/lib/pricing/public-pricing-copy";
import { isPublicPricingKrw } from "@/lib/pricing/public-pricing";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) {
    return { title: "FloXync — Pricing" };
  }
  const baseLocale = toBaseLocale(locale as AppLocale);
  const copy = buildPublicPricingPageCopy(
    baseLocale,
    isPublicPricingKrw(locale as AppLocale),
    baseLocale === "ko",
  );
  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
  };
}

export default async function PricingPage({ params }: Props) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();

  return <PublicPricingView locale={locale as AppLocale} />;
}
