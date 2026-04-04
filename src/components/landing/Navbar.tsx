'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, Leaf } from 'lucide-react';

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: '서비스 소개', href: '#about' },
    { name: '주요 기능', href: '#features' },
    { name: '고객 지원', href: '#', onClick: () => alert('고객지원 센터는 준비 중입니다.') },
  ];

  return (
    <header 
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-[#F9FAFA]/90 backdrop-blur-md shadow-sm py-3' 
          : 'bg-transparent py-5'
      }`}
    >
      <div className="container mx-auto px-6 md:px-12 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="bg-gradient-to-br from-[#1B4B43] to-[#2D736A] p-2 rounded-xl text-white shadow-md group-hover:scale-105 transition-transform">
            <Leaf size={24} />
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-slate-800">
            Florasync
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            link.onClick ? (
              <button 
                key={link.name} 
                onClick={link.onClick}
                className="text-sm font-semibold text-slate-600 hover:text-[#2D736A] transition-colors"
              >
                {link.name}
              </button>
            ) : (
              <Link 
                key={link.name} 
                href={link.href} 
                className="text-sm font-semibold text-slate-600 hover:text-[#2D736A] transition-colors"
              >
                {link.name}
              </Link>
            )
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-4">
          <Link 
            href="/login" 
            className="text-sm font-bold text-slate-700 hover:text-slate-900 transition-colors"
          >
            로그인
          </Link>
          <Link 
            href="/login" 
            className="text-sm font-bold bg-[#1B4B43] text-white px-5 py-2.5 rounded-full hover:bg-[#2D736A] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
          >
            대시보드 시작하기
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden p-2 text-slate-600"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border-t border-slate-100 shadow-xl py-4 px-6 flex flex-col gap-4 md:hidden animate-in slide-in-from-top-2">
          {navLinks.map((link) => (
            link.onClick ? (
              <button 
                key={link.name} 
                onClick={(e) => { link.onClick(); setMobileMenuOpen(false); }}
                className="text-left font-semibold text-slate-700 py-2 border-b border-slate-50"
              >
                {link.name}
              </button>
            ) : (
              <Link 
                key={link.name} 
                href={link.href} 
                onClick={() => setMobileMenuOpen(false)}
                className="font-semibold text-slate-700 py-2 border-b border-slate-50"
              >
                {link.name}
              </Link>
            )
          ))}
          <div className="flex flex-col gap-2 pt-2">
            <Link href="/login" className="py-3 text-center font-bold text-slate-700 border border-slate-200 rounded-xl">
              로그인
            </Link>
            <Link href="/login" className="py-3 text-center font-bold bg-[#1B4B43] text-white rounded-xl">
              대시보드 시작하기
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
