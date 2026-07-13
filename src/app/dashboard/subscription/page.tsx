"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { loadTossPayments } from "@tosspayments/payment-sdk";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";
import { type Period, type PlanId } from "./plan-localized";
import { resolveBillingProvider, type SubscriptionBillingProvider } from "@/lib/subscription/billing-provider";
import { buildSubscriptionOrderId } from "@/lib/subscription/order-id";
import { BILLING_PERIODS } from "@/lib/subscription/subscription-period";
import type { GlobalDiscountSettings } from "@/lib/subscription/discount-helper";
import { PublicPricingView } from "@/components/pricing/PublicPricingView";
import { cn } from "@/lib/utils";
import { isAfter } from "date-fns";

export default function DashboardSubscriptionPage() {
  const { tenantId } = useAuth();
  const searchParams = useSearchParams();
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const supabase = createClient();

  const [tenantData, setTenantData] = useState<any>(null);
  const [discountSettings, setDiscountSettings] = useState<GlobalDiscountSettings | null>(null);
  const [operatingCountry, setOperatingCountry] = useState<string>("KR");
  const [billingProvider, setBillingProvider] = useState<SubscriptionBillingProvider>("toss");
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("12m");
  const [isProcessing, setIsProcessing] = useState(false);

  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || 'test_ck_D5akZmejPyb70ng83YXrb8zV7n9E';

  useEffect(() => {
    async function loadTenant() {
      if (!tenantId) return;
      const [{ data }, settingsRes, hqRes] = await Promise.all([
        supabase.from("tenants").select("*").eq("id", tenantId).maybeSingle(),
        supabase.from("system_settings").select("data").eq("tenant_id", tenantId).maybeSingle(),
        supabase.from("system_settings").select("data").eq("id", "hq").maybeSingle(),
      ]);
      setTenantData(data);
      if (hqRes.data?.data) {
        setDiscountSettings(hqRes.data.data as GlobalDiscountSettings);
      }

      const country = (settingsRes.data?.data as { country?: string } | null)?.country || "KR";
      setOperatingCountry(country);
      setBillingProvider(resolveBillingProvider(country));
    }
    loadTenant();
  }, [tenantId, supabase]);

  const handleSubscribe = async (planId: string, period: "1m" | "12m") => {
    if (!tenantId) {
      toast.error(pickUiText(baseLocale, "로그인 정보가 없습니다.", "No login info.", "Không có thông tin đăng nhập."));
      return;
    }

    setIsProcessing(true);

    try {
      if (billingProvider === "stripe") {
        const res = await fetch("/api/payments/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId, period, uiLocale: locale }),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.message || "Failed to initialize Stripe checkout");
        }
        if (json.url) {
          window.location.href = json.url as string;
          return;
        }
        throw new Error("Invalid response from Stripe checkout");
      }

      const tossPayments = await loadTossPayments(clientKey);
      const orderId = buildSubscriptionOrderId(tenantId, planId as PlanId, period);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      await tossPayments.requestBillingAuth("카드", {
        customerKey: user?.id || "anonymous",
        successUrl: `${window.location.origin}/dashboard/subscription/success?orderId=${orderId}`,
        failUrl: `${window.location.origin}/dashboard/subscription/fail`,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      toast.error("Payment failed", { description: msg });
      setIsProcessing(false);
    }
  };

  const currentPlan = tenantData?.plan || 'free';
  const isExpired = !tenantData?.subscription_end || !isAfter(new Date(tenantData.subscription_end), new Date());
  const activePlanId = isExpired ? 'free' : currentPlan;

  const trPeriod = (p: Period) => {
    if (baseLocale === "ko") return p === "1m" ? "월간 결제" : "연간 결제";
    if (baseLocale === "vi") return p === "1m" ? "Hàng tháng" : "Hàng năm";
    return p === "1m" ? "Monthly" : "Annually";
  };

  return (
    <div className="bg-[#fbf9f7] min-h-screen relative pb-32">
      <div className="container mx-auto px-6 pt-12 pb-6 max-w-6xl relative z-20">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-sm border border-slate-100 mb-8">
          <div>
            <h2 className="text-xl font-black text-[#006b5c] mb-1">
              {pickUiText(baseLocale, "내 구독 관리", "Manage Subscription", "Quản lý đăng ký")}
            </h2>
            <p className="text-sm text-slate-500 font-medium">
              {pickUiText(baseLocale, `현재 국가 설정: ${operatingCountry}`, `Operating Country: ${operatingCountry}`, `Quốc gia: ${operatingCountry}`)}
              {" · "}
              {billingProvider === "stripe" ? "USD (Stripe)" : "KRW (Toss Payments)"}
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="inline-flex bg-slate-100/80 p-1 rounded-full border border-slate-200">
              {BILLING_PERIODS.map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPeriod(p)}
                  className={cn(
                    "px-6 py-2 rounded-full text-sm font-bold transition-all",
                    selectedPeriod === p 
                      ? "bg-white text-[#006b5c] shadow-sm" 
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  {trPeriod(p)}
                  {p === "12m" && (
                    <span className="ml-2 text-[10px] text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full uppercase">
                      Save
                    </span>
                  )}
                </button>
              ))}
            </div>
            
            {tenantData?.auto_billing_enabled && !tenantData.cancel_at_period_end && (
              <button
                onClick={async () => {
                  if (!confirm(pickUiText(baseLocale, "정말 정기 결제를 해지하시겠습니까?", "Are you sure you want to cancel your subscription?"))) return;
                  try {
                    const res = await fetch("/api/payments/billing/cancel", { method: "POST" });
                    if (res.ok) window.location.reload();
                    else alert("Failed to cancel subscription.");
                  } catch (e) {}
                }}
                className="text-xs text-rose-500 font-bold px-4 py-2 hover:bg-rose-50 rounded-full transition-colors"
              >
                {pickUiText(baseLocale, "구독 해지", "Cancel Subscription")}
              </button>
            )}
            {tenantData?.cancel_at_period_end && (
              <span className="text-xs text-orange-500 font-bold px-4 py-2 bg-orange-50 rounded-full">
                {pickUiText(baseLocale, "해지 예약됨", "Cancellation scheduled")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Professional Info Banner */}
      <div className="container mx-auto px-6 max-w-6xl relative z-10 mb-4">
        {/* Key Message */}
        <div className="bg-gradient-to-r from-[#006b5c]/8 to-[#665590]/8 border border-[#006b5c]/20 rounded-3xl p-6 md:p-8 mb-5">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="flex-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#006b5c] bg-[#006b5c]/10 px-3 py-1 rounded-full inline-block mb-3">
                {pickUiText(baseLocale, "플랜 안내", "Plan Guide", "Hướng dẫn gói")}
              </span>
              <h3 className="text-xl md:text-2xl font-black text-slate-800 mb-2">
                {pickUiText(baseLocale, "모든 유료 플랜, 동일한 기능 제공", "All paid plans include the same features", "Tất cả gói trả phí có cùng tính năng")}
              </h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                {pickUiText(
                  baseLocale,
                  "미니 · 라이트 · 프로 · 프로 플러스 모두 동일한 기능을 제공합니다. 플랜 간 유일한 차이는 월 주문 등록 건수입니다.",
                  "Mini · Light · Pro · Pro Plus all have identical features. The only difference between plans is the monthly order limit.",
                  "Mini · Light · Pro · Pro Plus đều có tính năng giống nhau. Điểm khác biệt duy nhất là giới hạn đơn hàng mỗi tháng."
                )}
              </p>
            </div>
            <div className="flex gap-3 flex-shrink-0 flex-wrap">
              {([
                { name: "MINI", orders: "50", cls: "bg-slate-50 text-slate-700 border-slate-200" },
                { name: "LIGHT", orders: "100", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
                { name: "PRO", orders: "200", cls: "bg-violet-50 text-violet-800 border-violet-200" },
                { name: "PLUS", orders: "∞", cls: "bg-[#006b5c]/10 text-[#006b5c] border-[#006b5c]/30" },
              ] as const).map(({ name, orders, cls }) => (
                <div key={name} className={`flex flex-col items-center px-4 py-3 rounded-2xl border font-black text-center min-w-[64px] ${cls}`}>
                  <span className="text-[9px] uppercase tracking-widest mb-1 opacity-60">{name}</span>
                  <span className="text-2xl leading-none">{orders}</span>
                  <span className="text-[9px] mt-1 opacity-50">{pickUiText(baseLocale, "건/월", "orders/mo", "đơn/th")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          {([
            { icon: "🎀", ko: "리본 디자인 & 출력", en: "Ribbon Design & Print", vi: "In ruy băng" },
            { icon: "📦", ko: "주문 · 고객 관리", en: "Order & Customer Mgmt", vi: "Quản lý đơn & khách" },
            { icon: "📱", ko: "모바일 앱 지원", en: "Mobile App Support", vi: "Hỗ trợ app di động" },
            { icon: "📊", ko: "매출 · 재고 통계", en: "Sales & Inventory Stats", vi: "Thống kê doanh thu" },
            { icon: "🖨️", ko: "POS 프린터 연동", en: "POS Printer Integration", vi: "Tích hợp máy in POS" },
            { icon: "☁️", ko: "클라우드 사진 백업", en: "Cloud Photo Backup", vi: "Sao lưu ảnh cloud" },
            { icon: "👤", ko: "직원 계정 관리", en: "Staff Account Mgmt", vi: "Quản lý tài khoản" },
            { icon: "🔒", ko: "데이터 보안 & 백업", en: "Data Security & Backup", vi: "Bảo mật dữ liệu" },
          ] as const).map(({ icon, ko, en, vi }) => (
            <div key={ko} className="flex items-center gap-3 bg-white rounded-2xl border border-slate-100 px-4 py-3 shadow-sm hover:shadow-md transition-shadow">
              <span className="text-xl flex-shrink-0">{icon}</span>
              <span className="text-xs font-bold text-slate-700 leading-snug">{pickUiText(baseLocale, ko, en, vi)}</span>
            </div>
          ))}
        </div>
        <p className="text-center text-[11px] text-slate-400 font-semibold mb-2">
          ✓&nbsp;{pickUiText(baseLocale, "위 모든 기능은 유료 플랜에서 건수 제한 없이 사용 가능합니다", "All features above are available on every paid plan without restriction", "Tất cả tính năng đều khả dụng với mọi gói trả phí")}
        </p>
      </div>

      <div className={cn("transition-opacity duration-300 -mt-4", isProcessing ? "opacity-50 pointer-events-none" : "opacity-100")}>
        <PublicPricingView 
          locale={locale} 
          hqSettings={discountSettings} 
          isDashboard={true} 
          forceUseKrw={billingProvider !== "stripe"}
          selectedPeriod={selectedPeriod}
          currentPlanId={activePlanId}
          onSelectPlan={handleSubscribe}
        />

        {/* Feature Comparison Table - Light Theme */}
        <div className="container mx-auto px-6 max-w-5xl pb-32 -mt-10">
          <div className="text-center mb-12">
            <h3 className="text-2xl font-black text-[#006b5c]">
              {pickUiText(baseLocale, "플랜별 상세 기능 비교", "Compare Plan Features", "So sánh tính năng")}
            </h3>
            <p className="text-sm text-slate-500 mt-2 font-medium">
              {pickUiText(baseLocale, "나에게 딱 맞는 플랜을 선택하세요.", "Choose the right plan for you.", "Chọn gói phù hợp với bạn.")}
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="py-6 px-6 text-left font-black text-slate-600 w-[28%]">
                      {pickUiText(baseLocale, "지원 기능", "Features", "Tính năng")}
                    </th>
                    <th className="py-6 px-3 text-center font-black text-slate-500 text-xs">FREE</th>
                    <th className="py-6 px-3 text-center font-black text-[#006b5c] text-xs">MINI</th>
                    <th className="py-6 px-3 text-center font-black text-[#0077b6] text-xs">LIGHT</th>
                    <th className="py-6 px-3 text-center font-black text-[#665590] text-xs">PRO</th>
                    <th className="py-6 px-3 text-center font-black text-[#4a3580] text-xs">PRO+</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <TableRow
                    label={pickUiText(baseLocale, "월 주문 등록 건수", "Monthly Orders", "Đơn hàng/tháng")}
                    v1={pickUiText(baseLocale, "10건", "10", "10")}
                    v2={pickUiText(baseLocale, "50건", "50", "50")}
                    v3={pickUiText(baseLocale, "100건", "100", "100")}
                    v4={pickUiText(baseLocale, "200건", "200", "200")}
                    v5={pickUiText(baseLocale, "무제한", "Unlimited", "Không giới hạn")}
                  />
                  <TableRow
                    label={pickUiText(baseLocale, "기본 화원 및 리본 인쇄", "Basic Flora & Ribbon Printing", "In hoa & ruy băng cơ bản")}
                    v1={true} v2={true} v3={true} v4={true} v5={true}
                  />
                  <TableRow
                    label={pickUiText(baseLocale, "모바일/PC 지원", "Mobile/PC Support", "Hỗ trợ Mobile/PC")}
                    v1={true} v2={true} v3={true} v4={true} v5={true}
                  />
                  <TableRow
                    label={pickUiText(baseLocale, "AI 자동 파싱 (스마트 입력)", "AI Smart Parsing", "Phân tích AI tự động")}
                    v1={false} v2={true} v3={true} v4={true} v5={true}
                  />
                  <TableRow
                    label={pickUiText(baseLocale, "고객/재고/매출 통계", "Customer/Inventory/Sales Analytics", "Phân tích khách hàng/kho/doanh thu")}
                    v1={false} v2={true} v3={true} v4={true} v5={true}
                  />
                  <TableRow
                    label={pickUiText(baseLocale, "직원 계정 추가", "Add Staff Accounts", "Thêm tài khoản nhân viên")}
                    v1={false} v2={true} v3={true} v4={true} v5={true}
                  />
                  <TableRow
                    label={pickUiText(baseLocale, "사진 백업 및 클라우드 연동", "Photo Backup & Cloud", "Sao lưu ảnh & Cloud")}
                    v1={false} v2={true} v3={true} v4={true} v5={true}
                  />
                  <TableRow
                    label={pickUiText(baseLocale, "고객 지원", "Customer Support", "Hỗ trợ khách hàng")}
                    v1={pickUiText(baseLocale, "이메일+고객센터", "Email+Support", "Email+CSKH")}
                    v2={pickUiText(baseLocale, "이메일+고객센터", "Email+Support", "Email+CSKH")}
                    v3={pickUiText(baseLocale, "이메일+고객센터", "Email+Support", "Email+CSKH")}
                    v4={pickUiText(baseLocale, "이메일+고객센터", "Email+Support", "Email+CSKH")}
                    v5={pickUiText(baseLocale, "이메일+고객센터", "Email+Support", "Email+CSKH")}
                  />
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ─── 결제 전 필수 안내 ─── */}
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* 헤더 */}
          <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-5 flex items-center gap-3">
            <span className="text-xl">📋</span>
            <div>
              <h4 className="text-sm font-black text-white tracking-wide">
                {pickUiText(baseLocale, "결제 전 꼭 확인하세요", "Important Before You Subscribe", "Thông tin quan trọng trước khi đăng ký")}
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                {pickUiText(baseLocale, "구독 신청 전 아래 내용을 반드시 숙지해 주세요.", "Please read carefully before subscribing.", "Vui lòng đọc kỹ trước khi đăng ký.")}
              </p>
            </div>
          </div>

          <div className="p-6 space-y-5">

            {/* 자동결제 */}
            <div className="flex gap-4 p-4 rounded-2xl bg-blue-50 border border-blue-100">
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600 text-lg">💳</div>
              <div>
                <p className="text-sm font-black text-blue-800 mb-1">
                  {pickUiText(baseLocale, "자동 결제 안내", "Auto-Renewal", "Tự động gia hạn")}
                </p>
                <p className="text-xs text-blue-700 leading-relaxed">
                  {pickUiText(baseLocale,
                    "구독은 선택하신 주기(월간/연간)에 맞춰 자동으로 갱신됩니다. 갱신 전 언제든지 마이페이지에서 해지하실 수 있습니다.",
                    "Your subscription auto-renews on your chosen billing cycle. You can cancel anytime before the renewal date.",
                    "Gói của bạn tự động gia hạn theo chu kỳ đã chọn. Bạn có thể hủy bất cứ lúc nào trước ngày gia hạn."
                  )}
                </p>
              </div>
            </div>

            {/* 환불 정책 - 핵심: 월간/연간 분리 카드 */}
            <div className="rounded-2xl border border-orange-100 overflow-hidden">
              <div className="bg-orange-50 px-4 py-3 flex items-center gap-2 border-b border-orange-100">
                <span className="text-base">🔄</span>
                <p className="text-sm font-black text-orange-800">
                  {pickUiText(baseLocale, "환불 정책", "Refund Policy", "Chính sách hoàn tiền")}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-orange-100">
                {/* 월간 */}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-100 text-teal-700 tracking-wide">월간 결제</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {pickUiText(baseLocale,
                      "결제일로부터 7일 이내, 서비스 미사용 시 전액 환불 가능합니다.",
                      "Full refund within 7 days of payment if the service has not been used.",
                      "Hoàn tiền đầy đủ trong vòng 7 ngày nếu chưa sử dụng dịch vụ."
                    )}
                  </p>
                </div>
                {/* 연간 */}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-700 tracking-wide">연간 결제</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {billingProvider === "toss"
                      ? pickUiText(baseLocale,
                          "국내 전자상거래 등에서의 소비자보호에 관한 법률에 따라 처리됩니다. 환불이 불가한 경우, 잔여 구독 기간을 타 계정으로 승계할 수 있습니다.",
                          "Processed under Korean e-commerce consumer protection law. If a refund is unavailable, the remaining subscription period may be transferred to another account.",
                          "Xử lý theo luật bảo vệ người tiêu dùng thương mại điện tử Hàn Quốc. Nếu không thể hoàn tiền, thời gian còn lại có thể chuyển nhượng sang tài khoản khác."
                        )
                      : pickUiText(baseLocale,
                          "해외 결제는 결제 대행사(Stripe) 정책에 따라 처리됩니다. 환불이 불가한 경우, 잔여 구독 기간을 타 계정으로 승계할 수 있습니다.",
                          "International payments are processed under the PG provider's (Stripe) refund policy. If a refund is unavailable, the remaining subscription period may be transferred to another account.",
                          "Thanh toán quốc tế được xử lý theo chính sách hoàn tiền của PG (Stripe). Nếu không thể hoàn tiền, thời gian còn lại có thể chuyển nhượng."
                        )
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* 부가세 */}
            <div className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-slate-200 flex items-center justify-center flex-shrink-0 text-slate-600 text-lg">🧾</div>
              <div>
                <p className="text-sm font-black text-slate-700 mb-1">
                  {pickUiText(baseLocale,
                    billingProvider === "toss" ? "부가세(VAT) 안내" : "Tax Notice",
                    "Tax Notice",
                    "Thông báo thuế"
                  )}
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {billingProvider === "toss"
                    ? pickUiText(baseLocale,
                        "표시된 금액은 부가세(VAT 10%) 별도 금액입니다. 실제 결제 시 부가세가 추가되어 청구됩니다. 세금계산서가 필요하신 경우 고객센터로 문의해 주세요.",
                        "Prices shown are exclusive of 10% VAT. VAT will be added at checkout. For a VAT invoice, please contact support.",
                        "Giá hiển thị chưa bao gồm 10% VAT. VAT sẽ được thêm vào khi thanh toán."
                      )
                    : pickUiText(baseLocale,
                        "표시 금액은 미화(USD) 기준이며 현지 세금은 별도입니다. 거주 국가에 따라 세금이 적용될 수 있습니다.",
                        "Displayed prices are in USD and exclude local taxes. Taxes may apply based on your country of residence.",
                        "Giá hiển thị tính bằng USD và không bao gồm thuế địa phương."
                      )
                  }
                </p>
              </div>
            </div>

            {/* 플랜 변경 + 무료체험 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-slate-200 flex items-center justify-center flex-shrink-0 text-slate-600 text-lg">📅</div>
                <div>
                  <p className="text-sm font-black text-slate-700 mb-1">
                    {pickUiText(baseLocale, "플랜 변경", "Plan Changes", "Thay đổi gói")}
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {pickUiText(baseLocale,
                      "업그레이드는 즉시 적용되며, 다운그레이드는 현재 구독 기간 종료 후 적용됩니다.",
                      "Upgrades take effect immediately. Downgrades apply at the end of your current billing period.",
                      "Nâng cấp có hiệu lực ngay. Hạ cấp áp dụng sau khi kết thúc chu kỳ hiện tại."
                    )}
                  </p>
                </div>
              </div>
              <div className="flex gap-4 p-4 rounded-2xl bg-green-50 border border-green-100">
                <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0 text-green-600 text-lg">🎁</div>
                <div>
                  <p className="text-sm font-black text-green-800 mb-1">
                    {pickUiText(baseLocale, "1주일 무료 체험", "1-Week Free Trial", "Dùng thử 1 tuần")}
                  </p>
                  <p className="text-xs text-green-700 leading-relaxed">
                    {pickUiText(baseLocale,
                      "신규 가입 후 1주일간 AI 파싱을 제외한 모든 기능을 무료 체험하실 수 있습니다. 체험 후 플랜을 선택하지 않으시면 FREE 플랜으로 전환됩니다.",
                      "New users get a 1-week free trial (AI parsing excluded). If no plan is chosen after the trial, you'll be moved to the free plan.",
                      "Người dùng mới dùng thử 1 tuần (không bao gồm AI parsing). Sau thời gian thử, chuyển sang gói miễn phí."
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 푸터 문의 */}
          <div className="bg-slate-800 px-6 py-4 flex items-center gap-2">
            <span className="text-sm">✉️</span>
            <p className="text-xs text-slate-300 font-medium">
              {pickUiText(baseLocale,
                "결제·환불 문의: help@floxync.com  |  운영 시간: 평일 10:00 ~ 18:00 (주말·공휴일 제외)",
                "Billing & refund: help@floxync.com  |  Hours: Weekdays 10:00–18:00 KST",
                "Hỗ trợ: help@floxync.com  |  Giờ làm việc: Thứ 2–6, 10:00–18:00 KST"
              )}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}


function TableRow({ label, v1, v2, v3, v4, v5 }: {
  label: string;
  v1: boolean | string; v2: boolean | string; v3: boolean | string;
  v4: boolean | string; v5: boolean | string;
}) {
  const renderCell = (v: boolean | string, col: "free" | "mini" | "light" | "pro" | "plus") => {
    if (typeof v === "string") {
      const colorMap = {
        free:  "text-slate-400",
        mini:  "text-[#006b5c]",
        light: "text-[#0077b6]",
        pro:   "text-[#665590]",
        plus:  "text-[#4a3580] font-black",
      };
      return <span className={`text-[11px] font-bold ${colorMap[col]}`}>{v}</span>;
    }
    if (v) {
      const bgMap = {
        free:  "bg-slate-100 text-slate-400",
        mini:  "bg-[#006b5c]/10 text-[#006b5c]",
        light: "bg-[#0077b6]/10 text-[#0077b6]",
        pro:   "bg-[#665590]/10 text-[#665590]",
        plus:  "bg-[#4a3580]/10 text-[#4a3580]",
      };
      return (
        <div className={cn("mx-auto w-6 h-6 rounded-full flex items-center justify-center", bgMap[col])}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    }
    return <div className="mx-auto w-4 h-[2px] bg-slate-200 rounded-full" />;
  };

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="py-4 px-6 font-semibold text-slate-700 text-sm">{label}</td>
      <td className="py-4 px-3 text-center">{renderCell(v1, "free")}</td>
      <td className="py-4 px-3 text-center">{renderCell(v2, "mini")}</td>
      <td className="py-4 px-3 text-center">{renderCell(v3, "light")}</td>
      <td className="py-4 px-3 text-center">{renderCell(v4, "pro")}</td>
      <td className="py-4 px-3 text-center">{renderCell(v5, "plus")}</td>
    </tr>
  );
}
