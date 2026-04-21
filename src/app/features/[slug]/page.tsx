import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { FeatureVisual } from '@/components/landing/feature-visual';
import { LANDING_FEATURE_SLUGS, getLandingFeatureBySlug } from '@/data/landing-features';
import type { Metadata } from 'next';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return LANDING_FEATURE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const feature = getLandingFeatureBySlug(slug);
  if (!feature) {
    return { title: '기능' };
  }
  return {
    title: `${feature.title} · Floxync`,
    description: feature.description,
  };
}

export default async function FeatureDetailPage({ params }: Props) {
  const { slug } = await params;
  const feature = getLandingFeatureBySlug(slug);
  if (!feature) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#0A0F0D] text-white overflow-x-hidden selection:bg-emerald-500/30 selection:text-emerald-200">
      <Navbar />
      <article className="pt-28 pb-24 md:pt-36 md:pb-32">
        <div className="container mx-auto px-6 md:px-12 max-w-4xl">
          <Link
            href="/#features"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-emerald-400 transition-colors mb-10 uppercase tracking-widest"
          >
            <ArrowLeft className="w-4 h-4" />
            기능 목록으로
          </Link>

          <header className="mb-12 md:mb-16">
            <p className="text-xs font-black text-emerald-500 uppercase tracking-[0.25em] mb-4">Floxync capability</p>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-tight mb-6">
              {feature.title}
            </h1>
            <p className="text-lg md:text-xl text-slate-400 font-light leading-relaxed">{feature.description}</p>
          </header>

          <div className="mb-16 md:mb-20">
            <FeatureVisual feature={feature} />
          </div>

          <div className="space-y-12 md:space-y-14">
            {feature.detailSections.map((section, i) => (
              <section key={i} className="border-t border-white/10 pt-10 md:pt-12 first:border-0 first:pt-0">
                {section.heading ? (
                  <h2 className="text-xl md:text-2xl font-black text-white mb-4 tracking-tight">{section.heading}</h2>
                ) : null}
                <p className="text-slate-400 leading-relaxed text-base md:text-lg font-medium">{section.body}</p>
              </section>
            ))}
          </div>

          <div className="mt-20 flex flex-col sm:flex-row gap-4">
            <Link
              href="/login"
              className="inline-flex justify-center px-8 py-4 rounded-2xl bg-emerald-500 text-[#0A0F0D] font-black text-center hover:shadow-[0_0_40px_rgba(16,185,129,0.35)] transition-shadow"
            >
              무료로 시작하기
            </Link>
            <Link
              href="/#features"
              className="inline-flex justify-center px-8 py-4 rounded-2xl border border-white/15 text-white font-bold text-center hover:bg-white/5 transition-colors"
            >
              다른 기능 보기
            </Link>
          </div>
        </div>
      </article>
      <Footer />
    </main>
  );
}
