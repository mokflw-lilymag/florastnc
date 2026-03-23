"use client";

import { ScrollText, Plus, Bell, Eye, Edit, Trash2, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { AccessDenied } from "@/components/access-denied";

export default function AnnouncementsPage() {
  const { profile, isLoading } = useAuth();
  const isSuperAdmin = profile?.role === 'super_admin';

  if (isLoading) return null;

  if (!isSuperAdmin) {
    return <AccessDenied requiredTier="System Admin" />;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader 
        title="글로벌 공지사항 관리" 
        description="모든 테넌트와 사용자에게 공유할 보도자료 및 공지사항을 작성합니다." 
        icon={ScrollText}
      >
        <Button className="bg-slate-900 dark:bg-slate-100 dark:text-slate-900">
          <Plus className="h-4 w-4 mr-2" /> 새 공지 작성
        </Button>
      </PageHeader>

      <div className="space-y-4">
        <Card className="hover:border-blue-200 transition-colors">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-orange-500">중요</Badge>
                <span className="text-xs text-slate-500">2024.03.20</span>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
            <CardTitle className="text-lg mt-2">시스템 점검 안내 (3월 25일)</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
              서비스 안정성을 위한 정기 점검이 예정되어 있습니다. 점검 시간에는 서비스 이용이 제한될 수 있습니다.
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-slate-300 transition-colors">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">일반</Badge>
                <span className="text-xs text-slate-500">2024.03.18</span>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
            <CardTitle className="text-lg mt-2">리본 프린터 신규 폰트 추가 안내</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
             <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
              사용자 여러분의 요청에 따라 감성적인 흘림체 등 5종의 신규 폰트가 추가되었습니다.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col items-center justify-center p-20 bg-slate-50/50 dark:bg-slate-900/20 rounded-xl border-2 border-dashed gap-4">
         <Megaphone className="h-10 w-10 text-slate-300" />
         <div className="text-center">
            <h3 className="font-semibold text-slate-600">더 많은 소식을 전해 보세요</h3>
            <p className="text-sm text-slate-400">등록된 공지사항이 대시보드 메인에 노출됩니다.</p>
         </div>
      </div>
    </div>
  );
}
