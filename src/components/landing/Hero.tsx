'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight, Bot, Download, Sparkles } from 'lucide-react';
import { AppLocale, localizePath, toBaseLocale } from '@/i18n/config';
import { getMessages } from '@/i18n/getMessages';
import { pickUiText } from '@/i18n/pick-ui-text';

const BUBBLE_ICONS = ['🖨️', '🎀', '📱', '🖥️', '📸', '📊'];

export function Hero({ locale = 'ko' }: { locale?: AppLocale }) {
  type HeroT = {
    status: string; line1: string; line2: string; line3: string;
    subtitle: string; start: string; demo: string; manual: string;
    bubble1: string; bubble2: string; bubble3: string;
    bubble4: string; bubble5: string; bubble6: string;
    applyBeta: string; downloadWindows: string;
    devicePhone: string; devicePhoneDesc: string; devicePhoneSub: string;
    devicePc: string; devicePcDesc: string; devicePcSub: string;
    deviceWeb: string; deviceWebDesc: string; deviceWebSub: string;
    altBackground: string; altDashboard: string;
  };
  const t = getMessages(locale).landing.hero as unknown as HeroT;
  const baseLocale = toBaseLocale(locale);

  const bubbles = [
    t.bubble1,
    t.bubble2,
    t.bubble3,
    t.bubble4,
    t.bubble5,
    t.bubble6,
  ];

  const devices = [
    {
      icon: t.devicePhone,
      desc: t.devicePhoneDesc,
      sub: t.devicePhoneSub,
      color: 'from-emerald-500/20 to-teal-500/20',
      border: 'border-emerald-500/30',
      dot: 'bg-emerald-400',
    },
    {
      icon: t.devicePc,
      desc: t.devicePcDesc,
      sub: t.devicePcSub,
      color: 'from-blue-500/20 to-indigo-500/20',
      border: 'border-blue-500/30',
      dot: 'bg-blue-400',
    },
    {
      icon: t.deviceWeb,
      desc: t.deviceWebDesc,
      sub: t.deviceWebSub,
      color: 'from-cyan-500/20 to-teal-500/20',
      border: 'border-cyan-500/30',
      dot: 'bg-cyan-400',
    },
  ];

  const downloadLabel = pickUiText(
    baseLocale,
    '윈도우 앱 다운로드',
    'Download Windows App',
    'Tải ứng dụng Windows',
    'Windowsアプリをダウンロード',
    '下载 Windows 应用',
    'Descargar App Windows',
    'Baixar App Windows',
    "Télécharger l'App Windows",
    'Windows-App herunterladen',
    'Скачать приложение Windows',
  );

  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-28 overflow-hidden bg-[#fbf9f7] text-[#1b1c1b]">
      {/* Background with warm tint */}
      <div className="absolute inset-0 z-0 bg-[#fbf9f7]" />

      {/* Luminous Ambient glows */}
      <div className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] bg-[#86e3ce]/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-[#dbcaff]/30 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-10 right-1/4 w-[400px] h-[400px] bg-[#fdcada]/25 rounded-full blur-[120px] pointer-events-none" />

      <div className="container relative z-10 mx-auto px-6 md:px-12">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* ── LEFT: Headline + Bubbles + CTAs ── */}
          <div className="space-y-8">

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#006b5c]/5 text-[#006b5c] font-black text-xs border border-[#006b5c]/10 backdrop-blur-md uppercase tracking-[0.18em] font-sans"
            >
              <Bot size={13} className="animate-pulse" />
              {t.status}
            </motion.div>

            {/* Headline */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.15 }}
            >
              <h1 className="text-5xl md:text-6xl font-extrabold text-[#1b1c1b] tracking-tight leading-[1.15] font-sans">
                {t.line1}
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#006b5c] via-[#665590] to-[#7a5361] drop-shadow-sm">
                  {t.line2}
                  <br />
                  {t.line3}
                </span>
              </h1>
            </motion.div>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-base md:text-lg text-[#3e4946] leading-relaxed font-normal max-w-lg font-sans"
            >
              {t.subtitle?.split('\n').map((line: string, i: number) => (
                <span key={i} className="block">{line}</span>
              ))}
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="flex flex-wrap items-center gap-4 pt-2"
            >
              <Link
                href={localizePath(locale, '/login')}
                className="group relative px-8 py-4 rounded-full bg-gradient-to-r from-[#86e3ce] to-[#dbcaff] text-[#006657] font-black text-base hover:shadow-[0_8px_30px_rgba(134,227,206,0.4)] transition-all duration-500 flex items-center justify-center gap-2 overflow-hidden border border-[#006b5c]/20"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {t.start}
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>

              <Link
                href="#test-user-apply"
                className="px-8 py-4 rounded-full bg-white/70 text-[#1b1c1b] font-bold text-base border border-[#fdcada] hover:border-[#7a5361] backdrop-blur-[20px] shadow-sm transition-all duration-300 flex items-center justify-center gap-2"
              >
                {t.applyBeta} <Sparkles size={15} className="text-[#7a5361]" />
              </Link>

              <a
                href="https://github.com/mokflw-lilymag/floxync-releases/releases/latest"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 rounded-full bg-[#dbcaff]/20 text-[#61508b] font-bold text-base border border-[#dbcaff]/40 hover:bg-[#dbcaff]/35 backdrop-blur-[20px] transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Download size={15} className="text-[#665590]" />
                {downloadLabel}
              </a>
            </motion.div>

            {/* Manual link */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.65 }}
            >
              <Link
                href="/docs/manual"
                className="text-sm font-bold text-[#006b5c] hover:text-[#006657] underline underline-offset-4 decoration-[#006b5c]/30 hover:decoration-[#006b5c] transition-colors"
              >
                {t.manual}
              </Link>
            </motion.p>
          </div>

          {/* ── RIGHT: Stitch Luminous AI Assistant 프리뷰 이미지 이식 ── */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative hidden lg:block"
          >
            {/* 시안 액자 프레임 - Soft shadow + warm white container */}
            <div className="relative p-4 rounded-[40px] bg-white/60 border border-white/80 backdrop-blur-3xl shadow-[0_20px_50px_rgba(110,122,118,0.15)] overflow-hidden">
              {/* 실제 대시보드 스크린샷 영역 */}
              <div className="relative rounded-[30px] overflow-hidden border border-[#efedec] bg-[#fbf9f7] aspect-[1.45/1] shadow-inner">
                <Image
                  src="https://lh3.googleusercontent.com/aida/AP1WRLvQwZj48SWOxMRNa6yQuksjVhHMQt42fNeAUyoJvm0qosWzRzqB-aqUrb4WM0vkgVsiMvogG-KsFN7179mrJoGpYpvB0hcufbT8fv2iIJIUB3B7uB9Nq_dU26RS7BJEA_kXX7EpqYQBe3jPrurmAfA_iejIvJqo-zelRT2HyqClAX2hRrk71TWDdzTvsNyXmweOEHz08j-Zubf5H5jngDnRDkv4Ivwr9Py_jt_B-F1YyK95xfg_azh6nVnK"
                  alt="Floxync Luminous Dashboard"
                  fill
                  priority
                  className="object-cover object-left-top scale-102"
                />
                
                {/* 실시간 99.9% 라이브 싱크 뱃지 */}
                <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/85 border border-[#86e3ce]/50 backdrop-blur-md shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-[#006b5c] animate-pulse" />
                  <span className="text-[9px] font-black text-[#006b5c] tracking-widest uppercase">LIVE SYNC 99.9%</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── 3디바이스 카드 (Stats 대체) ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.0 }}
          className="mt-24 pt-16 border-t border-[#efedec] grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          {devices.map((d, i) => (
            <div
              key={i}
              className="relative p-6 rounded-2xl bg-white/60 border border-white/80 shadow-sm backdrop-blur-sm overflow-hidden group hover:scale-[1.02] transition-transform duration-300"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{d.icon}</span>
                <div className="w-1.5 h-1.5 rounded-full bg-[#006b5c] animate-pulse" />
              </div>
              <p className="font-extrabold text-[#1b1c1b] text-base leading-snug">{d.desc}</p>
              <p className="text-xs text-[#3e4946] mt-1 font-medium">{d.sub}</p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Bottom line */}
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#006b5c]/10 to-transparent" />
    </section>
  );
}
