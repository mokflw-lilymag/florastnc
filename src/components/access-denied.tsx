"use client";

import { ShieldAlert, ArrowLeft, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";

interface AccessDeniedProps {
  requiredTier: "Ribbon" | "ERP" | "Pro";
}

export function AccessDenied({ requiredTier }: AccessDeniedProps) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-md w-full border-red-100 dark:border-red-900/30 shadow-xl overflow-hidden">
        <div className="h-2 bg-red-500" />
        <CardHeader className="text-center pb-2">
          <div className="mx-auto bg-red-50 dark:bg-red-900/20 p-3 rounded-full w-fit mb-4">
            <ShieldAlert className="h-10 w-10 text-red-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">접근 권한 제한</CardTitle>
          <CardDescription className="text-slate-500 mt-2">
            요청하신 페이지에 접근할 수 있는 권한이 없습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            현재 이용 중인 플랜에는 <span className="font-bold text-slate-900 dark:text-white underline decoration-red-500/30 decoration-2">{requiredTier}</span> 기능이 포함되어 있지 않습니다.
          </p>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 text-xs text-left text-slate-500 border border-slate-100 dark:border-slate-800">
            <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <CreditCard className="h-3 w-3" /> 해결 방법:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-1">
              <li>상단 메뉴의 [플랜 및 환경 설정]에서 플랜을 업그레이드 하세요.</li>
              <li>관리자에게 문의하여 계정 권한을 확인하세요.</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 pt-2">
          <Button 
            className="w-full bg-slate-900 hover:bg-slate-800 text-white"
            onClick={() => router.push("/dashboard/settings")}
          >
            플랜 업그레이드 하러 가기
          </Button>
          <Button 
            variant="ghost" 
            className="w-full text-slate-500"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> 이전 페이지로 돌아가기
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
