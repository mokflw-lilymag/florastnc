import Link from "next/link";
import { ArrowLeft, Mail, Check } from "lucide-react";
import { Footer } from "@/components/landing/Footer";
import { AndroidApkQrCard } from "@/components/pricing/AndroidApkQrCard";
import type { AppLocale } from "@/i18n/config";
import { toBaseLocale } from "@/i18n/config";
import { buildPublicPricingPageCopy } from "@/lib/pricing/public-pricing-copy";
import { isPublicPricingKrw } from "@/lib/pricing/public-pricing";
import { cn } from "@/lib/utils";

type Props = {
  locale: AppLocale;
};

export function PublicPricingView({ locale }: Props) {
  const baseLocale = toBaseLocale(locale);
  const useKrw = isPublicPricingKrw(locale);
  const copy = buildPublicPricingPageCopy(baseLocale, useKrw, baseLocale === "ko");

  return (
    <main className="min-h-screen bg-[#fbf9f7] text-[#1b1c1b] selection:bg-[#86e3ce] selection:text-[#006657] overflow-x-hidden relative">
      <div className="absolute top-0 -left-64 w-[600px] h-[600px] bg-[#86e3ce]/20 rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="absolute bottom-0 -right-32 w-[500px] h-[500px] bg-[#fdcada]/20 rounded-full blur-[100px] pointer-events-none -z-10" />

      <article className="pt-16 pb-24 md:pt-20 md:pb-32 relative z-10">
        <div className="container mx-auto px-6 md:px-12 max-w-6xl">
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-2 text-sm font-bold text-[#3e4946] hover:text-[#006b5c] transition-colors mb-10 uppercase tracking-widest"
          >
            <ArrowLeft className="w-4 h-4" />
            {copy.backHome}
          </Link>

          <header className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#86e3ce]/50 text-[#006657] font-bold text-xs mb-6 border border-[#006b5c]/10 uppercase tracking-[0.2em] shadow-sm">
              {copy.badge}
            </div>
            <h1 className="text-3xl md:text-5xl font-black mb-6 text-gradient bg-clip-text">
              {copy.h1}
            </h1>
            <p className="text-[#3e4946] text-lg md:text-xl leading-relaxed max-w-2xl mx-auto font-medium">
              {copy.subtitle}
            </p>
          </header>

          <p className="text-center text-xs md:text-sm text-[#3e4946]/90 max-w-3xl mx-auto mb-12 px-4 py-3 rounded-2xl bg-white/60 border border-[#bdc9c5]/30">
            {copy.disclaimer}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-16 items-stretch">
            {copy.plans.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  "glass-card p-5 rounded-3xl flex flex-col justify-between shadow-md hover:scale-[1.02] transition-transform duration-300 relative",
                  plan.highlighted
                    ? "border-2 border-[#006b5c] candy-gradient"
                    : "border-white/60 bg-white/70",
                )}
              >
                {plan.bestBadge ? (
                  <div className="absolute top-0 right-0 bg-[#006b5c] text-white text-[9px] font-black px-2 py-0.5 rounded-bl-xl">
                    {plan.bestBadge}
                  </div>
                ) : null}
                <div>
                  <span
                    className={cn(
                      "inline-block px-3 py-1 rounded-md text-xs font-bold mb-4",
                      plan.badgeClass,
                    )}
                  >
                    {plan.badge}
                  </span>
                  <h3
                    className={cn(
                      "text-lg font-black mb-2 text-slate-900",
                      plan.nameClass,
                    )}
                  >
                    {plan.name}
                  </h3>
                  <p className="text-slate-500 text-xs mb-6 h-10">{plan.description}</p>
                  <div className="mb-6">
                    <span className="text-2xl font-extrabold text-slate-900">
                      {plan.monthlyPrice}
                    </span>
                    <div
                      className={cn("text-[11px] font-bold mt-1", plan.annualNoteClass)}
                    >
                      {plan.annualNote}
                    </div>
                  </div>
                  <div className="border-t border-slate-100/50 pt-4">
                    <ul className="space-y-2 text-slate-700 text-xs">
                      {plan.features.map((feature) => (
                        <li
                          key={feature.text}
                          className={cn(
                            "flex items-center gap-1.5",
                            feature.strikethrough && "text-slate-400 line-through",
                            feature.bold && "font-bold text-emerald-700",
                            feature.warn && "font-semibold text-rose-600",
                          )}
                        >
                          <Check
                            className={cn(
                              "w-3.5 h-3.5 shrink-0",
                              feature.warn
                                ? "text-rose-500"
                                : feature.strikethrough
                                  ? "text-slate-400"
                                  : "text-emerald-600",
                            )}
                          />
                          {feature.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="mt-8 pt-4 border-t border-slate-100/50">
                  <div className="text-[11px] text-slate-500 text-center font-bold">
                    {plan.footer}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-8 md:p-12 rounded-[2.5rem] bg-gradient-to-r from-[#006b5c]/10 to-[#665590]/10 border border-[#006b5c]/20 shadow-lg text-center">
            <h3 className="text-xl md:text-2xl font-black mb-4 text-[#006b5c]">
              {copy.ctaTitle}
            </h3>
            <p className="text-sm md:text-base text-[#3e4946] mb-8 max-w-lg mx-auto">
              {copy.ctaBody}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link
                href={`/${locale}#test-user-apply`}
                className="bg-[#006b5c] text-white font-bold px-8 py-4 rounded-full shadow-lg shadow-[#006b5c]/20 hover:scale-105 transition-all text-center"
              >
                {copy.ctaApply}
              </Link>
              <a
                href="mailto:admin@floxync.com"
                className="bg-white text-[#1b1c1b] border border-[#bdc9c5]/30 font-bold px-8 py-4 rounded-full flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
              >
                <Mail className="w-5 h-5" />
                {copy.ctaEmail}
              </a>
            </div>

            <div className="border-t border-[#bdc9c5]/30 pt-8 mt-8">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
                {copy.downloadTitle}
              </p>
              <div className="flex flex-col lg:flex-row gap-6 justify-center items-center lg:items-stretch">
                <a
                  href="/api/downloads/bridge"
                  download="Floxync-Bridge-Setup.zip"
                  className="w-full sm:w-auto bg-[#665590] text-white font-bold px-6 py-3 rounded-full flex items-center justify-center gap-2 hover:bg-[#524475] transition-all shadow-md text-sm self-center"
                >
                  <span className="material-symbols-outlined text-[20px]">download</span>
                  {copy.downloadWindows}
                </a>
                <AndroidApkQrCard
                  buttonLabel={copy.downloadAndroid}
                  qrCaption={copy.androidQrCaption}
                  qrAlt={copy.androidQrAlt}
                  guidanceItems={copy.androidGuidanceItems}
                />
              </div>
            </div>
          </div>
        </div>
      </article>

      <Footer locale={locale} />
    </main>
  );
}
