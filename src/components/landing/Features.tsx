'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Terminal, Sparkles } from 'lucide-react';
import { LANDING_FEATURES } from '@/data/landing-features';
import { FeatureCardIcon, featureAccentIconClass } from '@/components/landing/feature-visual';
import { AppLocale, localizePath, toBaseLocale } from '@/i18n/config';
import { pickUiText } from '@/i18n/pick-ui-text';
import { getMessages } from '@/i18n/getMessages';

export function Features({ locale = 'ko' }: { locale?: AppLocale }) {
  const t = getMessages(locale).landing.features;
  const cards = t.featureCards;
  const baseLocale = toBaseLocale(locale);
  const commerceBridgeLabel = pickUiText(
    baseLocale,
    "커머스 API 브릿지",
    "Commerce API bridge",
    "Cầu nối API thương mại",
    "コマースAPIブリッジ",
    "商务 API 桥接",
    "Puente API de comercio",
    "Ponte API de comércio",
    "Passerelle API commerce",
    "Commerce-API-Brücke",
    "Мост API коммерции",
  );
  return (
    <section id="technology" className="py-24 md:py-32 bg-[#0A0F0D] relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-emerald-500/5 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-cyan-500/5 rounded-full blur-[100px]" />
      
      <div className="container mx-auto px-6 md:px-12 relative z-10">
        
        <div className="text-center max-w-4xl mx-auto mb-20">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-white/5 text-emerald-400 font-bold text-xs mb-8 border border-white/10 uppercase tracking-widest"
          >
            <Sparkles size={14} />
            {t.badge}
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-6 leading-tight"
          >
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">{t.title}</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="text-lg md:text-2xl text-slate-400 font-light"
          >
            {t.subtitle1} <br className="hidden md:block" />
            {t.subtitle2}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {LANDING_FEATURES.map((feature, idx) => (
            <Link key={feature.slug} href={localizePath(locale, `/features/${feature.slug}`)} className="block h-full group/card">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * (idx + 1), duration: 0.5 }}
                whileHover={{ y: -10 }}
                className="h-full bg-white/[0.02] p-10 rounded-[35px] border border-white/5 shadow-sm hover:shadow-emerald-500/5 hover:bg-white/[0.05] hover:border-white/10 transition-all duration-500 group relative overflow-hidden cursor-pointer"
              >
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-16 h-16 rounded-[20px] bg-black/40 flex items-center justify-center mb-8 border border-white/10 shadow-inner group-hover:scale-110 transition-transform">
                    <FeatureCardIcon
                      slug={feature.slug}
                      className={`w-6 h-6 ${featureAccentIconClass[feature.accent]}`}
                    />
                  </div>
                  <h3 className="text-2xl font-black text-white mb-4 group-hover:text-emerald-400 transition-colors tracking-tight">
                    {cards[feature.slug as keyof typeof cards]?.title ?? feature.slug}
                  </h3>
                  {feature.comingSoon ? (
                    <span className="inline-flex items-center mb-4 px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-300 text-[11px] font-black uppercase tracking-wider border border-indigo-400/30">
                      {t.comingSoon}
                    </span>
                  ) : null}
                  <p className="text-slate-500 leading-relaxed font-medium flex-1">
                    {cards[feature.slug as keyof typeof cards]?.description ?? ""}
                  </p>
                  <p className="mt-8 text-sm font-black text-emerald-500/90 uppercase tracking-widest opacity-0 group-hover/card:opacity-100 transition-opacity">
                    {t.viewDetail} →
                  </p>
                </div>

                <Terminal className="absolute -bottom-4 -right-4 w-12 h-12 text-white/5 group-hover:text-emerald-500/10 transition-colors pointer-events-none" />
              </motion.div>
            </Link>
          ))}
        </div>

        {/* 하단 CTA 블록 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mt-24 text-center"
        >
          <p className="text-slate-500 text-sm mb-4">{t.subtitle1}</p>
          <Link
            href="#test-user-apply"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-emerald-500/10 text-emerald-400 font-black text-sm border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 uppercase tracking-widest"
          >
            <Sparkles size={14} /> 베타 무료 신청하기
          </Link>
        </motion.div>
      </div>
    </section>
  );
}


