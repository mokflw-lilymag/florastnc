import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { AppLocale, localizePath } from '@/i18n/config';

type Props = {
  titleEn: string;
  titleKo: string;
  lastUpdated: string;
  locale?: AppLocale;
  children: React.ReactNode;
};

export function LegalDocShell({ titleEn, titleKo, lastUpdated, locale = 'ko', children }: Props) {
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
            홈으로
          </Link>

          <header className="mb-10">
            <p className="text-xs font-black text-emerald-500 uppercase tracking-[0.25em] mb-3">{titleEn}</p>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">{titleKo}</h1>
            <p className="text-slate-500 text-sm">시행일: {lastUpdated}</p>
          </header>

          <div className="mb-12 rounded-2xl border border-amber-500/25 bg-amber-500/5 px-5 py-4 text-amber-100/90 text-sm leading-relaxed break-keep">
            본 문서는 Floxync 서비스 소개를 위한 <strong className="text-amber-50">참고용 초안</strong>입니다. 실제 사업자 정보·수집 항목·보관 기간 등은
            운영 정책에 맞게 수정해야 하며, <strong className="text-amber-50">정식 오픈 전 변호사 또는 전문기관의 검토</strong>를 권장합니다.
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
