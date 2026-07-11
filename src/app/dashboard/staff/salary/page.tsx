"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import { toast } from "sonner";
import { StaffSubNav } from "@/app/dashboard/staff/components/staff-sub-nav";
import { StaffFinancialForm } from "@/app/dashboard/staff/components/StaffFinancialForm";
import { StaffSeveranceCard } from "@/app/dashboard/staff/components/StaffSeveranceCard";
import { PayrollSettingsCard } from "@/app/dashboard/staff/components/PayrollSettingsCard";
import { resolvePayrollConfig, syncFinancialFromAnnual } from "@/lib/payroll/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calculator,
  Eye,
  FileDown,
  Mail,
  Printer,
  RefreshCw,
  Save,
  Wallet,
} from "lucide-react";
import type { StaffFinancial, StaffSalaryStatement } from "@/types/staff-salary";
import { StaffPayslipBreakdown } from "@/app/dashboard/staff/components/StaffPayslipBreakdown";
import { PayslipPreviewDialog } from "@/app/dashboard/staff/components/PayslipPreviewDialog";
import { exportStaffSalaryToExcel } from "@/lib/staff-hr-excel";
import { createClient } from "@/utils/supabase/client";

interface StaffRow {
  id: string;
  name: string;
  position?: string | null;
  email?: string | null;
}

type StatementRow = StaffSalaryStatement & {
  tenant_staff?: { name: string; position?: string; email?: string } | null;
};

const EMPTY_FIN: StaffFinancial = {
  staff_id: "",
  employment_type: "정직원",
  salary_type: "월급",
  compensation_model: "annual",
  annual_salary: 0,
  base_salary: 0,
  meal_allowance_monthly: 200000,
  insurance_national_pension: true,
  insurance_health: true,
  insurance_employment: true,
};

export default function StaffSalaryPage() {
  const { canManageStaff, isLoading: authLoading, tenantId } = useAuth();
  const { settings } = useSettings();
  const payroll = resolvePayrollConfig(settings ?? {});
  const [staffList, setStaffList] = useState<StaffRow[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [yearMonth, setYearMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [financial, setFinancial] = useState<StaffFinancial>(EMPTY_FIN);
  const [statement, setStatement] = useState<StatementRow | null>(null);
  const [incomeTaxManual, setIncomeTaxManual] = useState(0);
  const [manualDeductions, setManualDeductions] = useState(0);
  const [manualIncomeTax, setManualIncomeTax] = useState(0);
  const [manualLocalTax, setManualLocalTax] = useState(0);
  const [manualInsurance, setManualInsurance] = useState(0);
  const [overtimePay, setOvertimePay] = useState(0);
  const [otherAllowance, setOtherAllowance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [allStatements, setAllStatements] = useState<StatementRow[]>([]);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [schemaWarning, setSchemaWarning] = useState<string | null>(null);

  const applySchemaWarning = (msg?: string) => {
    if (msg) setSchemaWarning(msg);
  };

  const fetchStaff = useCallback(async () => {
    if (!tenantId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("tenant_staff")
      .select("id, name, position, email")
      .eq("tenant_id", tenantId)
      .order("name");
    setStaffList(data || []);
    if (data?.length && !selectedStaffId) setSelectedStaffId(data[0].id);
  }, [tenantId, selectedStaffId]);

  const fetchFinancial = useCallback(async (staffId: string) => {
    const res = await fetch(`/api/staff/financials?staffId=${staffId}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    applySchemaWarning(json.schemaWarning);
    const fin = (json.financials?.[0] as StaffFinancial) ?? {
      ...EMPTY_FIN,
      staff_id: staffId,
    };
    setFinancial({
      ...fin,
      compensation_model: fin.compensation_model ?? "annual",
      annual_salary: fin.annual_salary ?? 0,
    });
  }, []);

  const fetchStatement = useCallback(async (staffId: string, ym: string) => {
    const res = await fetch(
      `/api/staff/salary?staffId=${staffId}&yearMonth=${ym}`,
    );
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    applySchemaWarning(json.schemaWarning);
    const stmt = (json.statements?.[0] as StatementRow) ?? null;
    setStatement(stmt);
    if (stmt) {
      setIncomeTaxManual(stmt.income_tax);
      setOvertimePay(stmt.overtime_pay);
      setOtherAllowance(stmt.other_allowance);
      setManualIncomeTax(stmt.income_tax);
      setManualLocalTax(stmt.local_income_tax);
      setManualInsurance(
        stmt.national_pension +
          stmt.health_insurance +
          stmt.long_term_care +
          stmt.employment_insurance,
      );
    }
  }, []);

  const fetchAllStatements = useCallback(async (ym: string) => {
    const res = await fetch(`/api/staff/salary?yearMonth=${ym}`);
    const json = await res.json();
    if (res.ok) {
      setAllStatements(json.statements || []);
      applySchemaWarning(json.schemaWarning);
    }
  }, []);

  const load = useCallback(async () => {
    if (!selectedStaffId) return;
    setLoading(true);
    try {
      await Promise.all([
        fetchFinancial(selectedStaffId),
        fetchStatement(selectedStaffId, yearMonth),
        fetchAllStatements(yearMonth),
      ]);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "불러오기 실패");
    } finally {
      setLoading(false);
    }
  }, [selectedStaffId, yearMonth, fetchFinancial, fetchStatement, fetchAllStatements]);

  useEffect(() => {
    if (tenantId && canManageStaff) void fetchStaff();
  }, [tenantId, canManageStaff, fetchStaff]);

  useEffect(() => {
    if (selectedStaffId && canManageStaff) void load();
  }, [selectedStaffId, yearMonth, canManageStaff, load]);

  const saveFinancial = async () => {
    if (!selectedStaffId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/staff/financials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          syncFinancialFromAnnual({ ...financial, staff_id: selectedStaffId }),
        ),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setFinancial(json.financial);
      if (json.schemaWarning) {
        toast.warning(json.schemaWarning);
      } else {
        toast.success("계약 정보가 저장되었습니다.");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const calculateAndSave = async (opts?: { saveOnly?: boolean; applyAuto?: boolean }) => {
    if (!selectedStaffId) return;
    const saveOnly = opts?.saveOnly ?? false;
    const applyAuto = opts?.applyAuto ?? !saveOnly;
    setCalculating(true);
    try {
      const res = await fetch("/api/staff/salary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: selectedStaffId,
          yearMonth,
          recalculate: !saveOnly,
          applyAutoAdjustments: applyAuto,
          otherAllowance,
          ...(applyAuto
            ? {}
            : {
                overtimePay,
                incomeTaxManual,
                manualDeductions:
                  payroll.payrollMode === "manual" ? manualDeductions : undefined,
                manualIncomeTax:
                  payroll.payrollMode === "manual" ? manualIncomeTax : undefined,
                manualLocalTax:
                  payroll.payrollMode === "manual" ? manualLocalTax : undefined,
                manualInsurance:
                  payroll.payrollMode === "manual" ? manualInsurance : undefined,
              }),
          save: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const stmt = json.statement as StatementRow;
      setStatement(stmt);
      setOvertimePay(stmt.overtime_pay);
      setIncomeTaxManual(stmt.income_tax);
      setManualIncomeTax(stmt.income_tax);
      setManualLocalTax(stmt.local_income_tax);
      toast.success(
        saveOnly
          ? "저장되었습니다."
          : applyAuto
            ? "근태·간이세액 기준으로 재계산했습니다."
            : "조정값이 반영되었습니다.",
      );
      void fetchAllStatements(yearMonth);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "계산 실패");
    } finally {
      setCalculating(false);
    }
  };

  const sendEmail = async () => {
    if (!statement?.id) return;
    setEmailSending(true);
    try {
      const res = await fetch(`/api/staff/salary/${statement.id}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailTo || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(`${json.emailedTo}(으)로 명세서를 발송했습니다.`);
      setEmailOpen(false);
      void load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "이메일 발송 실패");
    } finally {
      setEmailSending(false);
    }
  };

  const selectedStaff = staffList.find((s) => s.id === selectedStaffId);

  if (authLoading) return <div className="p-8 text-slate-500">불러오는 중...</div>;
  if (!canManageStaff) {
    return <div className="p-8 text-slate-600">접근 권한이 없습니다.</div>;
  }

  return (
    <div className="flex flex-col h-full bg-gray-50/30">
      <div className="p-6 pb-2">
        <h1 className="text-2xl font-bold">급여 정산</h1>
        <p className="text-sm text-slate-500 mt-1">
          정직원·파트타임·프리랜서별 4대보험·주휴수당·명세서 발송
        </p>
      </div>

      <div className="p-4 md:p-6 space-y-4 flex-1 overflow-auto">
        <StaffSubNav />
        <PayrollSettingsCard />

        {schemaWarning && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong>DB 마이그레이션 필요:</strong> {schemaWarning}
          </div>
        )}

        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-slate-500">정산 월</label>
            <Input
              type="month"
              value={yearMonth}
              onChange={(e) => setYearMonth(e.target.value)}
              className="w-40 h-9"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => void exportStaffSalaryToExcel(allStatements, yearMonth)}
            disabled={!allStatements.length}
          >
            <FileDown className="w-4 h-4" />
            엑셀보내기
          </Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <Card className="xl:col-span-3 border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">직원</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 max-h-[480px] overflow-y-auto">
              {staffList.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedStaffId(s.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedStaffId === s.id
                      ? "bg-indigo-100 text-indigo-900 font-semibold"
                      : "hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  {s.name}
                  {s.position && (
                    <span className="block text-xs text-slate-500">{s.position}</span>
                  )}
                </button>
              ))}
            </CardContent>
          </Card>

          <div className="xl:col-span-9 space-y-4">
            {selectedStaff && (
              <Card className="border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-indigo-500" />
                      {selectedStaff.name} — 계약·보험
                    </CardTitle>
                    <CardDescription>
                      <Link href={`/dashboard/staff/${selectedStaff.id}`} className="text-indigo-600 hover:underline text-xs">
                        인사 상세 보기 →
                      </Link>
                    </CardDescription>
                  </div>
                  <Button size="sm" onClick={() => void saveFinancial()} disabled={saving}>
                    <Save className="w-4 h-4 mr-1" />
                    {saving ? "저장 중..." : "계약 저장"}
                  </Button>
                </CardHeader>
                <CardContent>
                  <StaffFinancialForm value={financial} onChange={setFinancial} payroll={payroll} />
                </CardContent>
              </Card>
            )}

            <StaffSeveranceCard staffId={selectedStaffId} />

            <Card className="border-slate-200">
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  {yearMonth} 급여 명세
                  {statement?.status && (
                    <Badge variant="outline" className="ml-2">
                      {statement.status === "sent" ? "발송완료" : statement.status === "confirmed" ? "확정" : "초안"}
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void calculateAndSave({ applyAuto: true })}
                    disabled={calculating || loading}
                  >
                    <RefreshCw className={`w-4 h-4 mr-1 ${calculating ? "animate-spin" : ""}`} />
                    재계산
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void calculateAndSave({ applyAuto: false })}
                    disabled={calculating || loading}
                  >
                    조정 반영
                  </Button>
                  {statement?.id && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPreviewOpen(true)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        명세서 미리보기
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          window.open(
                            `/dashboard/staff/salary/print/${statement.id}`,
                            "_blank",
                          )
                        }
                      >
                        <Printer className="w-4 h-4 mr-1" />
                        인쇄 / PDF
                      </Button>
                      <Button
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700"
                        onClick={() => {
                          setEmailTo(selectedStaff?.email || "");
                          setEmailOpen(true);
                        }}
                      >
                        <Mail className="w-4 h-4 mr-1" />
                        이메일 발송
                      </Button>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {payroll.payrollMode === "auto" && payroll.payrollJurisdiction === "KR" && (
                  <p className="text-xs text-slate-500 rounded-lg bg-slate-50 border px-3 py-2">
                    <strong>재계산</strong>: 출퇴근 기준 주 40시간 초과 연장수당(시급×1.5)과 간이세액표 근사
                    소득세를 자동 채웁니다. 금액을 바꾼 뒤에는 <strong>조정 반영</strong>을 누르세요.
                  </p>
                )}
                {statement?.memo && (
                  <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
                    {statement.memo}
                  </p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-slate-500">
                      연장·야간 수당 (주 40h 초과 자동)
                    </label>
                    <Input
                      type="number"
                      value={overtimePay || ""}
                      onChange={(e) => setOvertimePay(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">기타 수당</label>
                    <Input
                      type="number"
                      value={otherAllowance || ""}
                      onChange={(e) => setOtherAllowance(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">
                      소득세 (원천징수
                      {payroll.payrollMode === "auto" ? ", 간이세액 자동·수정 가능" : ""})
                    </label>
                    <Input
                      type="number"
                      value={
                        (payroll.payrollMode === "manual"
                          ? manualIncomeTax
                          : incomeTaxManual) || ""
                      }
                      onChange={(e) => {
                        const v = Number(e.target.value) || 0;
                        if (payroll.payrollMode === "manual") setManualIncomeTax(v);
                        else setIncomeTaxManual(v);
                      }}
                    />
                  </div>
                  {payroll.payrollMode === "manual" ? (
                    <>
                      <div>
                        <label className="text-xs text-slate-500">지방소득세 (원천징수, 소득세의 10%)</label>
                        <Input
                          type="number"
                          value={manualLocalTax || ""}
                          onChange={(e) => setManualLocalTax(Number(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">4대보험 합계 (근로자 부담)</label>
                        <Input
                          type="number"
                          value={manualInsurance || ""}
                          onChange={(e) => setManualInsurance(Number(e.target.value) || 0)}
                        />
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-slate-500 self-end pb-2">
                      지방소득세는 소득세의 10%로 자동 계산됩니다.
                    </p>
                  )}
                </div>

                {loading ? (
                  <p className="text-slate-500 text-sm">불러오는 중...</p>
                ) : statement ? (
                  <StaffPayslipBreakdown statement={statement} />
                ) : (
                  <p className="text-slate-500 text-sm">
                    계약 정보 저장 후 &quot;재계산&quot;을 눌러 명세서를 생성하세요.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>급여명세서 이메일 발송</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-sm">수신 이메일</label>
            <Input
              type="email"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              placeholder="staff@example.com"
            />
            <p className="text-xs text-slate-500">
              환경설정 &gt; 이메일 SMTP가 설정되어 있어야 발송됩니다.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailOpen(false)}>취소</Button>
            <Button onClick={() => void sendEmail()} disabled={emailSending || !emailTo}>
              {emailSending ? "발송 중..." : "발송"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {statement?.id && (
        <PayslipPreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          statementId={statement.id}
          title={`${selectedStaff?.name ?? ""} ${yearMonth} 급여명세서`}
        />
      )}
    </div>
  );
}
