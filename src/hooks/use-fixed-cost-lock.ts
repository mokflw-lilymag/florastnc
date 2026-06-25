"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  fetchFixedCostLock,
  hashFixedCostPin,
  isFixedCostUnlocked,
  saveFixedCostLock,
  setFixedCostUnlocked,
} from "@/lib/fixed-cost-lock";

export function useFixedCostLock() {
  const { tenantId } = useAuth();
  const [lockEnabled, setLockEnabled] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!tenantId) {
      setLockEnabled(false);
      setUnlocked(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const lock = await fetchFixedCostLock(supabase, tenantId);
      const enabled = !!lock?.pinHash;
      setLockEnabled(enabled);
      setUnlocked(!enabled || isFixedCostUnlocked(tenantId));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const verifyPin = useCallback(
    async (pin: string) => {
      if (!tenantId) return false;
      const supabase = createClient();
      const lock = await fetchFixedCostLock(supabase, tenantId);
      if (!lock?.pinHash) {
        setUnlocked(true);
        return true;
      }
      const hash = await hashFixedCostPin(tenantId, pin);
      if (hash !== lock.pinHash) return false;
      setFixedCostUnlocked(tenantId, true);
      setUnlocked(true);
      return true;
    },
    [tenantId],
  );

  const setPin = useCallback(
    async (pin: string) => {
      if (!tenantId) return false;
      if (pin.trim().length < 4) {
        toast.error("암호는 4자리 이상으로 설정해 주세요.");
        return false;
      }
      try {
        const supabase = createClient();
        const pinHash = await hashFixedCostPin(tenantId, pin);
        await saveFixedCostLock(supabase, tenantId, pinHash);
        setLockEnabled(true);
        setFixedCostUnlocked(tenantId, true);
        setUnlocked(true);
        toast.success("고정비 템플릿 암호가 설정되었습니다.");
        return true;
      } catch (e) {
        console.warn("[useFixedCostLock] setPin failed", e);
        toast.error("암호 저장에 실패했습니다.");
        return false;
      }
    },
    [tenantId],
  );

  const changePin = useCallback(
    async (currentPin: string, newPin: string) => {
      if (!tenantId) return false;
      const ok = await verifyPin(currentPin);
      if (!ok) {
        toast.error("현재 암호가 맞지 않습니다.");
        return false;
      }
      return setPin(newPin);
    },
    [tenantId, verifyPin, setPin],
  );

  const removePin = useCallback(
    async (currentPin: string) => {
      if (!tenantId) return false;
      const ok = await verifyPin(currentPin);
      if (!ok) {
        toast.error("현재 암호가 맞지 않습니다.");
        return false;
      }
      try {
        const supabase = createClient();
        await saveFixedCostLock(supabase, tenantId, null);
        setLockEnabled(false);
        setFixedCostUnlocked(tenantId, true);
        setUnlocked(true);
        toast.success("암호가 해제되었습니다.");
        return true;
      } catch (e) {
        toast.error("암호 해제에 실패했습니다.");
        return false;
      }
    },
    [tenantId, verifyPin],
  );

  const lockAgain = useCallback(() => {
    if (!tenantId) return;
    setFixedCostUnlocked(tenantId, false);
    setUnlocked(false);
  }, [tenantId]);

  return {
    lockEnabled,
    unlocked,
    loading,
    reload,
    verifyPin,
    setPin,
    changePin,
    removePin,
    lockAgain,
  };
}
