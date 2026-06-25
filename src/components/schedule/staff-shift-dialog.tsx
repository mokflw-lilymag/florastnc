"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StaffShift } from "@/types/schedule-calendar";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: StaffShift | null;
  defaultDateYmd?: string;
  onSave: (shift: StaffShift) => Promise<boolean>;
};

export function StaffShiftDialog({
  open,
  onOpenChange,
  initial,
  defaultDateYmd,
  onSave,
}: Props) {
  const [staffName, setStaffName] = useState("");
  const [dateYmd, setDateYmd] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStaffName(initial?.staffName ?? "");
    setDateYmd(initial?.dateYmd ?? defaultDateYmd ?? new Date().toISOString().split("T")[0]);
    setStartTime(initial?.startTime ?? "09:00");
    setEndTime(initial?.endTime ?? "18:00");
    setMemo(initial?.memo ?? "");
  }, [open, initial, defaultDateYmd]);

  const handleSave = async () => {
    if (!staffName.trim() || !dateYmd) return;
    setSaving(true);
    try {
      const ok = await onSave({
        id: initial?.id ?? crypto.randomUUID(),
        staffName: staffName.trim(),
        dateYmd,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        memo: memo.trim() || undefined,
      });
      if (ok) onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "직원 스케줄 수정" : "직원 스케줄 추가"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div>
            <Label htmlFor="staff-name">직원 이름</Label>
            <Input id="staff-name" value={staffName} onChange={(e) => setStaffName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="staff-date">날짜</Label>
            <Input id="staff-date" type="date" value={dateYmd} onChange={(e) => setDateYmd(e.target.value)} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="staff-start">시작</Label>
              <Input id="staff-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="staff-end">종료</Label>
              <Input id="staff-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label htmlFor="staff-memo">메모</Label>
            <Input id="staff-memo" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="오전 배송, 마감 담당 등" className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button type="button" disabled={saving || !staffName.trim()} onClick={() => void handleSave()}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
