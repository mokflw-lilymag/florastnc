"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import type { ScheduleNote } from "@/types/schedule-calendar";
import { fetchScheduleNotes, saveScheduleNotes } from "@/lib/schedule-calendar-data";

export function useScheduleNotes() {
  const { tenantId } = useAuth();
  const [notes, setNotes] = useState<ScheduleNote[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const supabase = createClient();
      setNotes(await fetchScheduleNotes(supabase, tenantId));
    } catch (e) {
      console.warn("[useScheduleNotes] load failed", e);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void reload();
    
    if (!tenantId) return;
    const supabase = createClient();
    const notesId = `calendar_notes_${tenantId}`;
    const channel = supabase.channel(`system_settings_notes_${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_settings',
          filter: `id=eq.${notesId}`,
        },
        () => {
          void reload();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [reload, tenantId]);

  const upsertNote = async (note: ScheduleNote) => {
    if (!tenantId) return false;
    const next = [...notes.filter((n) => n.id !== note.id), note];
    try {
      const supabase = createClient();
      await saveScheduleNotes(supabase, tenantId, next);
      setNotes(next);
      toast.success("특이사항이 저장되었습니다.");
      return true;
    } catch (e) {
      console.warn("[useScheduleNotes] save failed", e);
      toast.error("저장에 실패했습니다.");
      return false;
    }
  };

  const deleteNote = async (id: string) => {
    if (!tenantId) return false;
    const next = notes.filter((n) => n.id !== id);
    try {
      const supabase = createClient();
      await saveScheduleNotes(supabase, tenantId, next);
      setNotes(next);
      toast.success("특이사항이 삭제되었습니다.");
      return true;
    } catch (e) {
      toast.error("삭제에 실패했습니다.");
      return false;
    }
  };

  return { notes, loading, reload, upsertNote, deleteNote };
}
