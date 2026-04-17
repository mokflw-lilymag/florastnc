'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Zap, ShieldCheck, Cpu, RefreshCw, Globe } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative pt-32 pb-24 md:pt-48 md:pb-36 overflow-hidden bg-[#0A0F0D]">
      {/* Premium Background Visuals */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0F0D]/80 via-[#0A0F0D]/40 to-[#0A0F0D] z-10" />
        <img 
          src="/florasync_premium_hero_1776419130551.png" 
          alt="FloraSync High-Tech Floral ERP" 
          className="w-full h-full object-cover opacity-60 scale-105 animate-pulse-slow"
        />
      </div>

      {/* Floating Particle Glows */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="container relative z-10 mx-auto px-6 md:px-12">
        <div className="max-w-4xl mx-auto text-center">
          
          {/* Badge Animation */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-xs mb-8 border border-emerald-500/20 backdrop-blur-md shadow-[0_0_20px_rgba(16,185,129,0.1)] uppercase tracking-[0.2em]"
          >
            <Cpu size={14} className="animate-spin-slow" />
            Next-Gen AI Floral Command Center
          </motion.div>

          {/* Headline with Gradient Text */}
          <motion.h1 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl md:text-8xl font-black text-white tracking-tight leading-[1.05] mb-8"
          >
            현장에서 체감하는 <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400 drop-shadow-[0_0_30px_rgba(52,211,153,0.3)]">
              진짜 첨단 기술의 꽃.
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-lg md:text-2xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed font-light"
          >
            단순히 주문만 적는 장부는 끝났습니다. <br className="hidden md:block" />
            AI 비서의 주문 자동 추출, 24시간 철통같은 쇼핑몰 동기화, <br className="hidden md:block" />
            그리고 당신의 상상을 현실로 만드는 가장 세련된 ERP 시스템.
          </motion.p>

          {/* CTA Buttons with Hover Effects */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6"
          >
            <Link 
              href="/login" 
              className="group relative w-full sm:w-auto px-10 py-5 rounded-2xl bg-emerald-500 text-[#0A0F0D] font-black text-xl hover:shadow-[0_0_40px_rgba(16,185,129,0.4)] transition-all duration-500 flex items-center justify-center gap-2 overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-3">
                지금 무료로 시작하기 <ArrowRight size={22} className="group-hover:translate-x-2 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
            
            <Link 
              href="#features" 
              className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-white/5 text-white font-bold text-xl border border-white/10 hover:bg-white/10 backdrop-blur-md transition-all duration-300 flex items-center justify-center gap-2"
            >
              기능 둘러보기 <Sparkles size={18} className="text-emerald-400" />
            </Link>
          </motion.div>

          {/* Feature Badges in Row */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1 }}
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto"
          >
            {[
              { icon: <Zap size={18} />, label: "AI 오더 컨시어지", color: "text-amber-400" },
              { icon: <RefreshCw size={18} />, label: "실시간 쇼핑몰 연동", color: "text-blue-400" },
              { icon: <ShieldCheck size={18} />, label: "철통 보안 API 금고", color: "text-emerald-400" },
              { icon: <Globe size={18} />, label: "언제 어디서나 웹/모바일", color: "text-indigo-400" }
            ].map((feature, i) => (
              <div key={i} className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm group hover:bg-white/10 hover:scale-105 transition-all outline-indigo-500">
                <div className={`p-3 rounded-2xl bg-black/40 ${feature.color} border border-white/5 shadow-inner`}>
                  {feature.icon || <Sparkles size={18} />}
                </div>
                <span className="text-sm font-bold text-slate-200 tracking-tight">{feature.label}</span>
              </div>
            ))}
          </motion.div>
          
        </div>
      </div>

      {/* Hero Visual Separation Line */}
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
    </section>
  );
}

