"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatKrw } from "@/lib/staff-salary-calc";
import { formatServiceTenure } from "@/lib/payroll/severance-kr";
import type { SeveranceEstimate } from "@/lib/payroll/types";
import { Landmark } from "lucide-react";

interface StaffSeveranceCardProps {
  staffId: string | null;
}

export function StaffSeveranceCard({ staffId }: StaffSeveranceCardProps) {
  const [estimate, setEstimate] = useState<SeveranceEstimate | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!staffId) return;
    setLoading(true);
    fetch(`/api/staff/severance?staffId=${staffId}`)
      .then((r) => r.json())
      .then((json) => {
        setEstimate(json.estimate ?? null);
        setMessage(json.message ?? null);
      })
      .catch(() => setMessage("퇴직금 조회에 실패했습니다."))
      .finally(() => setLoading(false));
  }, [staffId]);

  if (!staffId) return null;

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Landmark className="w-4 h-4 text-amber-600" />
          퇴직금 예상 (한국)
        </CardTitle>
        <CardDescription>근로자퇴직급여보장법 기준 참고용</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-slate-500">계산 중...</p>
        ) : message && !estimate ? (
          <p className="text-sm text-slate-500">{message}</p>
        ) : estimate ? (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">근속</span>
              <span className="font-medium">
                {formatServiceTenure(estimate.serviceDays)} ({estimate.serviceYears}년)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">1일 평균임금</span>
              <span>{formatKrw(estimate.dailyAverageWage)}</span>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-center">
              <p className="text-xs text-amber-800 mb-1">퇴사 시 예상 퇴직금</p>
              <p className="text-2xl font-bold text-amber-900">
                {formatKrw(estimate.estimatedAmount)}
              </p>
            </div>
            <p className="text-xs text-slate-500">{estimate.basisDescription}</p>
            <p className="text-xs text-slate-400">{estimate.disclaimer}</p>
            {!estimate.eligible && estimate.hireDate && (
              <p className="text-xs text-rose-600">1년 미만 근속 시 퇴직금 지급 의무가 없을 수 있습니다.</p>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
