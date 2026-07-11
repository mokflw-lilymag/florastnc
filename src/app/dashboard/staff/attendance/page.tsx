"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { StaffSubNav } from "@/app/dashboard/staff/components/staff-sub-nav";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Search, RefreshCw, Clock, UserCheck, Plus, Trash2, Timer, FileDown } from "lucide-react";
import { exportStaffAttendanceToExcel } from "@/lib/staff-hr-excel";
import {
  buildDailyAttendanceRows,
  formatTimeLabel,
  formatWorkHours,
  summarizeStaffWorkHours,
  type AttendanceLogDetail,
} from "@/lib/staff-attendance-hours";

export default function StaffAttendancePage() {
  const { tenantId, canManageStaff, isLoading: authLoading } = useAuth();
  const { settings, saveSettings } = useSettings();
  const [logs, setLogs] = useState<AttendanceLogDetail[]>([]);
  const [hoursLogs, setHoursLogs] = useState<AttendanceLogDetail[]>([]);
  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [breakSavingKey, setBreakSavingKey] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(today);
  const [selectedStaff, setSelectedStaff] = useState("all");

  const [addOpen, setAddOpen] = useState(false);
  const [addStaffId, setAddStaffId] = useState("");
  const [addType, setAddType] = useState<"clock_in" | "clock_out">("clock_in");
  const [addDate, setAddDate] = useState(today);
  const [addTime, setAddTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [addSaving, setAddSaving] = useState(false);

  const fetchHoursLogs = async () => {
    if (!tenantId) return;
    try {
      const supabase = createClient();
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const { data, error } = await supabase
        .from("staff_attendance_logs")
        .select("id, staff_id, type, recorded_at")
        .eq("tenant_id", tenantId)
        .gte("recorded_at", monthStart.toISOString())
        .order("recorded_at", { ascending: true })
        .limit(2000);
      if (error) throw error;
      setHoursLogs((data || []) as AttendanceLogDetail[]);
    } catch {
      // ignore
    }
  };

  const fetchLogs = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: staffData } = await supabase
        .from("tenant_staff")
        .select("id, name")
        .eq("tenant_id", tenantId)
        .order("name");
      setStaffList(staffData || []);

      const fromTs = new Date(dateFrom + "T00:00:00").toISOString();
      const toTs = new Date(dateTo + "T23:59:59").toISOString();
      let query = supabase
        .from("staff_attendance_logs")
        .select(`id, staff_id, type, recorded_at, tenant_staff ( name )`)
        .eq("tenant_id", tenantId)
        .gte("recorded_at", fromTs)
        .lte("recorded_at", toTs)
        .order("recorded_at", { ascending: false })
        .limit(500);
      if (selectedStaff !== "all") query = query.eq("staff_id", selectedStaff);
      const { data, error } = await query;
      if (error) throw error;
      setLogs((data || []) as unknown as AttendanceLogDetail[]);
    } catch {
      toast.error("근태 기록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      void fetchLogs();
      void fetchHoursLogs();
    }
  }, [tenantId]);

  const dayBreaks = settings?.attendanceDayBreaks ?? {};
  const monthDailyRows = useMemo(
    () => buildDailyAttendanceRows(hoursLogs, { dayBreaks }),
    [hoursLogs, dayBreaks],
  );
  const dailyRows = useMemo(
    () => buildDailyAttendanceRows(logs, { dayBreaks }),
    [logs, dayBreaks],
  );

  const staffHoursCards = useMemo(() => {
    const hoursByStaff = new Map(
      summarizeStaffWorkHours(monthDailyRows, hoursLogs).map((item) => [item.staffId, item]),
    );
    return staffList.map((staff) => {
      const hours = hoursByStaff.get(staff.id);
      return {
        staffId: staff.id,
        name: staff.name,
        todayMinutes: hours?.todayMinutes ?? 0,
        weekMinutes: hours?.weekMinutes ?? 0,
        monthMinutes: hours?.monthMinutes ?? 0,
        clockIns: hours?.clockIns ?? 0,
        clockOuts: hours?.clockOuts ?? 0,
        openShift: hours?.openShift ?? false,
      };
    });
  }, [monthDailyRows, hoursLogs, staffList]);

  const handleBreakToggle = async (
    rowKey: string,
    field: "tookLunch" | "tookDinner",
    checked: boolean,
  ) => {
    if (!settings) return;
    setBreakSavingKey(`${rowKey}:${field}`);
    try {
      const current = { ...(settings.attendanceDayBreaks ?? {}) };
      const prev = current[rowKey] ?? { tookLunch: false, tookDinner: false };
      const nextFlags = { ...prev, [field]: checked };
      if (!nextFlags.tookLunch && !nextFlags.tookDinner) delete current[rowKey];
      else current[rowKey] = nextFlags;
      await saveSettings({ ...settings, attendanceDayBreaks: current });
    } catch {
      toast.error("휴게 시간 저장에 실패했습니다.");
    } finally {
      setBreakSavingKey(null);
    }
  };

  const handleAddRecord = async () => {
    if (!addStaffId || !addDate || !addTime) {
      toast.error("직원, 날짜, 시간을 모두 입력해주세요.");
      return;
    }
    setAddSaving(true);
    try {
      const supabase = createClient();
      const recorded_at = new Date(`${addDate}T${addTime}:00`).toISOString();
      const { error } = await supabase.from("staff_attendance_logs").insert({
        tenant_id: tenantId,
        staff_id: addStaffId,
        type: addType,
        recorded_at,
      });
      if (error) throw error;
      toast.success("기록이 추가되었습니다.");
      setAddOpen(false);
      void fetchLogs();
      void fetchHoursLogs();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "추가에 실패했습니다.";
      toast.error(message);
    } finally {
      setAddSaving(false);
    }
  };

  const handleDeleteDay = async (logIds: string[]) => {
    if (!confirm(`이 날짜의 출퇴근 기록 ${logIds.length}건을 삭제하시겠습니까?`)) return;
    try {
      const supabase = createClient();
      const { error } = await supabase.from("staff_attendance_logs").delete().in("id", logIds);
      if (error) throw error;
      toast.success("기록이 삭제되었습니다.");
      void fetchLogs();
      void fetchHoursLogs();
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  };

  if (authLoading) return <div className="p-8 text-slate-500">불러오는 중...</div>;
  if (!canManageStaff) {
    return <div className="p-8 text-slate-600">접근 권한이 없습니다. 점주 계정으로 로그인했는지 확인해주세요.</div>;
  }

  return (
    <div className="flex flex-col h-full bg-gray-50/30">
      <div className="p-6 pb-2">
        <h1 className="text-2xl font-bold">출퇴근 기록</h1>
        <p className="text-sm text-slate-500 mt-1">일별 근무시간·휴게 관리</p>
      </div>

      <div className="p-4 md:p-6 space-y-4 flex-1 overflow-auto">
        <StaffSubNav />

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">시작일</label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 w-36 text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">종료일</label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 w-36 text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">직원</label>
                <select
                  value={selectedStaff}
                  onChange={(e) => setSelectedStaff(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                >
                  <option value="all">전체 직원</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <Button onClick={() => void fetchLogs()} disabled={loading} className="h-9 gap-2">
                <Search className="w-4 h-4" />
                {loading ? "검색 중..." : "검색"}
              </Button>
              <Button
                variant="outline"
                className="h-9 gap-2"
                disabled={dailyRows.length === 0}
                onClick={() =>
                  void exportStaffAttendanceToExcel(dailyRows, dateFrom, dateTo)
                }
              >
                <FileDown className="w-4 h-4" />
                엑셀
              </Button>
              <Button
                variant="outline"
                className="h-9 gap-2 ml-auto border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                onClick={() => {
                  setAddStaffId(staffList[0]?.id || "");
                  setAddDate(today);
                  setAddTime(new Date().toTimeString().slice(0, 5));
                  setAddType("clock_in");
                  setAddOpen(true);
                }}
              >
                <Plus className="w-4 h-4" />
                수동 기록 추가
              </Button>
            </div>
          </CardContent>
        </Card>

        {staffHoursCards.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {staffHoursCards.map((staff) => (
              <Card key={staff.staffId} className={`border shadow-sm ${staff.openShift ? "border-orange-200 bg-orange-50/40" : "border-slate-200"}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <UserCheck className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="font-semibold text-sm truncate">{staff.name}</span>
                    </div>
                    {staff.openShift && <Badge className="bg-orange-100 text-orange-700 border-none text-xs">근무 중</Badge>}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "오늘", minutes: staff.todayMinutes },
                      { label: "이번 주", minutes: staff.weekMinutes },
                      { label: "이번 달", minutes: staff.monthMinutes },
                    ].map((item) => (
                      <div key={item.label} className="rounded-lg bg-slate-50 border border-slate-100 px-2 py-2 text-center">
                        <p className="text-[10px] font-medium text-slate-500">{item.label}</p>
                        <p className="text-sm font-semibold text-slate-800 mt-0.5 flex items-center justify-center gap-1">
                          <Timer className="w-3 h-3 text-indigo-400" />
                          {formatWorkHours(item.minutes)}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                일별 근무 기록
                <span className="text-slate-400 font-normal text-sm">({dailyRows.length}일)</span>
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">점심·저녁 휴게 체크 시 각 1시간 차감 (미체크 = 전체 근무시간)</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { void fetchLogs(); void fetchHoursLogs(); }} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-gray-500">불러오는 중...</div>
            ) : dailyRows.length === 0 ? (
              <div className="p-8 text-center text-gray-500">해당 기간에 출퇴근 기록이 없습니다.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 font-medium">날짜</th>
                      <th className="px-4 py-3 font-medium">직원</th>
                      <th className="px-4 py-3 font-medium">출근</th>
                      <th className="px-4 py-3 font-medium">퇴근</th>
                      <th className="px-4 py-3 font-medium text-center w-16">점심(1h)</th>
                      <th className="px-4 py-3 font-medium text-center w-16">저녁(1h)</th>
                      <th className="px-4 py-3 font-medium">실근무</th>
                      <th className="px-4 py-3 font-medium">근무시간</th>
                      <th className="px-4 py-3 w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dailyRows.map((row) => {
                      const date = new Date(row.dateKey + "T12:00:00");
                      const breakDisabled = !!breakSavingKey?.startsWith(row.key);
                      return (
                        <tr key={row.key} className="bg-white hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                            {date.toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit", weekday: "short" })}
                          </td>
                          <td className="px-4 py-3 font-medium whitespace-nowrap">{row.staffName}</td>
                          <td className="px-4 py-3 font-mono">{formatTimeLabel(row.clockIn)}</td>
                          <td className="px-4 py-3 font-mono">{row.openShift ? "근무 중" : formatTimeLabel(row.clockOut)}</td>
                          <td className="px-4 py-3">
                            <label className="inline-flex items-center justify-center min-h-10 min-w-10 cursor-pointer rounded-lg hover:bg-slate-100">
                              <Checkbox
                                checked={row.tookLunch}
                                disabled={breakDisabled}
                                onCheckedChange={(v) => void handleBreakToggle(row.key, "tookLunch", v === true)}
                                className="size-6 rounded-md border-2 border-slate-500 bg-white shadow-sm data-checked:border-emerald-600 data-checked:bg-emerald-600 data-checked:text-white"
                              />
                            </label>
                          </td>
                          <td className="px-4 py-3">
                            <label className="inline-flex items-center justify-center min-h-10 min-w-10 cursor-pointer rounded-lg hover:bg-slate-100">
                              <Checkbox
                                checked={row.tookDinner}
                                disabled={breakDisabled}
                                onCheckedChange={(v) => void handleBreakToggle(row.key, "tookDinner", v === true)}
                                className="size-6 rounded-md border-2 border-slate-500 bg-white shadow-sm data-checked:border-indigo-600 data-checked:bg-indigo-600 data-checked:text-white"
                              />
                            </label>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{formatWorkHours(row.rawMinutes)}</td>
                          <td className="px-4 py-3 font-semibold text-indigo-700">{formatWorkHours(row.paidMinutes)}</td>
                          <td className="px-4 py-3">
                            <button onClick={() => void handleDeleteDay(row.logIds)} className="text-slate-300 hover:text-red-500" title="삭제">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>수동 출퇴근 기록 추가</DialogTitle>
            <DialogDescription>누락된 기록을 사장님이 직접 추가합니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <select value={addStaffId} onChange={(e) => setAddStaffId(e.target.value)} className="w-full h-9 rounded-md border px-3 text-sm">
              <option value="">직원 선택</option>
              {staffList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <Input type="date" value={addDate} onChange={(e) => setAddDate(e.target.value)} className="h-9 text-sm" />
              <Input type="time" value={addTime} onChange={(e) => setAddTime(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>취소</Button>
            <Button onClick={() => void handleAddRecord()} disabled={addSaving}>{addSaving ? "저장 중..." : "기록 추가"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
