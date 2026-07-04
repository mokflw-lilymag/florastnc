"use client";
import { getMessages } from "@/i18n/getMessages";

import Link from "next/link";
import { Settings, ShieldAlert, Globe, Mail, History, ExternalLink, Loader2, Save } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { AccessDenied } from "@/components/access-denied";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { PartnerOrdersFeatureSwitch } from "./components/partner-orders-feature-switch";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function SystemSettingsPage() {
  const { isSuperAdmin, isLoading } = useAuth();
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const baseLocale = toBaseLocale(locale);

  const [settings, setSettings] = useState<any>({});
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isSuperAdmin) {
      fetch("/api/admin/system-settings/hq")
        .then((res) => res.json())
        .then((data) => {
          if (data.data) {
            setSettings(data.data);
          }
        })
        .catch(console.error)
        .finally(() => setIsFetching(false));
    } else if (!isLoading) {
      setIsFetching(false);
    }
  }, [isSuperAdmin, isLoading]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/system-settings/hq", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) throw new Error("저장 실패");
      toast.success("전역 설정이 저장되었습니다.");
    } catch (err: any) {
      toast.error(err.message || "오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (key: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [key]: value }));
  };

  if (isLoading || isFetching) return <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

  if (!isSuperAdmin) {
    return <AccessDenied requiredTier="System Admin" />;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader 
          title={tf.f01483} 
          description={tf.f01399} 
          icon={Settings}
        >
          <span className="text-xs text-muted-foreground hidden sm:inline">
            플랫폼 전체에 적용되는 기본 환경 변수와 수수료 등을 설정합니다.
          </span>
        </PageHeader>
        <Button onClick={handleSave} disabled={isSaving} className="gap-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl px-6">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          저장하기
        </Button>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="bg-slate-100 dark:bg-slate-900/50 p-1 mb-6 rounded-xl">
          <TabsTrigger value="general" className="gap-2 rounded-lg data-[state=active]:bg-white">
            <Globe className="h-4 w-4" /> {tf.f01008}
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2 rounded-lg data-[state=active]:bg-white">
            <ShieldAlert className="h-4 w-4" /> 정산 및 보안
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2 rounded-lg data-[state=active]:bg-white">
            <History className="h-4 w-4" /> {tf.f00854}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <PartnerOrdersFeatureSwitch />
          <Card className="rounded-3xl shadow-sm border-emerald-100 bg-emerald-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4 text-emerald-700" />
                본사 메일 · SMTP
              </CardTitle>
              <CardDescription>
                비밀번호 초기화, 베타·계약·출고 안내 등 본사 발송 메일은 <strong>이메일 허브</strong>에서 SMTP·템플릿·발송을 한곳에서 관리합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard/admin/email-hub"
                className={buttonVariants({ className: "gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800" })}
              >
                <ExternalLink className="h-4 w-4" />
                이메일 · SMTP 허브 열기
              </Link>
            </CardContent>
          </Card>
          <Card className="rounded-3xl shadow-sm border-slate-100">
            <CardHeader>
              <CardTitle>{tf.f01400}</CardTitle>
              <CardDescription>{tf.f02147}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="site-name">{tf.f01325}</Label>
                  <Input 
                    id="site-name" 
                    value={settings.siteName ?? "FloXync"} 
                    onChange={(e) => updateSetting("siteName", e.target.value)} 
                    className="rounded-xl bg-slate-50/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-email">{tf.f00967}</Label>
                  <Input 
                    id="admin-email" 
                    value={settings.contactEmail ?? "admin@floxync.io"} 
                    onChange={(e) => updateSetting("contactEmail", e.target.value)}
                    className="rounded-xl bg-slate-50/50"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card className="rounded-3xl shadow-sm border-slate-100">
            <CardHeader>
              <CardTitle>수수료 정산 비율 설정</CardTitle>
              <CardDescription>가맹점 간 발주·수주 처리 시 적용되는 기본 정산 비율입니다. (총 100% 권장)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="fulfiller-rate">{tf.f01458}</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      id="fulfiller-rate" 
                      type="number" 
                      value={settings.fulfillerRate ?? 79} 
                      onChange={(e) => updateSetting("fulfillerRate", Number(e.target.value))}
                      className="font-bold rounded-xl bg-slate-50/50" 
                    />
                    <span className="text-slate-400">%</span>
                  </div>
                  <p className="text-[10px] text-slate-400">{tf.f01608}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sender-rate">{tf.f01230}</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      id="sender-rate" 
                      type="number" 
                      value={settings.senderRate ?? 19} 
                      onChange={(e) => updateSetting("senderRate", Number(e.target.value))}
                      className="font-bold text-blue-600 rounded-xl bg-blue-50/50 border-blue-100" 
                    />
                    <span className="text-slate-400">%</span>
                  </div>
                  <p className="text-[10px] text-slate-400">{tf.f01607}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="platform-rate">{tf.f02149}</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      id="platform-rate" 
                      type="number" 
                      value={settings.platformRate ?? 2} 
                      onChange={(e) => updateSetting("platformRate", Number(e.target.value))}
                      className="font-bold text-amber-600 rounded-xl bg-amber-50/50 border-amber-100" 
                    />
                    <span className="text-slate-400">%</span>
                  </div>
                  <p className="text-[10px] text-slate-400">{tf.f01481}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200">
                <h4 className="text-sm font-semibold mb-2">{tf.f00930} (100,000원 결제 예시)</h4>
                <div className="grid grid-cols-3 text-xs gap-4">
                  <div className="flex flex-col gap-1">
                     <span className="text-slate-500">{tf.f01457}</span>
                     <span className="font-bold">{(settings.fulfillerRate ?? 79) * 1000}원</span>
                  </div>
                  <div className="flex flex-col gap-1">
                     <span className="text-blue-500">{tf.f01231}</span>
                     <span className="font-bold text-blue-600">{(settings.senderRate ?? 19) * 1000}원</span>
                  </div>
                  <div className="flex flex-col gap-1">
                     <span className="text-amber-500">{tf.f01886}</span>
                     <span className="font-bold text-amber-600">{(settings.platformRate ?? 2) * 1000}원</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card className="rounded-3xl shadow-sm border-slate-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-4 w-4" />
                {tf.f00854}
              </CardTitle>
              <CardDescription>
                구독 실결제·관리자 부여 이력은 전용 화면에서 조회합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                토스·Stripe 결제, 수동 연장(사유 포함)이 <code className="text-xs bg-slate-100 px-1 rounded">tenant_subscription_events</code> 테이블에 기록됩니다.
              </p>
              <Link
                href="/dashboard/admin/subscription-events"
                className={buttonVariants({ className: "gap-2 rounded-xl" })}
              >
                <ExternalLink className="h-4 w-4" />
                구독·결제 이력 열기
              </Link>
              <Link
                href="/dashboard/tenants"
                className={buttonVariants({ variant: "outline", className: "gap-2 ml-2 rounded-xl" })}
              >
                매장 관리 (매장별 이력)
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
