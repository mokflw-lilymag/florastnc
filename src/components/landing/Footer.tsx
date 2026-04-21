'use client';

import Link from 'next/link';
import { Leaf, Monitor, Terminal, Github } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-[#0A0F0D] border-t border-white/5 pt-20 pb-12 text-sm relative overflow-hidden">
      {/* Footer Ambient Glow */}
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-6 md:px-12 relative z-10">
        <div className="flex flex-col xl:flex-row justify-between items-start gap-16 mb-20">
          <div className="max-w-md">
            <Link href="/" className="flex items-center gap-3 mb-8 group">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 rounded-xl text-[#0A0F0D] shadow-lg group-hover:scale-105 transition-transform">
                <Leaf size={20} />
              </div>
              <span className="font-title text-2xl tracking-tighter text-white">
                FLOXYNC <span className="text-xs text-slate-500 font-sans tracking-widest ml-1">SYSTEMS</span>
              </span>
            </Link>
            <p className="text-slate-400 mb-10 leading-relaxed text-lg font-light">
              세상의 모든 아름다움이 당신의 손끝에서 더 효율적으로 완성되도록. <br />
              플로리스트의 가치를 기술로 증명하는 차세대 지능형 ERP 플랫폼.
            </p>
            <div className="grid grid-cols-2 gap-6 text-slate-500 text-xs uppercase tracking-widest font-black">
              <div className="flex flex-col gap-2">
                <span className="text-slate-600">Support Line</span>
                <span className="text-white">1588-0000</span>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-slate-600">Official Channel</span>
                <span className="text-white">KAKAOTALK @FLOXYNC</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-12 lg:gap-24">
            <div>
              <h4 className="font-black text-white mb-6 uppercase tracking-[0.2em] text-[10px] text-emerald-500">Architecture</h4>
              <ul className="space-y-4">
                <li><Link href="#features" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 group"><Monitor size={14} className="opacity-50 group-hover:opacity-100" /> Core Engine</Link></li>
                <li><Link href="#ai-concierge" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 group"><Terminal size={14} className="opacity-50 group-hover:opacity-100" /> AI Modules</Link></li>
                <li><Link href="/login" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 group">Cloud Printing</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-black text-white mb-6 uppercase tracking-[0.2em] text-[10px] text-emerald-500">Ecosystem</h4>
              <ul className="space-y-4">
                <li><button className="text-slate-400 hover:text-white transition-colors">Ribbon Supply</button></li>
                <li><button className="text-slate-400 hover:text-white transition-colors">Ink & Toners</button></li>
                <li><button className="text-slate-400 hover:text-white transition-colors">Hardware Partner</button></li>
              </ul>
            </div>
            <div className="col-span-2 md:col-span-1">
              <h4 className="font-black text-white mb-6 uppercase tracking-[0.2em] text-[10px] text-emerald-500">Legal & Privacy</h4>
              <ul className="space-y-4">
                <li><Link href="#" className="text-slate-400 hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="#" className="text-emerald-500/70 hover:text-emerald-400 transition-colors font-bold">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 text-slate-500 text-xs">
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6">
            <p>© {new Date().getFullYear()} Ribbonist Corp. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <span className="hover:text-white transition-colors cursor-pointer">Security Status</span>
              <span className="hover:text-white transition-colors cursor-pointer">API Status</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <Link href="https://github.com/mokflw-lilymag" className="hover:text-white transition-colors">
              <Github size={20} />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

