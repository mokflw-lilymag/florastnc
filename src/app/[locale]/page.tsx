import { notFound } from "next/navigation";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { TestUserApplySection } from "@/components/landing/TestUserApplySection";
import { Footer } from "@/components/landing/Footer";
import { AppLocale, isSupportedLocale } from "@/i18n/config";

type Props = { params: Promise<{ locale: string }> };

export default async function LocalizedHome({ params }: Props) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const l = locale as AppLocale;
  return (
    <main className="min-h-screen bg-[#0A0F0D] text-white overflow-x-hidden selection:bg-emerald-500/30 selection:text-emerald-200">
      <Navbar locale={l} />
      <Hero locale={l} />
      <Features locale={l} />
      <TestUserApplySection locale={l} />
      <Footer locale={l} />
    </main>
  );
}
