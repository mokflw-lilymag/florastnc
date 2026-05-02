'use client';

import Link from 'next/link';
import { Cpu, Github, Monitor, Terminal } from 'lucide-react';
import { AppLocale, localizePath } from '@/i18n/config';
import { getMessages } from '@/i18n/getMessages';

export function Footer({ locale }: { locale?: AppLocale }) {
  const l = locale ?? 'ko';
  const { landing } = getMessages(l);
  const f = landing.footer;
  const nav = landing.navbar;
  const home = localizePath(l, '/');
  const terms = localizePath(l, '/terms');
  const privacy = localizePath(l, '/privacy');

  return (
    <footer className="bg-[#0A0F0D] border-t border-white/5 pt-20 pb-12 text-sm relative overflow-hidden">
      {/* Footer Ambient Glow */}
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-6 md:px-12 relative z-10">
        <div className="flex flex-col xl:flex-row justify-between items-start gap-16 mb-20">
          <div className="max-w-md">
            <Link href={home} className="flex items-center gap-3 mb-8 group">
              <img src="/images/floxync-logo-official-white.png" alt={nav.logoAlt} className="h-16 w-auto object-contain" />
            </Link>
            <p className="text-slate-400 mb-10 leading-relaxed text-lg font-light max-w-2xl">
              {f.line1}
              <br className="hidden md:block" />
              {f.line2}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-slate-500 text-xs uppercase tracking-widest font-black">
              <div className="flex flex-col gap-2">
                <span className="text-slate-600">{f.officialMail}</span>
                <a href="mailto:admin@floxync.com" className="text-white hover:text-emerald-400 transition-colors">admin@floxync.com</a>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-slate-600">{f.contactLabel}</span>
                <span className="text-white">+82 10 7939 9518</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-12 lg:gap-24">
            <div>
              <h4 className="font-black text-white mb-6 uppercase tracking-[0.2em] text-[10px] text-emerald-500">{f.architecture}</h4>
              <ul className="space-y-4">
                <li><Link href={`${home}#solutions`} className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 group"><Monitor size={14} className="opacity-50 group-hover:opacity-100" /> {f.coreEngine}</Link></li>
                <li><Link href={`${home}#technology`} className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 group"><Terminal size={14} className="opacity-50 group-hover:opacity-100" /> {f.aiModules}</Link></li>
                <li><Link href={`${home}#network`} className="text-emerald-500 font-bold hover:text-emerald-400 transition-colors flex items-center gap-2 group"><Cpu size={14} className="animate-pulse" /> {f.printBridge}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-black text-white mb-6 uppercase tracking-[0.2em] text-[10px] text-emerald-500">{f.businessColumn}</h4>
              <ul className="space-y-4">
                <li><Link href="#" className="text-slate-400 hover:text-white transition-colors">{f.partnerProgram}</Link></li>
                <li><Link href="#" className="text-slate-400 hover:text-white transition-colors">{f.contactSales}</Link></li>
              </ul>
            </div>
            <div className="col-span-2 md:col-span-1">
              <h4 className="font-black text-white mb-6 uppercase tracking-[0.2em] text-[10px] text-emerald-500">{f.legal}</h4>
              <ul className="space-y-4">
                <li><Link href={terms} className="text-slate-400 hover:text-white transition-colors">{f.terms}</Link></li>
                <li><Link href={privacy} className="text-emerald-500/70 hover:text-emerald-400 transition-colors font-bold">{f.privacy}</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 text-slate-500 text-xs">
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6">
            <p>© {new Date().getFullYear()} Lilymag Lab. {f.rights}</p>
            <div className="flex items-center gap-4">
              <span className="hover:text-white transition-colors cursor-pointer">{f.securityStatus}</span>
              <span className="hover:text-white transition-colors cursor-pointer">{f.apiStatus}</span>
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
