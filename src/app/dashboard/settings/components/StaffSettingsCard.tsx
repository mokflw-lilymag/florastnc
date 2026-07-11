"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Users, Pencil, Phone, MapPin, Briefcase, ExternalLink } from "lucide-react";
import Link from "next/link";
import {
  TENANT_STAFF_HR_SELECT,
  type TenantStaffHrInput,
  type TenantStaffHrProfile,
} from "@/types/tenant-staff";
import { StaffHrFieldsForm } from "./StaffHrFieldsForm";

const EMPTY_HR: TenantStaffHrInput = {
  name: "",
  pin_code: "",
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

export function StaffSettingsCard() {
  const { tenantId, canManageStaff } = useAuth();
  const [staffList, setStaffList] = useState<TenantStaffHrProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<TenantStaffHrInput>({ ...EMPTY_HR });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editStaff, setEditStaff] = useState<TenantStaffHrProfile | null>(null);
  const [editForm, setEditForm] = useState<TenantStaffHrInput>({ ...EMPTY_HR });
  const [editPin, setEditPin] = useState("");
  const [isEditSaving, setIsEditSaving] = useState(false);

  const fetchStaff = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const supabase = createClient();
      let { data, error } = await supabase
        .from("tenant_staff")
        .select(TENANT_STAFF_HR_SELECT)
        .eq("tenant_id", tenantId)
        .order("name", { ascending: true });

      if (error) {
        const fallback = await supabase
          .from("tenant_staff")
          .select("id, name, pin_code, role, created_at")
          .eq("tenant_id", tenantId)
          .order("name", { ascending: true });
        if (fallback.error) throw fallback.error;
        data = (fallback.data || []).map((row) => ({
          ...row,
          phone: null,
          email: null,
          address: null,
          birth_date: null,
          hire_date: null,
          position: null,
          memo: null,
          emergency_contact: null,
          emergency_phone: null,
        }));
      }

      setStaffList(
        (data || []).map((row) => ({
          ...row,
          full_name: row.name,
        })),
      );
    } catch {
      toast.error("직원 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId && canManageStaff) void fetchStaff();
  }, [tenantId, canManageStaff]);

  if (!canManageStaff) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-slate-500">
          직원 관리 권한이 없습니다.
        </CardContent>
      </Card>
    );
  }

  const handleCreateStaff = async () => {
    const trimmedName = form.name?.trim() ?? "";
    if (!trimmedName || !form.pin_code || form.pin_code.length !== 4) {
      toast.error("이름과 4자리 PIN 번호를 입력해주세요.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, name: trimmedName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("직원이 등록되었습니다.");
      setIsOpen(false);
      setForm({ ...EMPTY_HR });
      void fetchStaff();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "등록 실패";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (staff: TenantStaffHrProfile) => {
    setEditStaff(staff);
    setEditPin("");
    setEditForm({
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
  };

  const handleSaveEdit = async () => {
    if (!editStaff) return;
    const trimmedName = editForm.name?.trim() ?? "";
    if (!trimmedName) {
      toast.error("이름을 입력해주세요.");
      return;
    }
    setIsEditSaving(true);
    try {
      const res = await fetch("/api/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: editStaff.id,
          ...editForm,
          name: trimmedName,
          ...(editPin.length === 4 ? { newPin: editPin } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("직원 정보가 저장되었습니다.");
      setEditStaff(null);
      void fetchStaff();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "저장 실패";
      toast.error(message);
    } finally {
      setIsEditSaving(false);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm("정말 이 직원을 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/staff?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("삭제되었습니다.");
      void fetchStaff();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "삭제 실패";
      toast.error(message);
    }
  };

  const openCreateDialog = () => {
    setForm({ ...EMPTY_HR });
    setIsOpen(true);
  };

  return (
    <>
      <Card className="border-0 shadow-sm ring-1 ring-slate-200">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-500" />
              직원 인사 정보 (HR)
            </CardTitle>
            <CardDescription className="mt-1">
              이름·연락처·주소 등 인사 기록을 저장합니다. PIN은 POS 출퇴근·작업자 전환에 사용됩니다.
            </CardDescription>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger
              render={
                <Button
                  type="button"
                  className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
                  onClick={openCreateDialog}
                >
                  + 새 직원 등록
                </Button>
              }
            />
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>새 직원 등록</DialogTitle>
                <DialogDescription>인사 정보와 PIN을 함께 등록합니다.</DialogDescription>
              </DialogHeader>
              <StaffHrFieldsForm value={form} onChange={setForm} showPin />
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsOpen(false)}>취소</Button>
                <Button onClick={() => void handleCreateStaff()} disabled={isSubmitting}>
                  {isSubmitting ? "등록 중..." : "등록하기"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? (
            <div className="py-8 text-center text-slate-500">로딩 중...</div>
          ) : staffList.length === 0 ? (
            <div className="py-12 text-center text-gray-500 border rounded-xl border-dashed">등록된 직원이 없습니다.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {staffList.map((staff) => (
                <Card key={staff.id} className="shadow-sm border-slate-200">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {staff.name}
                      {staff.position && (
                        <span className="text-xs font-normal text-slate-500 flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />
                          {staff.position}
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs space-y-1">
                      {staff.phone && (
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{staff.phone}</span>
                      )}
                      {staff.address && (
                        <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" />{staff.address}</span>
                      )}
                      {staff.hire_date && <span>입사: {staff.hire_date}</span>}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 flex gap-2">
                    <Link href={`/dashboard/staff/${staff.id}`} className="flex-1">
                      <Button size="sm" variant="outline" className="w-full h-8 text-xs">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        상세
                      </Button>
                    </Link>
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => openEdit(staff)}>
                      <Pencil className="w-3 h-3 mr-1" />
                      정보 수정
                    </Button>
                    <Button size="sm" variant="destructive" className="h-8 text-xs bg-rose-100 text-rose-700 hover:bg-rose-200 border-none shadow-none" onClick={() => void handleDeleteStaff(staff.id)}>
                      삭제
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editStaff} onOpenChange={(open) => !open && setEditStaff(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>직원 정보 수정 — {editStaff?.name}</DialogTitle>
            <DialogDescription>인사 정보를 수정합니다. PIN은 변경할 때만 입력하세요.</DialogDescription>
          </DialogHeader>
          <StaffHrFieldsForm value={editForm} onChange={setEditForm} />
          <div className="space-y-2">
            <label className="text-sm font-medium">새 PIN (변경 시만)</label>
            <Input type="password" maxLength={4} value={editPin} onChange={(e) => setEditPin(e.target.value)} placeholder="••••" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStaff(null)}>취소</Button>
            <Button onClick={() => void handleSaveEdit()} disabled={isEditSaving}>
              {isEditSaving ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
