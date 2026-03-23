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

export default function SystemSettingsPage() {
  const { profile, isLoading } = useAuth();
  const isSuperAdmin = profile?.role === 'super_admin';

  if (isLoading) return null;

  if (!isSuperAdmin) {
    return <AccessDenied requiredTier="System Admin" />;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader 
        title="시스템 전역 설정" 
        description="서비스 전체의 구동 방식과 글로벌 정책을 관리합니다." 
        icon={Settings}
      >
        <Button className="bg-slate-900 dark:bg-slate-100 dark:text-slate-900">
          <Save className="h-4 w-4 mr-2" /> 변경사항 저장
        </Button>
      </PageHeader>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="bg-slate-100 dark:bg-slate-900/50 p-1 mb-6">
          <TabsTrigger value="general" className="gap-2">
            <Globe className="h-4 w-4" /> 기본 설정
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <ShieldAlert className="h-4 w-4" /> 보안 정책
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" /> 알림 설정
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <History className="h-4 w-4" /> 감사 로그
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>서비스 정보</CardTitle>
              <CardDescription>플랫폼 전역에서 사용되는 기본 정보입니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="site-name">사이트 명칭</Label>
                  <Input id="site-name" defaultValue="Florasync SaaS" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-email">관리자 수신 이메일</Label>
                  <Input id="admin-email" defaultValue="admin@florasync.io" />
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label>점검 모드 (Maintenance Mode)</Label>
                  <p className="text-xs text-muted-foreground">활성화 시 모든 일반 사용자의 접근을 차단합니다.</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>보안 및 접근 제어</CardTitle>
              <CardDescription>계정 보안과 API 접근에 대한 정책을 설정합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b">
                <div className="space-y-0.5">
                  <Label>2단계 인증(2FA) 강제</Label>
                  <p className="text-xs text-muted-foreground">모든 테넌트 관리자에게 2단계 인증을 필수로 요구합니다.</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <div className="space-y-0.5">
                  <Label>신규 가입 즉시 승인</Label>
                  <p className="text-xs text-muted-foreground">비활성 시 관리자가 직접 승인해야 서비스 이용이 가능합니다.</p>
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
