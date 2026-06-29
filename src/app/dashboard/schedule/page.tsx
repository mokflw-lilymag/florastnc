"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useFixedCostLock } from "@/hooks/use-fixed-cost-lock";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StoreScheduleCalendar } from "@/components/schedule/store-schedule-calendar";
import { ScheduleLayerFiltersBar } from "@/components/schedule/schedule-layer-filters";
import { ScheduleDayView } from "@/components/schedule/schedule-day-view";
import { StaffShiftDialog } from "@/components/schedule/staff-shift-dialog";
import { ScheduleNoteDialog } from "@/components/schedule/schedule-note-dialog";
import { FixedCostPinDialog } from "@/components/expenses/fixed-cost-pin-dialog";
import { useStaffShifts } from "@/hooks/use-staff-shifts";
import { useScheduleNotes } from "@/hooks/use-schedule-notes";
import { loadScheduleMonthEvents, maskFixedCostScheduleEvents, staffShiftsToEvents, scheduleNotesToEvents } from "@/lib/schedule-calendar-data";
import { shouldMaskFixedCosts } from "@/lib/fixed-cost-lock";
import {
  DEFAULT_SCHEDULE_FILTERS,
  type ScheduleCalendarEvent,
  type ScheduleLayerFilters,
  type StaffShift,
  type ScheduleNote,
} from "@/types/schedule-calendar";
import { Plus } from "lucide-react";

export default function SchedulePage() {
  const { tenantId } = useAuth();
  const [month, setMonth] = useState(() => new Date());
  const [filters, setFilters] = useState<ScheduleLayerFilters>(DEFAULT_SCHEDULE_FILTERS);
  const [events, setEvents] = useState<ScheduleCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedDateYmd, setSelectedDateYmd] = useState<string | null>(null);
  const [dayEvents, setDayEvents] = useState<ScheduleCalendarEvent[]>([]);

  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<StaffShift | null>(null);
  const [shiftDefaultDate, setShiftDefaultDate] = useState<string | undefined>();

  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<ScheduleNote | null>(null);
  const [noteDefaultDate, setNoteDefaultDate] = useState<string | undefined>();

  const { shifts, upsertShift, deleteShift, reload: reloadShifts } = useStaffShifts();
  const { notes, upsertNote, deleteNote, reload: reloadNotes } = useScheduleNotes();
  const {
    lockEnabled: fixedCostLockEnabled,
    unlocked: fixedCostUnlocked,
    verifyPin,
    setPin,
    changePin,
    removePin,
  } = useFixedCostLock();
  const [fixedCostPinOpen, setFixedCostPinOpen] = useState(false);

  const maskFixedCosts = shouldMaskFixedCosts(fixedCostLockEnabled, fixedCostUnlocked);

  // 암호 잠금 상태면 고정비 필터를 강제로 끕니다.
  useEffect(() => {
    if (maskFixedCosts && filters.fixed_cost) {
      setFilters((prev) => ({ ...prev, fixed_cost: false }));
    }
  }, [maskFixedCosts, filters.fixed_cost]);

  const handleFilterChange = (next: ScheduleLayerFilters) => {
    if (next.fixed_cost !== filters.fixed_cost && next.fixed_cost === true && maskFixedCosts) {
      setFixedCostPinOpen(true);
      return;
    }
    setFilters(next);
  };

  const handleUnlock = async (pin: string) => {
    const ok = await verifyPin(pin);
    if (ok) {
      setFilters((prev) => ({ ...prev, fixed_cost: true }));
    }
    return ok;
  };

  const loadMonth = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const data = await loadScheduleMonthEvents(supabase, tenantId, month);
      setEvents(data);
    } catch (e) {
      console.warn("[SchedulePage] load failed", e);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, month]);

  useEffect(() => {
    void loadMonth();
  }, [loadMonth]);

  const combinedEvents = useMemo(() => {
    const baseEvents = events.filter((e) => e.kind !== "staff" && e.kind !== "note");
    return [
      ...baseEvents,
      ...staffShiftsToEvents([...shifts].reverse()),
      ...scheduleNotesToEvents([...notes].reverse()),
    ];
  }, [events, shifts, notes]);

  const filteredEvents = useMemo(
    () => combinedEvents.filter((e) => filters[e.kind]),
    [combinedEvents, filters],
  );

  const displayEvents = useMemo(
    () => maskFixedCostScheduleEvents(filteredEvents, maskFixedCosts),
    [filteredEvents, maskFixedCosts],
  );

  useEffect(() => {
    if (!selectedDateYmd) return;
    const list = combinedEvents.filter((e) => e.dateYmd === selectedDateYmd && filters[e.kind]);
    setDayEvents(maskFixedCostScheduleEvents(list, maskFixedCosts));
  }, [selectedDateYmd, combinedEvents, filters, maskFixedCosts]);

  const handleDayClick = (dateYmd: string, list: ScheduleCalendarEvent[]) => {
    setSelectedDateYmd(dateYmd);
    setDayEvents(list);
  };

  const openAddShift = (dateYmd?: string) => {
    setEditingShift(null);
    setShiftDefaultDate(dateYmd);
    setShiftDialogOpen(true);
  };

  const openEditShift = (id: string) => {
    const found = shifts.find((s) => s.id === id);
    if (!found) return;
    setEditingShift(found);
    setShiftDefaultDate(undefined);
    setShiftDialogOpen(true);
  };

  const handleSaveShift = async (shift: StaffShift) => {
    const ok = await upsertShift(shift);
    if (ok) {
      await reloadShifts();
      await loadMonth();
    }
    return ok;
  };

  const handleDeleteShift = async (id: string) => {
    const ok = await deleteShift(id);
    if (ok) {
      await loadMonth();
      setDayEvents((prev) => prev.filter((e) => e.id !== `staff-${id}`));
    }
  };

  const openAddNote = (dateYmd?: string) => {
    setEditingNote(null);
    setNoteDefaultDate(dateYmd);
    setNoteDialogOpen(true);
  };

  const openEditNote = (id: string) => {
    const found = notes.find((n) => n.id === id);
    if (!found) return;
    setEditingNote(found);
    setNoteDefaultDate(undefined);
    setNoteDialogOpen(true);
  };

  const handleSaveNote = async (note: ScheduleNote) => {
    const ok = await upsertNote(note);
    if (ok) {
      await reloadNotes();
      await loadMonth();
    }
    return ok;
  };

  const handleDeleteNote = async (id: string) => {
    const ok = await deleteNote(id);
    if (ok) {
      await loadMonth();
      setDayEvents((prev) => prev.filter((e) => e.id !== `note-${id}`));
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="매장 일정"
        description="체크한 항목만 캘린더에 표시됩니다. 픽업·배송·고정비·지출·직원 근무를 한눈에 확인하세요."
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <ScheduleLayerFiltersBar filters={filters} onChange={handleFilterChange} fixedCostLocked={maskFixedCosts} />
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => openAddNote()}>
            <Plus className="h-4 w-4 mr-1" />
            특이/전달사항
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => openAddShift()}>
            <Plus className="h-4 w-4 mr-1" />
            직원 스케줄
          </Button>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-[520px] w-full rounded-xl" />
      ) : (
        <StoreScheduleCalendar
          month={month}
          onMonthChange={setMonth}
          events={displayEvents}
          filters={filters}
          onDayClick={handleDayClick}
          maskFixedCosts={maskFixedCosts}
        />
      )}

      {selectedDateYmd && (
        <ScheduleDayView
          dateYmd={selectedDateYmd}
          events={dayEvents}
          onAddStaff={openAddShift}
          onEditStaff={openEditShift}
          onDeleteStaff={handleDeleteShift}
          onAddNote={openAddNote}
          onEditNote={openEditNote}
          onDeleteNote={handleDeleteNote}
          maskFixedCosts={maskFixedCosts}
          onUnlockFixedCosts={() => setFixedCostPinOpen(true)}
        />
      )}

      <FixedCostPinDialog
        open={fixedCostPinOpen}
        onOpenChange={setFixedCostPinOpen}
        mode="unlock"
        lockEnabled={fixedCostLockEnabled}
        onUnlock={handleUnlock}
        onSetPin={setPin}
        onChangePin={changePin}
        onRemovePin={removePin}
      />

      <StaffShiftDialog
        open={shiftDialogOpen}
        onOpenChange={setShiftDialogOpen}
        initial={editingShift}
        defaultDateYmd={shiftDefaultDate}
        onSave={handleSaveShift}
      />

      <ScheduleNoteDialog
        open={noteDialogOpen}
        onOpenChange={setNoteDialogOpen}
        initial={editingNote}
        defaultDateYmd={noteDefaultDate}
        onSave={handleSaveNote}
      />
    </div>
  );
}
