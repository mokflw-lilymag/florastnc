"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Users, Heart, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";

const CUSTOMER_GOAL = 10;
const ANNIVERSARY_GOAL = 1;

export function RevenueOnboardingChecklist() {
  const { tenantId, isSuperAdmin, isLoading: authLoading } = useAuth();
  const supabase = createClient();
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const tr = (ko: string, en: string) => pickUiText(baseLocale, ko, en);

  const [customerCount, setCustomerCount] = useState(0);
  const [anniversaryCount, setAnniversaryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  const load = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { count: custCount } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("is_deleted", false);

      setCustomerCount(custCount ?? 0);

      const { count: annCount, error: annErr } = await supabase
        .from("customer_anniversaries")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId);

      if (annErr && (annErr.code === "PGRST205" || annErr.message?.includes("does not exist"))) {
        setAnniversaryCount(0);
      } else if (!annErr) {
        setAnniversaryCount(annCount ?? 0);
      }

      const { data: settings } = await supabase
        .from("system_settings")
        .select("data")
        .eq("tenant_id", tenantId)
        .eq("id", "revenue_onboarding")
        .maybeSingle();

      if (settings?.data && typeof settings.data === "object" && "dismissed" in settings.data) {
        setDismissed(Boolean((settings.data as { dismissed?: boolean }).dismissed));
      }
    } finally {
      setLoading(false);
    }
  }, [tenantId, supabase]);

  useEffect(() => {
    if (!authLoading && tenantId && !isSuperAdmin) load();
    else if (!authLoading) setLoading(false);
  }, [authLoading, tenantId, isSuperAdmin, load]);

  const customersDone = customerCount >= CUSTOMER_GOAL;
  const anniversaryDone = anniversaryCount >= ANNIVERSARY_GOAL;
  const allDone = customersDone && anniversaryDone;
  const progressPct = Math.round(
    ((Math.min(customerCount, CUSTOMER_GOAL) / CUSTOMER_GOAL) * 50 +
      (anniversaryDone ? 50 : 0))
  );

  const handleDismiss = async () => {
    if (!tenantId) return;
    setDismissed(true);
    await supabase.from("system_settings").upsert({
      id: "revenue_onboarding",
      tenant_id: tenantId,
      data: { dismissed: true, completed_at: new Date().toISOString() },
    });
  };

  if (authLoading || isSuperAdmin || !tenantId || loading) return null;
  if (dismissed && allDone) return null;

  return (
    <Card className="mb-6 border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 to-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          {tr("매출 엔진 온보딩", "Revenue engine onboarding")}
        </CardTitle>
        <CardDescription>
          {tr(
            "Floxync가 돈을 벌어주려면 고객·기념일 데이터가 필요해요.",
            "Floxync needs customers and anniversaries to drive revenue.",
          )}
        </CardDescription>
        <Progress value={progressPct} className="h-2 mt-2" />
      </CardHeader>
      <CardContent className="space-y-3">
        <ChecklistRow
          done={customersDone}
          icon={<Users className="w-4 h-4" />}
          label={tr(`고객 ${CUSTOMER_GOAL}명 등록`, `Register ${CUSTOMER_GOAL} customers`)}
          detail={tr(`${customerCount} / ${CUSTOMER_GOAL}명`, `${customerCount} / ${CUSTOMER_GOAL}`)}
          href="/dashboard/customers"
        />
        <ChecklistRow
          done={anniversaryDone}
          icon={<Heart className="w-4 h-4" />}
          label={tr("기념일 등록", "Add anniversaries")}
          detail={
            anniversaryCount > 0
              ? tr(`${anniversaryCount}건`, `${anniversaryCount}`)
              : tr("고객 상세에서 추가 (Phase 1 UI)", "Add from customer detail (Phase 1 UI)")
          }
          href="/dashboard/customers"
        />
        {allDone ? (
          <div className="flex flex-wrap gap-2 pt-2">
            <Button size="sm" onClick={handleDismiss}>
              {tr("완료 — 숨기기", "Done — dismiss")}
            </Button>
            <Link
              href="/dashboard/revenue"
              className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm hover:bg-accent"
            >
              {tr("매출 캘린더 열기", "Open revenue calendar")}
            </Link>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground pt-1">
            {tr(
              "완료하면 Phase 1 기념일 자동 알림을 켤 수 있어요.",
              "Complete this to enable Phase 1 anniversary alerts.",
            )}{" "}
            <Link href="/dashboard/revenue" className="underline text-emerald-700">
              {tr("매출 캘린더", "Revenue calendar")}
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ChecklistRow({
  done,
  icon,
  label,
  detail,
  href,
}: {
  done: boolean;
  icon: React.ReactNode;
  label: string;
  detail: string;
  href: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-white/80 px-3 py-2">
      <div className="flex items-center gap-3 min-w-0">
        {done ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
        ) : (
          <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium flex items-center gap-1.5">
            {icon}
            {label}
          </p>
          <p className="text-xs text-muted-foreground">{detail}</p>
        </div>
      </div>
      {!done && (
        <Link
          href={href}
          className="inline-flex shrink-0 items-center justify-center rounded-md h-8 w-8 hover:bg-accent"
        >
          <ArrowRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}
