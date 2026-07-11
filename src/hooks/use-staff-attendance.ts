"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { usePosSession } from "@/hooks/use-pos-session";
import { getPosClientHeaders } from "@/lib/pos-device";

export interface StaffAttendanceLog {
  id: string;
  staff_id: string;
  type: "clock_in" | "clock_out";
  recorded_at: string;
  created_at?: string;
  tenant_staff?: { name: string, pin_code: string };
}

export function useStaffAttendance() {
  const { tenantId, user } = useAuth();
  const { activeProfile, isStaffMode } = usePosSession();
  
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<StaffAttendanceLog[]>([]);
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  // PIN 전환된 직원(tenant_staff.id) 또는 로그인 계정
  const targetUserId = activeProfile?.id || user?.id;

  const fetchLogs = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const res = await fetch(targetUserId ? `/api/staff/attendance?targetUserId=${targetUserId}` : `/api/staff/attendance`, {
        headers: getPosClientHeaders(),
      });
      if (!res.ok) {
        throw new Error("Failed to fetch logs");
      }
      const data = await res.json();
      setLogs(data.logs || []);

      // 오늘 출근 여부 → 퇴근하기 버튼 표시용
      if (isStaffMode && targetUserId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todaysLogs = (data.logs || []).filter((l: StaffAttendanceLog) => 
          l.staff_id === targetUserId && 
          new Date(l.recorded_at).getTime() > today.getTime()
        );
        
        // Sort ascending
        todaysLogs.sort((a: StaffAttendanceLog, b: StaffAttendanceLog) => 
          new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
        );

        if (todaysLogs.length > 0) {
          const lastLog = todaysLogs[todaysLogs.length - 1];
          setIsCheckedIn(lastLog.type === "clock_in");
        } else {
          setIsCheckedIn(false);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch attendance logs", e);
    } finally {
      setLoading(false);
    }
  }, [tenantId, isStaffMode, targetUserId]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const recordAttendance = async (type: "clock_in" | "clock_out") => {
    if (!tenantId || !user) return false;
    
    try {
      const res = await fetch("/api/staff/attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getPosClientHeaders(),
        },
        body: JSON.stringify({ type, targetUserId })
      });
      
      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(data.error || "근태 기록에 실패했습니다.");
        return false;
      }
      
      toast.success(type === "clock_in" ? "출근이 기록되었습니다." : "퇴근이 기록되었습니다.");
      await fetchLogs();
      return true;
    } catch (e) {
      toast.error("네트워크 오류가 발생했습니다.");
      return false;
    }
  };

  return {
    logs,
    loading,
    isCheckedIn,
    recordAttendance,
    refresh: fetchLogs
  };
}
