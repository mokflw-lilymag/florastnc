'use client';

import { FileText, Calculator, Globe2, Printer } from 'lucide-react';

export function Features() {
  const features = [
    {
      icon: <FileText className="w-6 h-6 text-[#1B4B43]" />,
      title: '주문 및 고객 영구 보관',
      description: '카톡, 문자, 전화로 중구난방 들어오던 화환 주문을 한 번의 클릭으로 영구 보관하고 체계적으로 관리하세요.'
    },
    {
      icon: <Calculator className="w-6 h-6 text-[#2D736A]" />,
      title: '세금 및 정산 완전 자동화',
      description: '부가세 포함 여부, 입점사별 마진율 계산 등 복잡한 숫자 싸움은 Florasync의 자동 계산 엔진이 완벽하게 처리합니다.'
    },
    {
      icon: <Globe2 className="w-6 h-6 text-teal-600" />,
      title: '다국어 매장 완벽 지원',
      description: '플로리스트와 배송 기사의 언어가 달라도 걱정 마세요. 한국어, 영어, 베트남어가 원클릭으로 완벽하게 전환됩니다.'
    },
    {
      icon: <Printer className="w-6 h-6 text-emerald-500" />,
      title: '스마트 리본 출력 보조',
      description: 'ERP에 저장된 배송 정보 그대로! 조선 궁서체와 전문가의 7대 디자인 법칙을 적용해 10초 만에 완벽한 리본을 인쇄합니다.'
    }
  ];

  return (
    <section id="features" className="py-24 bg-white relative">
      <div className="absolute top-1/2 left-0 w-80 h-80 bg-slate-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 -z-10" />
      
      <div className="container mx-auto px-6 md:px-12 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-6">
            꽃 만지기도 벅차시죠?
          </h2>
          <p className="text-lg text-slate-600">
            주문, 계산서 발행, 직원 관리 등 하루가 다르게 쌓이는 사무 업무들.<br className="hidden md:block"/>
            Florasync가 내 손안의 AI 비서처럼 모든 관리 업무를 자동화합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, idx) => (
            <div 
              key={idx} 
              className="bg-[#F9FAFA] p-8 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-2 hover:bg-white transition-all duration-300 group"
            >
              <div className="w-14 h-14 rounded-[16px] bg-white flex items-center justify-center mb-6 shadow-sm border border-slate-100 group-hover:bg-[#E8F3EE] transition-colors">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-[#1B4B43] transition-colors">{feature.title}</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

