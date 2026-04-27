"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";

export default function PaymentFailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const tr = (koText: string, enText: string) => (baseLocale === "ko" ? koText : enText);
  const code = searchParams.get("code");
  const message = searchParams.get("message") || tr("결제 중 오류가 발생했습니다.", "An error occurred during payment.");

  return (
    <div className="min-h-screen bg-slate-50/50 flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-8 border-none shadow-2xl bg-white/80 backdrop-blur-xl">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="h-20 w-20 bg-red-50 rounded-full flex items-center justify-center">
            <XCircle className="h-10 w-10 text-red-500 shadow-sm" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{tr("결제에 실패했습니다", "Payment failed")}</h1>
            <div className="p-4 bg-red-50/50 rounded-xl border border-red-100 flex items-start space-x-3 text-left">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-900">{tr("오류 메시지:", "Error message:")}</p>
                <p className="text-sm text-red-700 leading-relaxed">{message}</p>
                {code && <p className="text-[10px] text-red-400 mt-1 uppercase font-mono tracking-wider">Error Code: {code}</p>}
              </div>
            </div>
          </div>

          <div className="w-full pt-4 space-y-3">
            <Button 
              onClick={() => router.push("/dashboard/subscription")}
              className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/10 transition-all font-medium"
            >
              {tr("구독 신청 다시하기", "Retry subscription")}
            </Button>
            <Button 
              onClick={() => router.push("/dashboard")}
              variant="outline"
              className="w-full h-12 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              {tr("나중에 하기", "Maybe later")}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
