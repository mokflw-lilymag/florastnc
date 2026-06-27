import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AppLocale, isSupportedLocale } from '@/i18n/config';
import { Footer } from '@/components/landing/Footer';
import Link from 'next/link';
import { ArrowLeft, Mail, Smartphone, Check, HelpCircle } from 'lucide-react';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) {
    return { title: '플로싱크 - 이용 요금' };
  }
  return {
    title: '이용 요금 · 플로싱크',
    description: '하루 단 800원부터 무제한 비서 서비스까지, 플로싱크의 정직한 요금 체계를 안내해 드립니다.',
  };
}

export default async function PricingPage({ params }: Props) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  
  const l = locale as AppLocale;

  return (
    <main className="min-h-screen bg-[#fbf9f7] text-[#1b1c1b] selection:bg-[#86e3ce] selection:text-[#006657] overflow-x-hidden relative">
      {/* Decorative Blobs */}
      <div className="absolute top-0 -left-64 w-[600px] h-[600px] bg-[#86e3ce]/20 rounded-full blur-[100px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-0 -right-32 w-[500px] h-[500px] bg-[#fdcada]/20 rounded-full blur-[100px] pointer-events-none -z-10"></div>

      <article className="pt-16 pb-24 md:pt-20 md:pb-32 relative z-10">
        <div className="container mx-auto px-6 md:px-12 max-w-6xl">
          <Link
            href={`/${l}`}
            className="inline-flex items-center gap-2 text-sm font-bold text-[#3e4946] hover:text-[#006b5c] transition-colors mb-10 uppercase tracking-widest"
          >
            <ArrowLeft className="w-4 h-4" />
            홈으로 돌아가기
          </Link>

          <header className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#86e3ce]/50 text-[#006657] font-bold text-xs mb-6 border border-[#006b5c]/10 uppercase tracking-[0.2em] shadow-sm">
              🌸 FLOSYNC RATE CARD
            </div>
            <h1 className="text-3xl md:text-5xl font-black mb-6 text-gradient bg-clip-text">
              플로싱크 이용 요금 안내
            </h1>
            <p className="text-[#3e4946] text-lg md:text-xl leading-relaxed max-w-2xl mx-auto font-medium">
              사장님 매장의 주문 건수와 필요 기능에 맞는 <strong className="text-[#006b5c]">가장 합리적인 혜택</strong>을 만나보세요.
            </p>
          </header>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16 items-stretch">
            {/* 1. Ribbon Only */}
            <div className="glass-card p-6 rounded-3xl flex flex-col justify-between shadow-lg border-white/60 bg-white/70 hover:scale-[1.02] transition-transform duration-300">
              <div>
                <span className="inline-block px-3 py-1 rounded-md bg-[#fdcada]/40 text-[#795260] text-xs font-bold mb-4">리본 전용</span>
                <h3 className="text-xl font-black mb-2 text-slate-900">리본 라이센스</h3>
                <p className="text-slate-500 text-xs mb-6 h-10">장부는 필요 없고 오직 화환 및 경조사 리본 인쇄만 무제한으로 사용하실 매장</p>
                <div className="mb-6">
                  <div className="text-xs text-slate-400 line-through">월 15,000원</div>
                  <span className="text-3xl font-extrabold text-slate-900">연 120,000원</span>
                  <div className="text-[#795260] text-[11px] font-bold mt-1">
                    (즉시 할인가 적용 / 연장 혜택 제외)
                  </div>
                </div>
                <div className="border-t border-slate-100/50 pt-4">
                  <ul className="space-y-2 text-slate-700 text-xs">
                    <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> 리본 출력 무제한</li>
                    <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Xprint 등 다양한 감열 프린터 지원</li>
                    <li className="flex items-center gap-1.5 text-slate-400 line-through"><Check className="w-3.5 h-3.5 shrink-0" /> 매장 장부 및 고객 관리 제외</li>
                    <li className="flex items-center gap-1.5 text-slate-400 line-through"><Check className="w-3.5 h-3.5 shrink-0" /> 포스 프린터 무상 임대 제외</li>
                  </ul>
                </div>
              </div>
              <div className="mt-8 pt-4 border-t border-slate-100/50">
                <div className="text-[11px] text-slate-500 text-center font-bold">월 구독 시 월 15,000원</div>
              </div>
            </div>

            {/* 2. FloSync Light */}
            <div className="glass-card p-6 rounded-3xl flex flex-col justify-between shadow-lg border-white/60 bg-white/70 hover:scale-[1.02] transition-transform duration-300">
              <div>
                <span className="inline-block px-3 py-1 rounded-md bg-[#86e3ce]/30 text-[#006657] text-xs font-bold mb-4">소규모 매장</span>
                <h3 className="text-xl font-black mb-2 text-slate-900">플로비서 라이트</h3>
                <p className="text-slate-500 text-xs mb-6 h-10">주문량이 많지 않아 부담 없는 가격에 모든 비서 기능을 입문하고 싶으신 1인 숍</p>
                <div className="mb-6">
                  <span className="text-3xl font-extrabold text-slate-900">월 25,000원</span>
                  <div className="text-emerald-700 text-[11px] font-bold mt-1">
                    (월 주문 100건 제한 플랜)
                  </div>
                </div>
                <div className="border-t border-slate-100/50 pt-4">
                  <ul className="space-y-2 text-slate-700 text-xs">
                    <li className="flex items-center gap-1.5 font-bold text-emerald-700"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> 월 주문 등록 100건 한도</li>
                    <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> 주문서/마감 정산/CRM 등 전 기능</li>
                    <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> 모바일 앱 사진 전송</li>
                    <li className="flex items-center gap-1.5 text-slate-400 line-through"><Check className="w-3.5 h-3.5 shrink-0" /> 포스 프린터 무상 임대 제외</li>
                  </ul>
                </div>
              </div>
              <div className="mt-8 pt-4 border-t border-slate-100/50">
                <div className="text-[11px] text-slate-500 text-center font-bold">연 결제 할인 / 보너스 없음</div>
              </div>
            </div>

            {/* 3. FloSync Pro */}
            <div className="glass-card p-6 rounded-3xl flex flex-col justify-between shadow-lg border-white/60 bg-white/70 hover:scale-[1.02] transition-transform duration-300">
              <div>
                <span className="inline-block px-3 py-1 rounded-md bg-[#dbcaff]/40 text-[#61508b] text-xs font-bold mb-4">성장형 매장</span>
                <h3 className="text-xl font-black mb-2 text-slate-900">플로비서 프로</h3>
                <p className="text-slate-500 text-xs mb-6 h-10">본격적으로 주문을 관리하며, 장비 대여 혜택까지 한번에 해결하고 싶으신 실속형 꽃집</p>
                <div className="mb-6">
                  <div className="text-xs text-slate-400 line-through">월 40,000원</div>
                  <span className="text-3xl font-extrabold text-slate-900">연 440,000원</span>
                  <div className="text-[#61508b] text-[11px] font-bold mt-1">
                    (1달 이용료 할인 + 1달 보너스 연장!)
                  </div>
                </div>
                <div className="border-t border-slate-100/50 pt-4">
                  <ul className="space-y-2 text-slate-700 text-xs">
                    <li className="flex items-center gap-1.5 font-bold text-[#61508b]"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> 월 주문 등록 200건 한도</li>
                    <li className="flex items-center gap-1.5 font-bold text-[#61508b]"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> 포스 프린터 무상 임대 제공</li>
                    <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> 사용 중 자연고장 평생 무상 교체</li>
                    <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> 총 13개월 이용 (연 결제 시)</li>
                  </ul>
                </div>
              </div>
              <div className="mt-8 pt-4 border-t border-slate-100/50">
                <div className="text-[11px] text-slate-500 text-center font-bold">월 결제 시 월 40,000원</div>
              </div>
            </div>

            {/* 4. FloSync Pro Plus */}
            <div className="glass-card p-6 rounded-3xl flex flex-col justify-between shadow-lg border-2 border-[#006b5c] candy-gradient hover:scale-[1.02] transition-transform duration-300 relative">
              <div className="absolute top-0 right-0 bg-[#006b5c] text-white text-[10px] font-black px-3 py-1 rounded-bl-2xl">
                BEST 추천 플랜 👑
              </div>
              <div>
                <span className="inline-block px-3 py-1 rounded-md bg-[#86e3ce] text-[#006657] text-xs font-bold mb-4">대형/무제한</span>
                <h3 className="text-xl font-black mb-2 text-[#006b5c]">프로 플러스</h3>
                <p className="text-slate-500 text-xs mb-6 h-10">한도 걱정 없는 주문 처리와 모든 VIP 혜택을 집약해서 누리고 싶은 프리미엄 매장</p>
                <div className="mb-6">
                  <div className="text-xs text-slate-400 line-through">월 60,000원</div>
                  <span className="text-3xl font-extrabold text-slate-900">연 660,000원</span>
                  <div className="text-emerald-700 text-[11px] font-bold mt-1">
                    (1달 이용료 할인 + 2달 보너스 연장!)
                  </div>
                </div>
                <div className="border-t border-slate-100/50 pt-4">
                  <ul className="space-y-2 text-slate-700 text-xs">
                    <li className="flex items-center gap-1.5 font-bold text-emerald-700"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> 등록 주문량 완전 무제한</li>
                    <li className="flex items-center gap-1.5 font-bold text-emerald-700"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> 포스 프린터 무상 임대 제공</li>
                    <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> 사용 중 자연고장 평생 무상 교체</li>
                    <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> 총 14개월 이용 (연 결제 시)</li>
                  </ul>
                </div>
              </div>
              <div className="mt-8 pt-4 border-t border-slate-100/50">
                <div className="text-[11px] text-slate-500 text-center font-bold">월 결제 시 월 60,000원</div>
              </div>
            </div>
          </div>

          {/* Refund Guarantee Section */}
          <div className="mb-16 p-8 rounded-3xl bg-amber-50/70 border border-amber-200 text-sm text-amber-950 leading-relaxed shadow-sm">
            <h4 className="text-base font-extrabold text-amber-900 mb-3 flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              💡 안심 약정 철회 및 중도 해지 환불 규정 (이용약관 제10조 근거)
            </h4>
            <p className="mb-2">
              연간 결제 후 운영 중 폐업이나 부득이한 사정으로 해지하시는 경우에도 정직하게 잔액을 환급해 드립니다.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs md:text-sm text-amber-900/90 font-medium">
              <li>실제 이용하신 일수만큼 해당 플랜의 할인 전 정상 요금을 일할 차감합니다. (무상 보너스 기간은 소멸)</li>
              <li>무상 임대되었던 포스 프린터 장비에 대해 사용한 월수만큼 규정된 기기 사용료를 소급하여 공제합니다.</li>
              <li>중도 해지 시 잔여 약정 기간 총 요금의 <strong>30%의 위약 수수료</strong>와 결제사 수수료 명목의 10%가 합산 공제 후 안전하게 페이백됩니다.</li>
            </ul>
          </div>

          {/* Tester Apply Box */}
          <div className="p-8 md:p-12 rounded-[2.5rem] bg-gradient-to-r from-[#006b5c]/10 to-[#665590]/10 border border-[#006b5c]/20 shadow-lg text-center">
            <h3 className="text-xl md:text-2xl font-black mb-4 text-[#006b5c]">
              베타 테스터 신청 및 가입
            </h3>
            <p className="text-sm md:text-base text-[#3e4946] mb-8 max-w-lg mx-auto">
              지금 가입 신청하시면 정식 런칭 전까지 100% 무료로 체험하실 수 있으며, 정식 런칭 후에도 베타 테스터 특별 우대 우대가가 적용됩니다.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link href={`/${l}#test-user-apply`} className="bg-[#006b5c] text-white font-bold px-8 py-4 rounded-full shadow-lg shadow-[#006b5c]/20 hover:scale-105 transition-all text-center">
                베타 테스터 신청서 쓰러 가기
              </Link>
              <a href="mailto:admin@floxync.com" className="bg-white text-[#1b1c1b] border border-[#bdc9c5]/30 font-bold px-8 py-4 rounded-full flex items-center justify-center gap-2 hover:bg-slate-50 transition-all">
                <Mail className="w-5 h-5" />
                이메일로 문의 접수하기
              </a>
            </div>

            <div className="border-t border-[#bdc9c5]/30 pt-8 mt-8">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">⬇️ 앱 및 프로그램 다운로드 (무료/체험 가능)</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <a 
                  href="/api/downloads/bridge" 
                  download="Floxync-Bridge-Setup.zip"
                  className="w-full sm:w-auto bg-[#665590] text-white font-bold px-6 py-3 rounded-full flex items-center justify-center gap-2 hover:bg-[#524475] transition-all shadow-md text-sm"
                >
                  <span className="material-symbols-outlined text-[20px]">download</span>
                  윈도우프로그램 다운로드
                </a>
                <a 
                  href="https://drive.google.com/file/d/1tqF_n4D_X5D8kZ-M43l775464117565/view?usp=sharing" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto bg-slate-900 text-white font-bold px-6 py-3 rounded-full flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-md text-sm"
                >
                  <Smartphone className="w-4 h-4" />
                  안드로이드 모바일 앱 다운로드
                </a>
              </div>
            </div>
          </div>
        </div>
      </article>

      <Footer locale={l} />
    </main>
  );
}
