import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppLocale, isSupportedLocale, toBaseLocale } from "@/i18n/config";
import { PublicPricingView } from "@/components/pricing/PublicPricingView";
import { buildPublicPricingPageCopy } from "@/lib/pricing/public-pricing-copy";
import { isPublicPricingKrw } from "@/lib/pricing/public-pricing";

type Props = { params: Promise<{ locale: string }> };

import { createClient } from "@/utils/supabase/server";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) {
    return { title: "FloXync — Pricing" };
  }
  
  const supabase = await createClient();
  const { data: hqData } = await supabase
    .from("system_settings")
    .select("data")
    .eq("id", "hq")
    .single();

  const baseLocale = toBaseLocale(locale as AppLocale);
  const copy = buildPublicPricingPageCopy(
    baseLocale,
    isPublicPricingKrw(locale as AppLocale),
    baseLocale === "ko",
    hqData?.data
  );
  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
  };
}

export default async function PricingPage({ params }: Props) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();

  const supabase = await createClient();
  const { data: hqData } = await supabase
    .from("system_settings")
    .select("data")
    .eq("id", "hq")
    .single();

  return <PublicPricingView locale={locale as AppLocale} hqSettings={hqData?.data} />;
}
