"use client";

import { Building2, CreditCard, Coins, RefreshCw, Percent, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { SystemSettings } from "@/hooks/use-settings";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";

interface OrderPolicySettingsProps {
  settings: SystemSettings;
  saveSettings: (newSettings: SystemSettings) => Promise<boolean>;
}

export function OrderPolicySettings({ settings, saveSettings }: OrderPolicySettingsProps) {
  const locale = usePreferredLocale();
  const isKo = toBaseLocale(locale) === "ko";
  const tr = (ko: string, en: string) => (isKo ? ko : en);
  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg ring-1 ring-slate-200 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white pb-8">
          <div className="flex items-center gap-2 mb-2 opacity-90">
            <Coins className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Loyalty & Marketing Policy</span>
          </div>
          <CardTitle className="text-2xl font-black">{tr("주문 할인 및 포인트 설정", "Order Discounts & Points")}</CardTitle>
          <CardDescription className="text-violet-100 opacity-80">
            {tr("고객의 재방문을 유도하는 포인트 제도와 효율적인 할인 정책을 관리합니다.", "Manage loyalty points and discount policies to increase repeat visits.")}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-10 p-8 -mt-4 bg-white rounded-t-[2rem]">
          {/* 1. 포인트 정책 섹션 */}
          <div className="space-y-6 pt-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">
                <Coins size={18} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">{tr("포인트 적립 및 사용 정책", "Point Earning & Usage Policy")}</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="group space-y-3 p-6 rounded-2xl bg-violet-50/50 border border-violet-100 hover:border-violet-300 transition-all shadow-sm">
                <div className="flex items-center justify-between">
                  <Label className="text-violet-900 font-bold text-sm">{tr("기본 포인트 적립률 (%)", "Default Point Rate (%)")}</Label>
                  <Badge className="bg-violet-600">{tr("마케팅 효과UP", "Marketing Boost")}</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <Input 
                    type="number" 
                    className="text-xl font-black text-violet-700 bg-white border-violet-200 focus-visible:ring-violet-500 h-12" 
                    value={settings.pointRate} 
                    onChange={e => saveSettings({...settings, pointRate: parseFloat(e.target.value) || 0})}
                  />
                  <span className="font-black text-violet-400 text-lg">%</span>
                </div>
                <p className="text-xs text-violet-600/70 font-medium leading-relaxed">
                  {tr("결제 금액의", "Automatically earn")} <span className="font-bold underline">{settings.pointRate}%</span> {tr("가 고객님께 자동으로 적립됩니다.", "of payment amount as points.")}
                </p>
              </div>

              <div className="group space-y-3 p-6 rounded-2xl bg-slate-50/50 border border-slate-200 hover:border-slate-300 transition-all shadow-sm">
                <Label className="text-slate-900 font-bold text-sm">{tr("최소 사용 가능 포인트", "Minimum Redeemable Points")}</Label>
                <div className="flex items-center gap-3">
                  <Input 
                    type="number" 
                    className="text-xl font-black text-slate-700 bg-white h-12" 
                    value={settings.minPointUsage} 
                    onChange={e => saveSettings({...settings, minPointUsage: parseInt(e.target.value) || 0})}
                  />
                  <span className="font-black text-slate-400 text-lg">P</span>
                </div>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  {tr("누적 포인트가", "Points can be used like cash only when balance is at least")} <span className="font-bold text-slate-900">{settings.minPointUsage.toLocaleString()} P</span>.
                </p>
              </div>
            </div>
          </div>

          <Separator className="bg-slate-100" />

          {/* 2. 할인 버튼 섹션 */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Percent size={18} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">{tr("자주 사용하는 할인율 (퀵 버튼)", "Frequently Used Discount Rates (Quick Buttons)")}</h3>
            </div>

            <div className="p-8 rounded-3xl bg-emerald-50/30 border border-emerald-100/50">
              <div className="flex flex-wrap gap-3 mb-6">
                {settings.discountRates.map((rate, idx) => (
                  <Badge 
                    key={idx} 
                    variant="secondary" 
                    className="px-5 py-2.5 text-base font-black bg-white text-emerald-700 border-emerald-100 shadow-sm hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 cursor-default group transition-all rounded-xl"
                  >
                    {rate}%
                    <Trash2 
                      className="h-4 w-4 ml-2 hidden group-hover:block cursor-pointer animate-in fade-in zoom-in" 
                      onClick={() => {
                        const newRates = settings.discountRates.filter((_, i) => i !== idx);
                        saveSettings({...settings, discountRates: newRates});
                      }} 
                    />
                  </Badge>
                ))}
                <div className="flex items-center gap-2">
                   <Input 
                      placeholder={tr("추가 %", "Add %")} 
                      className="w-24 h-11 text-sm font-bold border-emerald-200 focus-visible:ring-emerald-500" 
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const val = parseInt((e.target as HTMLInputElement).value);
                          if (!isNaN(val)) {
                            saveSettings({...settings, discountRates: [...settings.discountRates, val].sort((a,b) => a-b)});
                            (e.target as HTMLInputElement).value = "";
                          }
                        }
                      }}
                   />
                </div>
              </div>
              <p className="text-xs text-emerald-700 font-medium bg-white/50 p-3 rounded-lg border border-emerald-100/50 inline-block">
                {tr("💡 주문 등록 화면에서 이 할인율들이 단축 버튼으로 노출되어 빠른 업무 처리가 가능해집니다.", "💡 These rates appear as quick buttons on the order screen for faster processing.")}
              </p>
            </div>
          </div>

          <Separator className="bg-slate-100" />

          {/* 3. 매출 집계 기준 섹션 (맨 아래로 이동) */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <RefreshCw size={18} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">{tr("매출 집계 기준 설정", "Revenue Recognition Basis")}</h3>
            </div>

            <div className="p-6 rounded-2xl border-2 border-slate-100 bg-slate-50/10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  variant={settings.revenueRecognitionBasis === 'order_date' ? 'default' : 'outline'}
                  className={cn(
                    "h-24 flex-col gap-2 rounded-2xl border-2 transition-all group",
                    settings.revenueRecognitionBasis === 'order_date' 
                      ? "bg-slate-900 text-white shadow-lg shadow-slate-200" 
                      : "border-slate-100 hover:border-blue-200 text-slate-600 hover:bg-blue-50/30"
                  )}
                  onClick={() => saveSettings({...settings, revenueRecognitionBasis: 'order_date'})}
                >
                  <div className={cn("p-2 rounded-lg", settings.revenueRecognitionBasis === 'order_date' ? "bg-white/10" : "bg-slate-100 group-hover:bg-blue-100")}>
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-base font-black">{tr("당일 주문일 기준", "Order Date Basis")}</span>
                    <span className="text-[10px] opacity-70">{tr("주문서가 생성된 날짜를 매출로 집계", "Recognize revenue on order creation date")}</span>
                  </div>
                </Button>
                <Button 
                  variant={settings.revenueRecognitionBasis === 'payment_completed' ? 'default' : 'outline'}
                  className={cn(
                    "h-24 flex-col gap-2 rounded-2xl border-2 transition-all group",
                    settings.revenueRecognitionBasis === 'payment_completed' 
                      ? "bg-slate-900 text-white shadow-lg shadow-slate-200" 
                      : "border-slate-100 hover:border-blue-200 text-slate-600 hover:bg-blue-50/30"
                  )}
                  onClick={() => saveSettings({...settings, revenueRecognitionBasis: 'payment_completed'})}
                >
                  <div className={cn("p-2 rounded-lg", settings.revenueRecognitionBasis === 'payment_completed' ? "bg-white/10" : "bg-slate-100 group-hover:bg-blue-100")}>
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-base font-black">{tr("결제 완료 기준", "Payment Completed Basis")}</span>
                    <span className="text-[10px] opacity-70">{tr("실제로 돈이 들어온 시점을 매출로 집계", "Recognize revenue when payment is completed")}</span>
                  </div>
                </Button>
              </div>
              <div className="mt-6 flex items-start gap-3 p-4 bg-blue-50/50 rounded-xl border border-blue-100/50 text-xs text-blue-700 leading-relaxed">
                <span className="text-base">ℹ️</span>
                <p>
                  {tr("이 설정은 대시보드 차트와 보고서, 일일 마감 통계에 반영됩니다. 화원 운영 정책에 맞춰 주문 시점 혹은 결제 완료 시점 중 하나를 선택해 주세요.", "This setting affects dashboard charts, reports, and daily closing stats. Choose order time or payment completion to match your operation policy.")}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


