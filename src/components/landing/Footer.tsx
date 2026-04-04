'use client';

import Link from 'next/link';
import { Leaf } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-white border-t border-slate-100 pt-16 pb-8 text-sm">
      <div className="container mx-auto px-6 md:px-12">
        <div className="flex flex-col md:flex-row justify-between items-start gap-10 mb-16">
          <div className="max-w-xs">
            <Link href="/" className="flex items-center gap-2 mb-4 group">
              <div className="bg-gradient-to-br from-[#1B4B43] to-[#2D736A] p-2 rounded-lg text-white shadow-sm group-hover:scale-105 transition-transform">
                <Leaf size={16} />
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-900">
                Florasync
              </span>
            </Link>
            <p className="text-slate-500 mb-6 leading-relaxed">
              꽃에만 집중할 수 있도록. 플로리스트를 위한 가장 혁신적이고 완벽한 종합 사무·운영(ERP) 플랫폼.
            </p>
            <div className="flex flex-col gap-1 text-slate-500">
              <p><strong>고객센터 핫라인:</strong> 1588-0000</p>
              <p><strong>카카오톡:</strong> @ribbonprint</p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-8">
            <div>
              <h4 className="font-bold text-slate-900 mb-4 uppercase tracking-wider text-xs">서비스</h4>
              <ul className="space-y-3">
                <li><Link href="#features" className="text-slate-500 hover:text-blue-600 transition-colors">주요 기능</Link></li>
                <li><button onClick={() => alert('매뉴얼 페이지 준비 중')} className="text-slate-500 hover:text-blue-600 transition-colors">매뉴얼 가이드</button></li>
                <li><Link href="/login" className="text-slate-500 hover:text-blue-600 transition-colors">출력 페이지 (Login)</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-4 uppercase tracking-wider text-xs">쇼핑몰</h4>
              <ul className="space-y-3">
                <li><button onClick={() => alert('몰 오픈 준비 중')} className="text-slate-500 hover:text-blue-600 transition-colors">리본 용지 구매</button></li>
                <li><button onClick={() => alert('몰 오픈 준비 중')} className="text-slate-500 hover:text-blue-600 transition-colors">전용 잉크/토너</button></li>
                <li><button onClick={() => alert('몰 오픈 준비 중')} className="text-slate-500 hover:text-blue-600 transition-colors">엡손 프린터 기기</button></li>
              </ul>
            </div>
            <div className="col-span-2 lg:col-span-1">
              <h4 className="font-bold text-slate-900 mb-4 uppercase tracking-wider text-xs">법적 고지</h4>
              <ul className="space-y-3">
                <li><Link href="#" className="text-slate-500 hover:text-blue-600 transition-colors">이용약관</Link></li>
                <li><Link href="#" className="font-semibold text-slate-600 hover:text-blue-600 transition-colors">개인정보처리방침</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-400 text-xs">
          <p>© {new Date().getFullYear()} Ribbonist (Florasync). All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-600 cursor-pointer">Support</span>
            <span className="hover:text-slate-600 cursor-pointer">Status</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
