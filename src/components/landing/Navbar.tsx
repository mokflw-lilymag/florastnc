'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Leaf, Smartphone, Terminal, Globe, ChevronDown } from 'lucide-react';
import { AppLocale, LOCALE_COOKIE, resolveLocale, SUPPORTED_LOCALES } from '@/i18n/config';
import { LANDING_LOCALE_SELECT_OPTIONS, resolveLandingSelectLocale } from '@/i18n/ui-locale-options';

export function Navbar({ locale }: { locale?: AppLocale }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [uiLocale, setUiLocale] = useState<AppLocale>(locale || 'ko');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);

    // Sync from cookie if provided locale is missing or as fallback
    if (!locale && typeof document !== 'undefined') {
      const cookieValue = document.cookie
        .split('; ')
        .find((row) => row.startsWith(`${LOCALE_COOKIE}=`))
        ?.split('=')[1];
      if (cookieValue) setUiLocale(resolveLocale(cookieValue));
    }

    return () => window.removeEventListener('scroll', handleScroll);
  }, [locale]);

  const handleLocaleChange = (nextLocale: AppLocale) => {
    setUiLocale(nextLocale);
    document.cookie = `${LOCALE_COOKIE}=${nextLocale}; path=/; max-age=${60 * 60 * 24 * 365}`;
    window.dispatchEvent(new Event('preferred-locale-changed'));
    
    // Redirect to the new locale path
    const currentPath = window.location.pathname;
    const pathParts = currentPath.split('/');
    if (pathParts.length > 1 && SUPPORTED_LOCALES.includes(pathParts[1] as any)) {
      pathParts[1] = nextLocale;
      window.location.href = pathParts.join('/');
    } else {
      window.location.href = `/${nextLocale}`;
    }
  };

  const navLinks = [
    { name: '솔루션', href: '#solutions' },
    { name: '테크놀로지', href: '#technology' },
    { name: '네트워크', href: '#network' },
    { name: '문서', href: '#documentation' },
  ];

  const selectLocale = resolveLandingSelectLocale(uiLocale);

  return (
    <header 
      className={`fixed top-0 inset-x-0 z-[100] transition-all duration-500 ${
        isScrolled 
          ? 'bg-[#0A0F0D]/80 backdrop-blur-2xl border-b border-white/5 py-4' 
          : 'bg-transparent py-8'
      }`}
    >
      <div className="container mx-auto px-6 md:px-12 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group relative">
          <img src="/images/floxync-logo-official-white.png" alt="Floxync Logo" className="h-20 md:h-28 w-auto object-contain" />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-10">
          {navLinks.map((link) => (
            <Link 
              key={link.name} 
              href={link.href} 
              className="group relative text-xs font-black text-slate-400 hover:text-white transition-colors uppercase tracking-widest font-sans"
            >
              {link.name}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-emerald-500 transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-6">
          {/* Language Switcher */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
            <Globe size={14} className="text-slate-400 group-hover:text-emerald-400 transition-colors" />
            <select
              value={selectLocale}
              onChange={(e) => handleLocaleChange(e.target.value as AppLocale)}
              className="bg-transparent text-[10px] font-black text-slate-400 hover:text-white outline-none cursor-pointer uppercase tracking-tighter"
            >
              {LANDING_LOCALE_SELECT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[#0A0F0D] text-white">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <Link 
            href="/login" 
            className="text-xs font-black text-slate-400 hover:text-white transition-colors uppercase tracking-[0.2em]"
          >
            LOGIN
          </Link>
          <Link 
            href="/login" 
            className="group relative px-6 py-3 bg-white text-black font-black text-xs rounded-xl overflow-hidden shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-white/20 transition-all uppercase tracking-[0.1em]"
          >
            <span className="relative z-10 flex items-center gap-2">
              Get Started <Terminal size={14} className="animate-pulse" />
            </span>
            <div className="absolute inset-x-0 bottom-0 h-0 group-hover:h-full bg-emerald-500/10 transition-all duration-500" />
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="lg:hidden p-2 text-white/70 hover:text-white transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={32} /> : <Menu size={32} />}
        </button>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="absolute top-full left-0 right-0 bg-[#0A0F0D] border-b border-white/5 shadow-2xl overflow-hidden lg:hidden"
          >
            <div className="container mx-auto px-6 py-12 flex flex-col gap-6">
              {/* Mobile Language Switcher */}
              <div className="flex items-center justify-between px-2 py-4 border-b border-white/5">
                <span className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Globe size={16} /> Language
                </span>
                <select
                  value={selectLocale}
                  onChange={(e) => handleLocaleChange(e.target.value as AppLocale)}
                  className="bg-transparent text-lg font-black text-white outline-none"
                >
                  {LANDING_LOCALE_SELECT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-[#0A0F0D] text-white">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {navLinks.map((link) => (
                <Link 
                  key={link.name} 
                  href={link.href} 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-2xl font-black text-white px-2 py-3 hover:text-emerald-400 transition-colors tracking-tighter border-b border-white/5"
                >
                  {link.name}
                </Link>
              ))}
              <div className="flex flex-col gap-4 pt-8">
                <Link href="/login" className="py-5 text-center font-black text-white border border-white/10 rounded-2xl bg-white/5 flex items-center justify-center gap-2">
                  <Smartphone size={20} /> 모바일 앱 다운로드
                </Link>
                <Link href="/login" className="py-5 text-center font-black bg-emerald-500 text-[#0A0F0D] rounded-2xl text-xl shadow-lg shadow-emerald-500/20">
                  대시보드 바로가기
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

