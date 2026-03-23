"use client";

import { useState, useEffect } from "react";
import { 
  CreditCard, 
  Check, 
  Zap, 
  Rocket, 
  Clock, 
  MessageCircle, 
  Phone, 
  Mail, 
  ArrowRight, 
  ShieldCheck,
  Package,
  Printer,
  TrendingUp,
  HelpCircle,
  Gem,
  Gift,
  Star,
  Percent,
  TrendingDown,
  ShoppingBag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/utils/supabase/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, isAfter } from "date-fns";
import { toast } from "sonner";

const PLANS = [
  {
    id: "free",
    name: "PRINT 전용",
    description: "리본 프린터 출력을 위한 핵심 기능 제공",
    price: "20,000",
    yearlyPrice: "200,000",
    monthlyEffective: "16,660",
    savePercent: "17%",
    features: [
      "무제한 리본 출력",
      "출력 로그 관리",
      "기본 템플릿 제공",
      "프린터 브릿지 연동",
      "기술 지원 (이메일)"
    ],
    pricing: { 
      "1m": { label: "1개월", price: "20,000", total: "20,000", discount: "" }, 
      "3m": { label: "3개월", price: "19,000", total: "57,000", discount: "5% 할인" }, 
      "6m": { label: "6개월", price: "18,330", total: "110,000", discount: "약 8% 할인" }, 
      "12m": { label: "12개월", price: "16,660", total: "200,000", discount: "약 17% 할인" } 
    },
    color: "slate",
    icon: Printer,
    benefit: "2개월분 무료"
  },
  {
    id: "erp_only",
    name: "ERP ONLY",
    description: "정산 및 고객 관리를 위한 스마트한 선택",
    price: "30,000",
    yearlyPrice: "300,000",
    monthlyEffective: "25,000",
    savePercent: "17%",
    features: [
      "고객 CRM & 포인트 관리",
      "주문 및 배송 관리",
      "정산 및 매출 보고서",
      "배송비 관리",
      "재고 및 지출 관리",
      "우선 순위 기술 지원"
    ],
    pricing: { 
      "1m": { label: "1개월", price: "30,000", total: "30,000", discount: "" }, 
      "3m": { label: "3개월", price: "28,330", total: "85,000", discount: "약 6% 할인" }, 
      "6m": { label: "6개월", price: "27,500", total: "165,000", discount: "약 8% 할인" }, 
      "12m": { label: "12개월", price: "25,000", total: "300,000", discount: "약 17% 할인" } 
    },
    color: "emerald",
    icon: TrendingUp,
    benefit: "2개월분 무료"
  },
  {
    id: "pro",
    name: "FLORA PRO",
    description: "프린터 + ERP 통합 관리 솔루션",
    price: "50,000",
    yearlyPrice: "500,000",
    monthlyEffective: "38,460",
    savePercent: "23%",
    features: [
      "PRINT 전용 모든 기능",
      "ERP ONLY 모든 기능",
      "구글 시트 연동",
      "카카오톡 주문 알림톡",
      "갤러리 쇼핑몰 전용",
      "VIP 밀착 지원 (카카오톡)"
    ],
    pricing: { 
      "1m": { label: "1개월", price: "50,000", total: "50,000", discount: "" }, 
      "3m": { label: "3개월", price: "46,660", total: "140,000", discount: "약 7% 할인" }, 
      "6m": { label: "6개월", price: "45,830", total: "275,000", discount: "약 8% 할인" }, 
      "12m": { label: "12개월", price: "38,460", total: "500,000", discount: "약 23% 초특가" } 
    },
    color: "blue",
    icon: Gem,
    specialBenefit: "+1개월 추가 증정 (총 13개월 이용 가능)",
    benefit: "최대 혜택 플랜",
    popular: true
  }
];

type Period = "1m" | "3m" | "6m" | "12m";

export default function SubscriptionPage() {
  const supabase = createClient();
  const { user, profile, tenantId } = useAuth();
  const [tenantData, setTenantData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("12m");

  useEffect(() => {
    async function loadTenant() {
      if (!tenantId) return;
      const { data } = await supabase.from('tenants').select('*').eq('id', tenantId).single();
      setTenantData(data);
      setLoading(false);
    }
    loadTenant();
  }, [tenantId]);

  const handleSubscribe = (planId: string, period: Period) => {
    const plan = PLANS.find(p => p.id === planId);
    const pricing = plan?.pricing[period];
    toast.success(`${plan?.name} (${pricing?.label}) 신청이 접수되었습니다.`, {
      description: `총 결제 예정 금액: ₩${pricing?.total}`,
      duration: 5000,
    });
    // 여기에 실제 결제 로직 또는 페이지 이동 추가
  };

  const currentPlan = tenantData?.plan || 'free';
  const isExpired = tenantData?.subscription_end && isAfter(new Date(), new Date(tenantData.subscription_end));

  return (
    <div className="container mx-auto py-12 space-y-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
        <div className="space-y-4">
           <Badge className="bg-blue-50 text-blue-600 border-blue-100 px-6 py-1.5 text-base font-normal rounded-full tracking-widest uppercase">Membership Plan</Badge>
           <h1 className="text-6xl font-light tracking-tight text-slate-900 leading-tight">서비스 플랜 및 구독 관리</h1>
           <p className="text-slate-500 text-2xl font-light">화원의 성장에 맞는 <span className="text-blue-600">최적의 솔루션</span>을 경험하세요.</p>
        </div>
        
        {tenantData && (
          <Card className="border-none shadow-2xl shadow-blue-100 bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-10 rounded-[48px] min-w-[360px] relative overflow-hidden group">
             <div className="relative z-10">
                <div className="flex items-center gap-3 opacity-80 text-base font-light uppercase tracking-[0.3em] mb-6">
                  <ShieldCheck className="h-6 w-6" /> Current Subscription
                </div>
                <div className="text-4xl font-normal mb-3 flex items-center gap-3">
                  {currentPlan.toUpperCase()} PLAN
                  {currentPlan === 'pro' && <Star className="h-7 w-7 text-amber-300 fill-amber-300 animate-pulse" />}
                </div>
                <div className="flex items-center gap-3 text-xl opacity-90 font-light ml-1">
                  <Clock className="h-6 w-6" />
                  {tenantData.subscription_end 
                    ? `${format(new Date(tenantData.subscription_end), 'yyyy년 MM월 dd일')} 까지`
                    : '이용 기한 없음 (무제한)'
                  }
                  {isExpired && <Badge variant="destructive" className="ml-3 animate-pulse border-0 px-4 py-2 text-sm font-normal rounded-xl">기간 만료</Badge>}
                </div>
             </div>
             <Rocket className="absolute -right-6 -bottom-6 h-48 w-48 opacity-10 rotate-12 transition-transform duration-700 group-hover:scale-110" />
          </Card>
        )}
      </div>

      <div className="flex justify-center pt-8">
        <div className="bg-slate-100/80 backdrop-blur-sm p-2 rounded-[32px] flex items-center gap-2 border border-slate-200 shadow-inner">
          {(["1m", "3m", "6m", "12m"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPeriod(p)}
              className={cn(
                "px-8 py-4 rounded-[24px] text-lg font-normal transition-all duration-300",
                selectedPeriod === p 
                  ? "bg-white text-blue-600 shadow-xl scale-105" 
                  : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
              )}
            >
              {p === "1m" ? "1개월" : p === "3m" ? "3개월" : p === "6m" ? "6개월" : "12개월(연간)"}
              {p === "12m" && <Badge className="ml-2 bg-blue-100 text-blue-600 border-0 text-[10px] font-bold">BEST</Badge>}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const isCurrent = currentPlan === plan.id;
          const pricing = (plan.pricing as any)[selectedPeriod];

          return (
            <Card key={plan.id} className={cn(
              "relative border-none shadow-2xl transition-all duration-500 hover:-translate-y-3 rounded-[56px] overflow-hidden flex flex-col h-full",
              plan.popular ? "ring-[3px] ring-blue-500 scale-105 z-10" : "bg-white/80 backdrop-blur-md"
            )}>
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-blue-600 text-white px-10 py-2.5 rounded-bl-[32px] text-base font-normal tracking-[0.2em] uppercase shadow-lg z-20">
                  Best Value
                </div>
              )}
              
              <CardHeader className="p-12 pb-8">
                 <div className={cn(
                   "w-20 h-20 rounded-[32px] flex items-center justify-center mb-10 shadow-inner relative",
                   plan.color === 'emerald' ? "bg-emerald-50 text-emerald-600" :
                   plan.color === 'blue' ? "bg-blue-50 text-blue-600" : "bg-slate-50 text-slate-600"
                 )}>
                    <Icon className="h-10 w-10" />
                 </div>
                 <CardTitle className="text-4xl font-normal text-slate-900 tracking-tight">{plan.name}</CardTitle>
                 <CardDescription className="text-slate-500 font-light mt-4 leading-relaxed text-lg">
                   {plan.description}
                 </CardDescription>
              </CardHeader>

              <CardContent className="p-12 pt-6 flex-1">
                 <div className="mb-12 space-y-8">
                    <div className="pt-8 border-t border-slate-100 relative group/price">
                      <div className="flex items-center gap-2 mb-2">
                         <span className={cn(
                            "text-5xl font-normal tracking-tighter",
                            plan.popular ? "text-blue-600" : "text-emerald-600"
                         )}>₩{pricing.price}</span>
                         <span className="text-slate-400 font-light text-xl whitespace-nowrap">/ 월</span>
                         {pricing.discount && (
                           <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 font-normal py-1 px-3 text-xs ml-auto whitespace-nowrap">
                             {pricing.discount}
                           </Badge>
                         )}
                      </div>
                      <p className="text-slate-400 font-light text-base mt-2">
                        {pricing.label} 총액 <span className="font-normal text-slate-900 text-lg">₩{pricing.total}</span>
                      </p>
                    </div>

                    {plan.specialBenefit && selectedPeriod === "12m" && (
                      <div className="mt-8 inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-blue-50 text-blue-600 text-base font-normal border border-blue-100 animate-bounce">
                         <Gift className="h-5 w-5" /> {plan.specialBenefit}
                      </div>
                    )}
                 </div>

                 <div className="space-y-8">
                    <p className="text-sm font-normal text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100 pb-4">주요 탑재 기능</p>
                    <ul className="space-y-5">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-4">
                          <div className={cn(
                            "mt-1.5 p-1 rounded-full flex-shrink-0 opacity-80",
                            plan.color === 'emerald' ? "bg-emerald-100 text-emerald-600" :
                            plan.color === 'blue' ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-600"
                          )}>
                            <Check className="h-4 w-4" strokeWidth={2} />
                          </div>
                          <span className="text-lg font-light text-slate-600 leading-snug">{feature}</span>
                        </li>
                      ))}
                    </ul>
                 </div>
              </CardContent>

              <CardFooter className="p-12 pt-0">
                <Button 
                  onClick={() => handleSubscribe(plan.id, selectedPeriod)}
                  className={cn(
                    "w-full h-20 rounded-[32px] font-normal transition-all shadow-xl text-lg group/btn active:scale-95",
                    isCurrent ? "bg-slate-100 text-slate-400 cursor-default" :
                    plan.popular ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200" : 
                    "bg-slate-900 hover:bg-black text-white shadow-slate-200"
                  )}
                  disabled={isCurrent}
                >
                  {isCurrent ? "현재 이용 중인 플랜" : `${plan.name} ${pricing.label} 신청`}
                  {!isCurrent && <ArrowRight className="ml-4 h-6 w-6 group-hover/btn:translate-x-2 transition-transform duration-300" />}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <Card className="border-none shadow-2xl shadow-slate-100 rounded-[64px] overflow-hidden bg-white mt-24">
        <CardHeader className="p-12 bg-slate-50/50 border-b border-slate-100">
           <CardTitle className="text-3xl font-normal flex items-center gap-4">
             <Percent className="h-8 w-8 text-blue-500 font-light" /> 전 플랜 기간별 할인율 상세 비교
           </CardTitle>
           <CardDescription className="text-xl font-light mt-2">길게 구독할수록 커지는 최적의 할인율을 확인하세요. 원하는 가격을 클릭하여 신청하실 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
           <div className="overflow-x-auto">
              <table className="w-full text-lg">
                 <thead>
                    <tr className="bg-slate-50/80">
                       <th className="px-12 py-8 text-left font-normal text-slate-400 uppercase tracking-[0.3em] text-sm whitespace-nowrap">Plan Name</th>
                       <th className="px-12 py-8 text-center font-normal text-slate-400 uppercase tracking-[0.3em] text-sm whitespace-nowrap">1개월</th>
                       <th className="px-12 py-8 text-center font-normal text-slate-400 uppercase tracking-[0.3em] text-sm whitespace-nowrap">3개월분 결제</th>
                       <th className="px-12 py-8 text-center font-normal text-slate-400 uppercase tracking-[0.3em] text-sm whitespace-nowrap">6개월분 (할인)</th>
                       <th className="px-12 py-8 text-center font-normal text-slate-400 uppercase tracking-[0.3em] text-sm font-bold text-blue-600 whitespace-nowrap">12개월분 (VIP)</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 bg-white font-light">
                    {PLANS.map(plan => (
                      <tr key={plan.id} className="hover:bg-slate-50 transition-colors group/row">
                        <td className="px-12 py-10">
                           <div className="font-normal text-slate-900 text-3xl">{plan.name}</div>
                           <div className="text-sm text-slate-400 mt-1 uppercase tracking-[0.2em] font-light">{plan.id.replace('_', ' ')}</div>
                        </td>
                        {(["1m", "3m", "6m", "12m"] as Period[]).map((p) => {
                          const data = (plan.pricing as any)[p];
                          const isSelected = selectedPeriod === p;
                          return (
                            <td 
                              key={p} 
                              onClick={() => {
                                setSelectedPeriod(p);
                                handleSubscribe(plan.id, p);
                              }}
                              className={cn(
                                "px-12 py-10 text-center cursor-pointer transition-all duration-300 relative overflow-hidden",
                                p === "12m" ? "bg-blue-50/10" : "",
                                "hover:bg-blue-50/50"
                              )}
                            >
                               <div className={cn(
                                 "text-xl font-normal transition-transform duration-300 group-hover/row:scale-110",
                                 p === "12m" ? "text-blue-700 text-3xl font-bold" : "text-slate-900"
                               )}>
                                 ₩{data.total}
                               </div>
                               {data.discount && (
                                 <div className={cn(
                                   "text-[10px] mt-2 font-normal uppercase tracking-widest",
                                   p === "12m" ? "text-blue-600" : "text-emerald-500"
                                 )}>
                                   {data.discount}
                                 </div>
                               )}
                               <div className="mt-4 opacity-0 group-hover/row:opacity-100 transition-opacity">
                                  <Button variant={p === "12m" ? "default" : "outline"} size="sm" className="rounded-full text-[10px] h-8 px-4">
                                    {p === "12m" ? "VIP 신청" : "교체 신청"}
                                  </Button>
                               </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-stretch pt-12 pb-20">
        <Card className="border-none shadow-2xl shadow-blue-50 bg-white rounded-[64px] p-16 flex flex-col justify-center">
           <h3 className="text-5xl font-light text-slate-900 mb-6 tracking-tight">상담이 필요하신가요?</h3>
           <p className="text-slate-500 font-light mb-16 text-2xl leading-relaxed">구독 연장, 결제증빙 등 모든 궁금증을 실시간으로 해결해 드립니다.</p>
           
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="flex items-center gap-6 p-8 rounded-[40px] bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-2xl transition-all duration-500">
                 <div className="h-16 w-16 rounded-3xl bg-emerald-500 flex items-center justify-center text-white shadow-2xl shadow-emerald-100">
                    <MessageCircle className="h-8 w-8" />
                 </div>
                 <div>
                    <div className="text-sm text-slate-400 font-normal uppercase tracking-widest mb-2">KakaoTalk</div>
                    <div className="text-xl font-normal text-slate-900">@릴리맥_플로라싱크</div>
                 </div>
              </div>
              <div className="flex items-center gap-6 p-8 rounded-[40px] bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-2xl transition-all duration-500">
                 <div className="h-16 w-16 rounded-3xl bg-blue-500 flex items-center justify-center text-white shadow-2xl shadow-blue-100">
                    <Phone className="h-8 w-8" />
                 </div>
                 <div>
                    <div className="text-sm text-slate-400 font-normal uppercase tracking-widest mb-2">Support Line</div>
                    <div className="text-xl font-normal text-slate-900">010-XXXX-XXXX</div>
                 </div>
              </div>
           </div>
        </Card>

        <Card className="border-none shadow-2xl shadow-indigo-100 bg-slate-900 text-white rounded-[64px] p-16 relative overflow-hidden group">
           <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <Badge className="bg-white/10 text-white border-0 mb-10 px-6 py-2 font-light text-base tracking-[0.3em] rounded-full uppercase">Subscription GATEWAY</Badge>
                <h3 className="text-6xl font-light mb-10 leading-tight tracking-tight">간편하게<br />신청하세요</h3>
                <p className="text-slate-400 font-light text-2xl leading-relaxed max-w-[420px]">
                  입금 확인 후 1시간 내 즉시 활성화됩니다.
                </p>
              </div>
              
              <div className="mt-16 space-y-6">
                <Button className="bg-white text-slate-900 hover:bg-slate-100 h-24 rounded-[36px] font-normal w-full uppercase tracking-[0.3em] text-lg transition-all border-0 shadow-2xl">
                   <Mail className="h-8 w-8 mr-6 font-light" /> info@florasync.com
                </Button>
                <p className="text-sm text-center text-slate-500 font-light tracking-[0.5em] uppercase">Florasync Payment Portal</p>
              </div>
           </div>
           <Zap className="absolute -right-12 -top-12 h-[400px] w-[400px] text-white/5 rotate-12 transition-transform duration-1000 group-hover:rotate-45" />
           <Gem className="absolute -left-12 -bottom-12 h-64 w-64 text-white/5 -rotate-12" />
        </Card>
      </div>
      
      <div className="text-center py-20 opacity-30 flex flex-col items-center">
         <ShieldCheck className="h-10 w-10 mb-5 text-slate-400" />
         <span className="text-sm font-light uppercase tracking-[0.6em]">Integrated SaaS Infrastructure v2.5</span>
      </div>
    </div>
  );
}
