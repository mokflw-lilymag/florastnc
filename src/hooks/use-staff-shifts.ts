"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import type { StaffShift } from "@/types/schedule-calendar";
import { fetchStaffShifts, saveStaffShifts } from "@/lib/schedule-calendar-data";

export function useStaffShifts() {
  const { tenantId } = useAuth();
  const [shifts, setShifts] = useState<StaffShift[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const supabase = createClient();
      setShifts(await fetchStaffShifts(supabase, tenantId));
    } catch (e) {
      console.warn("[useStaffShifts] load failed", e);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const upsertShift = async (shift: StaffShift) => {
    if (!tenantId) return false;
    const next = [...shifts.filter((s) => s.id !== shift.id), shift];
    try {
      const supabase = createClient();
      await saveStaffShifts(supabase, tenantId, next);
      setShifts(next);
      toast.success("직원 스케줄이 저장되었습니다.");
      return true;
    } catch (e) {
      console.warn("[useStaffShifts] save failed", e);
      toast.error("저장에 실패했습니다.");
      return false;
    }
  };

  const deleteShift = async (id: string) => {
    if (!tenantId) return false;
    const next = shifts.filter((s) => s.id !== id);
    try {
      const supabase = createClient();
      await saveStaffShifts(supabase, tenantId, next);
      setShifts(next);
      toast.success("삭제되었습니다.");
      return true;
    } catch (e) {
      toast.error("삭제에 실패했습니다.");
      return false;
    }
  };

  return { shifts, loading, reload, upsertShift, deleteShift };
}
