"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyRound, AlertTriangle } from "lucide-react";

export function OwnerPinSettingsCard() {
  const { canManageStaff } = useAuth();
  const [hasPin, setHasPin] = useState(false);
  const [staffCount, setStaffCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/staff/owner-pin");
      if (res.ok) {
        const data = await res.json();
        setHasPin(data.hasPin === true);
        setStaffCount(data.staffCount ?? 0);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canManageStaff) fetchStatus();
  }, [canManageStaff]);

  if (!canManageStaff) return null;

  const needsPin = staffCount > 0 && !hasPin;

  const handleSave = async () => {
    if (newPin.length !== 4 || confirmPin.length !== 4) {
      toast.error("4자리 PIN 번호를 입력해주세요.");
      return;
    }
    if (newPin !== confirmPin) {
      toast.error("PIN 번호가 일치하지 않습니다.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/staff/owner-pin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(hasPin ? "사장님 PIN이 변경되었습니다." : "사장님 PIN이 등록되었습니다.");
      setNewPin("");
      setConfirmPin("");
      setHasPin(true);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className={`border-0 shadow-sm ring-1 ${needsPin ? "ring-amber-300 bg-amber-50/30" : "ring-slate-200"}`}>
      <CardHeader className="border-b border-slate-100 pb-4">
        <CardTitle className="text-xl flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-amber-600" />
          사장님 PIN 설정
        </CardTitle>
        <CardDescription className="mt-1">
          직원이 등록된 매장은 사장님 PIN이 필요합니다. 직원은 사장님 PIN 없이 사장님 권한으로 전환할 수 없으며,
          허용된 메뉴 범위에서만 작업할 수 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {loading ? (
          <div className="py-4 text-center text-slate-500 text-sm">불러오는 중...</div>
        ) : (
          <>
            {needsPin && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-semibold">등록된 직원 {staffCount}명 — 사장님 PIN을 설정해주세요.</p>
                  <p className="mt-1 text-amber-800/90">
                    PIN을 설정하지 않으면 직원이 작업자 전환 시 사장님 계정으로 돌아갈 수 없고,
                    허용된 메뉴 열람·작업만 가능합니다.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">현재 상태:</span>
              <span className={`font-semibold ${hasPin ? "text-emerald-600" : "text-amber-600"}`}>
                {hasPin ? "PIN 설정됨" : "PIN 미설정"}
              </span>
              {staffCount > 0 && (
                <span className="text-slate-400">· 등록 직원 {staffCount}명</span>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 max-w-md">
              <div className="space-y-2">
                <label className="text-sm font-medium">4자리 PIN</label>
                <Input
                  type="password"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••"
                  className="tracking-widest"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">PIN 확인</label>
                <Input
                  type="password"
                  maxLength={4}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••"
                  className="tracking-widest"
                />
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving || newPin.length !== 4 || confirmPin.length !== 4}>
              {saving ? "저장 중..." : hasPin ? "PIN 변경" : "PIN 등록"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
