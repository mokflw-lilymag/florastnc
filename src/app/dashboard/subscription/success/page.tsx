"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const tr = (koText: string, enText: string) => (baseLocale === "ko" ? koText : enText);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState(tr("결제를 확인하고 있습니다...", "Checking payment..."));
  const confirmedRef = useRef(false);

  useEffect(() => {
    const confirmPayment = async () => {
      if (confirmedRef.current) return;
      confirmedRef.current = true;

      const paymentKey = searchParams.get("paymentKey");
      const orderId = searchParams.get("orderId");
      const amount = searchParams.get("amount");

      if (!paymentKey || !orderId || !amount) {
        setStatus("error");
        setMessage(tr("결제 정보가 부족합니다.", "Missing payment information."));
        return;
      }

      try {
        const response = await fetch("/api/payments/confirm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount: Number(amount),
          }),
        });

        const data = await response.json();

        if (response.ok) {
          setStatus("success");
          setMessage(tr("구독 신청이 완료되었습니다! 1초 후 대시보드로 이동합니다.", "Subscription completed! Redirecting to dashboard in 1 second."));
          setTimeout(() => {
            router.push("/dashboard");
          }, 1500);
        } else {
          setStatus("error");
          setMessage(data.message || tr("결제 승인 중 오류가 발생했습니다.", "An error occurred while confirming payment."));
        }
      } catch (err) {
        setStatus("error");
        setMessage(tr("서버와 통신 중 오류가 발생했습니다.", "A server communication error occurred."));
      }
    };

    confirmPayment();
  }, [searchParams, router, baseLocale]);

  return (
    <div className="min-h-screen bg-slate-50/50 flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-8 border-none shadow-2xl bg-white/80 backdrop-blur-xl">
        <div className="flex flex-col items-center text-center space-y-6">
          {status === "loading" && (
            <>
              <div className="h-20 w-20 bg-blue-50 rounded-full flex items-center justify-center">
                <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold text-slate-900">{tr("결제 처리 중", "Processing payment")}</h1>
                <p className="text-slate-500">{message}</p>
              </div>
            </>
          )}

          {status === "success" && (
            <>
              <div className="h-20 w-20 bg-emerald-50 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold text-slate-900">{tr("결제 성공", "Payment success")}</h1>
                <p className="text-slate-500">{message}</p>
              </div>
              <Button 
                onClick={() => router.push("/dashboard")}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                variant="default"
              >
                {tr("대시보드로 가기", "Go to dashboard")}
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <div className="h-20 w-20 bg-red-50 rounded-full flex items-center justify-center">
                <XCircle className="h-10 w-10 text-red-500" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold text-slate-900">{tr("결제 실패", "Payment failed")}</h1>
                <p className="text-red-500 font-medium">{message}</p>
              </div>
              <div className="w-full space-y-3">
                <Button 
                  onClick={() => router.push("/dashboard/subscription")}
                  className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white"
                >
                  {tr("구독 페이지로 돌아가기", "Back to subscription")}
                </Button>
                <Button 
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="w-full h-12 border-slate-200"
                >
                  {tr("다시 시도", "Try again")}
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
