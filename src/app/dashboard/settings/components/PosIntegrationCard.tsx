"use client";

import { CreditCard, Settings as SettingsIcon, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";

interface PosIntegrationCardProps {
  posIntegration?: any;
  isLoading?: boolean;
}

export function PosIntegrationCard({ posIntegration, isLoading }: PosIntegrationCardProps) {
  const locale = usePreferredLocale();
  const isKo = toBaseLocale(locale) === "ko";
  const tr = (ko: string, en: string) => (isKo ? ko : en);
  const isEasyCheckActive = posIntegration?.pos_type === 'easycheck' && posIntegration?.is_active;
  const isTossActive = posIntegration?.pos_type === 'toss' && posIntegration?.is_active;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label className="text-sm font-bold flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-orange-600" /> {tr("오프라인 POS 연동 (이지체크/토스)", "Offline POS Integration (EasyCheck/Toss)")}
          </Label>
          <p className="text-xs text-slate-500">{tr("포스기에서 결제 시 자동으로 주문을 생성하고 포인트를 적립합니다.", "Create orders and points automatically from POS payments.")}</p>
        </div>
        <Link href="/dashboard/settings/pos">
          <Button size="sm" variant="outline" className="gap-2 rounded-xl border-orange-200 text-orange-600 hover:bg-orange-50">
            <SettingsIcon className="h-3 w-3" /> {tr("상세 설정", "Details")}
          </Button>
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-2 h-24 border border-dashed rounded-2xl flex items-center justify-center bg-slate-50/50">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400 mr-2" />
            <span className="text-xs text-slate-400">{tr("데이터를 불러오는 중...", "Loading data...")}</span>
          </div>
        ) : (
          <>
            <div className={cn(
              "p-4 rounded-2xl border flex items-center justify-between transition-all",
              isEasyCheckActive ? "bg-orange-50/30 border-orange-200" : "bg-slate-50/30 border-slate-200 opacity-60"
            )}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <CheckCircle2 className={cn("h-4 w-4", isEasyCheckActive ? "text-emerald-500" : "text-slate-300")} />
                </div>
                <div>
                  <p className="text-xs font-bold">이지체크 (EasyCheck)</p>
                  <p className="text-[10px] text-slate-400">{isEasyCheckActive ? tr('웹훅 연동 활성화됨', 'Webhook active') : tr('연동 정보 없음', 'No integration info')}</p>
                </div>
              </div>
              {isEasyCheckActive ? (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">{tr("연결됨", "Connected")}</Badge>
              ) : (
                <Badge variant="outline" className="text-slate-400">{tr("미연결", "Not connected")}</Badge>
              )}
            </div>
            
            <div className={cn(
              "p-4 rounded-2xl border flex items-center justify-between transition-all",
              isTossActive ? "bg-blue-50/30 border-blue-200" : "bg-slate-50/30 border-slate-200 opacity-60"
            )}>
               <div className="flex items-center gap-3">
                 <div className="p-2 bg-white rounded-lg shadow-sm">
                   <CheckCircle2 className={cn("h-4 w-4", isTossActive ? "text-emerald-500" : "text-slate-300")} />
                 </div>
                 <div>
                   <p className="text-xs font-bold">토스 POS (Toss)</p>
                   <p className="text-[10px] text-slate-400">{isTossActive ? tr('연동 활성화됨', 'Integration active') : tr('연동 정보 없음', 'No integration info')}</p>
                 </div>
               </div>
               {isTossActive ? (
                 <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">{tr("연결됨", "Connected")}</Badge>
               ) : (
                 <Badge variant="outline" className="text-slate-400">{tr("미연결", "Not connected")}</Badge>
               )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
