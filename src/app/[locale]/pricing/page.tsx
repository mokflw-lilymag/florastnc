import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AppLocale, isSupportedLocale } from '@/i18n/config';
import { getPublicServerMessages } from '@/i18n/getMessages.server';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Mail, Smartphone } from 'lucide-react';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) {
    return { title: 'Floxync - 이용 요금' };
  }
  return {
    title: '이용 요금 · Floxync',
    description: '지금은 베타 기간이라 무료로 사용하실 수 있어요. 직접 써보시고 솔직한 의견 남겨주세요.',
  };
}

export default async function PricingPage({ params }: Props) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  
  const l = locale as AppLocale;
  const t = (await getPublicServerMessages(l)).landing.testApply;

  return (
    <main className="min-h-screen bg-[#fbf9f7] text-[#1b1c1b] selection:bg-[#86e3ce] selection:text-[#006657]">
      <article className="pt-16 pb-24 md:pt-20 md:pb-32">
        <div className="container mx-auto px-6 md:px-12 max-w-4xl">
          <Link
            href={`/${l}`}
            className="inline-flex items-center gap-2 text-sm font-bold text-[#3e4946] hover:text-[#006b5c] transition-colors mb-10 uppercase tracking-widest"
          >
            <ArrowLeft className="w-4 h-4" />
            홈으로 돌아가기
          </Link>

          <header className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#86e3ce] text-[#006657] font-bold text-xs mb-6 border border-[#006657]/20 uppercase tracking-[0.2em]">
              👑 Floxync Rate System
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-[#1b1c1b] tracking-tight mb-6">
              Floxync 이용 요금 안내
            </h1>
            <p className="text-[#3e4946] text-lg md:text-xl leading-relaxed max-w-2xl mx-auto">
              지금은 베타 기간이라 <strong className="text-[#006b5c]">100% 무료</strong>로 사용하실 수 있어요.<br />
              직접 써보시고 사장님들의 솔직한 의견을 보내주세요!
            </p>
          </header>

          <div className="grid md:grid-cols-2 gap-8 mb-16 text-sm text-[#3e4946] leading-relaxed">
            <div className="p-8 rounded-3xl bg-white border border-[#bdc9c5]/30 shadow-sm flex flex-col justify-between">
              <div>
                <p className="font-black text-[#006657] text-sm uppercase tracking-widest mb-4">🎁 베타 사용자가 되시면</p>
                <ul className="space-y-4 list-disc pl-4 marker:text-[#006b5c] text-base">
                  <li>FloXync AI 비서를 무료로 먼저 써보실 수 있어요</li>
                  <li>궁금한 점은 언제든 물어보세요</li>
                  <li>불편한 점 말씀해 주시면 바로 고칠게요</li>
                  <li>원하시는 기능도 요청하실 수 있어요</li>
                </ul>
              </div>
            </div>
            <div className="p-8 rounded-3xl bg-white border border-[#bdc9c5]/30 shadow-sm flex flex-col justify-between">
              <div>
                <p className="font-black text-[#665590] text-sm uppercase tracking-widest mb-4">📢 참여 조건 및 운영 안내</p>
                <p className="text-base leading-relaxed mb-6">
                  실제 꽃집을 운영하시면서 매장에서 직접 솔루션을 활용하고 피드백을 공유해 주실 분들만 신청해 주세요.
                </p>
                <p className="text-xs text-[#3e4946] bg-[#efedec] p-4 rounded-xl">
                  ※ 정식 서비스 출시 후에도 베타 테스터 우대 혜택(평생 할인 등)이 별도로 제공될 예정입니다.
                </p>
              </div>
            </div>
          </div>

          <div className="p-8 md:p-12 rounded-[2.5rem] bg-gradient-to-r from-[#006b5c]/10 to-[#665590]/10 border border-[#006b5c]/20 shadow-lg text-center">
            <h3 className="text-xl md:text-2xl font-black mb-4 text-[#006b5c]">
              베타 테스터 신청 방법
            </h3>
            <p className="text-sm md:text-base text-[#3e4946] mb-8 max-w-lg mx-auto">
              홈페이지 메인 화면의 맨 아래에 있는 신청 폼을 작성해 제출해 주시거나, 공식 이메일로 접수해 주시면 순차적으로 연락을 드립니다.
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
                  윈도우용 프린트 브릿지 다운로드 (PC)
                </a>
                <a 
                  href="https://drive.google.com/file/d/1tqF_n4D_X5D8kZ-M43l775464117565/view?usp=sharing" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto bg-slate-900 text-white font-bold px-6 py-3 rounded-full flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-md text-sm"
                >
                  <Smartphone className="w-4 h-4" />
                  안드로이드 모바일 앱 다운로드 (구글 드라이브)
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
