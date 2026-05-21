"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { Save, Settings2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Textarea from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { MARKETING_PERSONAS, DEFAULT_PROMO_TOPICS } from "@/lib/revenue/personas";
import {
  mergeMessageTemplatesWithDefaults,
  TEMPLATE_PLACEHOLDER_HINTS,
} from "@/lib/revenue/default-message-templates";
import type { TemplateKey } from "@/lib/revenue/template-service";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";

const TEMPLATE_KEYS = [
  { key: "anniversary_d7", labelKo: "기념일 D-7", labelEn: "Anniversary D-7" },
  { key: "order_followup_d1", labelKo: "구매 후 D+1", labelEn: "Follow-up D+1" },
  { key: "order_followup_d7", labelKo: "구매 후 D+7", labelEn: "Follow-up D+7" },
  { key: "order_followup_d30", labelKo: "구매 후 D+30", labelEn: "Follow-up D+30" },
] as const;

export function RevenueSettingsPanel() {
  const baseLocale = toBaseLocale(usePreferredLocale());
  const tr = (ko: string, en: string) => pickUiText(baseLocale, ko, en);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [persona, setPersona] = useState("warm");
  const [promoTopics, setPromoTopics] = useState<string[]>([...DEFAULT_PROMO_TOPICS]);
  const [templates, setTemplates] = useState<Record<TemplateKey, string>>(() =>
    mergeMessageTemplatesWithDefaults(),
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/revenue/autopilot");
        const json = await res.json();
        if (res.ok && json.settings) {
          setPersona(json.settings.marketing_persona ?? "warm");
          const topics = json.settings.promo_topics;
          if (Array.isArray(topics) && topics.length >= 3) {
            setPromoTopics(topics.slice(0, 3));
          }
          if (json.settings.message_templates && typeof json.settings.message_templates === "object") {
            setTemplates(mergeMessageTemplatesWithDefaults(json.settings.message_templates));
          } else {
            setTemplates(mergeMessageTemplatesWithDefaults());
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/revenue/autopilot", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketing_persona: persona,
          promo_topics: promoTopics,
          message_templates: templates,
        }),
      });
      if (!res.ok) throw new Error("save failed");
      toast.success(tr("설정 저장됨", "Settings saved"));
    } catch {
      toast.error(tr("저장 실패", "Save failed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">{tr("불러오는 중…", "Loading…")}</p>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="w-4 h-4" />
            {tr("페르소나 · 홍보 주제", "Persona & promo topics")}
          </CardTitle>
          <CardDescription>
            {tr("SNS AI 초안 톤과 추천 주제 3가지를 설정합니다.", "Sets SNS AI tone and 3 promo topics.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{tr("브랜드 페르소나", "Brand persona")}</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {MARKETING_PERSONAS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPersona(p.id)}
                  className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                    persona === p.id ? "border-emerald-500 bg-emerald-50" : "hover:bg-accent"
                  }`}
                >
                  <p className="font-medium">{p.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {promoTopics.map((topic, i) => (
              <div key={i} className="space-y-1">
                <Label>{tr(`홍보 주제 ${i + 1}`, `Promo topic ${i + 1}`)}</Label>
                <Input
                  value={topic}
                  onChange={(e) => {
                    const next = [...promoTopics];
                    next[i] = e.target.value;
                    setPromoTopics(next);
                  }}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{tr("메시지 템플릿", "Message templates")}</CardTitle>
          <CardDescription>
            {tr(
              "아래 예시 문구를 그대로 쓰거나, 꽃집 말투에 맞게 수정하세요. {{customerName}}, {{orderLink}} 등은 발송 시 자동 치환됩니다.",
              "Use or edit the examples below. Placeholders like {{customerName}} and {{orderLink}} are filled in automatically.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {TEMPLATE_KEYS.map(({ key, labelKo, labelEn }) => (
            <div key={key} className="space-y-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Label>{tr(labelKo, labelEn)}</Label>
                <span className="text-[11px] text-muted-foreground">{TEMPLATE_PLACEHOLDER_HINTS[key]}</span>
              </div>
              <Textarea
                rows={5}
                value={templates[key] ?? ""}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                  setTemplates({ ...templates, [key]: e.target.value })
                }
                className="text-sm leading-relaxed"
              />
            </div>
          ))}
          <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            <Save className="w-4 h-4 mr-1" />
            {tr("설정 저장", "Save settings")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
