"use client";

import { Mail, Save, Loader2, Info, CalendarClock, Send, Plus, Trash2, Edit2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import type { SystemSettings } from "@/hooks/use-settings";
import {
  DEFAULT_EMAIL_TEMPLATE_ANNIVERSARY_D7,
  DEFAULT_EMAIL_TEMPLATE_ANNIVERSARY_DAY_OF,
  DEFAULT_EMAIL_TEMPLATE_FIRST_PURCHASE,
  DEFAULT_EMAIL_TEMPLATE_DELIVERY_COMPLETE,
  DEFAULT_EMAIL_TEMPLATE_PRODUCTION_COMPLETE,
} from "@/lib/email/default-templates";
import { EmailTemplateEditor } from "@/components/email-template-editor";
import { resolveEmailShopName } from "@/lib/email/resolve-shop-name";
import { pickUiText } from "@/i18n/pick-ui-text";
import { toBaseLocale } from "@/i18n/config";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { useAuth } from "@/hooks/use-auth";

interface EmailSettingsCardProps {
  settings: SystemSettings;
  saveSettings: (settings: SystemSettings) => Promise<boolean>;
}

export function EmailSettingsCard({ settings, saveSettings }: EmailSettingsCardProps) {
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const tr = (ko: string, en: string) => pickUiText(baseLocale, ko, en);
  const { profile } = useAuth();
  const tenantShopName = profile?.tenants?.name as string | undefined;
  const tenantLogoUrl = profile?.tenants?.logo_url as string | undefined;

  const [saving, setSaving] = useState(false);
  const [local, setLocal] = useState({
    smtpEnabled: settings.smtpEnabled ?? false,
    smtpHost: settings.smtpHost || "smtp.gmail.com",
    smtpPort: settings.smtpPort || "587",
    smtpUser: settings.smtpUser || "",
    smtpPass: settings.smtpPass || "",
    smtpSenderName: settings.smtpSenderName || tenantShopName || settings.siteName || "",
    autoEmailProductionComplete: settings.autoEmailProductionComplete ?? true,
    autoEmailDeliveryComplete: settings.autoEmailDeliveryComplete ?? true,
    autoEmailAnniversaryD7: settings.autoEmailAnniversaryD7 ?? false,
    emailTemplateProductionComplete: settings.emailTemplateProductionComplete,
    emailTemplateDeliveryComplete: settings.emailTemplateDeliveryComplete,
    emailTemplateAnniversaryD7: settings.emailTemplateAnniversaryD7,
    marketingEmailSubjectDayOf: settings.marketingEmailSubjectDayOf || '[{회사명}] 오늘 {기념일명}을 진심으로 축하드립니다!',
    marketingEmailContentDayOf: settings.marketingEmailContentDayOf || '',
    marketingEmailSubjectDaysBefore7: settings.marketingEmailSubjectDaysBefore7 || '[{회사명}] {고객명}님, 일주일 앞으로 다가온 {기념일명}을 준비해보세요.',
    marketingEmailContentDaysBefore7: settings.marketingEmailContentDaysBefore7 || '',
    marketingEmailSubjectFirstPurchase: settings.marketingEmailSubjectFirstPurchase || '[{회사명}] {고객명}님, 첫 구매에 진심으로 감사드립니다!',
    marketingEmailContentFirstPurchase: settings.marketingEmailContentFirstPurchase || '',
    marketingAdTemplates: settings.marketingAdTemplates || [],
  });

  useEffect(() => {
    setLocal({
      smtpEnabled: settings.smtpEnabled ?? false,
      smtpHost: settings.smtpHost || "smtp.gmail.com",
      smtpPort: settings.smtpPort || "587",
      smtpUser: settings.smtpUser || "",
      smtpPass: settings.smtpPass || "",
      smtpSenderName: settings.smtpSenderName || tenantShopName || settings.siteName || "",
      autoEmailProductionComplete: settings.autoEmailProductionComplete ?? true,
      autoEmailDeliveryComplete: settings.autoEmailDeliveryComplete ?? true,
      autoEmailAnniversaryD7: settings.autoEmailAnniversaryD7 ?? false,
      emailTemplateProductionComplete: settings.emailTemplateProductionComplete,
      emailTemplateDeliveryComplete: settings.emailTemplateDeliveryComplete,
      emailTemplateAnniversaryD7: settings.emailTemplateAnniversaryD7,
      marketingEmailSubjectDayOf: settings.marketingEmailSubjectDayOf || '오늘 {기념일명}을 진심으로 축하드립니다!',
      marketingEmailContentDayOf: settings.marketingEmailContentDayOf || '',
      marketingEmailAutoDayOf: settings.marketingEmailAutoDayOf ?? false,
      marketingEmailSubjectDaysBefore7: settings.marketingEmailSubjectDaysBefore7 || '{기념일명}이 일주일 앞으로 다가왔습니다.',
      marketingEmailContentDaysBefore7: settings.marketingEmailContentDaysBefore7 || '',
      marketingEmailAutoDaysBefore7: settings.marketingEmailAutoDaysBefore7 ?? false,
      marketingEmailSubjectFirstPurchase: settings.marketingEmailSubjectFirstPurchase || '첫 구매를 진심으로 감사드립니다.',
      marketingEmailContentFirstPurchase: settings.marketingEmailContentFirstPurchase || '',
      marketingEmailAutoFirstPurchase: settings.marketingEmailAutoFirstPurchase ?? false,
      marketingAdTemplates: settings.marketingAdTemplates || [],
    });
  }, [settings, tenantShopName]);

  const patch = (partial: Partial<typeof local>) => setLocal((prev) => ({ ...prev, ...partial }));

  const templatePreviewSample = {
    회사명: resolveEmailShopName(
      { smtpSenderName: local.smtpSenderName, siteName: settings.siteName },
      tenantShopName,
    ),
    연락처: settings.contactPhone || "02-1234-5678",
    이메일: settings.storeEmail || local.smtpUser || "shop@example.com",
    보유포인트: "1,500",
    포인트안내: settings.pointRate > 0 && settings.minPointUsage > 0 
      ? `<div style="margin: 32px 0; padding: 28px 20px; background: linear-gradient(135deg, #fff1f2 0%, #fce7f3 100%); border-radius: 16px; text-align: center; border: 1px solid #fbcfe8; box-shadow: 0 4px 12px rgba(244, 114, 182, 0.1);"><p style="margin: 0; font-size: 15px; color: #be185d; font-weight: bold;">고객님의 소중한 혜택 🎁</p><p style="margin: 16px 0; font-size: 28px; color: #e11d48; font-weight: 900; letter-spacing: -0.5px; line-height: 1.2;"><span style="font-size: 13px; color: #9f1239; font-weight: bold; display: block; margin-bottom: 4px;">현재 보유 포인트</span>1,500점</p><p style="margin: 0; font-size: 14px; color: #881337; font-weight: 600; line-height: 1.6;">${settings.minPointUsage.toLocaleString()}점부터 현금처럼 즉시 사용 가능합니다.<br/><span style="color: #e11d48; font-weight: bold; text-decoration: underline;">소멸되기 전에 얼른 사용하러 오세요! 🏃‍♀️💨</span></p></div>` 
      : "",
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await saveSettings({
        ...settings,
        smtpEnabled: local.smtpEnabled,
        smtpHost: local.smtpHost,
        smtpPort: local.smtpPort,
        smtpUser: local.smtpUser.trim(),
        smtpPass: local.smtpPass,
        smtpSenderName: local.smtpSenderName.trim(),
        autoEmailProductionComplete: local.autoEmailProductionComplete,
        autoEmailDeliveryComplete: local.autoEmailDeliveryComplete,
        autoEmailAnniversaryD7: local.autoEmailAnniversaryD7,
        emailTemplateProductionComplete: local.emailTemplateProductionComplete,
        emailTemplateDeliveryComplete: local.emailTemplateDeliveryComplete,
        emailTemplateAnniversaryD7: local.emailTemplateAnniversaryD7,
        marketingEmailSubjectDayOf: local.marketingEmailSubjectDayOf,
        marketingEmailContentDayOf: local.marketingEmailContentDayOf,
        marketingEmailAutoDayOf: local.marketingEmailAutoDayOf,
        marketingEmailSubjectDaysBefore7: local.marketingEmailSubjectDaysBefore7,
        marketingEmailContentDaysBefore7: local.marketingEmailContentDaysBefore7,
        marketingEmailAutoDaysBefore7: local.marketingEmailAutoDaysBefore7,
        marketingEmailSubjectFirstPurchase: local.marketingEmailSubjectFirstPurchase,
        marketingEmailContentFirstPurchase: local.marketingEmailContentFirstPurchase,
        marketingEmailAutoFirstPurchase: local.marketingEmailAutoFirstPurchase,
        marketingAdTemplates: local.marketingAdTemplates,
      });
      if (!saved) throw new Error("save failed");
      toast.success(tr("이메일 설정이 저장되었습니다.", "Email settings saved."));
    } catch {
      toast.error(tr("이메일 설정 저장에 실패했습니다.", "Failed to save email settings."));
    } finally {
      setSaving(false);
    }
  };

  const handleBulkSend = async (type: 'dayOf' | 'd7' | 'firstPurchase' | 'custom_ad', templateId?: string) => {
    if (!confirm(tr('정말 마케팅에 수신 동의한 "전체 고객"에게 해당 메일을 일괄 발송하시겠습니까? (백그라운드에서 순차 처리됩니다)', 'Send bulk email to all consented customers?'))) return;
    
    try {
      toast.loading(tr('대량 발송 예약 중...', 'Scheduling bulk send...'), { id: 'bulk-send' });
      const res = await fetch('/api/marketing/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, templateId })
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(tr('대량 발송 예약이 성공적으로 완료되었습니다.', 'Bulk send scheduled successfully.'), { id: 'bulk-send' });
    } catch (e: any) {
      toast.error(tr('대량 발송 예약 실패: ', 'Bulk send failed: ') + e.message, { id: 'bulk-send' });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm ring-1 ring-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2 flex-wrap">
            <Mail className="h-5 w-5 text-blue-500" />
            {tr("이메일(SMTP) 발송 설정", "Email (SMTP) settings")}
            {local.smtpEnabled ? (
              <Badge className="bg-blue-100 text-blue-700 border-blue-200">{tr("사용 중", "Enabled")}</Badge>
            ) : (
              <Badge variant="secondary">{tr("비활성", "Disabled")}</Badge>
            )}
          </CardTitle>
          <CardDescription>
            {tr(
              "Connect SMTP to send production, delivery, and anniversary emails.",
              "Connect SMTP to send production, delivery, and anniversary emails.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
            <div>
              <Label className="text-base">{tr("SMTP 이메일 사용", "Enable SMTP Email")}</Label>
              <p className="text-sm text-muted-foreground">
                {tr(
                  "직접 SMTP 정보를 입력하여 메일을 보냅니다. (Gmail 등)",
                  "Send emails using your own SMTP server (e.g. Gmail).",
                )}
              </p>
            </div>
            <Switch checked={local.smtpEnabled ?? false} onCheckedChange={(v) => patch({ smtpEnabled: v })} />
          </div>

          {local.smtpEnabled && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp-host">SMTP Host <span className="text-red-500">*</span></Label>
                  <Input
                    id="smtp-host"
                    value={local.smtpHost}
                    onChange={(e) => patch({ smtpHost: e.target.value })}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-port">SMTP Port <span className="text-red-500">*</span></Label>
                  <Input
                    id="smtp-port"
                    value={local.smtpPort}
                    onChange={(e) => patch({ smtpPort: e.target.value })}
                    placeholder="587"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-user">SMTP Username (Email) <span className="text-red-500">*</span></Label>
                  <Input
                    id="smtp-user"
                    type="email"
                    value={local.smtpUser}
                    onChange={(e) => patch({ smtpUser: e.target.value })}
                    placeholder="your-email@gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-pass">
                    SMTP Password / App Password <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="smtp-pass"
                    type="password"
                    value={local.smtpPass}
                    onChange={(e) => patch({ smtpPass: e.target.value })}
                    placeholder="••••••••••••"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {tr(
                      "Gmail의 경우 앱 비밀번호(App Password)를 발급받아 입력하세요.",
                      "For Gmail, use an App Password instead of your account password.",
                    )}
                  </p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="smtp-sender-name">{tr("발신인 표시 이름", "Sender display name")}</Label>
                  <Input
                    id="smtp-sender-name"
                    value={local.smtpSenderName}
                    onChange={(e) => patch({ smtpSenderName: e.target.value })}
                    placeholder={tenantShopName || tr("우리 꽃집", "Our flower shop")}
                  />
                </div>
              </div>
            </>
          )}

          <Separator />

          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-800">{tr("자동 발송", "Auto-send")}</p>
            <div className="flex items-center justify-between gap-4 p-3 rounded-lg border">
              <div>
                <Label>{tr("제작완료 자동 이메일", "Auto: production complete")}</Label>
                <p className="text-xs text-muted-foreground">{tr("주문 상세 버튼 발송은 항상 가능", "Manual send always works")}</p>
              </div>
              <Switch checked={local.autoEmailProductionComplete ?? false} onCheckedChange={(v) => patch({ autoEmailProductionComplete: v })} />
            </div>
            <div className="flex items-center justify-between gap-4 p-3 rounded-lg border">
              <div>
                <Label>{tr("배송완료 자동 이메일", "Auto: delivery complete")}</Label>
                <p className="text-xs text-muted-foreground">{tr("주문 상세 버튼 발송은 항상 가능", "Manual send always works")}</p>
              </div>
              <Switch checked={local.autoEmailDeliveryComplete ?? false} onCheckedChange={(v) => patch({ autoEmailDeliveryComplete: v })} />
            </div>
            <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-pink-100 bg-pink-50/30">
              <div>
                <Label className="flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5 text-pink-600" />
                  {tr("기념일 D-7 자동 이메일 (구버전 스케줄러)", "Auto: anniversary D-7 email (legacy)")}
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {tr(
                    "매일 09:00(KST) Trigger.dev 배치 · 구형 알림톡 스케줄러. 아래의 신규 마케팅 스케줄러를 권장합니다.",
                    "Legacy daily batch. We recommend the new marketing scheduler below.",
                  )}
                </p>
              </div>
              <Switch checked={local.autoEmailAnniversaryD7 ?? false} onCheckedChange={(v) => patch({ autoEmailAnniversaryD7: v })} />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {tr("SMTP·자동발송 저장", "Save SMTP & auto-send")}
          </Button>
        </CardFooter>
      </Card>

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-800">{tr("이메일 템플릿", "Email templates")}</h3>
        <EmailTemplateEditor
          templateName={tr("제작완료", "Production complete")}
          value={local.emailTemplateProductionComplete}
          onChange={(v) => patch({ emailTemplateProductionComplete: v })}
          variables={["고객명", "주문번호", "회사명", "보유포인트", "포인트안내"]}
          defaultTemplate={DEFAULT_EMAIL_TEMPLATE_PRODUCTION_COMPLETE}
          sampleData={templatePreviewSample}
          shopLogoUrl={tenantLogoUrl}
        />
        <EmailTemplateEditor
          templateName={tr("배송완료", "Delivery complete")}
          value={local.emailTemplateDeliveryComplete}
          onChange={(v) => patch({ emailTemplateDeliveryComplete: v })}
          variables={["고객명", "주문번호", "배송일", "수령인", "회사명", "보유포인트", "포인트안내"]}
          defaultTemplate={DEFAULT_EMAIL_TEMPLATE_DELIVERY_COMPLETE}
          sampleData={templatePreviewSample}
          shopLogoUrl={tenantLogoUrl}
        />
        
        <Separator className="my-6" />
        <h3 className="text-lg font-bold text-slate-800">{tr("스마트 마케팅 템플릿", "Smart Marketing Templates")}</h3>
        <p className="text-sm text-slate-500 mb-4">자동 발송 스위치를 켜면 Trigger.dev 스케줄러를 통해 고객에게 알아서 메일이 발송됩니다.</p>

        <div className="space-y-2 border rounded-lg p-4 bg-slate-50 mt-4">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200">
            <Label className="font-bold text-slate-800 text-base">{tr("당일 기념일 축하", "Anniversary (Day Of)")}</Label>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={local.marketingEmailAutoDayOf ?? false} onCheckedChange={(v) => patch({ marketingEmailAutoDayOf: v })} />
                <span className="text-sm font-medium">{tr("매일 자동 발송 (오전 9시)", "Auto send (09:00)")}</span>
              </div>
              
            </div>
          </div>
          <Label className="font-semibold text-slate-700 text-xs">{tr("메일 제목", "Subject")}</Label>
          <Input 
            value={local.marketingEmailSubjectDayOf} 
            onChange={(e) => patch({ marketingEmailSubjectDayOf: e.target.value })}
            placeholder="[{회사명}] 오늘 {기념일명}을 진심으로 축하드립니다!"
            className="mb-2"
          />
          <div className="pt-2">
            <EmailTemplateEditor
              templateName={tr("당일 기념일 본문", "Body")}
              value={local.marketingEmailContentDayOf}
              onChange={(v) => patch({ marketingEmailContentDayOf: v })}
              variables={["고객명", "회사명", "기념일명", "기념일", "보유포인트", "포인트안내"]}
              defaultTemplate={DEFAULT_EMAIL_TEMPLATE_ANNIVERSARY_DAY_OF}
              sampleData={templatePreviewSample}
              shopLogoUrl={tenantLogoUrl}
            />
          </div>
        </div>

        <div className="space-y-2 border rounded-lg p-4 bg-slate-50 mt-4">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200">
            <Label className="font-bold text-slate-800 text-base">{tr("기념일 D-7 안내", "Anniversary D-7")}</Label>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={local.marketingEmailAutoDaysBefore7 ?? false} onCheckedChange={(v) => patch({ marketingEmailAutoDaysBefore7: v })} />
                <span className="text-sm font-medium">{tr("매일 자동 발송 (오전 9시)", "Auto send (09:00)")}</span>
              </div>
              
            </div>
          </div>
          <Label className="font-semibold text-slate-700 text-xs">{tr("메일 제목", "Subject")}</Label>
          <Input 
            value={local.marketingEmailSubjectDaysBefore7} 
            onChange={(e) => patch({ marketingEmailSubjectDaysBefore7: e.target.value })}
            placeholder="[{회사명}] {고객명}님, 일주일 앞으로 다가온 {기념일명}을 준비해보세요."
            className="mb-2"
          />
          <div className="pt-2">
            <EmailTemplateEditor
              templateName={tr("기념일 D-7 본문", "Body")}
              value={local.marketingEmailContentDaysBefore7}
              onChange={(v) => patch({ marketingEmailContentDaysBefore7: v })}
              variables={["고객명", "회사명", "기념일명", "기념일", "주문링크", "보유포인트", "포인트안내"]}
              defaultTemplate={DEFAULT_EMAIL_TEMPLATE_ANNIVERSARY_D7}
              sampleData={templatePreviewSample}
              shopLogoUrl={tenantLogoUrl}
            />
          </div>
        </div>

        <div className="space-y-2 border rounded-lg p-4 bg-slate-50 mt-4">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200">
            <Label className="font-bold text-slate-800 text-base">{tr("첫 구매 감사 메일", "First Purchase")}</Label>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={local.marketingEmailAutoFirstPurchase ?? false} onCheckedChange={(v) => patch({ marketingEmailAutoFirstPurchase: v })} />
                <span className="text-sm font-medium">{tr("구매 후 1시간 내 자동 발송", "Auto send (within 1 hour)")}</span>
              </div>
              
            </div>
          </div>
          <Label className="font-semibold text-slate-700 text-xs">{tr("메일 제목", "Subject")}</Label>
          <Input 
            value={local.marketingEmailSubjectFirstPurchase} 
            onChange={(e) => patch({ marketingEmailSubjectFirstPurchase: e.target.value })}
            placeholder="[{회사명}] {고객명}님, 첫 구매에 진심으로 감사드립니다!"
          />
          <div className="pt-2">
            <EmailTemplateEditor
              templateName={tr("첫 구매 감사", "First Purchase")}
              value={local.marketingEmailContentFirstPurchase}
              onChange={(v) => patch({ marketingEmailContentFirstPurchase: v })}
              variables={["고객명", "회사명", "보유포인트", "포인트안내"]}
              defaultTemplate={DEFAULT_EMAIL_TEMPLATE_FIRST_PURCHASE}
              sampleData={templatePreviewSample}
              shopLogoUrl={tenantLogoUrl}
            />
          </div>
        </div>
        
        <Separator className="my-6" />
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">{tr("광고/마케팅 전용 템플릿 (대량 발송용)", "Ad/Marketing Templates")}</h3>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => {
              const newTemplate = {
                id: crypto.randomUUID(),
                name: '새 광고 템플릿',
                subject: '[{회사명}] 새로운 이벤트 안내!',
                content: DEFAULT_EMAIL_TEMPLATE_FIRST_PURCHASE // placeholder
              };
              patch({ marketingAdTemplates: [...(local.marketingAdTemplates || []), newTemplate] });
            }}
          >
            <Plus className="h-4 w-4 mr-2" /> 새 템플릿 추가
          </Button>
        </div>
        <p className="text-sm text-slate-500 mb-4">전체 발송은 이 광고/마케팅 전용 템플릿으로만 가능합니다.</p>

        <div className="space-y-4">
          {(local.marketingAdTemplates || []).map((template, index) => (
            <div key={template.id} className="border rounded-lg p-4 bg-white shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Label className="font-semibold w-24">템플릿명</Label>
                <Input 
                  value={template.name} 
                  onChange={(e) => {
                    const newTemplates = [...local.marketingAdTemplates];
                    newTemplates[index] = { ...template, name: e.target.value };
                    patch({ marketingAdTemplates: newTemplates });
                  }}
                  placeholder="템플릿 이름 (예: 봄맞이 이벤트)"
                />
                <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => {
                  if (confirm('이 템플릿을 삭제하시겠습니까?')) {
                    patch({ marketingAdTemplates: local.marketingAdTemplates.filter(t => t.id !== template.id) });
                  }
                }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Label className="font-semibold w-24">메일 제목</Label>
                <Input 
                  value={template.subject} 
                  onChange={(e) => {
                    const newTemplates = [...local.marketingAdTemplates];
                    newTemplates[index] = { ...template, subject: e.target.value };
                    patch({ marketingAdTemplates: newTemplates });
                  }}
                  placeholder="메일 제목"
                />
              </div>

              <div className="pt-2 border-t mt-4">
                <EmailTemplateEditor
                  templateName={template.name}
                  value={template.content}
                  onChange={(v) => {
                    const newTemplates = [...local.marketingAdTemplates];
                    newTemplates[index] = { ...template, content: v };
                    patch({ marketingAdTemplates: newTemplates });
                  }}
                  variables={["고객명", "회사명", "보유포인트", "포인트안내"]}
                  defaultTemplate={DEFAULT_EMAIL_TEMPLATE_FIRST_PURCHASE}
                  sampleData={templatePreviewSample}
                  shopLogoUrl={tenantLogoUrl}
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button 
                  size="sm" 
                  variant="default" 
                  className="gap-2 bg-blue-600 hover:bg-blue-700 text-white" 
                  onClick={() => handleBulkSend('custom_ad', template.id)}
                >
                  <Send className="h-3.5 w-3.5" /> 이 템플릿으로 전체 발송
                </Button>
              </div>
            </div>
          ))}
          {(!local.marketingAdTemplates || local.marketingAdTemplates.length === 0) && (
            <div className="text-center p-8 border border-dashed rounded-lg text-slate-500">
              저장된 광고/마케팅 템플릿이 없습니다. 새 템플릿을 추가해주세요.
            </div>
          )}
        </div>

        <Separator className="my-6" />

        <Button onClick={handleSave} disabled={saving} className="w-full md:w-auto">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          {tr("템플릿 저장", "Save templates")}
        </Button>
      </div>
    </div>
  );
}
