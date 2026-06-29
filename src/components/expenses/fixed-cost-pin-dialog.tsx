"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
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

type Mode = "unlock" | "set" | "change" | "remove";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  lockEnabled: boolean;
  onUnlock: (pin: string) => Promise<boolean>;
  onSetPin: (pin: string) => Promise<boolean>;
  onChangePin: (current: string, next: string) => Promise<boolean>;
  onRemovePin: (current: string) => Promise<boolean>;
};

export function FixedCostPinDialog({
  open,
  onOpenChange,
  mode,
  lockEnabled,
  onUnlock,
  onSetPin,
  onChangePin,
  onRemovePin,
}: Props) {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
  }, [open, mode]);

  const title =
    mode === "unlock"
      ? "고정비 템플릿 암호"
      : mode === "set"
        ? "암호 설정"
        : mode === "change"
          ? "암호 변경"
          : "암호 해제";

  const handleSubmit = async () => {
    setSaving(true);
    try {
      if (mode === "unlock") {
        const ok = await onUnlock(currentPin);
        if (ok) onOpenChange(false);
        else toast.error("암호가 맞지 않습니다.");
        return;
      }
      if (mode === "remove") {
        const ok = await onRemovePin(currentPin);
        if (ok) onOpenChange(false);
        return;
      }
      if (newPin.trim().length < 4) {
        toast.error("새 암호는 4자리 이상이어야 합니다.");
        return;
      }
      if (newPin !== confirmPin) {
        toast.error("새 암호 확인이 일치하지 않습니다.");
        return;
      }
      if (mode === "set") {
        const ok = await onSetPin(newPin);
        if (ok) onOpenChange(false);
        return;
      }
      const ok = await onChangePin(currentPin, newPin);
      if (ok) onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
          {mode === "unlock" ? (
            <p className="text-xs text-muted-foreground">
              이 매장에 설정된 암호를 입력하면 고정비 템플릿·캘린더 정보를 볼 수 있습니다. (이
              탭에서만 잠금 해제)
            </p>
          ) : null}
          {(mode === "unlock" || mode === "change" || mode === "remove") ? (
            <div>
              <Label htmlFor="fixed-pin-current">현재 암호</Label>
              <Input
                id="fixed-pin-current"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value)}
                className="mt-1"
              />
            </div>
          ) : null}
          {mode === "set" || mode === "change" ? (
            <>
              <div>
                <Label htmlFor="fixed-pin-new">{mode === "set" ? "암호" : "새 암호"}</Label>
                <Input
                  id="fixed-pin-new"
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="mt-1"
                  placeholder="4자리 이상"
                />
              </div>
              <div>
                <Label htmlFor="fixed-pin-confirm">암호 확인</Label>
                <Input
                  id="fixed-pin-confirm"
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  className="mt-1"
                />
              </div>
            </>
          ) : null}
          {mode === "remove" ? (
            <p className="text-xs text-muted-foreground">현재 암호 입력 후 해제하면 누구나 펼칠 수 있습니다.</p>
          ) : null}
          {mode === "set" && !lockEnabled ? (
            <p className="text-xs text-muted-foreground">
              사장님만 아는 숫자 암호를 설정해 두면, 직원 계정으로는 펼치기 전에 암호가 필요합니다.
            </p>
          ) : null}
        </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={saving}>
              {mode === "unlock" ? "확인" : mode === "remove" ? "암호 해제" : "저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
