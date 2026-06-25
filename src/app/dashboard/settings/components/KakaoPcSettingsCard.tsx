"use client";

import { MessageCircle, Save, Loader2, RotateCcw } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import Textarea from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import type { SystemSettings } from "@/hooks/use-settings";
import {
  DEFAULT_KAKAO_TEMPLATE_DELIVERY_COMPLETE,
  DEFAULT_KAKAO_TEMPLATE_PRODUCTION_COMPLETE,
} from "@/lib/kakao/default-pc-templates";
import { pickUiText } from "@/i18n/pick-ui-text";
import { toBaseLocale } from "@/i18n/config";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";

interface KakaoPcSettingsCardProps {
  settings: SystemSettings;
  saveSettings: (settings: SystemSettings) => Promise<boolean>;
}

export function KakaoPcSettingsCard({ settings, saveSettings }: KakaoPcSettingsCardProps) {
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const tr = (ko: string, en: string) => pickUiText(baseLocale, ko, en);

  const [saving, setSaving] = useState(false);
  const [local, setLocal] = useState({
    kakaoTemplateProductionComplete:
      settings.kakaoTemplateProductionComplete || DEFAULT_KAKAO_TEMPLATE_PRODUCTION_COMPLETE,
    kakaoTemplateDeliveryComplete:
      settings.kakaoTemplateDeliveryComplete || DEFAULT_KAKAO_TEMPLATE_DELIVERY_COMPLETE,
  });

  useEffect(() => {
    setLocal({
      kakaoTemplateProductionComplete:
        settings.kakaoTemplateProductionComplete || DEFAULT_KAKAO_TEMPLATE_PRODUCTION_COMPLETE,
      kakaoTemplateDeliveryComplete:
        settings.kakaoTemplateDeliveryComplete || DEFAULT_KAKAO_TEMPLATE_DELIVERY_COMPLETE,
    });
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await saveSettings({
        ...settings,
        kakaoTemplateProductionComplete: local.kakaoTemplateProductionComplete.trim(),
        kakaoTemplateDeliveryComplete: local.kakaoTemplateDeliveryComplete.trim(),
      });
      if (!saved) throw new Error("save failed");
      toast.success(tr("카카오톡 PC 알림 문구가 저장되었습니다.", "Kakao PC message templates saved."));
    } catch {
      toast.error(tr("저장에 실패했습니다.", "Failed to save."));
    } finally {
      setSaving(false);
    }
  };

  const varHint = tr(
    "변수: {고객명}, {회사명}(또는 {지점명}), {사진링크}(완성사진 URL — 카톡은 링크 텍스트로 삽입)",
    "Variables: {고객명}, {회사명}, {사진링크} (photo URL as text link for Kakao PC)",
  );

  return (
    <Card className="border-0 shadow-sm ring-1 ring-yellow-200">
      <CardHeader>
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-yellow-600" />
          {tr("카카오톡 PC 반자동 알림", "KakaoTalk PC semi-auto notifications")}
        </CardTitle>
        <CardDescription>
          {tr(
            "주문 상세에서 제작·배송완료 알림 클릭 시 메시지가 클립보드에 복사되고 PC 카카오톡이 열립니다. 완성사진은 {사진링크}에 URL로 들어갑니다.",
            "On notify from order detail, message is copied and KakaoTalk PC opens. Photo goes in {사진링크} as a URL.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="kakao-template-production" className="text-xs font-semibold">
            {tr("[제작완료] 전송 문구", "[Production complete] message")}
          </Label>
          <Textarea
            id="kakao-template-production"
            value={local.kakaoTemplateProductionComplete}
            onChange={(e) => setLocal((p) => ({ ...p, kakaoTemplateProductionComplete: e.target.value }))}
            className="min-h-[88px] text-sm"
            spellCheck={false}
          />
          <p className="text-[10px] text-muted-foreground">{varHint}</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() =>
              setLocal((p) => ({
                ...p,
                kakaoTemplateProductionComplete: DEFAULT_KAKAO_TEMPLATE_PRODUCTION_COMPLETE,
              }))
            }
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            {tr("기본 문구로 복원", "Restore default")}
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="kakao-template-delivery" className="text-xs font-semibold">
            {tr("[배송완료] 전송 문구", "[Delivery complete] message")}
          </Label>
          <Textarea
            id="kakao-template-delivery"
            value={local.kakaoTemplateDeliveryComplete}
            onChange={(e) => setLocal((p) => ({ ...p, kakaoTemplateDeliveryComplete: e.target.value }))}
            className="min-h-[88px] text-sm"
            spellCheck={false}
          />
          <p className="text-[10px] text-muted-foreground">{varHint}</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() =>
              setLocal((p) => ({
                ...p,
                kakaoTemplateDeliveryComplete: DEFAULT_KAKAO_TEMPLATE_DELIVERY_COMPLETE,
              }))
            }
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            {tr("기본 문구로 복원", "Restore default")}
          </Button>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          {tr("카카오톡 문구 저장", "Save Kakao templates")}
        </Button>
      </CardFooter>
    </Card>
  );
}
