"use client";

import { MessageCircle, Save, Loader2, RotateCcw } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import Textarea from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SystemSettings } from "@/hooks/use-settings";
import { getDefaultKakaoTemplates } from "@/lib/messenger/localized-templates";
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
  const defaultTemplates = getDefaultKakaoTemplates(baseLocale);

  const [saving, setSaving] = useState(false);
  const [local, setLocal] = useState({
    preferredMessenger: settings.preferredMessenger || "kakaotalk",
    kakaoTemplateProductionComplete:
      settings.kakaoTemplateProductionComplete || defaultTemplates.productionComplete,
    kakaoTemplateDeliveryComplete:
      settings.kakaoTemplateDeliveryComplete || defaultTemplates.deliveryComplete,
    marketingKakaoTemplateDayOf:
      settings.marketingKakaoTemplateDayOf || defaultTemplates.marketingDayOf,
    marketingKakaoTemplateDaysBefore7:
      settings.marketingKakaoTemplateDaysBefore7 || defaultTemplates.marketingDaysBefore7,
    marketingKakaoTemplateFirstPurchase:
      settings.marketingKakaoTemplateFirstPurchase || defaultTemplates.marketingFirstPurchase,
  });

  useEffect(() => {
    setLocal({
      preferredMessenger: settings.preferredMessenger || "kakaotalk",
      kakaoTemplateProductionComplete:
        settings.kakaoTemplateProductionComplete || defaultTemplates.productionComplete,
      kakaoTemplateDeliveryComplete:
        settings.kakaoTemplateDeliveryComplete || defaultTemplates.deliveryComplete,
      marketingKakaoTemplateDayOf:
        settings.marketingKakaoTemplateDayOf || defaultTemplates.marketingDayOf,
      marketingKakaoTemplateDaysBefore7:
        settings.marketingKakaoTemplateDaysBefore7 || defaultTemplates.marketingDaysBefore7,
      marketingKakaoTemplateFirstPurchase:
        settings.marketingKakaoTemplateFirstPurchase || defaultTemplates.marketingFirstPurchase,
    });
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await saveSettings({
        ...settings,
        preferredMessenger: local.preferredMessenger,
        kakaoTemplateProductionComplete: local.kakaoTemplateProductionComplete.trim(),
        kakaoTemplateDeliveryComplete: local.kakaoTemplateDeliveryComplete.trim(),
        marketingKakaoTemplateDayOf: local.marketingKakaoTemplateDayOf.trim(),
        marketingKakaoTemplateDaysBefore7: local.marketingKakaoTemplateDaysBefore7.trim(),
        marketingKakaoTemplateFirstPurchase: local.marketingKakaoTemplateFirstPurchase.trim(),
      });
      if (!saved) throw new Error("save failed");
      toast.success(tr("알림 메신저 및 문구가 저장되었습니다.", "Messenger settings saved."));
    } catch {
      toast.error(tr("저장에 실패했습니다.", "Failed to save."));
    } finally {
      setSaving(false);
    }
  };

  const varHint = tr(
    "변수: {고객명}, {회사명}(또는 {지점명}), {사진링크}, {보유포인트}, {포인트안내}",
    "Variables: {고객명}, {회사명}, {사진링크}, {보유포인트}, {포인트안내}",
  );

  return (
    <Card className="border-0 shadow-sm ring-1 ring-yellow-200">
      <CardHeader>
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-yellow-600" />
          {tr("알림 메신저 및 PC 반자동 연동 설정", "Messenger & PC Semi-Auto Notifications Settings")}
        </CardTitle>
        <CardDescription>
          {tr(
            "주문 상세에서 제작·배송완료 알림 발송 시 사용되는 기본 메신저와 치환 문구를 설정합니다. 데스크톱 앱에서는 설정된 메신저가 열리고 텍스트가 클립보드에 복사되며, 모바일에서는 공유 기능으로 발송됩니다.",
            "Set the preferred messenger and message templates. In the PC app, it copies text and opens the chosen messenger app. On mobile, it opens the share dialog.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-semibold">
            {tr("기본 알림 메신저 선택", "Preferred Notification Messenger")}
          </Label>
          <Select
            value={local.preferredMessenger}
            onValueChange={(val) => setLocal((p) => ({ ...p, preferredMessenger: val as any }))}
          >
            <SelectTrigger className="w-full text-sm">
              <SelectValue placeholder="메신저 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kakaotalk">{tr("카카오톡 (KakaoTalk)", "KakaoTalk")}</SelectItem>
              <SelectItem value="zalo">{tr("잘로 (Zalo)", "Zalo")}</SelectItem>
              <SelectItem value="line">{tr("라인 (LINE)", "LINE")}</SelectItem>
              <SelectItem value="whatsapp">{tr("왓츠앱 (WhatsApp)", "WhatsApp")}</SelectItem>
              <SelectItem value="sms">{tr("일반 문자 (SMS)", "SMS")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

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
                kakaoTemplateProductionComplete: defaultTemplates.productionComplete,
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
                kakaoTemplateDeliveryComplete: defaultTemplates.deliveryComplete,
              }))
            }
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            {tr("기본 문구로 복원", "Restore default")}
          </Button>
        </div>
        <div className="space-y-2 mt-6 border-t pt-4 border-slate-100">
          <h4 className="text-sm font-bold text-slate-800">{tr("스마트 마케팅 발송 문구", "Smart Marketing Messages")}</h4>
          <p className="text-[10px] text-muted-foreground">{tr("변수: {고객명}, {기념일명}, {보유포인트}, {포인트안내}, {매장명}, {설명}", "Variables: {고객명}, {기념일명}, {보유포인트}, {포인트안내}, {매장명}, {설명}")}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="kakao-template-marketing-day-of" className="text-xs font-semibold text-pink-600">
            {tr("[당일 기념일] 전송 문구", "[Anniversary (Day Of)] message")}
          </Label>
          <Textarea
            id="kakao-template-marketing-day-of"
            value={local.marketingKakaoTemplateDayOf}
            onChange={(e) => setLocal((p) => ({ ...p, marketingKakaoTemplateDayOf: e.target.value }))}
            className="min-h-[88px] text-sm border-pink-100 focus-visible:ring-pink-300 bg-pink-50/10"
            spellCheck={false}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-pink-600 hover:text-pink-700 hover:bg-pink-50"
            onClick={() =>
              setLocal((p) => ({
                ...p,
                marketingKakaoTemplateDayOf: defaultTemplates.marketingDayOf,
              }))
            }
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            {tr("기본 문구로 복원", "Restore default")}
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="kakao-template-marketing-d7" className="text-xs font-semibold text-pink-600">
            {tr("[기념일 D-7] 전송 문구", "[Anniversary D-7] message")}
          </Label>
          <Textarea
            id="kakao-template-marketing-d7"
            value={local.marketingKakaoTemplateDaysBefore7}
            onChange={(e) => setLocal((p) => ({ ...p, marketingKakaoTemplateDaysBefore7: e.target.value }))}
            className="min-h-[88px] text-sm border-pink-100 focus-visible:ring-pink-300 bg-pink-50/10"
            spellCheck={false}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-pink-600 hover:text-pink-700 hover:bg-pink-50"
            onClick={() =>
              setLocal((p) => ({
                ...p,
                marketingKakaoTemplateDaysBefore7: defaultTemplates.marketingDaysBefore7,
              }))
            }
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            {tr("기본 문구로 복원", "Restore default")}
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="kakao-template-marketing-first" className="text-xs font-semibold text-pink-600">
            {tr("[첫 구매 감사] 전송 문구", "[First Purchase] message")}
          </Label>
          <Textarea
            id="kakao-template-marketing-first"
            value={local.marketingKakaoTemplateFirstPurchase}
            onChange={(e) => setLocal((p) => ({ ...p, marketingKakaoTemplateFirstPurchase: e.target.value }))}
            className="min-h-[88px] text-sm border-pink-100 focus-visible:ring-pink-300 bg-pink-50/10"
            spellCheck={false}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-pink-600 hover:text-pink-700 hover:bg-pink-50"
            onClick={() =>
              setLocal((p) => ({
                ...p,
                marketingKakaoTemplateFirstPurchase: defaultTemplates.marketingFirstPurchase,
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
