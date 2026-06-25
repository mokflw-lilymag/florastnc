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
import { ScheduleDaySheet } from "@/components/schedule/schedule-day-sheet";
import { StaffShiftDialog } from "@/components/schedule/staff-shift-dialog";
import { FixedCostPinDialog } from "@/components/expenses/fixed-cost-pin-dialog";
import { useStaffShifts } from "@/hooks/use-staff-shifts";
import { loadScheduleMonthEvents, maskFixedCostScheduleEvents } from "@/lib/schedule-calendar-data";
import { shouldMaskFixedCosts } from "@/lib/fixed-cost-lock";
import {
  DEFAULT_SCHEDULE_FILTERS,
  type ScheduleCalendarEvent,
  type ScheduleLayerFilters,
  type StaffShift,
} from "@/types/schedule-calendar";
import { Plus } from "lucide-react";

export default function SchedulePage() {
  const { tenantId } = useAuth();
  const [month, setMonth] = useState(() => new Date());
  const [filters, setFilters] = useState<ScheduleLayerFilters>(DEFAULT_SCHEDULE_FILTERS);
  const [events, setEvents] = useState<ScheduleCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const [daySheetOpen, setDaySheetOpen] = useState(false);
  const [selectedDateYmd, setSelectedDateYmd] = useState<string | null>(null);
  const [dayEvents, setDayEvents] = useState<ScheduleCalendarEvent[]>([]);

  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<StaffShift | null>(null);
  const [shiftDefaultDate, setShiftDefaultDate] = useState<string | undefined>();

  const { shifts, upsertShift, deleteShift, reload: reloadShifts } = useStaffShifts();
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

  const filteredEvents = useMemo(
    () => events.filter((e) => filters[e.kind]),
    [events, filters],
  );

  const displayEvents = useMemo(
    () => maskFixedCostScheduleEvents(filteredEvents, maskFixedCosts),
    [filteredEvents, maskFixedCosts],
  );

  useEffect(() => {
    if (!daySheetOpen || !selectedDateYmd) return;
    const list = events.filter((e) => e.dateYmd === selectedDateYmd && filters[e.kind]);
    setDayEvents(maskFixedCostScheduleEvents(list, maskFixedCosts));
  }, [daySheetOpen, selectedDateYmd, events, filters, maskFixedCosts]);

  const handleDayClick = (dateYmd: string, list: ScheduleCalendarEvent[]) => {
    setSelectedDateYmd(dateYmd);
    setDayEvents(list);
    setDaySheetOpen(true);
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

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="매장 일정"
        description="체크한 항목만 캘린더에 표시됩니다. 픽업·배송·고정비·지출·직원 근무를 한눈에 확인하세요."
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <ScheduleLayerFiltersBar filters={filters} onChange={setFilters} />
        <Button type="button" variant="outline" size="sm" onClick={() => openAddShift()}>
          <Plus className="h-4 w-4 mr-1" />
          직원 스케줄
        </Button>
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

      <ScheduleDaySheet
        open={daySheetOpen}
        onOpenChange={setDaySheetOpen}
        dateYmd={selectedDateYmd}
        events={dayEvents}
        onAddStaff={(ymd) => openAddShift(ymd)}
        onEditStaff={openEditShift}
        onDeleteStaff={(id) => void handleDeleteShift(id)}
        maskFixedCosts={maskFixedCosts}
        onUnlockFixedCosts={() => setFixedCostPinOpen(true)}
      />

      <FixedCostPinDialog
        open={fixedCostPinOpen}
        onOpenChange={setFixedCostPinOpen}
        mode="unlock"
        lockEnabled={fixedCostLockEnabled}
        onUnlock={verifyPin}
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
    </div>
  );
}
