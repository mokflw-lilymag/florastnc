"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { StaffSubNav } from "@/app/dashboard/staff/components/staff-sub-nav";
import { StaffHrFieldsForm } from "@/app/dashboard/settings/components/StaffHrFieldsForm";
import { StaffFinancialForm } from "@/app/dashboard/staff/components/StaffFinancialForm";
import { StaffSeveranceCard } from "@/app/dashboard/staff/components/StaffSeveranceCard";
import { resolvePayrollConfig } from "@/lib/payroll/types";
import { syncFinancialFromAnnual } from "@/lib/payroll/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PayslipPreviewDialog } from "@/app/dashboard/staff/components/PayslipPreviewDialog";
import { ArrowLeft, Eye, Save, Wallet, CalendarOff, Clock } from "lucide-react";
import {
  TENANT_STAFF_HR_SELECT,
  type TenantStaffHrInput,
  type TenantStaffHrProfile,
} from "@/types/tenant-staff";
import type { StaffFinancial, StaffLeaveRequest, StaffSalaryStatement } from "@/types/staff-salary";
import { formatKrw } from "@/lib/staff-salary-calc";
import { formatWorkHours, summarizeStaffWorkHours, buildDailyAttendanceRows } from "@/lib/staff-attendance-hours";

const EMPTY_HR: TenantStaffHrInput = {
  name: "",
  phone: "",
  email: "",
  address: "",
  birth_date: "",
  hire_date: "",
  position: "",
  memo: "",
  emergency_contact: "",
  emergency_phone: "",
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

export default function StaffDetailPage() {
  const params = useParams();
  const staffId = params.staffId as string;
  const { canManageStaff, isLoading: authLoading, tenantId } = useAuth();
  const { settings } = useSettings();
  const payroll = resolvePayrollConfig(settings ?? {});
  const [profile, setProfile] = useState<TenantStaffHrProfile | null>(null);
  const [hrForm, setHrForm] = useState<TenantStaffHrInput>(EMPTY_HR);
  const [financial, setFinancial] = useState<StaffFinancial>(EMPTY_FIN);
  const [leaves, setLeaves] = useState<StaffLeaveRequest[]>([]);
  const [statements, setStatements] = useState<StaffSalaryStatement[]>([]);
  const [monthMinutes, setMonthMinutes] = useState(0);
  const [saving, setSaving] = useState(false);
  const [previewStatementId, setPreviewStatementId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tenantId || !staffId) return;
    const supabase = createClient();

    const { data: staff, error } = await supabase
      .from("tenant_staff")
      .select(TENANT_STAFF_HR_SELECT)
      .eq("id", staffId)
      .eq("tenant_id", tenantId)
      .single();

    if (error || !staff) {
      toast.error("직원 정보를 찾을 수 없습니다.");
      return;
    }

    setProfile(staff);
    setHrForm({
      name: staff.name,
      phone: staff.phone || "",
      email: staff.email || "",
      address: staff.address || "",
      birth_date: staff.birth_date || "",
      hire_date: staff.hire_date || "",
      position: staff.position || "",
      memo: staff.memo || "",
      emergency_contact: staff.emergency_contact || "",
      emergency_phone: staff.emergency_phone || "",
    });

    const finRes = await fetch(`/api/staff/financials?staffId=${staffId}`);
    const finJson = await finRes.json();
    if (finRes.ok && finJson.financials?.[0]) {
      setFinancial(finJson.financials[0]);
    } else {
      setFinancial({ ...EMPTY_FIN, staff_id: staffId });
    }

    const leaveRes = await fetch(`/api/staff/leave?staffId=${staffId}`);
    const leaveJson = await leaveRes.json();
    if (leaveRes.ok) setLeaves(leaveJson.requests || []);

    const salRes = await fetch(`/api/staff/salary?staffId=${staffId}`);
    const salJson = await salRes.json();
    if (salRes.ok) setStatements(salJson.statements || []);

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const { data: logs } = await supabase
      .from("staff_attendance_logs")
      .select("id, staff_id, type, recorded_at")
      .eq("staff_id", staffId)
      .gte("recorded_at", monthStart.toISOString());

    const rows = buildDailyAttendanceRows((logs || []) as never);
    const summary = summarizeStaffWorkHours(rows, logs || []);
    setMonthMinutes(summary[0]?.monthMinutes ?? 0);
  }, [tenantId, staffId]);

  useEffect(() => {
    if (canManageStaff) void load();
  }, [canManageStaff, load]);

  const saveHr = async () => {
    if (!staffId || !hrForm.name?.trim()) {
      toast.error("이름을 입력해주세요.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: staffId, ...hrForm, name: hrForm.name.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("인사 정보가 저장되었습니다.");
      void load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const saveFin = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/staff/financials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(syncFinancialFromAnnual({ ...financial, staff_id: staffId })),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setFinancial(json.financial);
      toast.success("급여 계약이 저장되었습니다.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) return <div className="p-8 text-slate-500">불러오는 중...</div>;
  if (!canManageStaff) return <div className="p-8 text-slate-600">접근 권한이 없습니다.</div>;
  if (!profile) return <div className="p-8 text-slate-500">불러오는 중...</div>;

  return (
    <div className="flex flex-col h-full bg-gray-50/30">
      <div className="p-6 pb-2 flex items-center gap-3">
        <Link href="/dashboard/staff" className="text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{profile.name}</h1>
          <p className="text-sm text-slate-500">{profile.position || "직원 상세"}</p>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-4 flex-1 overflow-auto">
        <StaffSubNav />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="border-slate-200">
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="w-8 h-8 text-indigo-400" />
              <div>
                <p className="text-xs text-slate-500">이번 달 근무</p>
                <p className="font-bold">{formatWorkHours(monthMinutes)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="p-4 flex items-center gap-3">
              <Wallet className="w-8 h-8 text-emerald-400" />
              <div>
                <p className="text-xs text-slate-500">고용 형태</p>
                <p className="font-bold">{financial.employment_type}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="p-4 flex items-center gap-3">
              <CalendarOff className="w-8 h-8 text-amber-400" />
              <div>
                <p className="text-xs text-slate-500">휴가 신청</p>
                <p className="font-bold">{leaves.length}건</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="hr">
          <TabsList>
            <TabsTrigger value="hr">인사 정보</TabsTrigger>
            <TabsTrigger value="salary">급여·보험</TabsTrigger>
            <TabsTrigger value="leave">휴가</TabsTrigger>
            <TabsTrigger value="payslip">급여 이력</TabsTrigger>
          </TabsList>

          <TabsContent value="hr" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row justify-between">
                <CardTitle className="text-base">인사 정보</CardTitle>
                <Button size="sm" onClick={() => void saveHr()} disabled={saving}>
                  <Save className="w-4 h-4 mr-1" />
                  저장
                </Button>
              </CardHeader>
              <CardContent>
                <StaffHrFieldsForm value={hrForm} onChange={setHrForm} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="salary" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle className="text-base">급여 계약·4대보험</CardTitle>
                <div className="flex gap-2">
                  <Link href="/dashboard/staff/salary">
                    <Button size="sm" variant="outline">급여 정산 →</Button>
                  </Link>
                  <Button size="sm" onClick={() => void saveFin()} disabled={saving}>
                    <Save className="w-4 h-4 mr-1" />
                    저장
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <StaffFinancialForm
                  value={{ ...financial, staff_id: staffId }}
                  onChange={setFinancial}
                  payroll={payroll}
                />
              </CardContent>
            </Card>
            <StaffSeveranceCard staffId={staffId} />
          </TabsContent>

          <TabsContent value="leave" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row justify-between">
                <CardTitle className="text-base">휴가 내역</CardTitle>
                <Link href="/dashboard/staff/leave">
                  <Button size="sm" variant="outline">휴가 관리 →</Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-2">
                {leaves.length === 0 ? (
                  <p className="text-slate-500 text-sm">휴가 신청이 없습니다.</p>
                ) : (
                  leaves.map((l) => (
                    <div key={l.id} className="flex items-center justify-between border rounded-lg p-3 text-sm">
                      <div>
                        <span className="font-medium">{l.leave_type}</span>
                        <span className="text-slate-500 ml-2">{l.start_date} ~ {l.end_date}</span>
                      </div>
                      <Badge variant="outline">{l.status}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payslip" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">급여 명세 이력</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {statements.length === 0 ? (
                  <p className="text-slate-500 text-sm">급여 명세가 없습니다.</p>
                ) : (
                  statements.map((s) => (
                    <div key={s.id} className="flex items-center justify-between border rounded-lg p-3 text-sm">
                      <div>
                        <span className="font-medium">{s.payment_year_month}</span>
                        <span className="text-slate-500 ml-2">{formatKrw(s.net_pay)}</span>
                      </div>
                      {s.id && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPreviewStatementId(s.id!)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          미리보기
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {previewStatementId && (
        <PayslipPreviewDialog
          open={!!previewStatementId}
          onOpenChange={(open) => !open && setPreviewStatementId(null)}
          statementId={previewStatementId}
          title={`${profile?.name ?? ""} 급여명세서`}
        />
      )}
    </div>
  );
}
