'use client';

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
    <main className="min-h-screen bg-[#fbf9f7] text-[#1b1c1b] selection:bg-[#86e3ce] selection:text-[#006657]">
      <Navbar locale={locale} />
      <article className="pt-28 pb-24 md:pt-36 md:pb-32">
        <div className="container mx-auto px-6 md:px-12 max-w-3xl">
          <Link
            href={localizePath(locale, '/')}
            className="relative z-10 inline-flex items-center gap-2 text-sm font-bold text-[#3e4946] hover:text-[#006b5c] transition-colors mb-10 uppercase tracking-widest"
          >
            <ArrowLeft className="w-4 h-4" />
            {L.backHome}
          </Link>

          <header className="mb-10">
            {isPrimaryKo ? (
              <p className="text-xs font-black text-[#006b5c] uppercase tracking-[0.25em] mb-3">{titleEn}</p>
            ) : null}
            <h1 className="text-3xl md:text-4xl font-black text-[#1b1c1b] tracking-tight mb-2">
              {isPrimaryKo ? titleKo : titleEn}
            </h1>
            <p className="text-[#3e4946] text-sm">
              {L.effectiveDatePrefix}
              {lastUpdated}
            </p>
          </header>

          <div className="mb-12 rounded-2xl border border-amber-200 bg-amber-50/70 px-5 py-4 text-amber-950 text-sm leading-relaxed break-keep">
            {L.draftPart1}
            <strong className="text-amber-950 font-extrabold">{L.draftEmphasis1}</strong>
            {L.draftPart2}
            <strong className="text-amber-950 font-extrabold">{L.draftEmphasis2}</strong>
            {L.draftPart3}
          </div>

          <div className="space-y-10 text-[#3e4946] leading-relaxed text-[15px] md:text-base break-keep [&_h2]:text-[#1b1c1b] [&_h2]:text-lg [&_h2]:font-black [&_h2]:tracking-tight [&_h2]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_strong]:text-[#1b1c1b]">
            {children}
          </div>
        </div>
      </article>
      <Footer locale={locale} />
    </main>
  );
}
