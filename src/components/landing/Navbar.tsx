'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Smartphone, Terminal, Globe } from 'lucide-react';
import { AppLocale, LOCALE_COOKIE, localizePath, resolveLocale, SUPPORTED_LOCALES } from '@/i18n/config';
import { getMessages } from '@/i18n/getMessages';
import { LANDING_LOCALE_SELECT_OPTIONS, resolveLandingSelectLocale } from '@/i18n/ui-locale-options';

export function Navbar({ locale }: { locale?: AppLocale }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [uiLocale, setUiLocale] = useState<AppLocale>(locale || 'ko');

  useEffect(() => {
    if (locale) setUiLocale(locale);
  }, [locale]);

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

  const nav = getMessages(uiLocale).landing.navbar;
  const navLinks = [
    { name: '사용 설명서', href: '/docs/manual' },
    { name: '이용 요금', href: localizePath(uiLocale, '/pricing') },
  ];

  const selectLocale = resolveLandingSelectLocale(uiLocale);
  const homeHref = localizePath(uiLocale, '/');
  const loginHref = localizePath(uiLocale, '/login');

  return (
    <header 
      className={`fixed top-0 inset-x-0 z-[100] transition-all duration-500 ${
        isScrolled 
          ? 'bg-white/80 backdrop-blur-2xl border-b border-[#efedec] py-4 shadow-sm' 
          : 'bg-transparent py-8'
      }`}
    >
      <div className="container mx-auto px-6 md:px-12 flex items-center justify-between">
        {/* Logo */}
        <Link href={homeHref} className="flex items-center gap-3 group relative">
          <Image src="/images/floxync-logo-dark.png" alt={nav.logoAlt} width={160} height={112} className="h-14 md:h-16 w-auto object-contain flex-shrink-0" />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link 
              key={link.name} 
              href={link.href} 
              className="group relative text-sm font-bold text-[#3e4946] hover:text-[#006b5c] transition-colors whitespace-nowrap"
            >
              {link.name}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#006b5c] transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-4 flex-shrink-0">
          {/* Language Switcher */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#efedec] bg-white/70 hover:bg-white shadow-sm transition-colors cursor-pointer group">
            <Globe size={14} className="text-[#3e4946] group-hover:text-[#006b5c] transition-colors" />
            <select
              value={selectLocale}
              onChange={(e) => handleLocaleChange(e.target.value as AppLocale)}
              className="bg-transparent text-[10px] font-black text-[#3e4946] hover:text-[#006b5c] outline-none cursor-pointer uppercase tracking-tighter"
            >
              {LANDING_LOCALE_SELECT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-white text-[#1b1c1b]">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <Link
            href={loginHref}
            prefetch={false}
            className="text-sm font-bold text-[#3e4946] hover:text-[#006b5c] transition-colors whitespace-nowrap"
          >
            {nav.login}
          </Link>
          <Link
            href={loginHref}
            prefetch={false}
            className="group relative px-5 py-2.5 bg-gradient-to-r from-[#86e3ce] to-[#dbcaff] text-[#006657] font-bold text-sm rounded-full overflow-hidden border border-[#006b5c]/25 shadow-sm transition-all whitespace-nowrap"
          >
            <span className="relative z-10 flex items-center gap-2">
              {nav.getStarted} <Terminal size={14} className="animate-pulse" />
            </span>
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="lg:hidden p-2 text-[#1b1c1b] hover:text-[#006b5c] transition-colors"
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
            className="absolute top-full left-0 right-0 bg-[#fbf9f7] border-b border-[#efedec] shadow-2xl overflow-hidden lg:hidden"
          >
            <div className="container mx-auto px-6 py-12 flex flex-col gap-6">
              {/* Mobile Language Switcher */}
              <div className="flex items-center justify-between px-2 py-4 border-b border-[#efedec]">
                <span className="text-sm font-black text-[#3e4946] uppercase tracking-widest flex items-center gap-2">
                  <Globe size={16} /> {nav.languageLabel}
                </span>
                <select
                  value={selectLocale}
                  onChange={(e) => handleLocaleChange(e.target.value as AppLocale)}
                  className="bg-transparent text-lg font-black text-[#1b1c1b] outline-none"
                >
                  {LANDING_LOCALE_SELECT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-white text-[#1b1c1b]">
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
                  className="text-2xl font-black text-[#1b1c1b] px-2 py-3 hover:text-[#006b5c] transition-colors tracking-tighter border-b border-[#efedec]"
                >
                  {link.name}
                </Link>
              ))}
              <div className="flex flex-col gap-4 pt-8">
                <Link href={loginHref} prefetch={false} className="py-5 text-center font-black text-[#3e4946] border border-[#efedec] rounded-2xl bg-white flex items-center justify-center gap-2 shadow-sm">
                  <Smartphone size={20} /> {nav.mobileApp}
                </Link>
                <Link href={loginHref} prefetch={false} className="py-5 text-center font-black bg-gradient-to-r from-[#86e3ce] to-[#dbcaff] text-[#006657] border border-[#006b5c]/25 rounded-2xl text-xl shadow-md">
                  {nav.dashboardNow}
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

