"use client";
import { getMessages } from "@/i18n/getMessages";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";
import { format } from "date-fns";
import { dateFnsLocaleForBase } from "@/lib/date-fns-locale";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const dfLoc = dateFnsLocaleForBase(baseLocale);
  const tf = getMessages(locale).tenantFlows;
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState(tf.f00924);
  const [detail, setDetail] = useState<string | null>(null);
  const confirmedRef = useRef(false);

  const successDetail = (monthsGranted?: number, expiry?: string) => {
    const parts: string[] = [];
    if (monthsGranted && monthsGranted > 0) {
      parts.push(
        pickUiText(
          baseLocale,
          `${monthsGranted}개월 이용권이 적용되었습니다.`,
          `${monthsGranted} months of access have been applied.`,
          `Đã cấp ${monthsGranted} tháng sử dụng.`,
          `${monthsGranted}ヶ月分の利用権が適用されました。`,
          `已开通 ${monthsGranted} 个月使用权。`,
        ),
      );
    }
    if (expiry) {
      const expiryLabel = format(new Date(expiry), "PPP", { locale: dfLoc });
      parts.push(
        pickUiText(
          baseLocale,
          `이용 만료일: ${expiryLabel}`,
          `Valid until: ${expiryLabel}`,
          `Hết hạn: ${expiryLabel}`,
          `利用期限: ${expiryLabel}`,
          `到期日: ${expiryLabel}`,
        ),
      );
    }
    return parts.length > 0 ? parts.join(" ") : null;
  };

  useEffect(() => {
    const confirmPayment = async () => {
      if (confirmedRef.current) return;
      confirmedRef.current = true;

      const provider = searchParams.get("provider");
      const sessionId = searchParams.get("session_id");

      try {
        if (provider === "stripe" && sessionId) {
          const response = await fetch("/api/payments/stripe/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId, uiLocale: locale }),
          });
          const data = await response.json();
          if (response.ok) {
            setStatus("success");
            setMessage(tf.f00978);
            setDetail(successDetail(data.monthsGranted, data.expiry));
            setTimeout(() => router.push("/dashboard"), 2500);
          } else {
            setStatus("error");
            setMessage(data.message || tf.f00916);
          }
          return;
        }

        const paymentKey = searchParams.get("paymentKey");
        const orderId = searchParams.get("orderId");
        const amount = searchParams.get("amount");

        if (!paymentKey || !orderId || !amount) {
          setStatus("error");
          setMessage(tf.f00919);
          return;
        }

        const response = await fetch("/api/payments/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
          setDetail(successDetail(data.monthsGranted, data.expiry));
          setTimeout(() => router.push("/dashboard"), 2500);
        } else {
          setStatus("error");
          setMessage(data.message || tf.f00916);
        }
      } catch {
        setStatus("error");
        setMessage(tf.f01397);
      }
    };

    confirmPayment();
  }, [searchParams, router, locale, tf.f00919, tf.f00978, tf.f00916, tf.f01397, baseLocale, dfLoc]);

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
                {detail && (
                  <p className="text-sm font-medium text-emerald-700 bg-emerald-50 rounded-xl px-4 py-3">
                    {detail}
                  </p>
                )}
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
