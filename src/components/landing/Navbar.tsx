'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Leaf, Smartphone, Terminal } from 'lucide-react';

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: '기술력', href: '#vision' },
    { name: 'AI 오더', href: '#ai-concierge' },
    { name: '멀티채널 자동화', href: '#integrations' },
    { name: '도입 문의', href: '#' },
  ];

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
          <motion.div 
            whileHover={{ rotate: 15 }}
            className="relative bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 rounded-2xl text-[#0A0F0D] shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all overflow-hidden"
          >
            <Leaf size={24} className="relative z-10" />
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.div>
          <div className="flex flex-col -gap-1">
            <span className="font-title text-2xl tracking-tighter text-white leading-tight">
              FLOXYNC <span className="text-[10px] text-emerald-500 font-bold tracking-widest bg-emerald-500/10 px-1.5 py-0.5 rounded ml-1 border border-emerald-500/20">PRO</span>
            </span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] font-sans">Tech x Floral ERP</span>
          </div>
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

