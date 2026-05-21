"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Gem, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";

interface AccessInfo {
  plan: string;
  planLabel: string;
  features: string[];
  freeCampaignLimit?: { used: number; limit: number; allowed: boolean };
}

const FEATURE_LABELS_KO: Record<string, string> = {
  anniversary_d7: "기념일 D-7",
  order_followup: "구매 후 시퀀스",
  sns_manual: "SNS 수동 초안",
  sns_autopilot: "SNS Auto-Pilot",
  attribution_detail: "귀속 리포트",
  flash_sale: "재고 플래시",
  naver_seo_pack: "네이버 SEO 패키지",
};

export function RevenuePlanUpsell() {
  const locale = usePreferredLocale();
  const tr = (ko: string, en: string) => pickUiText(toBaseLocale(locale), ko, en);
  const [info, setInfo] = useState<AccessInfo | null>(null);

  useEffect(() => {
    fetch("/api/revenue/access")
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => {});
  }, []);

  if (!info || info.plan === "pro") return null;

  return (
    <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50/80 to-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Gem className="w-4 h-4 text-indigo-600" />
          {tr("매출 엔진 업그레이드", "Upgrade revenue engine")}
        </CardTitle>
        <CardDescription>
          {tr(`현재 플랜: ${info.planLabel}`, `Current plan: ${info.planLabel}`)}
          {info.freeCampaignLimit && info.plan === "free" && (
            <span className="block mt-1">
              {tr(
                `이번 달 발송 ${info.freeCampaignLimit.used}/${info.freeCampaignLimit.limit}건`,
                `Campaigns this month ${info.freeCampaignLimit.used}/${info.freeCampaignLimit.limit}`,
              )}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2 items-center">
        {!info.features.includes("sns_autopilot") && (
          <Badge variant="outline">{tr("SNS Auto-Pilot → PRO", "SNS Auto-Pilot → PRO")}</Badge>
        )}
        {!info.features.includes("flash_sale") && (
          <Badge variant="outline">{tr("재고 플래시 → PRO", "Flash → PRO")}</Badge>
        )}
        <Link href="/dashboard/subscription?highlight=revenue">
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            {tr("FLORA PRO 보기", "View FLORA PRO")}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
