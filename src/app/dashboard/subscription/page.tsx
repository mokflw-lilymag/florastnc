"use client";
import { getMessages } from "@/i18n/getMessages";

import { useState, useEffect, useRef, useMemo } from "react";
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
  AlertCircle,
  Clock,
  ShieldCheck,
  CreditCard,
  Cloud,
  FileText,
  MousePointer2,
  Scan,
  Trophy,
  Rocket,
  Shield,
  Star
} from "lucide-react";
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/utils/supabase/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { isAfter } from "date-fns";
import { toast } from "sonner";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";

type Period = "1m" | "3m" | "6m" | "12m";

/** English discount lines (source of truth; Korean stays on `PLANS`). */
const EN_PLAN_DISCOUNTS: Record<string, Record<Period, string>> = {
  free: { "1m": "", "3m": "5% off", "6m": "8% off", "12m": "17% off" },
  erp_only: { "1m": "", "3m": "6% off", "6m": "8% off", "12m": "17% off" },
  pro: { "1m": "", "3m": "7% off", "6m": "8% off", "12m": "23% off" },
};

const EN_PERIOD_LABELS: Record<Period, string> = {
  "1m": "1 month",
  "3m": "3 months",
  "6m": "6 months",
  "12m": "12 months",
};

const PLANS = [
  {
    id: "free",
    name: "PRINT CORE",
    subName: "화원 리본 출력 전용",
    description: "리본 프린터 출력을 위한 핵심 기능을 제공합니다. 안정적인 출력이 최우선인 사장님께 추천합니다.",
    price: "20,000",
    yearlyPrice: "200,000",
    monthlyEffective: "16,660",
    savePercent: "17%",
    features: [
      "무제한 리본 출력 (모든 규격 지원)",
      "전문 출력 로그 및 이력 상세 관리",
      "고급 폰트 및 디자인 템플릿 라이브러리",
      "로컬 프린터 브릿지 무상 연동 서비스",
      "기본적인 주문 내역 수동 기록 및 관리"
    ],
    pricing: { 
      "1m": { label: "1개월", price: "20,000", total: "20,000", discount: "" }, 
      "3m": { label: "3개월", price: "19,000", total: "57,000", discount: "5% 할인" }, 
      "6m": { label: "6개월", price: "18,330", total: "110,000", discount: "8% 할인" }, 
      "12m": { label: "12개월", price: "16,660", total: "200,000", discount: "17% 할인" } 
    },
    color: "slate",
    icon: Printer,
    popular: false,
    themeColor: "indigo",
    accent: "bg-slate-500"
  },
  {
    id: "erp_only",
    name: "ERP SMART",
    subName: "효율적인 화원 운영의 정석",
    description: "정산 및 고객 관리를 위한 스마트 솔루션입니다. 데이터 기반의 성장을 원하는 사장님께 완벽합니다.",
    price: "30,000",
    yearlyPrice: "300,000",
    monthlyEffective: "25,000",
    savePercent: "17%",
    features: [
      "고객 CRM + 포인트 마케팅 자동화",
      "실시간 배송 배차 및 위치 추적 시스템",
      "AI 영수증 OCR 정산 및 지출 내역 자동화",
      "매입 단가 추이분석 및 재고 관리",
      "자동 세무 설정 및 월간 손익 정산 보고서"
    ],
    pricing: { 
      "1m": { label: "1개월", price: "30,000", total: "30,000", discount: "" }, 
      "3m": { label: "3개월", price: "28,330", total: "85,000", discount: "6% 할인" }, 
      "6m": { label: "6개월", price: "27,500", total: "165,000", discount: "8% 할인" }, 
      "12m": { label: "12개월", price: "25,000", total: "300,000", discount: "17% 할인" } 
    },
    color: "emerald",
    icon: TrendingUp,
    popular: false,
    themeColor: "emerald",
    accent: "bg-emerald-500"
  },
  {
    id: "pro",
    name: "FLORA PRO",
    subName: "완벽한 디지털 트랜스포메이션",
    description: "프린터와 ERP, 마케팅 기능이 하나로 통합된 완전체입니다. 모든 것을 한 번에 해결하고 싶은 성공한 사장님의 선택.",
    price: "50,000",
    yearlyPrice: "500,000",
    monthlyEffective: "38,460",
    savePercent: "23%",
    features: [
      "PRINT + ERP 모든 기능 무제한 언리미티드",
      "AI 사장님 비서 및 마케팅 원클릭 자동 포스팅",
      "SNS(인스타/블로그) 실시간 연동 및 분석",
      "외부 쇼핑몰(파트너 갤러리) 주문 자동 스크래핑",
      "VIP 고객 전용 멤버십 전용관 개설 지원"
    ],
    pricing: { 
      "1m": { label: "1개월", price: "50,000", total: "50,000", discount: "" }, 
      "3m": { label: "3개월", price: "46,660", total: "140,000", discount: "7% 할인" }, 
      "6m": { label: "6개월", price: "45,830", total: "275,000", discount: "8% 할인" }, 
      "12m": { label: "12개월", price: "38,460", total: "500,000", discount: "23% 특가" } 
    },
    color: "indigo",
    icon: Crown,
    popular: true,
    themeColor: "indigo",
    accent: "bg-indigo-600"
  }
];

export default function SubscriptionPage() {
  const supabase = createClient();
  const { tenantId } = useAuth();
  const [tenantData, setTenantData] = useState<any>(null);
  const [usageData, setUsageData] = useState<any>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("12m");
  const [isProcessing, setIsProcessing] = useState(false);
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const baseLocale = toBaseLocale(locale);
  const localizedPlans = useMemo(() => {
    if (baseLocale === "ko") return PLANS;
    return PLANS.map((plan) => ({
      ...plan,
      subName:
        plan.id === "free"
          ? "Focused on flower ribbon printing"
          : plan.id === "erp_only"
            ? "Efficient flower shop operations"
            : "Complete digital transformation",
      description:
        plan.id === "free"
          ? "Core features for stable ribbon printing and basic order tracking."
          : plan.id === "erp_only"
            ? "Smart operations suite for settlement and customer growth."
            : "All-in-one printer, ERP, and marketing bundle for scaling teams.",
      features:
        plan.id === "free"
          ? [
              "Unlimited ribbon printing (all sizes)",
              "Detailed print logs and history",
              "Premium font and template library",
              "Local printer bridge integration",
              "Manual order record management",
            ]
          : plan.id === "erp_only"
            ? [
                "Customer CRM + point marketing",
                "Live delivery dispatch and tracking",
                "AI receipt OCR for expense automation",
                "Purchase price trend and inventory",
                "Auto tax setup and monthly P&L report",
              ]
            : [
                "Unlimited PRINT + ERP core features",
                "AI assistant and one-click marketing posts",
                "SNS integration and performance analysis",
                "External marketplace order sync",
                "VIP membership storefront support",
              ],
      pricing: Object.fromEntries(
        (Object.keys(plan.pricing) as Period[]).map((k) => [
          k,
          {
            ...plan.pricing[k],
            label: EN_PERIOD_LABELS[k],
            discount: EN_PLAN_DISCOUNTS[plan.id][k],
          },
        ])
      ) as typeof plan.pricing,
    }));
  }, [baseLocale]);

  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || 'test_ck_D5akZmejPyb70ng83YXrb8zV7n9E';

  // For nice scroll animations
  const { scrollYProgress } = useScroll();
  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);

  useEffect(() => {
    async function loadTenant() {
      if (!tenantId) return;
      const { data } = await supabase.from('tenants').select('*').eq('id', tenantId).maybeSingle();
      setTenantData(data);

      const [orderCount, customerCount, expenseCount] = await Promise.all([
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabase.from('customers').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabase.from('expenses').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId)
      ]);

      setUsageData({
        orders: orderCount.count || 0,
        customers: customerCount.count || 0,
        expenses: expenseCount.count || 0
      });
    }
    loadTenant();
  }, [tenantId, supabase]);

  const handleSubscribe = async (planId: string, period: Period) => {
    if (!tenantId) {
      toast.error(tf.f00176);
      return;
    }

    setIsProcessing(true);
    const plan = localizedPlans.find(p => p.id === planId);
    if (!plan) return;

    const pricing = plan.pricing[period];
    const amount = Number(pricing.total.replace(/,/g, ''));
    
    try {
      const tossPayments = await loadTossPayments(clientKey);
      const orderId = `${tenantId.substring(0, 8)}_${planId}_${period}_${Date.now()}`;
      const { data: { user } } = await supabase.auth.getUser();

      await tossPayments.requestPayment(tf.f02482 as "카드" | "CARD", {
        amount,
        orderId,
        orderName: `${plan.name} (${pricing.label}) ${tf.f00974}`,
        successUrl: window.location.origin + "/dashboard/subscription/success",
        failUrl: window.location.origin + "/dashboard/subscription/fail",
        customerEmail: user?.email || "",
        customerName: tenantData?.name || tf.f02266,
      });
    } catch (error: any) {
      toast.error(tf.f00922, { description: error.message });
      setIsProcessing(false);
    }
  };

  const currentPlan = tenantData?.plan || 'free';
  const isExpired = !tenantData?.subscription_end || !isAfter(new Date(tenantData.subscription_end), new Date());

  return (
    <div className="relative min-h-screen bg-[#030712] text-white selection:bg-indigo-500/30 overflow-x-hidden">
      
      {/* Background Mesh Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
         <motion.div 
           animate={{ 
             scale: [1, 1.2, 1],
             rotate: [0, 90, 0]
           }}
           transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
           className="absolute -top-[20%] -right-[10%] w-[80%] h-[80%] bg-indigo-600/20 rounded-full blur-[120px]" 
         />
         <motion.div 
           animate={{ 
             scale: [1, 1.3, 1],
             rotate: [0, -90, 0]
           }}
           transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
           className="absolute top-[40%] -left-[10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[100px]" 
         />
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] contrast-150 brightness-150" />
      </div>

      {/* Floating Glass Navigation */}
      <div className="sticky top-6 z-50 mx-auto max-w-5xl px-4 pointer-events-none">
        <div className="pointer-events-auto flex items-center justify-between px-6 py-3 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl shadow-black/50 overflow-hidden">
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                 <Rocket className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                 <h2 className="text-sm font-black tracking-widest text-white uppercase">{tf.f02419}</h2>
                 <p className="text-[10px] text-slate-400 font-bold">{tf.f01309}</p>
              </div>
           </div>
           
           <div className="flex items-center gap-6">
              {usageData && (
                 <div className="hidden lg:flex items-center gap-8 pr-8 border-r border-white/10">
                    <Stat text={tf.f02405} value={usageData.orders} />
                    <Stat text={tf.f02406} value={usageData.customers} />
                    <Stat text={tf.f02407} value={usageData.expenses} />
                 </div>
              )}
              <div className="flex flex-col items-end">
                 <Badge className="bg-white/10 text-white hover:bg-white/20 border-white/10 px-3 py-1 text-[10px] font-black tracking-widest uppercase">
                    {localizedPlans.find(p => p.id === currentPlan)?.name || tf.f02420}
                 </Badge>
              </div>
           </div>
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-6 max-w-7xl pt-24 pb-32">
        
        {/* Hero Section */}
        <div className="text-center space-y-8 mb-32">
          <motion.div
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]"
          >
             <Star className="w-3 h-3 fill-indigo-400" /> {tf.f02431}
          </motion.div>
          
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.9] overflow-hidden">
             <motion.span 
               initial={{ y: 100 }}
               animate={{ y: 0 }}
               transition={{ duration: 0.8, ease: "circOut" }}
               className="block"
             >
                {tf.f01070}
             </motion.span>
             <motion.span 
               initial={{ y: 100 }}
               animate={{ y: 0 }}
               transition={{ duration: 0.8, delay: 0.1, ease: "circOut" }}
               className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-blue-400 to-teal-400"
             >
                {tf.f01025}
             </motion.span>
          </h1>
          
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ delay: 0.5 }}
             className="text-slate-400 max-w-3xl mx-auto text-lg md:text-xl font-medium leading-relaxed"
          >
             {tf.f01779} <br />
             {tf.f01260}
          </motion.p>
          
          <div className="flex justify-center pt-8">
            <div className="inline-flex flex-wrap items-center justify-center p-2 bg-white/5 backdrop-blur-3xl rounded-[32px] border border-white/10 shadow-3xl">
               {(["1m", "3m", "6m", "12m"] as Period[]).map((p) => (
                 <button
                   key={p}
                   onClick={() => setSelectedPeriod(p)}
                   className={cn(
                     "px-8 py-3 rounded-[24px] text-xs font-black transition-all relative overflow-hidden group",
                     selectedPeriod === p 
                       ? "bg-white text-slate-900 shadow-[0_0_30px_rgba(255,255,255,0.2)]" 
                       : "text-slate-400 hover:text-white"
                   )}
                 >
                   <span className="relative z-10">
                     {p === "1m" ? tf.f02401 : p === "3m" ? tf.f02402 : p === "6m" ? tf.f02403 : tf.f02404}
                   </span>
                   {p === "12m" && (
                     <div className="absolute top-0 right-0 h-full w-full bg-indigo-600/10 pointer-events-none" />
                   )}
                   {p === "12m" && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                       <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                    </span>
                   )}
                 </button>
               ))}
            </div>
          </div>
        </div>

        {/* Pricing Cards with 3D Interaction */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch mb-40">
           {localizedPlans.map((plan, i) => (
             <TiltCard 
               key={plan.id} 
               plan={plan} 
               period={selectedPeriod} 
               onSubscribe={handleSubscribe}
               isCurrent={currentPlan === plan.id && !isExpired}
               isProcessing={isProcessing}
               index={i}
               tf={tf}
             />
           ))}
        </div>

        {/* Brand Core Values */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-40">
           <ValueCard icon={<Shield className="w-6 h-6" />} title={tf.f02413} desc={tf.f00991} />
           <ValueCard icon={<Scan className="w-6 h-6" />} title={tf.f02414} desc={tf.f02248} />
           <ValueCard icon={<Cloud className="w-6 h-6" />} title={tf.f02415} desc={tf.f01002} />
           <ValueCard icon={<Trophy className="w-6 h-6" />} title={tf.f02416} desc={tf.f00829} />
        </div>

        {/* Comparison Table */}
        <div className="mb-40">
           <div className="text-center space-y-4 mb-20">
              <h2 className="text-3xl md:text-5xl font-black tracking-tight">{tf.f02417}</h2>
              <p className="text-slate-400 font-bold uppercase tracking-[0.5em] text-[10px]">{tf.f01339}</p>
           </div>
           
           <div className="bg-white/5 backdrop-blur-2xl rounded-[48px] border border-white/10 p-12 overflow-hidden shadow-3xl">
              <table className="w-full">
                 <thead>
                    <tr className="border-b border-white/5">
                       <th className="pb-10 px-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">{tf.f02418}</th>
                       {(["PRINT", "SMART", "PRO"] as const).map(p => (
                         <th key={p} className="pb-10 px-4 text-center text-sm font-black text-white">{p}</th>
                       ))}
                    </tr>
                 </thead>
                    <tbody className="divide-y divide-white/5">
                       <Row label={tf.f01785} v1 v2 v3 />
                       <Row label={tf.f01210} v1 v2 v3 />
                       <Row label={tf.f00938} v1={false} v2 v3 />
                       <Row label={tf.f01509} v1={false} v2 v3 />
                       <Row label={tf.f02241} v1={false} v2 v3 />
                       <Row label={tf.f01725} v1={false} v2 v3 />
                       <Row label={tf.f02055} v1={false} v2={false} v3 />
                       <Row label={tf.f02242} v1={false} v2={false} v3 />
                       <Row label={tf.f01618} v1={false} v2={false} v3 />
                       <Row label={tf.f02020} v1="E-mail" v2={tf.f01974} v3={tf.f00828} />
                    </tbody>
              </table>
           </div>
        </div>

        {/* Final CTA */}
        <motion.div 
          whileHover={{ scale: 0.99 }}
          className="relative p-20 rounded-[64px] bg-gradient-to-br from-indigo-600 to-blue-700 text-center overflow-hidden shadow-4xl shadow-indigo-500/20"
        >
           <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.1] mix-blend-overlay" />
           <div className="relative z-10 space-y-12">
              <h3 className="text-4xl md:text-7xl font-black tracking-tighter leading-none mb-6">
                 {tf.f01069}<br />
                 {tf.f01897}
              </h3>
              <div className="flex items-center justify-center gap-4">
                 <div className="flex -space-x-3">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="w-12 h-12 rounded-full border-4 border-indigo-600 bg-slate-800 flex items-center justify-center overflow-hidden">
                         <img src={`https://i.pravatar.cc/150?u=${i}`} alt="user" className="w-full h-full object-cover" />
                      </div>
                    ))}
                 </div>
                 <p className="text-indigo-200 font-bold text-sm">{tf.f00806}</p>
              </div>
              <Button className="h-20 px-16 rounded-full bg-white text-indigo-700 font-black text-2xl hover:scale-110 transition-transform shadow-2xl shadow-indigo-500/50">
                 {tf.f01896}
              </Button>
           </div>
        </motion.div>
      </div>
    </div>
  );
}

function Stat({ text, value }: { text: string, value: number }) {
  return (
    <div className="flex flex-col items-center">
       <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{text}</span>
       <span className="text-sm font-black text-white">{value.toLocaleString()}</span>
    </div>
  );
}

function TiltCard({ plan, period, onSubscribe, isCurrent, isProcessing, index, tf }: any) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const pricing = plan.pricing[period];

  const handleMouseMove = (e: any) => {
     const rect = e.currentTarget.getBoundingClientRect();
     const width = rect.width;
     const height = rect.height;
     const mouseX = e.clientX - rect.left;
     const mouseY = e.clientY - rect.top;
     x.set(mouseX / width - 0.5);
     y.set(mouseY / height - 0.5);
  };

  const handleMouseLeave = () => {
     x.set(0);
     y.set(0);
  };

  return (
    <motion.div
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="group relative h-full"
    >
       <Card className={cn(
         "h-full relative overflow-hidden bg-white/5 backdrop-blur-3xl border-white/10 rounded-[48px] shadow-2xl transition-all duration-700 group-hover:bg-white/10",
         plan.popular && "ring-2 ring-indigo-500/50"
       )}>
          {plan.popular && (
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
          )}

          <CardHeader className="p-12 pb-6">
             <div className="flex justify-between items-center mb-8">
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-3xl", plan.accent)}>
                   <plan.icon className="w-7 h-7" />
                </div>
                {plan.popular && (
                  <Badge className="bg-indigo-600 text-white border-0 px-4 py-1.5 font-black uppercase text-[10px] tracking-[0.2em] shadow-lg shadow-indigo-500/20">{tf.f02408}</Badge>
                )}
             </div>
             <CardTitle className="text-4xl font-black tracking-tighter text-white mb-2">{plan.name}</CardTitle>
             <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">{plan.subName}</p>
          </CardHeader>

          <CardContent className="p-12 pt-0 flex-1">
             <div className="mb-12">
                <div className="flex items-baseline gap-2">
                   <span className="text-6xl font-black tracking-tighter text-white">₩{pricing.price}</span>
                   <span className="text-slate-500 font-bold uppercase text-xs">/ Mo</span>
                </div>
                {pricing.discount && (
                   <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/10">
                      <Zap className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      <span className="text-[10px] font-black uppercase text-slate-300 italic">
                        {pricing.discount} {tf.f02412}
                      </span>
                   </div>
                )}
             </div>

             <ul className="space-y-6">
                {plan.features.map((f: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-4 group/li">
                     <div className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center border border-white/10 group-hover/li:bg-indigo-500 transition-colors">
                        <Check className="w-3 h-3 text-white" />
                     </div>
                     <span className="text-sm font-bold text-slate-400 group-hover/li:text-white transition-colors leading-snug">{f}</span>
                  </li>
                ))}
             </ul>
          </CardContent>

          <CardFooter className="p-12 pt-0">
             <Button 
               onClick={() => onSubscribe(plan.id, period)}
               disabled={isCurrent || isProcessing}
               className={cn(
                 "w-full h-18 rounded-[32px] text-lg font-black transition-all shadow-4xl group-hover:scale-105",
                 isCurrent 
                   ? "bg-slate-800 text-slate-400 border border-white/5 cursor-default" 
                   : plan.popular 
                     ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20" 
                     : "bg-white text-slate-900 hover:bg-slate-100 shadow-white/5"
               )}
             >
               {isCurrent ? tf.f02409 : isProcessing ? tf.f02410 : tf.f02411}
             </Button>
          </CardFooter>

          {/* Sparkle background decoration */}
          <Sparkles className="absolute -right-10 -bottom-10 w-40 h-40 text-white/5 pointer-events-none group-hover:scale-150 transition-transform duration-1000" />
       </Card>
    </motion.div>
  );
}

function ValueCard({ icon, title, desc }: any) {
  return (
    <div className="p-10 rounded-[40px] bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all group">
       <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-8 border border-white/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all transform group-hover:rotate-12">
          {icon}
       </div>
       <h4 className="text-lg font-black text-white mb-3 tracking-tight">{title}</h4>
       <p className="text-sm font-medium text-slate-500 leading-relaxed">{desc}</p>
    </div>
  );
}

function Row({ label, v1, v2, v3 }: any) {
  const render = (v: any, primary = false) => {
    if (typeof v === 'string') return <span className="text-[10px] font-black text-slate-500 italic">{v}</span>;
    return v ? (
      <div className={cn("mx-auto w-6 h-6 rounded-full flex items-center justify-center", primary ? "bg-indigo-600" : "bg-white/10")}>
         <Check className="w-3.5 h-3.5 text-white" />
      </div>
    ) : (
      <div className="mx-auto w-6 h-[1px] bg-white/5" />
    );
  };
  return (
    <tr className="hover:bg-white/5 transition-colors group">
       <td className="py-8 px-4 text-sm font-black text-slate-400 group-hover:text-white transition-colors">{label}</td>
       <td className="py-8 px-4 text-center">{render(v1)}</td>
       <td className="py-8 px-4 text-center">{render(v2)}</td>
       <td className="py-8 px-4 text-center">{render(v3, true)}</td>
    </tr>
  );
}
