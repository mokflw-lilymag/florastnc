"use client";

import { CreditCard, TrendingUp, Users, DollarSign, Download, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { AccessDenied } from "@/components/access-denied";

export default function BillingAdminPage() {
  const { profile, isLoading } = useAuth();
  const isSuperAdmin = profile?.role === 'super_admin';

  if (isLoading) return null;

  if (!isSuperAdmin) {
    return <AccessDenied requiredTier="System Admin" />;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader 
        title="구독 및 결제 관제" 
        description="전체 테넌트의 매출 현황과 구독 상태를 모니터링합니다." 
        icon={CreditCard}
      >
        <Button variant="outline" className="border-slate-200">
           <Download className="h-4 w-4 mr-2" /> 엑셀 다운로드
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-blue-700 dark:text-blue-300">월 매출 (MRR)</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">₩14,250,000</div>
            <p className="text-[10px] text-blue-600/80 dark:text-blue-400/80 mt-1">+12.5% from last month</p>
          </CardContent>
        </Card>
        
        <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-purple-700 dark:text-purple-300">활성 구독</CardTitle>
            <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">242</div>
            <p className="text-[10px] text-purple-600/80 dark:text-purple-400/80 mt-1">+5 new this week</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>최근 결제 내역</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-500 text-center py-10 border-2 border-dashed rounded-lg">
             결제 내역을 불러오는 중이거나 데이터가 없습니다.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
