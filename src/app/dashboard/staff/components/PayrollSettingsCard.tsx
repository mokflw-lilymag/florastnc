"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@/hooks/use-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Globe, Save } from "lucide-react";
import { PAYROLL_JURISDICTION_OPTIONS } from "@/lib/payroll/types";
import type { CompensationModel, PayrollMode } from "@/lib/payroll/types";
import { toast } from "sonner";

export function PayrollSettingsCard() {
  const { settings, saveSettings } = useSettings();
  const [saving, setSaving] = useState(false);
  const [jurisdiction, setJurisdiction] = useState("KR");
  const [payrollMode, setPayrollMode] = useState<PayrollMode>("auto");
  const [fullTimeModel, setFullTimeModel] = useState<CompensationModel>("annual");

  useEffect(() => {
    if (!settings) return;
    const j = settings.payrollJurisdiction || settings.country || "KR";
    setJurisdiction(j);
    setPayrollMode(settings.payrollMode ?? (j === "KR" ? "auto" : "manual"));
    setFullTimeModel(settings.fullTimeCompensationModel ?? "annual");
  }, [settings]);

  if (!settings) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSettings({
        ...settings,
        payrollJurisdiction: jurisdiction,
        payrollMode,
        fullTimeCompensationModel: fullTimeModel,
      });
      toast.success("급여·노동 설정이 저장되었습니다.");
    } catch {
      toast.error("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-500" />
            급여·노동 (국가)
          </CardTitle>
          <CardDescription className="mt-1">
            국가별 급여 계산 방식. 한국 외 지역은 수동 명세 모드를 권장합니다.
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
          <Save className="w-4 h-4 mr-1" />
          {saving ? "저장 중..." : "저장"}
        </Button>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>급여 관할 국가</Label>
          <select
            className="w-full h-9 rounded-md border px-3 text-sm"
            value={jurisdiction}
            onChange={(e) => {
              const code = e.target.value;
              setJurisdiction(code);
              if (code !== "KR") setPayrollMode("manual");
              else setPayrollMode("auto");
            }}
          >
            {PAYROLL_JURISDICTION_OPTIONS.map((o) => (
              <option key={o.code} value={o.code}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500">매장 국가: {settings.country}</p>
        </div>

        <div className="space-y-2">
          <Label>계산 모드</Label>
          <select
            className="w-full h-9 rounded-md border px-3 text-sm"
            value={payrollMode}
            onChange={(e) => setPayrollMode(e.target.value as PayrollMode)}
          >
            <option value="auto">자동 (국가 법규 모듈)</option>
            <option value="manual">수동 (지급·공제 직접 입력)</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label>정직원 기본 보수</Label>
          <select
            className="w-full h-9 rounded-md border px-3 text-sm"
            value={fullTimeModel}
            onChange={(e) => setFullTimeModel(e.target.value as CompensationModel)}
          >
            <option value="annual">년봉제 (÷12 월 환산)</option>
            <option value="monthly">월급제</option>
          </select>
        </div>
      </CardContent>
    </Card>
  );
}
