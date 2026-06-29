"use client";
import { getMessages } from "@/i18n/getMessages";

import Link from "next/link";
import { Settings, ShieldAlert, Globe, Bell, History, ExternalLink } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { AccessDenied } from "@/components/access-denied";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { PartnerOrdersFeatureSwitch } from "./components/partner-orders-feature-switch";

export default function SystemSettingsPage() {
  const { isSuperAdmin, isLoading } = useAuth();
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const baseLocale = toBaseLocale(locale);
  if (isLoading) return null;

  if (!isSuperAdmin) {
    return <AccessDenied requiredTier="System Admin" />;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader 
        title={tf.f01483} 
        description={tf.f01399} 
        icon={Settings}
      >
        <span className="text-xs text-muted-foreground hidden sm:inline">
          플랫폼 수수료·알림은 준비 중입니다. 구독 감사는 결제 이력 메뉴를 이용하세요.
        </span>
      </PageHeader>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="bg-slate-100 dark:bg-slate-900/50 p-1 mb-6">
          <TabsTrigger value="general" className="gap-2">
            <Globe className="h-4 w-4" /> {tf.f01008}
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <ShieldAlert className="h-4 w-4" /> {tf.f01257}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" /> {tf.f01527}
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <History className="h-4 w-4" /> {tf.f00854}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <PartnerOrdersFeatureSwitch />
          <Card>
            <CardHeader>
              <CardTitle>{tf.f01400}</CardTitle>
              <CardDescription>{tf.f02147}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="site-name">{tf.f01325}</Label>
                  <Input id="site-name" defaultValue="FloXync" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-email">{tf.f00967}</Label>
                  <Input id="admin-email" defaultValue="admin@floxync.io" />
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label>{tf.f01812}</Label>
                  <p className="text-xs text-muted-foreground">{tf.f02227}</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{tf.f01451}</CardTitle>
              <CardDescription>{tf.f01617}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="fulfiller-rate">{tf.f01458}</Label>
                  <div className="flex items-center gap-2">
                    <Input id="fulfiller-rate" type="number" defaultValue={79} className="font-bold" />
                    <span className="text-slate-400">%</span>
                  </div>
                  <p className="text-[10px] text-slate-400">{tf.f01608}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sender-rate">{tf.f01230}</Label>
                  <div className="flex items-center gap-2">
                    <Input id="sender-rate" type="number" defaultValue={19} className="font-bold text-blue-600" />
                    <span className="text-slate-400">%</span>
                  </div>
                  <p className="text-[10px] text-slate-400">{tf.f01607}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="platform-rate">{tf.f02149}</Label>
                  <div className="flex items-center gap-2">
                    <Input id="platform-rate" type="number" defaultValue={2} className="font-bold text-amber-600" />
                    <span className="text-slate-400">%</span>
                  </div>
                  <p className="text-[10px] text-slate-400">{tf.f01481}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200">
                <h4 className="text-sm font-semibold mb-2">{tf.f00930}</h4>
                <div className="grid grid-cols-3 text-xs gap-4">
                  <div className="flex flex-col gap-1">
                     <span className="text-slate-500">{tf.f01457}</span>
                     <span className="font-bold">79,000원</span>
                  </div>
                  <div className="flex flex-col gap-1">
                     <span className="text-blue-500">{tf.f01231}</span>
                     <span className="font-bold text-blue-600">19,000원</span>
                  </div>
                  <div className="flex flex-col gap-1">
                     <span className="text-amber-500">{tf.f01886}</span>
                     <span className="font-bold text-amber-600">2,000원</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between py-2 border-t pt-4">
                <div className="space-y-0.5">
                  <Label>{tf.f01727}</Label>
                  <p className="text-xs text-muted-foreground">{tf.f01228}</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{tf.f01255}</CardTitle>
              <CardDescription>{tf.f00931}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b">
                <div className="space-y-0.5">
                  <Label>{tf.f00834}</Label>
                  <p className="text-xs text-muted-foreground">{tf.f01198}</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <div className="space-y-0.5">
                  <Label>{tf.f01491}</Label>
                  <p className="text-xs text-muted-foreground">{tf.f01313}</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{tf.f01527}</CardTitle>
              <CardDescription>관리자 알림·이메일 템플릿은 추후 연동 예정입니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                만료 임박·연체 알림은 현재 대시보드와 SaaS 구독 메뉴에서 확인하세요.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
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
                className={buttonVariants({ className: "gap-2" })}
              >
                <ExternalLink className="h-4 w-4" />
                구독·결제 이력 열기
              </Link>
              <Link
                href="/dashboard/tenants"
                className={buttonVariants({ variant: "outline", className: "gap-2 ml-2" })}
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
