"use client";

import { Mail, Save, Loader2, Info, CalendarClock } from "lucide-react";
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
      });
      if (!saved) throw new Error("save failed");
      toast.success(tr("이메일 설정이 저장되었습니다.", "Email settings saved."));
    } catch {
      toast.error(tr("이메일 설정 저장에 실패했습니다.", "Failed to save email settings."));
    } finally {
      setSaving(false);
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
              "Gmail 등 SMTP 계정을 연결하면 제작·배송·기념일 알림을 고객 이메일로 보낼 수 있습니다.",
              "Connect SMTP to send production, delivery, and anniversary emails.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="space-y-0.5 flex-1">
              <Label className="font-semibold">{tr("이메일 발송 사용", "Enable email sending")}</Label>
              <p className="text-xs text-muted-foreground">
                {tr("켜야 SMTP로 실제 메일이 발송됩니다.", "Must be on for real email delivery.")}
              </p>
            </div>
            <Switch checked={local.smtpEnabled} onCheckedChange={(v) => patch({ smtpEnabled: v })} />
          </div>

          {local.smtpEnabled && (
            <>
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-2">
                <div className="flex items-start gap-2 text-blue-900">
                  <Info className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="text-xs leading-relaxed space-y-1">
                    <p className="font-semibold">{tr("Gmail 설정 안내", "Gmail setup")}</p>
                    <p>
                      {tr(
                        "smtp.gmail.com · 포트 587 · 2단계 인증 후 앱 비밀번호 사용",
                        "smtp.gmail.com · port 587 · use an App Password after 2FA",
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp-host">{tr("SMTP 호스트", "SMTP host")}</Label>
                  <Input id="smtp-host" value={local.smtpHost} onChange={(e) => patch({ smtpHost: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-port">{tr("SMTP 포트", "SMTP port")}</Label>
                  <Input id="smtp-port" type="number" value={local.smtpPort} onChange={(e) => patch({ smtpPort: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-user">{tr("발신 이메일", "Sender email")}</Label>
                  <Input id="smtp-user" type="email" value={local.smtpUser} onChange={(e) => patch({ smtpUser: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-pass">{tr("앱 비밀번호", "App password")}</Label>
                  <Input id="smtp-pass" type="password" value={local.smtpPass} onChange={(e) => patch({ smtpPass: e.target.value })} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="smtp-sender-name">{tr("발신인 표시 이름", "Sender display name")}</Label>
                  <Input
                    id="smtp-sender-name"
                    value={local.smtpSenderName}
                    onChange={(e) => patch({ smtpSenderName: e.target.value })}
                    placeholder={tenantShopName || tr("우리 꽃집", "Our flower shop")}
                  />
                  <p className="text-xs text-muted-foreground">
                    {tr(
                      "비워두면 로그인한 매장 이름이 이메일에 표시됩니다.",
                      "If empty, your logged-in shop name appears in emails.",
                    )}
                  </p>
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
              <Switch checked={local.autoEmailProductionComplete} onCheckedChange={(v) => patch({ autoEmailProductionComplete: v })} />
            </div>
            <div className="flex items-center justify-between gap-4 p-3 rounded-lg border">
              <div>
                <Label>{tr("배송완료 자동 이메일", "Auto: delivery complete")}</Label>
                <p className="text-xs text-muted-foreground">{tr("주문 상세 버튼 발송은 항상 가능", "Manual send always works")}</p>
              </div>
              <Switch checked={local.autoEmailDeliveryComplete} onCheckedChange={(v) => patch({ autoEmailDeliveryComplete: v })} />
            </div>
            <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-pink-100 bg-pink-50/30">
              <div>
                <Label className="flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5 text-pink-600" />
                  {tr("기념일 D-7 자동 이메일", "Auto: anniversary D-7 email")}
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {tr(
                    "매일 09:00(KST) Trigger.dev 배치 · 기념일 7일 전 · 고객 이메일+마케팅 동의 시 발송 (없으면 문자)",
                    "Daily 09:00 KST batch · 7 days before anniversary · email if available, else SMS",
                  )}
                </p>
              </div>
              <Switch checked={local.autoEmailAnniversaryD7} onCheckedChange={(v) => patch({ autoEmailAnniversaryD7: v })} />
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
          variables={["고객명", "주문번호", "회사명"]}
          defaultTemplate={DEFAULT_EMAIL_TEMPLATE_PRODUCTION_COMPLETE}
          sampleData={templatePreviewSample}
          shopLogoUrl={tenantLogoUrl}
        />
        <EmailTemplateEditor
          templateName={tr("배송완료", "Delivery complete")}
          value={local.emailTemplateDeliveryComplete}
          onChange={(v) => patch({ emailTemplateDeliveryComplete: v })}
          variables={["고객명", "주문번호", "배송일", "수령인", "회사명"]}
          defaultTemplate={DEFAULT_EMAIL_TEMPLATE_DELIVERY_COMPLETE}
          sampleData={templatePreviewSample}
          shopLogoUrl={tenantLogoUrl}
        />
        <EmailTemplateEditor
          templateName={tr("기념일 D-7", "Anniversary D-7")}
          value={local.emailTemplateAnniversaryD7}
          onChange={(v) => patch({ emailTemplateAnniversaryD7: v })}
          variables={["고객명", "회사명", "기념일명", "기념일", "주문링크"]}
          defaultTemplate={DEFAULT_EMAIL_TEMPLATE_ANNIVERSARY_D7}
          sampleData={templatePreviewSample}
          shopLogoUrl={tenantLogoUrl}
        />
        <Button onClick={handleSave} disabled={saving} className="w-full md:w-auto">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          {tr("템플릿 저장", "Save templates")}
        </Button>
      </div>
    </div>
  );
}
