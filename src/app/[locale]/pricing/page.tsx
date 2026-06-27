import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AppLocale, isSupportedLocale } from '@/i18n/config';
import { getPublicServerMessages } from '@/i18n/getMessages.server';
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
    description: '하루 2천 원으로 완성하는 우리 매장 전용 스마트 꽃집 비서, 플로싱크의 정직한 요금 체계를 안내해 드립니다.',
  };
}

export default async function PricingPage({ params }: Props) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  
  const l = locale as AppLocale;

  return (
    <main className="min-h-screen bg-[#fbf9f7] text-[#1b1c1b] selection:bg-[#86e3ce] selection:text-[#006657]">
      <article className="pt-16 pb-24 md:pt-20 md:pb-32">
        <div className="container mx-auto px-6 md:px-12 max-w-5xl">
          <Link
            href={`/${l}`}
            className="inline-flex items-center gap-2 text-sm font-bold text-[#3e4946] hover:text-[#006b5c] transition-colors mb-10 uppercase tracking-widest"
          >
            <ArrowLeft className="w-4 h-4" />
            홈으로 돌아가기
          </Link>

          <header className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#86e3ce]/30 text-[#006657] font-bold text-xs mb-6 border border-[#006657]/20 uppercase tracking-[0.2em]">
              🌸 FloSync Pricing Policy
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-[#1b1c1b] tracking-tight mb-6">
              플로싱크 이용 요금 안내
            </h1>
            <p className="text-[#3e4946] text-lg md:text-xl leading-relaxed max-w-2xl mx-auto">
              하루 단 <strong className="text-[#006b5c]">2,000원</strong>으로 매장의 모든 주문과 리본 인쇄, 고객 관리를 한 번에 해결하세요.
            </p>
          </header>

          {/* Pricing Grid */}
          <div className="grid md:grid-cols-2 gap-8 mb-16 items-stretch">
            {/* Monthly Plan */}
            <div className="p-8 rounded-3xl bg-white border border-[#bdc9c5]/30 shadow-sm flex flex-col justify-between relative overflow-hidden">
              <div>
                <span className="inline-block px-3 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-bold mb-4">정기 구독</span>
                <h3 className="text-2xl font-black mb-2 text-slate-900">월간 멤버십</h3>
                <p className="text-slate-500 text-sm mb-6">매달 필요한 만큼 가볍게 시작하고 싶으신 매장</p>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-slate-900">60,000원</span>
                  <span className="text-slate-500 text-sm ml-1">/ 월 (하루 약 2,000원꼴)</span>
                </div>
                <div className="border-t border-slate-100 pt-6">
                  <ul className="space-y-3 text-slate-700 text-sm">
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> 리본/화환 프린터 출력 무제한</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> 주문서 등록 및 일일 마감 정산 ERP</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> 단골 전용 기념일 CRM & 자동 문자 발송</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> 모바일 앱을 통한 실시간 제작 사진 전송</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Annual Plan */}
            <div className="p-8 rounded-3xl bg-white border-2 border-[#006b5c] shadow-lg flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-[#006b5c] text-white text-xs font-black px-4 py-1.5 rounded-bl-2xl">
                ★ 2달 무료 추가 혜택
              </div>
              <div>
                <span className="inline-block px-3 py-1 rounded-md bg-[#86e3ce]/30 text-[#006657] text-xs font-bold mb-4">합리적인 선택</span>
                <h3 className="text-2xl font-black mb-2 text-[#006b5c]">연간 멤버십 패키지</h3>
                <p className="text-slate-500 text-sm mb-6">포스 프린터와 평생 교체 혜택까지 받고 싶으신 매장</p>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-slate-900">600,000원</span>
                  <span className="text-slate-500 text-sm ml-1">/ 년</span>
                  <div className="text-emerald-700 text-xs font-bold mt-1">
                    (10개월 요금으로 12개월 + 2개월 추가 = 총 14개월 이용!)
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-6">
                  <ul className="space-y-3 text-slate-700 text-sm">
                    <li className="flex items-center gap-2 font-bold text-[#006b5c]"><Check className="w-4 h-4 text-emerald-600" /> 포스 프린터 무상 임대 제공</li>
                    <li className="flex items-center gap-2 font-bold text-[#006b5c]"><Check className="w-4 h-4 text-emerald-600" /> 사용 중 고장 시 1:1 즉시 무상 교체 보증</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> 리본 출력 및 통합 매장 관리 프로그램 무제한</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> 신규 가입 시 꽃집 전용 기초 데이터 무료 탑재</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Refund Guarantee Section */}
          <div className="mb-16 p-8 rounded-3xl bg-amber-50/70 border border-amber-200 text-sm text-amber-950 leading-relaxed shadow-sm">
            <h4 className="text-base font-extrabold text-amber-900 mb-3 flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              💡 중도 해지 시 100% 정직한 페이백(환불) 보증 정책
            </h4>
            <p className="mb-2">
              연간 멤버십 이용 중 피치 못할 사정으로 폐업을 하시거나 해지를 하셔야 하는 경우에도 걱정하지 마세요. 
              플로싱크는 해지 위약금이나 꼼수 없이 <strong>가장 투명하고 정직한 정산 방식</strong>을 약속드립니다.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs md:text-sm text-amber-900/90 font-medium">
              <li>연간 가입 시 제공되었던 <strong>추가 보너스 기간(2달)을 제외</strong>한 실제 이용일수만 계산합니다.</li>
              <li>사용한 날짜만큼만 <strong>하루 정가인 2,000원씩 계산</strong>하여 공제한 후, 남은 잔액을 그대로 사장님 통장으로 즉시 반환(페이백)해 드립니다.</li>
              <li>
                예시: 연 결제(60만 원) 후 딱 100일간 사용하고 해지 시 ➡️ (사용 일수 100일 × 하루 2,000원 = 20만 원)을 제외한 <strong>나머지 40만 원을 고스란히 환불</strong>해 드립니다.
              </li>
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
