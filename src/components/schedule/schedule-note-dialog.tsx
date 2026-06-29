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
import Textarea from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { ScheduleNote } from "@/types/schedule-calendar";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: ScheduleNote | null;
  defaultDateYmd?: string;
  onSave: (note: ScheduleNote) => Promise<boolean>;
};

export function ScheduleNoteDialog({
  open,
  onOpenChange,
  initial,
  defaultDateYmd,
  onSave,
}: Props) {
  const [content, setContent] = useState("");
  const [dateYmd, setDateYmd] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setContent(initial?.content ?? "");
    setDateYmd(initial?.dateYmd ?? defaultDateYmd ?? new Date().toISOString().split("T")[0]);
  }, [open, initial, defaultDateYmd]);

  const handleSave = async () => {
    if (!content.trim() || !dateYmd) return;
    setSaving(true);
    try {
      const ok = await onSave({
        id: initial?.id ?? crypto.randomUUID(),
        content: content.trim(),
        dateYmd,
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
          <DialogTitle>{initial ? "특이사항 및 전달사항 수정" : "특이사항 및 전달사항 추가"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div>
            <Label htmlFor="note-date">날짜</Label>
            <Input id="note-date" type="date" value={dateYmd} onChange={(e) => setDateYmd(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="note-content">내용</Label>
            <Textarea
              id="note-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="예: VIP 방문 예정, 특별 배송 건 주의사항 등"
              className="mt-1 h-24 resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button type="button" disabled={saving || !content.trim()} onClick={() => void handleSave()}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
