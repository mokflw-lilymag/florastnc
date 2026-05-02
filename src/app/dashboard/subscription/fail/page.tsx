"use client";
import { getMessages } from "@/i18n/getMessages";

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
  const tf = getMessages(locale).tenantFlows;
  const baseLocale = toBaseLocale(locale);  const code = searchParams.get("code");
  const message = searchParams.get("message") || tf.f00920;

  return (
    <div className="min-h-screen bg-slate-50/50 flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-8 border-none shadow-2xl bg-white/80 backdrop-blur-xl">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="h-20 w-20 bg-red-50 rounded-full flex items-center justify-center">
            <XCircle className="h-10 w-10 text-red-500 shadow-sm" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{tf.f00928}</h1>
            <div className="p-4 bg-red-50/50 rounded-xl border border-red-100 flex items-start space-x-3 text-left">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-900">{tf.f01609}</p>
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
              {tf.f00977}
            </Button>
            <Button 
              onClick={() => router.push("/dashboard")}
              variant="outline"
              className="w-full h-12 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              {tf.f01024}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
