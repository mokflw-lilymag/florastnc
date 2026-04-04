'use client';

import Link from 'next/link';
import { ArrowRight, FileText, CheckCircle2, Calculator } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-[#F9FAFA]">
      {/* K-Flower Background Gradients */}
      <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-[800px] h-[800px] bg-[#E8F3EE] rounded-full blur-3xl opacity-60 pointer-events-none" />
      <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-[600px] h-[600px] bg-[#EBEAE4] rounded-full blur-3xl opacity-60 pointer-events-none" />

      <div className="container relative z-10 mx-auto px-6 md:px-12 flex flex-col lg:flex-row items-center gap-16">
        
        {/* Left Content */}
        <div className="flex-1 text-center lg:text-left z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#E8F3EE] text-[#1B4B43] font-semibold text-sm mb-6 shadow-sm border border-[#D1E6DD]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2D736A] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1B4B43]"></span>
            </span>
            K-플라워 비즈니스의 시작
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15] mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            복잡한 사무 업무는 <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1B4B43] to-[#429381]">
              Florasync에 맡기세요.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            주문 접수, 세금 계산, 고객 정산까지. 꽃 시장 다녀오고 작품 만들기에도 바쁜 플로리스트를 위해 번거로운 행정 업무를 완벽하게 자동화합니다.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-200">
            <Link 
              href="/login" 
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#1B4B43] text-white font-bold text-lg hover:bg-[#2D736A] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2"
            >
              대시보드 시작하기 <ArrowRight size={20} />
            </Link>
          </div>
          
          <div className="mt-10 flex items-center justify-center lg:justify-start gap-8 text-sm font-medium text-slate-500 animate-in fade-in duration-700 delay-500">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-[#2D736A]" /> 매출/정산 자동화
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-[#2D736A]" /> 주문/고객 영구 관리
            </div>
          </div>
        </div>

        {/* Right 3D Visual (Glassmorphism Dashboard concept) */}
        <div className="flex-1 relative w-full max-w-2xl lg:max-w-none perspective-1000 animate-in fade-in slide-in-from-bottom-20 duration-1000 delay-300">
          <div className="relative w-full aspect-[4/3] transform transition-transform duration-700 hover:rotate-y-[-5deg] hover:rotate-x-[2deg]">
            
            {/* Main Glass Panel */}
            <div className="absolute inset-0 bg-white/70 backdrop-blur-xl border border-white/80 rounded-[32px] shadow-[0_30px_60px_-15px_rgba(27,75,67,0.15)] overflow-hidden flex flex-col items-center justify-center z-10">
              <div className="w-full h-12 bg-white/40 border-b border-white/50 px-6 flex items-center gap-2 backdrop-blur-md">
                <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                <div className="w-3 h-3 rounded-full bg-slate-300"></div>
              </div>
              <div className="flex-1 w-full p-8 flex flex-col gap-4">
                <div className="h-8 w-1/3 bg-slate-200/50 rounded-lg"></div>
                <div className="flex-1 bg-[#F9FAFA]/50 rounded-xl border border-white/50 p-6 flex flex-col gap-4">
                  <div className="h-5 w-3/4 bg-slate-200/50 rounded flex items-center gap-2">
                    <FileText size={16} className="text-[#1B4B43] ml-2" />
                  </div>
                  <div className="space-y-2 mt-2">
                    <div className="h-4 w-full bg-slate-100 rounded"></div>
                    <div className="h-4 w-5/6 bg-slate-100 rounded"></div>
                    <div className="h-4 w-4/6 bg-slate-100 rounded"></div>
                  </div>
                  <div className="h-10 w-full bg-[#E8F3EE]/80 rounded mt-auto border border-[#D1E6DD]/50"></div>
                </div>
              </div>
            </div>

            {/* Floating Card 1: Orders */}
            <div className="absolute -left-8 top-16 w-64 p-5 bg-white/95 backdrop-blur-xl border border-white rounded-2xl shadow-xl z-20 transform -translate-y-4 hover:-translate-y-6 transition-transform duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-[#E8F3EE] rounded-lg text-[#1B4B43]">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">신규 화환 주문</h4>
                  <p className="text-[11px] text-slate-500">방금 전 접수 및 자동 분류</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-2 w-full bg-slate-100 rounded"></div>
                <div className="h-2 w-2/3 bg-slate-100 rounded"></div>
              </div>
            </div>

            {/* Floating Card 2: Tax/Calc */}
            <div className="absolute -right-6 bottom-16 w-56 p-5 bg-white/95 backdrop-blur-xl border border-white rounded-2xl shadow-xl z-20 transform translate-y-4 hover:translate-y-2 transition-transform duration-300">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-amber-50 rounded-lg text-amber-600 border border-amber-100/50">
                  <Calculator size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">이번 달 정산액</h4>
                  <p className="text-[11px] text-slate-500">부가세 자동 분리</p>
                </div>
              </div>
              <div className="text-xl font-bold text-[#1B4B43] mt-3 border-t pt-3 border-slate-100 flex items-baseline gap-1">
                <span className="text-sm text-slate-400 font-normal">₩</span> 3,450,000
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
