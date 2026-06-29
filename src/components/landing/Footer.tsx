'use client';

import Link from 'next/link';
import Image from 'next/image';
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
    <footer className="bg-[#efedec] border-t border-[#bdc9c5]/40 pt-20 pb-12 text-sm relative overflow-hidden">
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#96f4de]/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-6 md:px-12 relative z-10 max-w-7xl">
        <div className="flex flex-col xl:flex-row justify-between items-start gap-16 mb-20">
          <div className="max-w-md">
            <Link href={home} className="flex items-center gap-2 mb-8 group">
              <Image 
                src="/images/floxync-logo-dark.png" 
                alt={nav.logoAlt} 
                width={120} 
                height={64} 
                className="h-16 w-auto object-contain" 
              />
            </Link>
            <p className="text-[#3e4946] mb-10 leading-relaxed text-lg font-light max-w-2xl">
              {f.line1}
              <br />
              {f.line2.split('\n').map((line, idx) => (
                <span key={idx}>
                  {line}
                  {idx !== f.line2.split('\n').length - 1 && <br />}
                </span>
              ))}
            </p>
            <div className="grid grid-cols-1 gap-6 text-[#3e4946] text-xs uppercase tracking-widest font-black">
              <div className="flex flex-col gap-2">
                <span className="text-[#6e7a76]">{f.officialMail}</span>
                <a href="mailto:admin@floxync.com" className="text-[#006b5c] hover:underline">admin@floxync.com</a>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-12 lg:gap-24">
            <div>
              <h4 className="font-black text-[#006b5c] mb-6 uppercase tracking-[0.2em] text-[10px]">{f.architecture}</h4>
              <ul className="space-y-4">
                <li><Link href={`${home}#feature-automation`} className="text-[#3e4946] hover:text-[#006b5c] transition-colors flex items-center gap-2 group"><Monitor size={14} className="opacity-50 group-hover:opacity-100" /> {f.coreEngine}</Link></li>
                <li><Link href={`${home}#feature-connection`} className="text-[#3e4946] hover:text-[#006b5c] transition-colors flex items-center gap-2 group"><Terminal size={14} className="opacity-50 group-hover:opacity-100" /> {f.aiModules}</Link></li>
                <li><Link href={`${home}#feature-ribbon`} className="text-[#665590] font-bold hover:text-[#006b5c] transition-colors flex items-center gap-2 group"><Cpu size={14} className="animate-pulse" /> {f.printBridge}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-black text-[#006b5c] mb-6 uppercase tracking-[0.2em] text-[10px]">{f.businessColumn}</h4>
              <ul className="space-y-4">
                <li><Link href="#" className="text-[#3e4946] hover:text-[#006b5c] transition-colors">{f.partnerProgram}</Link></li>
                <li><Link href="#" className="text-[#3e4946] hover:text-[#006b5c] transition-colors">{f.contactSales}</Link></li>
              </ul>
            </div>
            <div className="col-span-2 md:col-span-1">
              <h4 className="font-black text-[#006b5c] mb-6 uppercase tracking-[0.2em] text-[10px]">{f.legal}</h4>
              <ul className="space-y-4">
                <li><Link href={terms} className="text-[#3e4946] hover:text-[#006b5c] transition-colors">{f.terms}</Link></li>
                <li><Link href={privacy} className="text-[#006b5c] hover:underline font-bold">{f.privacy}</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="pt-12 border-t border-[#bdc9c5]/40 flex flex-col md:flex-row items-center justify-between gap-6 text-[#6e7a76] text-xs">
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6">
            <p>© {new Date().getFullYear()} Lilymag Lab. {f.rights}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
