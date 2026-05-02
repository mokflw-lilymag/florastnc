import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { AppLocale, localizePath, toBaseLocale } from '@/i18n/config';
import { getMessages } from '@/i18n/getMessages';

type Props = {
  titleEn: string;
  titleKo: string;
  lastUpdated: string;
  locale?: AppLocale;
  children: React.ReactNode;
};

export function LegalDocShell({ titleEn, titleKo, lastUpdated, locale = 'ko', children }: Props) {
  const L = getMessages(locale).legalDoc;
  const isPrimaryKo = toBaseLocale(locale) === 'ko';

  return (
    <main className="min-h-screen bg-[#0A0F0D] text-white selection:bg-emerald-500/30 selection:text-emerald-200">
      <Navbar locale={locale} />
      <article className="pt-28 pb-24 md:pt-36 md:pb-32">
        <div className="container mx-auto px-6 md:px-12 max-w-3xl">
          <Link
            href={localizePath(locale, '/')}
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-emerald-400 transition-colors mb-10 uppercase tracking-widest"
          >
            <ArrowLeft className="w-4 h-4" />
            {L.backHome}
          </Link>

          <header className="mb-10">
            {isPrimaryKo ? (
              <p className="text-xs font-black text-emerald-500 uppercase tracking-[0.25em] mb-3">{titleEn}</p>
            ) : null}
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">
              {isPrimaryKo ? titleKo : titleEn}
            </h1>
            <p className="text-slate-500 text-sm">
              {L.effectiveDatePrefix}
              {lastUpdated}
            </p>
          </header>

          <div className="mb-12 rounded-2xl border border-amber-500/25 bg-amber-500/5 px-5 py-4 text-amber-100/90 text-sm leading-relaxed break-keep">
            {L.draftPart1}
            <strong className="text-amber-50">{L.draftEmphasis1}</strong>
            {L.draftPart2}
            <strong className="text-amber-50">{L.draftEmphasis2}</strong>
            {L.draftPart3}
          </div>

          <div className="space-y-10 text-slate-300 leading-relaxed text-[15px] md:text-base break-keep [&_h2]:text-white [&_h2]:text-lg [&_h2]:font-black [&_h2]:tracking-tight [&_h2]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_strong]:text-slate-200">
            {children}
          </div>
        </div>
      </article>
      <Footer locale={locale} />
    </main>
  );
}
