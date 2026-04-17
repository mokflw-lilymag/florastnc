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

interface OrderPolicySettingsProps {
  settings: SystemSettings;
  saveSettings: (newSettings: SystemSettings) => Promise<boolean>;
}

export function OrderPolicySettings({ settings, saveSettings }: OrderPolicySettingsProps) {
  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm ring-1 ring-slate-200">
        <CardHeader>
          <div className="flex items-center gap-2 text-violet-600 mb-1">
            <Coins className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Loyalty & Revenue Policy</span>
          </div>
          <CardTitle>포인트 및 매출 인식 설정</CardTitle>
          <CardDescription>포인트 발생 정책과 매출을 집계하는 기준을 설정합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4 p-5 rounded-2xl border-2 border-slate-100 bg-slate-50/10 mb-2">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-bold flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-emerald-600" /> 매출 집계 기준 (Revenue Recognition)
                </Label>
                <p className="text-[11px] text-slate-500">대시보드 차트와 보고서에서 매출로 잡는 기준을 결정합니다.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button 
                variant={settings.revenueRecognitionBasis === 'order_date' ? 'default' : 'outline'}
                className={cn(
                  "h-20 flex-col gap-2 rounded-2xl border-2 transition-all",
                  settings.revenueRecognitionBasis === 'order_date' ? "bg-slate-900 text-white" : "border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                )}
                onClick={() => saveSettings({...settings, revenueRecognitionBasis: 'order_date'})}
              >
                <Building2 className="h-5 w-5" />
                <div className="flex flex-col items-center">
                  <span className="text-sm font-bold">당일 주문일 기준</span>
                  <span className="text-[10px] opacity-70">주문이 생성되면 매출로 인정</span>
                </div>
              </Button>
              <Button 
                variant={settings.revenueRecognitionBasis === 'payment_completed' ? 'default' : 'outline'}
                className={cn(
                  "h-20 flex-col gap-2 rounded-2xl border-2 transition-all",
                  settings.revenueRecognitionBasis === 'payment_completed' ? "bg-slate-900 text-white" : "border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                )}
                onClick={() => saveSettings({...settings, revenueRecognitionBasis: 'payment_completed'})}
              >
                <CreditCard className="h-5 w-5" />
                <div className="flex flex-col items-center">
                  <span className="text-sm font-bold">결제 완료 기준</span>
                  <span className="text-[10px] opacity-70">결제 완료된 주문만 매출로 인정</span>
                </div>
              </Button>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
            <div className="space-y-3 p-4 rounded-xl bg-violet-50/50 border border-violet-100">
              <Label className="text-violet-900">기본 포인트 적립률 (%)</Label>
              <div className="flex items-center gap-3">
                <Input 
                  type="number" 
                  className="text-lg font-bold" 
                  value={settings.pointRate} 
                  onChange={e => saveSettings({...settings, pointRate: parseFloat(e.target.value) || 0})}
                />
                <span className="font-medium text-slate-500">%</span>
              </div>
              <p className="text-xs text-violet-600">결제 금액의 {settings.pointRate}%가 자동 적립됩니다.</p>
            </div>
            <div className="space-y-3 p-4 rounded-xl bg-slate-50/50 border border-slate-200">
              <Label>최소 사용 가능 포인트</Label>
              <div className="flex items-center gap-3">
                <Input 
                  type="number" 
                  className="text-lg font-bold" 
                  value={settings.minPointUsage} 
                  onChange={e => saveSettings({...settings, minPointUsage: parseInt(e.target.value) || 0})}
                />
                <span className="font-medium text-slate-500">P</span>
              </div>
              <p className="text-xs text-slate-500">{settings.minPointUsage.toLocaleString()} P 이상부터 사용 가능합니다.</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <Label className="text-sm font-bold flex items-center gap-2">
              <Percent className="h-4 w-4 text-emerald-600" /> 자주 사용하는 할인율
            </Label>
            <div className="flex flex-wrap gap-2">
              {settings.discountRates.map((rate, idx) => (
                <Badge 
                  key={idx} 
                  variant="secondary" 
                  className="px-4 py-1.5 text-sm gap-2 hover:bg-rose-50 hover:text-rose-600 cursor-default group transition-colors"
                >
                  {rate}%
                  <Trash2 className="h-3 w-3 hidden group-hover:block cursor-pointer" onClick={() => {
                    const newRates = settings.discountRates.filter((_, i) => i !== idx);
                    saveSettings({...settings, discountRates: newRates});
                  }} />
                </Badge>
              ))}
              <div className="flex items-center gap-2 ml-2">
                 <Input 
                    placeholder="추가 %" 
                    className="w-20 h-8 text-xs" 
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
            <p className="text-xs text-slate-500">주문 화면에서 위 항목들이 퀵 버튼으로 노출됩니다.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
