'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Zap, ShieldCheck, Cpu, RefreshCw, Globe } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative pt-32 pb-24 md:pt-48 md:pb-36 overflow-hidden bg-[#0A0F0D]">
      {/* Premium Background Visuals */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0F0D]/80 via-[#0A0F0D]/50 to-[#0A0F0D] z-10" />
        <img
          src="https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=2000&auto=format&fit=crop"
          alt="Floxync High-Tech Floral ERP"
          className="w-full h-full object-cover opacity-30 scale-105 animate-pulse-slow mix-blend-luminosity"
        />
      </div>

      {/* Floating Particle Glows */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="container relative z-10 mx-auto px-6 md:px-12">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          <div className="space-y-8">
            {/* Badge Animation */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-xs border border-emerald-500/20 backdrop-blur-md shadow-[0_0_20px_rgba(16,185,129,0.1)] uppercase tracking-[0.2em]"
            >
              <Cpu size={14} className="animate-spin-slow" />
              SYSTEM STATUS: OPTIMIZED
            </motion.div>

            {/* Headline with Gradient Text */}
            <motion.h1
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-5xl md:text-7xl font-black text-white tracking-tight leading-[1.1]"
            >
              꽃집 경영의 미래가 <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 drop-shadow-[0_0_30px_rgba(52,211,153,0.3)]">
                지금 여기에 있습니다.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-lg md:text-xl text-slate-400 leading-relaxed font-light"
            >
              AI 기반 자동화와 24/7 전 채널 동기화로 당신의 화훼 비즈니스 생태계를 완벽하게 지휘하세요. 정밀한 효율성을 약속합니다.
            </motion.p>

            {/* CTA Buttons with Hover Effects */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex flex-col sm:flex-row items-center gap-6 pt-4"
            >
              <Link
                href="/login"
                className="group relative w-full sm:w-auto px-10 py-5 rounded-2xl bg-emerald-500 text-[#0A0F0D] font-black text-xl hover:shadow-[0_0_40px_rgba(16,185,129,0.4)] transition-all duration-500 flex items-center justify-center gap-2 overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-3">
                  시작하기 <ArrowRight size={22} className="group-hover:translate-x-2 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>

              <Link
                href="#technology"
                className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-black/40 text-white font-bold text-xl border border-emerald-500/30 hover:border-emerald-500 backdrop-blur-[20px] transition-all duration-300 flex items-center justify-center gap-2"
              >
                데모 보기 <Sparkles size={18} className="text-emerald-400" />
              </Link>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative hidden lg:block"
          >
            <div className="bg-[#0A0F0D]/40 backdrop-blur-[20px] border border-emerald-500/10 p-6 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.15)] relative overflow-hidden group">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDogQlJcBAnyWm5e3LiRDIonifXziIbtuSWBeYez3S36nS420M_CX2dm2dVGOzC0_3_UH_Ck9ejMoUBp7_-8TmQA1EIlkqceNnEAGod000YQSU5n1_neWA1xVQjqY6NFIJ1SYmp-g9Jy2KYk_TNdgiEH-CIc33DQbL5arMTP360U5LP8xPbH0glVnB2SuPEc1_W4H9W4CzWXB4CqC7R7ORhFKFUbLgBNoQ1pUum7zzfCNVXJu1HO_9MPhM0Z3pP1MuaKA4bVe20OQ5B"
                alt="Floxync Dashboard Preview"
                className="rounded-lg opacity-80 group-hover:opacity-100 transition-opacity duration-700 w-full object-cover"
              />
              {/* Overlay UI elements */}
              <div className="absolute top-10 right-10 bg-[#0A0F0D]/40 backdrop-blur-[20px] p-4 rounded-lg border border-emerald-500/50 shadow-lg">
                <p className="text-[12px] font-bold text-emerald-500 uppercase tracking-widest">LIVE SYNC</p>
                <p className="text-3xl font-black text-white mt-1">99.9%</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Stats Section replacing Feature Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="mt-32 pt-16 border-t border-white/5 grid grid-cols-2 md:grid-cols-4 gap-6"
        >
          {[
            { label: "활성 스튜디오", value: "12+" },
            { label: "일일 데이터 처리량", value: "2.5k+" },
            { label: "실시간 동기화", value: "99.9%" },
            { label: "안정성", value: "99.9%" }
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center md:items-start gap-2 p-6 rounded-3xl group transition-all">
              <span className="text-4xl md:text-5xl font-black text-emerald-500">
                {stat.value}
              </span>
              <span className="text-xs font-bold text-slate-500 tracking-widest uppercase">{stat.label}</span>
            </div>
          ))}
        </motion.div>

      </div>

      {/* Hero Visual Separation Line */}
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
    </section>
  );
}
