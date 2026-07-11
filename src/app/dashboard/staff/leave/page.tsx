"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { StaffSubNav } from "@/app/dashboard/staff/components/staff-sub-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { FileDown, Plus, Check, X } from "lucide-react";
import type { LeaveType, StaffLeaveRequest } from "@/types/staff-salary";
import { exportStaffLeaveToExcel } from "@/lib/staff-hr-excel";
import { StaffLeaveCalendar } from "@/app/dashboard/staff/components/StaffLeaveCalendar";
import { createClient } from "@/utils/supabase/client";

const LEAVE_TYPES: LeaveType[] = ["연차", "반차", "병가", "무급", "기타"];

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
};

export default function StaffLeavePage() {
  const { canManageStaff, isLoading: authLoading, tenantId } = useAuth();
  const [requests, setRequests] = useState<StaffLeaveRequest[]>([]);
  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    staffId: "",
    leaveType: "연차" as LeaveType,
    startDate: "",
    endDate: "",
    reason: "",
    contact: "",
  });
  const [saving, setSaving] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());

  const fetchRequests = useCallback(async () => {
    const q = filter === "all" ? "" : `?status=${filter}`;
    const res = await fetch(`/api/staff/leave${q}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    setRequests(json.requests || []);
  }, [filter]);

  const fetchStaff = useCallback(async () => {
    if (!tenantId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("tenant_staff")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .order("name");
    setStaffList(data || []);
    if (data?.[0]) setForm((f) => ({ ...f, staffId: f.staffId || data[0].id }));
  }, [tenantId]);

  useEffect(() => {
    if (canManageStaff) {
      setLoading(true);
      Promise.all([fetchRequests(), fetchStaff()])
        .catch((e) => toast.error(e.message))
        .finally(() => setLoading(false));
    }
  }, [canManageStaff, fetchRequests, fetchStaff]);

  const openLeaveDialog = (dateYmd: string) => {
    setForm((f) => ({
      ...f,
      startDate: dateYmd,
      endDate: f.endDate && f.endDate >= dateYmd ? f.endDate : dateYmd,
    }));
    setOpen(true);
  };

  const submitLeave = async () => {
    if (!form.staffId || !form.startDate || !form.endDate) {
      toast.error("필수 항목을 입력해주세요.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/staff/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: form.staffId,
          leaveType: form.leaveType,
          startDate: form.startDate,
          endDate: form.endDate,
          reason: form.reason,
          contact: form.contact,
          autoApprove: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("휴가 신청이 등록되었습니다.");
      setOpen(false);
      void fetchRequests();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "등록 실패");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: "approved" | "rejected") => {
    let rejectReason: string | undefined;
    if (status === "rejected") {
      rejectReason = prompt("반려 사유를 입력하세요.") ?? undefined;
      if (!rejectReason) return;
    }
    try {
      const res = await fetch(`/api/staff/leave/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, rejectReason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(status === "approved" ? "승인되었습니다." : "반려되었습니다.");
      void fetchRequests();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "처리 실패");
    }
  };

  if (authLoading) return <div className="p-8 text-slate-500">불러오는 중...</div>;
  if (!canManageStaff) return <div className="p-8 text-slate-600">접근 권한이 없습니다.</div>;

  return (
    <div className="flex flex-col h-full bg-gray-50/30">
      <div className="p-6 pb-2">
        <h1 className="text-2xl font-bold">휴가 관리</h1>
        <p className="text-sm text-slate-500 mt-1">연차·반차·병가 신청 및 승인</p>
      </div>

      <div className="p-4 md:p-6 space-y-4 flex-1 overflow-auto">
        <StaffSubNav />

        <div className="flex flex-wrap gap-2 items-center">
          {(["all", "pending", "approved", "rejected"] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={filter === s ? "default" : "outline"}
              onClick={() => setFilter(s)}
            >
              {s === "all" ? "전체" : s === "pending" ? "대기" : s === "approved" ? "승인" : "반려"}
            </Button>
          ))}
          <Button size="sm" variant="outline" className="ml-auto gap-1" onClick={() => void exportStaffLeaveToExcel(requests)}>
            <FileDown className="w-4 h-4" />
            엑셀
          </Button>
          <Button size="sm" className="gap-1 bg-indigo-600" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4" />
            휴가 등록
          </Button>
        </div>

        <StaffLeaveCalendar
          month={calendarMonth}
          onMonthChange={setCalendarMonth}
          requests={requests}
          onDayClick={openLeaveDialog}
        />

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">신청 목록 ({requests.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="p-8 text-center text-slate-500">불러오는 중...</p>
            ) : requests.length === 0 ? (
              <p className="p-8 text-center text-slate-500">신청 내역이 없습니다.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs">
                    <tr>
                      <th className="px-4 py-3 text-left">직원</th>
                      <th className="px-4 py-3 text-left">유형</th>
                      <th className="px-4 py-3 text-left">기간</th>
                      <th className="px-4 py-3 text-left">사유</th>
                      <th className="px-4 py-3 text-left">상태</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {requests.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium">{r.tenant_staff?.name}</td>
                        <td className="px-4 py-3">{r.leave_type}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {r.start_date} ~ {r.end_date}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">{r.reason}</td>
                        <td className="px-4 py-3">
                          <Badge className={STATUS_BADGE[r.status] || ""}>
                            {r.status === "pending" ? "대기" : r.status === "approved" ? "승인" : "반려"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {r.status === "pending" && (
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600" onClick={() => void updateStatus(r.id, "approved")}>
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600" onClick={() => void updateStatus(r.id, "rejected")}>
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>휴가 등록</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <select
              className="w-full h-9 border rounded-md px-3 text-sm"
              value={form.staffId}
              onChange={(e) => setForm({ ...form, staffId: e.target.value })}
            >
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <select
              className="w-full h-9 border rounded-md px-3 text-sm"
              value={form.leaveType}
              onChange={(e) => setForm({ ...form, leaveType: e.target.value as LeaveType })}
            >
              {LEAVE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
            <Input placeholder="사유" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            <Input placeholder="비상 연락처" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>취소</Button>
            <Button onClick={() => void submitLeave()} disabled={saving}>
              {saving ? "등록 중..." : "등록"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
