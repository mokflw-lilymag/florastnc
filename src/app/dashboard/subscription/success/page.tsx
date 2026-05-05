"use client";
import { getMessages } from "@/i18n/getMessages";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState(tf.f00924);
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
        setMessage(tf.f00919);
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
            uiLocale: locale,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          setStatus("success");
          setMessage(tf.f00978);
          setTimeout(() => {
            router.push("/dashboard");
          }, 1500);
        } else {
          setStatus("error");
          setMessage(data.message || tf.f00916);
        }
      } catch (err) {
        setStatus("error");
        setMessage(tf.f01397);
      }
    };

    confirmPayment();
  }, [searchParams, router, locale]);

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
                <h1 className="text-2xl font-semibold text-slate-900">{tf.f00921}</h1>
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
                <h1 className="text-2xl font-semibold text-slate-900">{tf.f00914}</h1>
                <p className="text-slate-500">{message}</p>
              </div>
              <Button 
                onClick={() => router.push("/dashboard")}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                variant="default"
              >
                {tf.f01081}
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <div className="h-20 w-20 bg-red-50 rounded-full flex items-center justify-center">
                <XCircle className="h-10 w-10 text-red-500" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold text-slate-900">{tf.f00917}</h1>
                <p className="text-red-500 font-medium">{message}</p>
              </div>
              <div className="w-full space-y-3">
                <Button 
                  onClick={() => router.push("/dashboard/subscription")}
                  className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white"
                >
                  {tf.f00984}
                </Button>
                <Button 
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="w-full h-12 border-slate-200"
                >
                  {tf.f01060}
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
