"use client";
import { getMessages } from "@/i18n/getMessages";

import { CreditCard, Settings as SettingsIcon, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";
import { usePosConnection } from "@/hooks/use-pos-connection";
import {
  getPosConnectionLabel,
  resolvePosConnectionStatus,
} from "@/lib/pos/pos-connection-status";

interface PosIntegrationCardProps {
  posIntegration?: any;
  isLoading?: boolean;
}

export function PosIntegrationCard({ posIntegration, isLoading }: PosIntegrationCardProps) {
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const baseLocale = toBaseLocale(locale);
  const { status: liveStatus, bridgeOnline, loading: connectionLoading } = usePosConnection(0);

  const tr = (
    ko: string,
    en: string,
    vi?: string,
    ja?: string,
    zh?: string,
    es?: string,
    pt?: string,
    fr?: string,
    de?: string,
    ru?: string,
  ) => pickUiText(baseLocale, ko, en, vi, ja, zh, es, pt, fr, de, ru);

  const status = posIntegration
    ? resolvePosConnectionStatus(posIntegration, { bridgeOnline })
    : liveStatus;

  const isEasyCheck = posIntegration?.pos_type === "easycheck";
  const isToss = posIntegration?.pos_type === "toss";
  const showLoading = isLoading || connectionLoading;

  const connectionBadge = () => {
    if (status.connectionState === "connected") {
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
          {getPosConnectionLabel("connected")}
        </Badge>
      );
    }
    if (status.connectionState === "pending") {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
          {getPosConnectionLabel("pending")}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-slate-400">
        {tf.f01220}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label className="text-sm font-bold flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-orange-600" /> {tf.f01611}
          </Label>
          <p className="text-xs text-slate-500">{tf.f02106}</p>
          {status.reason && status.connectionState === "pending" && (
            <p className="text-[11px] text-amber-700 leading-snug">{status.reason}</p>
          )}
          {status.isConnected && (
            <p className="text-[11px] text-emerald-700">
              {tr(
                "카드 결제·현금영수증 등 단말 연동 기능을 사용할 수 있습니다.",
                "Terminal features (card payment, cash receipts) are available.",
              )}
            </p>
          )}
          {status.isEnabled && !status.isConnected && (
            <p className="text-[11px] text-slate-500">
              {tr(
                "활성화만 된 상태입니다. 카드 단말 승인·현금영수증 발행은 연동 완료 후 사용됩니다.",
                "Enabled in settings only — card terminal and cash receipts work after full connection.",
              )}
            </p>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled
          className="gap-2 rounded-xl border-slate-200 text-slate-400 cursor-not-allowed"
        >
          <SettingsIcon className="h-3 w-3" /> {tf.f01340}
          <Badge
            variant="secondary"
            className="ml-1 bg-slate-100 text-slate-500 font-bold text-[9px] border-none shadow-none"
          >
            {tr("준비중", "Coming soon")}
          </Badge>
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {showLoading ? (
          <div className="col-span-2 h-24 border border-dashed rounded-2xl flex items-center justify-center bg-slate-50/50">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400 mr-2" />
            <span className="text-xs text-slate-400">{tf.f00157}</span>
          </div>
        ) : (
          <>
            <div className={cn(
              "p-4 rounded-2xl border flex items-center justify-between transition-all",
              isEasyCheck && status.isConnected ? "bg-orange-50/30 border-orange-200" : "bg-slate-50/30 border-slate-200 opacity-80"
            )}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  {isEasyCheck && status.isConnected ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-slate-300" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold">
                    {tr("이지체크 (EasyCheck)", "EasyCheck")}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {isEasyCheck
                      ? status.isConnected
                        ? tf.f01651
                        : tr("설정됨 · Webhook 미수신", "Configured · no webhook yet")
                      : tf.f01571}
                  </p>
                </div>
              </div>
              {isEasyCheck ? connectionBadge() : (
                <Badge variant="outline" className="text-slate-400">{tf.f01220}</Badge>
              )}
            </div>
            
            <div className={cn(
              "p-4 rounded-2xl border flex items-center justify-between transition-all",
              isToss && status.isConnected ? "bg-blue-50/30 border-blue-200" : "bg-slate-50/30 border-slate-200 opacity-80"
            )}>
               <div className="flex items-center gap-3">
                 <div className="p-2 bg-white rounded-lg shadow-sm">
                   {isToss && status.isConnected ? (
                     <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                   ) : (
                     <AlertCircle className="h-4 w-4 text-slate-300" />
                   )}
                 </div>
                 <div>
                   <p className="text-xs font-bold">
                     {tr("토스 POS (Toss)", "Toss POS")}
                   </p>
                   <p className="text-[10px] text-slate-400">
                     {isToss
                       ? status.isConnected
                         ? tf.f01574
                         : tr("설정됨 · Webhook 미수신", "Configured · no webhook yet")
                       : tf.f01571}
                   </p>
                 </div>
               </div>
               {isToss ? connectionBadge() : (
                 <Badge variant="outline" className="text-slate-400">{tf.f01220}</Badge>
               )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
