"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { ShieldCheck, Store, Users, ArrowRight, Printer, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const supabase = createClient();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        // Fetch role
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        
        setIsSuperAdmin(profile?.role === 'super_admin');
      }
      setLoading(false);
    });
  }, [supabase.auth, supabase]);

  if (loading) {
    return <div className="animate-pulse h-96 bg-slate-200/50 dark:bg-slate-800/50 rounded-xl"></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
          {isSuperAdmin ? (
            <><ShieldCheck className="text-blue-600 h-8 w-8" /> 시스템 개요</>
          ) : (
            <><Store className="text-green-600 h-8 w-8" /> 우리 화원 리포트</>
          )}
        </h1>
        <p className="text-slate-500 mt-2">
          {isSuperAdmin 
            ? "Florasync SaaS에 등록된 전체 화원과 인프라 현황을 요약합니다."
            : "새로운 주문과 리본 출력 현황 등 오늘의 주요 업무를 한눈에 확인하세요."
          }
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Metric Cards placeholders */}
        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">이번 달 매출</CardTitle>
            <span className="text-2xl">💰</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₩0</div>
            <p className="text-xs text-muted-foreground">+0% from last month</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isSuperAdmin ? "전체 등록 화원" : "신규 주문 건수"}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle>최근 활동 내역</CardTitle>
            <CardDescription>
              {isSuperAdmin ? "시스템 전체의 주요 변동 로깅" : "주문 및 리본 출력 상태 업데이트"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <AlertCircle className="h-10 w-10 text-slate-400" />
              <p className="text-slate-500 text-sm">기록된 활동 내용이 없습니다.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle>빠른 실행</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isSuperAdmin ? (
              <>
                <Button variant="outline" className="w-full justify-between h-14">
                  <div className="flex items-center"><Store className="mr-3 h-5 w-5 text-blue-500" /> 신규 가입 화원 승인</div>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </Button>
                <Button variant="outline" className="w-full justify-between h-14">
                  <div className="flex items-center"><ShieldCheck className="mr-3 h-5 w-5 text-purple-500" /> 서비스 요금제 편집</div>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" className="w-full justify-between h-14 border-blue-200 dark:border-blue-900 hover:bg-blue-50 dark:hover:bg-blue-900/30">
                  <div className="flex items-center"><Printer className="mr-3 h-5 w-5 text-blue-600" /> 리본 캔버스 열기</div>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </Button>
                <Button variant="outline" className="w-full justify-between h-14">
                  <div className="flex items-center"><Store className="mr-3 h-5 w-5 text-green-600" /> 스마트스토어 연동 설정</div>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
