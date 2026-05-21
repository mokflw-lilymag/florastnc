"use client";

import { useEffect, useState } from "react";
import { Zap, Server, Workflow } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import {
  REVENUE_INTEGRATIONS_KEY,
  REVENUE_COUPON_LIMITS_KEY,
  type RevenueIntegrationsConfig,
  type RevenueCouponLimitsConfig,
} from "@/lib/revenue/types";
import { DEFAULT_COUPON_LIMITS } from "@/lib/revenue/coupon-limits";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";

const DEFAULT: RevenueIntegrationsConfig = {
  postiz_api_url: "",
  postiz_api_key_set: false,
  trigger_project_ref: "",
  trigger_env: "DEVELOPMENT",
  n8n_deprecated: true,
};

export function RevenueIntegrationsPanel({
  onSave,
  saving,
}: {
  onSave: (key: string, value: RevenueIntegrationsConfig | RevenueCouponLimitsConfig) => Promise<void>;
  saving?: boolean;
}) {
  const supabase = createClient();
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const tr = (ko: string, en: string) => pickUiText(baseLocale, ko, en);

  const [form, setForm] = useState<RevenueIntegrationsConfig>(DEFAULT);
  const [postizApiKey, setPostizApiKey] = useState("");
  const [couponLimits, setCouponLimits] = useState<RevenueCouponLimitsConfig>(DEFAULT_COUPON_LIMITS);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("platform_config")
        .select("value")
        .eq("key", REVENUE_INTEGRATIONS_KEY)
        .maybeSingle();
      if (data?.value && typeof data.value === "object") {
        setForm({ ...DEFAULT, ...(data.value as RevenueIntegrationsConfig) });
      }
      const { data: couponData } = await supabase
        .from("platform_config")
        .select("value")
        .eq("key", REVENUE_COUPON_LIMITS_KEY)
        .maybeSingle();
      if (couponData?.value && typeof couponData.value === "object") {
        setCouponLimits({ ...DEFAULT_COUPON_LIMITS, ...(couponData.value as RevenueCouponLimitsConfig) });
      }
    })();
  }, [supabase]);

  const handleSubmit = async () => {
    const next: RevenueIntegrationsConfig = {
      ...form,
      postiz_api_key_set: form.postiz_api_key_set || postizApiKey.length > 0,
    };
    await onSave(REVENUE_INTEGRATIONS_KEY, next);
    await onSave(REVENUE_COUPON_LIMITS_KEY, couponLimits);
    if (postizApiKey) setPostizApiKey("");
    toast.success(tr("연동 설정 저장됨", "Integration settings saved"));
  };

  return (
    <Card className="border-emerald-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Workflow className="w-5 h-5 text-emerald-600" />
          {tr("매출 엔진 연동 센터", "Revenue engine integrations")}
        </CardTitle>
        <CardDescription>
          {tr(
            "Trigger.dev (오케스트레이션) + Postiz VPS (SNS). n8n은 Phase 2에서 제거.",
            "Trigger.dev (orchestration) + Postiz VPS (SNS). n8n removed in Phase 2.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-amber-700 border-amber-300">
            n8n {tr("폐기 예정", "deprecated")}
          </Badge>
          <Badge variant="secondary">Trigger.dev</Badge>
          <Badge variant="secondary">Postiz</Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Server className="w-3.5 h-3.5" />
              Postiz API URL
            </Label>
            <Input
              value={form.postiz_api_url ?? ""}
              onChange={(e) => setForm({ ...form, postiz_api_url: e.target.value })}
              placeholder="https://postiz.yourdomain.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Postiz API Key {tr("(Phase 2)", "(Phase 2)")}</Label>
            <Input
              type="password"
              value={postizApiKey}
              onChange={(e) => setPostizApiKey(e.target.value)}
              placeholder={
                form.postiz_api_key_set
                  ? tr("설정됨 — 변경 시만 입력", "Set — enter to rotate")
                  : tr("미설정", "Not set")
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Trigger Project Ref</Label>
            <Input
              value={form.trigger_project_ref ?? ""}
              onChange={(e) => setForm({ ...form, trigger_project_ref: e.target.value })}
              placeholder="proj_..."
            />
          </div>
          <div className="space-y-2">
            <Label>Trigger Environment</Label>
            <Select
              value={form.trigger_env ?? "DEVELOPMENT"}
              onValueChange={(v) =>
                setForm({
                  ...form,
                  trigger_env: v as RevenueIntegrationsConfig["trigger_env"],
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DEVELOPMENT">DEVELOPMENT</SelectItem>
                <SelectItem value="STAGING">STAGING</SelectItem>
                <SelectItem value="PRODUCTION">PRODUCTION</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-lg border p-4 space-y-3">
          <p className="text-sm font-medium">{tr("쿠폰·발송 상한 (어뷰징 방지)", "Send & coupon caps")}</p>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <Label>{tr("고객당 월 최대 발송", "Max sends / customer / month")}</Label>
              <Input
                type="number"
                value={couponLimits.max_campaigns_per_customer_per_month}
                onChange={(e) =>
                  setCouponLimits({
                    ...couponLimits,
                    max_campaigns_per_customer_per_month: Number(e.target.value) || 1,
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>{tr("예상 매출 상한 (원)", "Max expected revenue (KRW)")}</Label>
              <Input
                type="number"
                value={couponLimits.max_expected_revenue_krw}
                onChange={(e) =>
                  setCouponLimits({
                    ...couponLimits,
                    max_expected_revenue_krw: Number(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>{tr("동일 유형 재발송 간격 (일)", "Min resend interval (days)")}</Label>
              <Input
                type="number"
                value={couponLimits.min_resend_interval_days}
                onChange={(e) =>
                  setCouponLimits({
                    ...couponLimits,
                    min_resend_interval_days: Number(e.target.value) || 1,
                  })
                }
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-slate-50 p-3 text-xs text-muted-foreground flex gap-2">
          <Zap className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            {tr(
              "로컬: npm run trigger:dev · 배포: TRIGGER_PROJECT_REF + TRIGGER_SECRET_KEY (Vercel·Trigger 대시보드)",
              "Local: npm run trigger:dev · Deploy: set TRIGGER_PROJECT_REF + TRIGGER_SECRET_KEY",
            )}
          </p>
        </div>

        <Button onClick={handleSubmit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
          {tr("연동 설정 저장", "Save integrations")}
        </Button>
      </CardContent>
    </Card>
  );
}
