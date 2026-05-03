"use client";

import { getMessages } from "@/i18n/getMessages";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";
import { ShieldAlert, ArrowLeft, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";

interface AccessDeniedProps {
  requiredTier: "Ribbon" | "ERP" | "Pro" | "System Admin";
}

export function AccessDenied({ requiredTier }: AccessDeniedProps) {
  const router = useRouter();
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const baseLocale = toBaseLocale(locale);
  const tierLabel =
    requiredTier === "Ribbon"
      ? pickUiText(baseLocale, "리본", "Ribbon", "Ruy băng")
      : requiredTier === "ERP"
        ? pickUiText(baseLocale, "ERP", "ERP", "ERP")
        : requiredTier === "Pro"
          ? pickUiText(baseLocale, "PRO", "Pro", "Pro")
          : pickUiText(baseLocale, "시스템 관리자", "System admin", "Quản trị hệ thống");

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-md w-full border-red-100 dark:border-red-900/30 shadow-xl overflow-hidden">
        <div className="h-2 bg-red-500" />
        <CardHeader className="text-center pb-2">
          <div className="mx-auto bg-red-50 dark:bg-red-900/20 p-3 rounded-full w-fit mb-4">
            <ShieldAlert className="h-10 w-10 text-red-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">{tf.f02469}</CardTitle>
          <CardDescription className="text-slate-500 mt-2">
            {tf.f02470}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {(() => {
              const parts = tf.f02471.split("{tier}");
              const before = parts[0] ?? "";
              const after = parts[1] ?? "";
              return (
                <>
                  {before}
                  <span className="font-bold text-slate-900 dark:text-white underline decoration-red-500/30 decoration-2">
                    {tierLabel}
                  </span>
                  {after}
                </>
              );
            })()}
          </p>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 text-xs text-left text-slate-500 border border-slate-100 dark:border-slate-800">
            <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <CreditCard className="h-3 w-3" /> {tf.f02472}
            </p>
            <ul className="list-disc list-inside space-y-1 ml-1">
              <li>{tf.f02473}</li>
              <li>{tf.f02474}</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 pt-2">
          <Button 
            className="w-full bg-slate-900 hover:bg-slate-800 text-white"
            onClick={() => router.push("/dashboard/settings")}
          >
            {tf.f02475}
          </Button>
          <Button 
            variant="ghost" 
            className="w-full text-slate-500"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> {tf.f02476}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
