"use client";

import { Settings, Save, ShieldAlert, Globe, Bell, History } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export default function SystemSettingsPage() {
  const { profile, isSuperAdmin, isLoading } = useAuth();
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const tr = (koText: string, enText: string) => (baseLocale === "ko" ? koText : enText);

  if (isLoading) return null;

  if (!isSuperAdmin) {
    return <AccessDenied requiredTier="System Admin" />;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader 
        title={tr("시스템 전역 설정", "Global System Settings")} 
        description={tr("서비스 전체의 구동 방식과 글로벌 정책을 관리합니다.", "Manage platform-wide runtime behavior and global policies.")} 
        icon={Settings}
      >
        <Button className="bg-slate-900 dark:bg-slate-100 dark:text-slate-900">
          <Save className="h-4 w-4 mr-2" /> {tr("변경사항 저장", "Save Changes")}
        </Button>
      </PageHeader>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="bg-slate-100 dark:bg-slate-900/50 p-1 mb-6">
          <TabsTrigger value="general" className="gap-2">
            <Globe className="h-4 w-4" /> {tr("기본 설정", "General")}
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <ShieldAlert className="h-4 w-4" /> {tr("보안 정책", "Security")}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" /> {tr("알림 설정", "Notifications")}
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <History className="h-4 w-4" /> {tr("감사 로그", "Audit Log")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{tr("서비스 정보", "Service Information")}</CardTitle>
              <CardDescription>{tr("플랫폼 전역에서 사용되는 기본 정보입니다.", "Default information used across the platform.")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="site-name">{tr("사이트 명칭", "Site Name")}</Label>
                  <Input id="site-name" defaultValue="Floxync SaaS" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-email">{tr("관리자 수신 이메일", "Admin Receiver Email")}</Label>
                  <Input id="admin-email" defaultValue="admin@floxync.io" />
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label>{tr("점검 모드 (Maintenance Mode)", "Maintenance Mode")}</Label>
                  <p className="text-xs text-muted-foreground">{tr("활성화 시 모든 일반 사용자의 접근을 차단합니다.", "When enabled, all regular user access is blocked.")}</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{tr("수익 배분 모델 설정 (79 / 19 / 2)", "Revenue Split Model (79 / 19 / 2)")}</CardTitle>
              <CardDescription>{tr("외부 발주 시 회원사 간 수익 배분 비율을 설정합니다. (합계 100% 필수)", "Set the revenue split ratio among member shops for external orders. (Must total 100%)")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="fulfiller-rate">{tr("수주사 정산 비율 (%)", "Fulfiller Share (%)")}</Label>
                  <div className="flex items-center gap-2">
                    <Input id="fulfiller-rate" type="number" defaultValue={79} className="font-bold" />
                    <span className="text-slate-400">%</span>
                  </div>
                  <p className="text-[10px] text-slate-400">{tr("오더를 처리하는 화원사가 받는 금액", "Amount received by the fulfilling flower shop")}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sender-rate">{tr("발주사 수익 비율 (%)", "Sender Share (%)")}</Label>
                  <div className="flex items-center gap-2">
                    <Input id="sender-rate" type="number" defaultValue={19} className="font-bold text-blue-600" />
                    <span className="text-slate-400">%</span>
                  </div>
                  <p className="text-[10px] text-slate-400">{tr("오더를 보내는 화원사가 취하는 수익", "Profit taken by the sending flower shop")}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="platform-rate">{tr("플랫폼 중계 수수료 (%)", "Platform Fee (%)")}</Label>
                  <div className="flex items-center gap-2">
                    <Input id="platform-rate" type="number" defaultValue={2} className="font-bold text-amber-600" />
                    <span className="text-slate-400">%</span>
                  </div>
                  <p className="text-[10px] text-slate-400">{tr("시스템 운영사에 지급되는 수수료", "Fee paid to the platform operator")}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200">
                <h4 className="text-sm font-semibold mb-2">{tr("계산 예시 (100,000원 주문 기준)", "Calculation Example (for 100,000 KRW order)")}</h4>
                <div className="grid grid-cols-3 text-xs gap-4">
                  <div className="flex flex-col gap-1">
                     <span className="text-slate-500">{tr("수주사", "Fulfiller")}</span>
                     <span className="font-bold">79,000원</span>
                  </div>
                  <div className="flex flex-col gap-1">
                     <span className="text-blue-500">{tr("발주사(나)", "Sender (me)")}</span>
                     <span className="font-bold text-blue-600">19,000원</span>
                  </div>
                  <div className="flex flex-col gap-1">
                     <span className="text-amber-500">{tr("중계수수료", "Platform Fee")}</span>
                     <span className="font-bold text-amber-600">2,000원</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between py-2 border-t pt-4">
                <div className="space-y-0.5">
                  <Label>{tr("자동 정산 활성화", "Enable Auto Settlement")}</Label>
                  <p className="text-xs text-muted-foreground">{tr("발주 완료 시 상기 비율로 정산 데이터를 자동 생성합니다.", "Automatically creates settlement data with the ratio above when an order completes.")}</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{tr("보안 및 접근 제어", "Security & Access Control")}</CardTitle>
              <CardDescription>{tr("계정 보안과 API 접근에 대한 정책을 설정합니다.", "Configure account security and API access policies.")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b">
                <div className="space-y-0.5">
                  <Label>{tr("2단계 인증(2FA) 강제", "Enforce 2FA")}</Label>
                  <p className="text-xs text-muted-foreground">{tr("모든 테넌트 관리자에게 2단계 인증을 필수로 요구합니다.", "Require 2FA for all tenant administrators.")}</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <div className="space-y-0.5">
                  <Label>{tr("신규 가입 즉시 승인", "Auto-approve New Signups")}</Label>
                  <p className="text-xs text-muted-foreground">{tr("비활성 시 관리자가 직접 승인해야 서비스 이용이 가능합니다.", "When disabled, admins must approve signups manually.")}</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
