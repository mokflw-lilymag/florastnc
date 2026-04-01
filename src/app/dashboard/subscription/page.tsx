"use client";

import { useState, useEffect } from "react";
import { loadTossPayments } from "@tosspayments/payment-sdk";
import { 
  Zap, 
  MessageCircle, 
  Mail, 
  ArrowRight, 
  Printer,
  TrendingUp,
  Sparkles,
  Layers,
  Crown,
  Gem,
  Check,
  HelpCircle,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/utils/supabase/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { isAfter } from "date-fns";
import { toast } from "sonner";

const PLANS = [
  {
    id: "free",
    name: "PRINT CORE",
    subName: "출력 전문 엔진",
    description: "리본 프린터 출력을 위한 핵심 기능에 집중합니다.",
    price: "20,000",
    yearlyPrice: "200,000",
    monthlyEffective: "16,660",
    savePercent: "17%",
    features: [
      "무제한 리본 출력 (모든 규격)",
      "전문 출력 로그 및 이력 관리",
      "고급 폰트 및 템플릿 라이브러리",
      "로컬 프린터 브릿지 무상 연동",
      "출력 전용 디자인 엔진 탑재"
    ],
    pricing: { 
      "1m": { label: "1개월", price: "20,000", total: "20,000", discount: "" }, 
      "3m": { label: "3개월", price: "19,000", total: "57,000", discount: "5% SAVE" }, 
      "6m": { label: "6개월", price: "18,330", total: "110,000", discount: "8% SAVE" }, 
      "12m": { label: "12개월", price: "16,660", total: "200,000", discount: "17% SAVE" } 
    },
    color: "slate",
    icon: Printer,
    gradient: "from-slate-700 to-slate-900"
  },
  {
    id: "erp_only",
    name: "ERP SMART",
    subName: "경영 효율화",
    description: "정산 및 고객 관리를 위한 스마트한 데이터 솔루션입니다.",
    price: "30,000",
    yearlyPrice: "300,000",
    monthlyEffective: "25,000",
    savePercent: "17%",
    features: [
      "고객 CRM + 포인트 마케팅 시스템",
      "전방위 주문 및 배송 현황 실시간 추적",
      "자동 정산 및 월간 매출 분석 보고서",
      "지출 자동 기록 및 매입 단가 관리",
      "업무 효율 증대를 위한 직원 권한 설정"
    ],
    pricing: { 
      "1m": { label: "1개월", price: "30,000", total: "30,000", discount: "" }, 
      "3m": { label: "3개월", price: "28,330", total: "85,000", discount: "6% SAVE" }, 
      "6m": { label: "6개월", price: "27,500", total: "165,000", discount: "8% SAVE" }, 
      "12m": { label: "12개월", price: "25,000", total: "300,000", discount: "17% SAVE" } 
    },
    color: "emerald",
    icon: TrendingUp,
    gradient: "from-emerald-600 to-teal-800"
  },
  {
    id: "pro",
    name: "FLORA PRO",
    subName: "통합 럭셔리 솔루션",
    description: "프린터와 ERP, 마케팅 기능이 하나로 통합된 완전체입니다.",
    price: "50,000",
    yearlyPrice: "500,000",
    monthlyEffective: "38,460",
    savePercent: "23%",
    features: [
      "PRINT + ERP 모든 기능 풀버전 탑재",
      "파트너 갤러리 쇼핑몰 전용 채널 개설",
      "구글 시트 실시간 동기화 (BI 분석용)",
      "카카오 알림톡 자동 발송 시스템",
      "24/7 전담 기술 매니저 배정 (VIP)"
    ],
    pricing: { 
      "1m": { label: "1개월", price: "50,000", total: "50,000", discount: "" }, 
      "3m": { label: "3개월", price: "46,660", total: "140,000", discount: "7% SAVE" }, 
      "6m": { label: "6개월", price: "45,830", total: "275,000", discount: "8% SAVE" }, 
      "12m": { label: "12개월", price: "38,460", total: "500,000", discount: "23% SPECIAL" } 
    },
    color: "blue",
    icon: Crown,
    gradient: "from-indigo-600 via-blue-700 to-blue-900",
    specialBenefit: "연간 구독 시 +1개월 무료 연장",
    popular: true
  }
];

type Period = "1m" | "3m" | "6m" | "12m";

export default function SubscriptionPage() {
  const supabase = createClient();
  const { tenantId } = useAuth();
  const [tenantData, setTenantData] = useState<any>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("12m");
  const [isProcessing, setIsProcessing] = useState(false);

  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || 'test_ck_D5akZmejPyb70ng83YXrb8zV7n9E';


  useEffect(() => {
    async function loadTenant() {
      if (!tenantId) return;
      const { data } = await supabase.from('tenants').select('*').eq('id', tenantId).single();
      setTenantData(data);
    }
    loadTenant();
  }, [tenantId, supabase]);

  const handleSubscribe = async (planId: string, period: Period) => {
    if (!tenantId) {
      toast.error("로그인이 필요합니다.");
      return;
    }

    const plan = PLANS.find(p => p.id === planId);
    if (!plan) return;

    const pricing = plan.pricing[period];
    const amount = Number(pricing.total.replace(/,/g, ''));
    
    setIsProcessing(true);
    
    try {
      const tossPayments = await loadTossPayments(clientKey);
      
      // orderId format: tenantId_planId_period_timestamp
      const orderId = `${tenantId.substring(0, 8)}_${planId}_${period}_${Date.now()}`;
      
      const { data: { user } } = await supabase.auth.getUser();
      const customerEmail = user?.email || "user@example.com";

      await tossPayments.requestPayment("카드", {
        amount,
        orderId,
        orderName: `${plan.name} (${pricing.label}) 구독`,
        successUrl: window.location.origin + "/dashboard/subscription/success",
        failUrl: window.location.origin + "/dashboard/subscription/fail",
        customerEmail,
        customerName: tenantData?.name || "FloraSync 가입자",
      });
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error("결제창을 여는 중 오류가 발생했습니다.", {
        description: error.message
      });
      setIsProcessing(false);
    }
  };

  const currentPlan = tenantData?.plan || 'free';
  const isExpired = !tenantData?.subscription_end || !isAfter(new Date(tenantData.subscription_end), new Date());
  const isSuspended = tenantData?.status === 'suspended';
  const accessBlocked = isExpired || isSuspended;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24 selection:bg-blue-100 selection:text-blue-900 font-sans">
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-32 overflow-hidden bg-white dark:bg-zinc-950">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
        
        <div className="container mx-auto px-6 relative z-10 text-center space-y-10 max-w-5xl">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-blue-50/50 text-blue-600 text-xs font-medium uppercase tracking-[0.2em] border border-blue-100/50 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Sparkles className="w-3.5 h-3.5" />
            Premium Membership
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extralight tracking-tight text-slate-900 dark:text-white leading-[1.15] animate-in fade-in slide-in-from-bottom-4 duration-700">
            당신의 화원을 위한 <br />
            <span className="font-light bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800">지속 가능한 성장 솔루션</span>
          </h1>
          
          <p className="text-slate-500 dark:text-zinc-400 text-xl font-light max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-1000">
            복잡한 화원 업무를 자동화하고 고객 중심의 성장을 가속화하세요. <br />
            비즈니스 형태에 가장 적합한 플랜을 제안합니다.
          </p>

          <div className="flex justify-center pt-10">
            <div className="inline-flex p-1.5 bg-zinc-100/50 dark:bg-zinc-900 rounded-3xl border border-zinc-200/50 dark:border-zinc-800 backdrop-blur-sm shadow-inner overflow-hidden">
              {(["1m", "3m", "6m", "12m"] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPeriod(p)}
                  className={cn(
                    "px-8 py-3.5 rounded-2xl text-sm font-light transition-all duration-500 relative",
                    selectedPeriod === p 
                      ? "bg-white dark:bg-zinc-800 text-blue-600 shadow-xl shadow-blue-500/5 scale-[1.02] font-normal" 
                      : "text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                  )}
                >
                  {p === "1m" ? "Monthly" : p === "3m" ? "Quarterly" : p === "6m" ? "Semi-Annual" : "Annual"}
                  {p === "12m" && (
                    <Badge className="absolute -top-3 -right-2 bg-blue-600 text-white border-0 shadow-lg text-[9px] px-2 py-0.5 font-bold uppercase tracking-widest">
                      Best Value
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Pricing Cards */}
      <section className="container mx-auto px-6 -mt-12 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {PLANS.map((plan, index) => {
            const Icon = plan.icon;
            const pricing = plan.pricing[selectedPeriod];
            const isPro = plan.id === 'pro';
            const isCurrent = currentPlan === plan.id;

            return (
              <Card 
                key={plan.id} 
                className={cn(
                  "relative border-0 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.05)] rounded-[40px] overflow-hidden flex flex-col h-full group hover:shadow-[0_48px_80px_-20px_rgba(0,0,0,0.1)] transition-all duration-700 animate-in fade-in slide-in-from-bottom-12 bg-white/70 backdrop-blur-xl",
                  isPro ? "scale-105 z-10 border border-blue-100 shadow-[0_32px_64px_-16px_rgba(59,130,246,0.15)]" : "border border-white/20",
                  `delay-[${index * 200}ms]`
                )}
              >
                <CardHeader className="p-12 pb-8">
                   <div className="flex justify-between items-start mb-10">
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform duration-500 group-hover:scale-110",
                        plan.id === 'free' ? "bg-slate-50 text-slate-400" :
                        plan.id === 'erp_only' ? "bg-emerald-50 text-emerald-500" :
                        "bg-blue-600 text-white"
                      )}>
                         <Icon className="h-6 w-6" strokeWidth={1.5} />
                      </div>
                      {isPro && (
                        <div className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-[10px] font-medium uppercase tracking-[0.2em] border border-blue-100 shadow-sm animate-pulse">
                           Recommended
                        </div>
                      )}
                   </div>
                   
                   <div className="space-y-2">
                      <h3 className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.4em] leading-none mb-1">{plan.subName}</h3>
                      <CardTitle className="text-3xl font-light text-slate-900 tracking-tight">{plan.name}</CardTitle>
                   </div>
                   
                   <CardDescription className="text-slate-400 font-light mt-6 leading-relaxed text-sm min-h-[3rem]">
                     {plan.description}
                   </CardDescription>
                </CardHeader>

                <CardContent className="p-12 pt-4 flex-1">
                   <div className="mb-12 space-y-5">
                      <div className="flex items-baseline gap-1">
                         <span className={cn(
                            "text-6xl font-extralight tracking-tighter",
                            isPro ? "text-blue-600" : "text-slate-900"
                         )}>₩{pricing.price}</span>
                         <span className="text-slate-300 font-light text-lg ml-2">/ month</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50">
                         <span className="font-light text-slate-400 uppercase tracking-widest">{pricing.label} total amount</span>
                         <span className="font-light text-slate-900 italic">₩{pricing.total}</span>
                      </div>

                      {pricing.discount && (
                         <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50/50 text-emerald-600 text-[10px] font-medium tracking-wider border border-emerald-100/50 animate-in fade-in duration-500">
                           <Zap className="w-3 h-3 text-emerald-400" /> {pricing.discount} benefit applied
                         </div>
                      )}
                   </div>

                   <div className="space-y-8 mt-12">
                      <p className="text-[9px] font-medium text-slate-300 uppercase tracking-[0.5em] flex items-center gap-2">
                        <span className="w-8 h-[1px] bg-slate-100" /> Key Features
                      </p>
                      <ul className="space-y-5">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-4 group/item">
                            <div className={cn(
                              "mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all",
                              isPro ? "bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.5)]" : "bg-slate-200"
                            )} />
                            <span className="text-sm font-light text-slate-500 leading-snug group-hover/item:text-slate-900 transition-colors">{feature}</span>
                          </li>
                        ))}
                      </ul>
                   </div>
                </CardContent>

                <CardFooter className="p-12 pt-0">
                  <Button 
                    onClick={() => handleSubscribe(plan.id, selectedPeriod)}
                    disabled={(isCurrent && !accessBlocked) || isProcessing}
                    className={cn(
                      "w-full h-16 rounded-2xl font-medium transition-all shadow-xl text-sm group/btn border",
                      isCurrent && !accessBlocked
                        ? "bg-emerald-50 text-emerald-600 border-emerald-100 cursor-default opacity-100" 
                        : isCurrent && accessBlocked
                          ? "bg-rose-600 hover:bg-rose-700 text-white border-transparent shadow-rose-500/20 animate-bounce-subtle"
                          : isPro 
                            ? "bg-blue-600 hover:bg-white text-white hover:text-blue-600 border-transparent hover:border-blue-200 shadow-blue-500/10 hover:scale-[1.01]" 
                            : "bg-slate-900 hover:bg-white text-white hover:text-slate-900 border-transparent hover:border-slate-200 shadow-slate-900/10 hover:scale-[1.01]"
                    )}
                  >
                    {isCurrent && !accessBlocked ? (
                      <span className="flex items-center justify-center">
                        <Check className="mr-2 h-4 w-4" /> 현재 사용 중인 플랜
                      </span>
                    ) : isProcessing ? (
                      "결제창 이동 중..."
                    ) : (
                      `${plan.name} 신청하기`
                    )}
                    {(!isCurrent || accessBlocked) && !isProcessing && <ArrowRight className="ml-3 h-4 w-4 stroke-1 group-hover/btn:translate-x-1 transition-transform opacity-50" />}
                  </Button>
                </CardFooter>
                
                {isCurrent && (
                  <div className="px-12 pb-8 text-center">
                    <p className="text-[10px] text-slate-400 font-light flex items-center justify-center">
                      <HelpCircle className="h-3 w-3 mr-1 opacity-50" />
                      플랜 변경 및 해지는 고객센터로 문의해 주세요.
                    </p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="container mx-auto px-6 mt-40">
        <div className="text-center mb-20 space-y-4">
          <h2 className="text-3xl md:text-5xl font-extralight tracking-tight text-slate-900">플랜별 정밀 분석</h2>
          <p className="text-slate-400 font-light text-lg">비즈니스의 깊이만큼 필요한 기능을 정교하게 설계했습니다.</p>
        </div>

        <div className="rounded-[32px] overflow-hidden border border-slate-100 shadow-2xl shadow-slate-100/50 bg-white/30 backdrop-blur-xl max-w-5xl mx-auto">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-12 py-10 text-left text-[10px] font-medium uppercase tracking-[0.4em] text-slate-400">Functionality Matrix</th>
                  <th className="px-12 py-10 text-center text-[10px] font-light uppercase tracking-[0.2em] text-slate-600">Print Core</th>
                  <th className="px-12 py-10 text-center text-[10px] font-light uppercase tracking-[0.2em] text-slate-600">ERP Smart</th>
                  <th className="px-12 py-10 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-blue-600">Flora Pro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm font-light text-slate-500">
                <ComparisonRow label="전문 리본 출력 엔진" v1 v2 v3 />
                <ComparisonRow label="무제한 인쇄 로그 관리" v1 v2 v3 />
                <ComparisonRow label="고객 CRM 및 포인트 시스템" v1={false} v2 v3 />
                <ComparisonRow label="배송 및 주문 통합 대시보드" v1={false} v2 v3 />
                <ComparisonRow label="직원 권한 및 지출 관리" v1={false} v2 v3 />
                <ComparisonRow label="구글 시트 BI 데이터 연동" v1={false} v2={false} v3 />
                <ComparisonRow label="카카오톡 알림톡 무상 연동" v1={false} v2={false} v3 />
                <ComparisonRow label="VIP 전담 기술 매저 배정" v1="E-mail" v2="Priority" v3="Digital Concierge" />
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Trust & Support Section */}
      <section className="container mx-auto px-6 mt-40 grid grid-cols-1 lg:grid-cols-2 gap-10 max-w-6xl items-stretch">
        <div className="relative p-16 rounded-[48px] bg-slate-900 text-white overflow-hidden group border border-white/5">
          <div className="relative z-10 space-y-12 h-full flex flex-col justify-between">
            <div className="space-y-8">
              <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 px-5 py-1.5 font-light tracking-[0.4em] text-[9px] uppercase rounded-full">Secure Infrastructure</Badge>
              <h3 className="text-4xl md:text-6xl font-extralight leading-tight tracking-tighter">
                신뢰를 넘어선 <br />
                <span className="font-light italic text-blue-400">디지털 트랜스포메이션</span>
              </h3>
              <p className="text-zinc-500 text-lg leading-relaxed max-w-sm font-light">
                릴리맥 플로라싱크는 화원의 모든 기록을 가장 안전하게 관리하며, 중단 없는 서비스를 보장합니다. 지금 바로 파트너가 되어 보세요.
              </p>
            </div>
            
            <div className="flex flex-wrap gap-6 pt-10">
               <div className="space-y-2">
                  <p className="text-[9px] font-medium text-zinc-600 uppercase tracking-widest">Global Support</p>
                  <p className="text-xl font-light text-blue-200">info@florasync.com</p>
               </div>
               <div className="w-[1px] h-12 bg-zinc-800 hidden sm:block" />
               <div className="space-y-2">
                  <p className="text-[9px] font-medium text-zinc-600 uppercase tracking-widest">Help Desk</p>
                  <p className="text-xl font-light text-white tracking-widest leading-none">010.XXXX.XXXX</p>
               </div>
            </div>
          </div>
          <Zap className="absolute -right-20 -bottom-20 h-96 w-96 text-white/5 opacity-50 rotate-12 transition-transform duration-[2000ms] group-hover:rotate-45" />
        </div>

        <div className="p-16 rounded-[48px] bg-white border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-center gap-10">
           <div className="space-y-4">
              <h3 className="text-3xl font-light text-slate-900 tracking-tight">전문 기술 지원</h3>
              <p className="text-slate-400 font-light text-lg leading-relaxed">구독 전/후 모든 과정에서 릴리맥 전문가가 함께합니다.</p>
           </div>
           
           <div className="grid grid-cols-1 gap-4">
              <a href="#" className="flex items-center justify-between p-8 rounded-3xl bg-slate-50/50 hover:bg-white hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-500 group border border-transparent hover:border-blue-100">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 bg-white text-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
                    <MessageCircle className="w-6 h-6 stroke-1" />
                  </div>
                  <div>
                    <h4 className="font-normal text-slate-900 text-lg">카카오톡 채널 상담</h4>
                    <p className="text-xs text-slate-400 font-light tracking-wide mt-1">평일 AM 09:00 - PM 06:00</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all stroke-1" />
              </a>
              
              <a href="#" className="flex items-center justify-between p-8 rounded-3xl bg-slate-50/50 hover:bg-white hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-500 group border border-transparent hover:border-indigo-100">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 bg-white text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm">
                    <Mail className="w-6 h-6 stroke-1" />
                  </div>
                  <div>
                    <h4 className="font-normal text-slate-900 text-lg">계산서 및 결제 증빙</h4>
                    <p className="text-xs text-slate-400 font-light tracking-wide mt-1">admin@florasync.com</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all stroke-1" />
              </a>
           </div>
        </div>
      </section>

      {/* Branding Footer */}
      <footer className="mt-40 text-center opacity-30 px-6">
        <div className="flex flex-col items-center gap-6 max-w-xs mx-auto">
          <div className="h-[0.5px] w-full bg-slate-300" />
          <span className="text-[9px] font-medium uppercase tracking-[1em] text-slate-400">LilyMag Florasync Ecosystem</span>
        </div>
      </footer>
    </div>
  );
}

function ComparisonRow({ label, v1, v2, v3 }: { label: string, v1: boolean | string, v2: boolean | string, v3: boolean | string }) {
  const renderCell = (v: boolean | string) => {
    if (typeof v === 'string') return <span className="text-[10px] font-light uppercase tracking-widest text-slate-500 italic">{v}</span>;
    return v 
      ? <div className="mx-auto w-1 h-1 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]" /> 
      : <div className="mx-auto w-6 h-[0.5px] bg-slate-100" />;
  };

  return (
    <tr className="hover:bg-slate-50/50 transition-colors">
      <td className="px-12 py-7 px-10 text-xs font-normal text-slate-800 tracking-tight">{label}</td>
      <td className="px-12 py-7 text-center">{renderCell(v1)}</td>
      <td className="px-12 py-7 text-center">{renderCell(v2)}</td>
      <td className="px-12 py-7 text-center border-l border-slate-50/50 font-medium">{renderCell(v3)}</td>
    </tr>
  );
}
