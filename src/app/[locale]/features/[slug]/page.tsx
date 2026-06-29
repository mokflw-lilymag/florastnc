import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { FeatureVisual } from '@/components/landing/feature-visual';
import { LANDING_FEATURE_SLUGS, getLandingFeatureBySlug } from '@/data/landing-features';
import { AppLocale, isSupportedLocale, localizePath, SUPPORTED_LOCALES } from '@/i18n/config';
import { getPublicServerMessages } from '@/i18n/getMessages.server';
import type { Metadata } from 'next';

type Props = { params: Promise<{ slug: string; locale: string }> };

export function generateStaticParams() {
  const locales: AppLocale[] = [...SUPPORTED_LOCALES];
  return locales.flatMap((locale) => LANDING_FEATURE_SLUGS.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  const feature = getLandingFeatureBySlug(slug);
  if (!feature || !isSupportedLocale(locale)) return { title: 'Feature' };
  const l = locale as AppLocale;
  const cards = (await getPublicServerMessages(l)).landing.features.featureCards;
  const card = cards[feature.slug as keyof typeof cards];
  const titleText = card?.title ?? "Floxync";
  const descText = card?.description ?? "";
  return {
    title: `${titleText} · Floxync`,
    description: descText,
  };
}

export default async function FeatureDetailPage({ params }: Props) {
  const { slug, locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const l = locale as AppLocale;
  const landing = (await getPublicServerMessages(l)).landing;
  const t = landing.featureDetail;
  const cards = landing.features.featureCards;
  const card = cards[slug as keyof typeof cards];
  const detailPage = landing.featureDetailPages[slug as keyof typeof landing.featureDetailPages];
  const feature = getLandingFeatureBySlug(slug);
  if (!feature) notFound();
  const displayTitle = card?.title ?? slug;
  const displayDescription = card?.description ?? "";

  return (
    <main className="min-h-screen bg-[#0A0F0D] text-white overflow-x-hidden selection:bg-emerald-500/30 selection:text-emerald-200">
      <Navbar locale={l} />
      <article className="pt-28 pb-24 md:pt-36 md:pb-32">
        <div className="container mx-auto px-6 md:px-12 max-w-4xl">
          <Link
            href={`${localizePath(l, '/')}#technology`}
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-emerald-400 transition-colors mb-10 uppercase tracking-widest"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.back}
          </Link>

          <header className="mb-16 md:mb-20 text-center max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-black uppercase tracking-[0.2em] border border-emerald-500/25 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {t.capability}
            </span>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-tight mb-8">
              {displayTitle}
            </h1>
            {feature.comingSoon ? (
              <div className="mb-8 inline-flex items-center px-4 py-2 rounded-full bg-indigo-500/15 text-indigo-300 text-xs font-black uppercase tracking-[0.2em] border border-indigo-400/30">
                {t.comingSoon}
              </div>
            ) : null}
            <p className="text-lg md:text-2xl text-slate-300 font-light leading-relaxed">{displayDescription}</p>
          </header>

          <div className="mb-20 md:mb-24 shadow-[0_0_60px_rgba(16,185,129,0.06)] rounded-[35px] overflow-hidden p-1 bg-gradient-to-b from-white/10 to-transparent">
            <FeatureVisual feature={feature} imageAlt={displayTitle} />
          </div>

          <div className="space-y-8 md:space-y-10">
            {detailPage.sections.map((section, i) => (
              <section 
                key={i} 
                className="relative bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.03] transition-all duration-300 p-8 md:p-12 rounded-[30px] overflow-hidden group"
              >
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                {section.heading ? (
                  <h2 className="text-2xl md:text-3xl font-black text-white mb-6 tracking-tight flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                    {section.heading}
                  </h2>
                ) : null}
                <p className="text-slate-350 leading-relaxed text-base md:text-lg font-normal whitespace-pre-line">{section.body}</p>
              </section>
            ))}
          </div>

          {detailPage.ctaLinks && detailPage.ctaLinks.length > 0 ? (
            <div className="mt-16 flex flex-col sm:flex-row flex-wrap gap-4 justify-center">
              {detailPage.ctaLinks.map((cta) => {
                const isMail = cta.href.startsWith('mailto:');
                const isHashHome = cta.href.startsWith('/#');
                const className = isMail
                  ? 'inline-flex justify-center items-center px-8 py-4 rounded-2xl border border-emerald-500/40 text-emerald-300 font-black text-base text-center hover:bg-emerald-500/10 hover:shadow-[0_0_25px_rgba(16,185,129,0.15)] transition-all'
                  : 'inline-flex justify-center items-center px-8 py-4 rounded-2xl bg-white/5 border border-white/15 text-white font-bold text-base text-center hover:bg-white/10 transition-colors';
                if (isMail) return <a key={cta.label} href={cta.href} className={className}>{cta.label}</a>;
                const href = isHashHome ? `${localizePath(l, '/')}${cta.href.slice(1)}` : localizePath(l, cta.href);
                return <Link key={cta.label} href={href} className={className}>{cta.label}</Link>;
              })}
            </div>
          ) : null}

          <div className="mt-24 pt-12 border-t border-white/5 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={localizePath(l, '/login')}
              className="inline-flex justify-center items-center px-10 py-5 rounded-2xl bg-emerald-500 text-[#0A0F0D] font-black text-base text-center hover:shadow-[0_0_40px_rgba(16,185,129,0.4)] transition-all duration-300"
            >
              {t.startFree}
            </Link>
            <Link
              href={`${localizePath(l, '/')}#technology`}
              className="inline-flex justify-center items-center px-10 py-5 rounded-2xl border border-white/15 text-white font-bold text-base text-center hover:bg-white/5 transition-colors"
            >
              {t.viewOthers}
            </Link>
          </div>
        </div>
      </article>
      <Footer locale={l} />
    </main>
  );
}
