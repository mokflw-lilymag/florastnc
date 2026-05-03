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
  const baseLocale = toBaseLocale(locale);
  const commerceBridgeLabel = pickUiText(
    baseLocale,
    "커머스 API 브릿지",
    "Commerce API bridge",
    "Cầu nối API thương mại"
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
                    {feature.title}
                  </h3>
                  {feature.comingSoon ? (
                    <span className="inline-flex items-center mb-4 px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-300 text-[11px] font-black uppercase tracking-wider border border-indigo-400/30">
                      {t.comingSoon}
                    </span>
                  ) : null}
                  <p className="text-slate-500 leading-relaxed font-medium flex-1">{feature.description}</p>
                  <p className="mt-8 text-sm font-black text-emerald-500/90 uppercase tracking-widest opacity-0 group-hover/card:opacity-100 transition-opacity">
                    {t.viewDetail} →
                  </p>
                </div>

                <Terminal className="absolute -bottom-4 -right-4 w-12 h-12 text-white/5 group-hover:text-emerald-500/10 transition-colors pointer-events-none" />
              </motion.div>
            </Link>
          ))}
        </div>

        {/* Integrated Intelligence Section */}
        <div className="mt-32 border-t border-white/5 pt-32">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-xs mb-8 border border-emerald-500/20 uppercase tracking-widest"
              >
                {t.integratedBadge}
              </motion.div>
              <motion.h2 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-6 leading-tight"
              >
                {t.integratedTitleLeft} <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">{t.integratedTitleHighlight}</span>
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-lg text-slate-400 font-light mb-8 leading-relaxed"
              >
                {t.integratedDescription}
              </motion.p>
              
              <motion.ul 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="space-y-4"
              >
                {[
                  t.integratedItem1,
                  t.integratedItem2,
                  t.integratedItem3
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-300">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    {item}
                  </li>
                ))}
              </motion.ul>
            </div>
            
            <div className="lg:w-1/2 w-full">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="relative aspect-square w-full max-w-lg mx-auto"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 rounded-[40px] blur-3xl" />
                <div className="relative h-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-[40px] p-8 flex flex-col items-center justify-center overflow-hidden">
                  <div className="w-32 h-32 rounded-full border border-emerald-500/30 flex items-center justify-center relative z-10 animate-pulse-slow bg-[#0A0F0D]">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.5)]">
                      <Sparkles className="text-[#0A0F0D] w-10 h-10" />
                    </div>
                  </div>
                  
                  {/* Orbit rings & API Nodes */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] border border-white/5 rounded-full animate-[spin_20s_linear_infinite]">
                    {/* Naver Node */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-[#03C75A] border-4 border-[#0A0F0D] shadow-[0_0_20px_rgba(3,199,90,0.6)] flex items-center justify-center text-white font-black text-xs animate-[spin_20s_linear_infinite_reverse]">
                      NAVER
                    </div>
                  </div>
                  
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] border border-white/5 rounded-full animate-[spin_15s_linear_infinite_reverse]">
                    {/* Cafe24 Node */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-16 h-16 rounded-full bg-white border-4 border-[#0A0F0D] shadow-[0_0_20px_rgba(255,255,255,0.4)] flex items-center justify-center text-black font-black text-xs animate-[spin_15s_linear_infinite]">
                      CAFE24
                    </div>
                  </div>
                  
                  <div className="absolute bottom-10 text-center z-10 bg-[#0A0F0D]/60 px-6 py-2 rounded-full backdrop-blur-md border border-white/5">
                    <p className="text-emerald-400 font-bold tracking-widest text-sm uppercase">{commerceBridgeLabel}</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


