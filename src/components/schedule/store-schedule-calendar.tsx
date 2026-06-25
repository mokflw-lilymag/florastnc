"use client";

import { useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Package, Truck, CreditCard, Wallet, Users, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  DayScheduleSummary,
  ScheduleCalendarEvent,
  ScheduleLayerFilters,
} from "@/types/schedule-calendar";

type Props = {
  month: Date;
  onMonthChange: (d: Date) => void;
  events: ScheduleCalendarEvent[];
  filters: ScheduleLayerFilters;
  onDayClick: (dateYmd: string, dayEvents: ScheduleCalendarEvent[]) => void;
  maskFixedCosts?: boolean;
};

function filterEvents(events: ScheduleCalendarEvent[], filters: ScheduleLayerFilters) {
  return events.filter((e) => filters[e.kind]);
}

export function StoreScheduleCalendar({
  month,
  onMonthChange,
  events,
  filters,
  onDayClick,
  maskFixedCosts = false,
}: Props) {
  const monthStart = startOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const filtered = useMemo(() => filterEvents(events, filters), [events, filters]);

  const byDate = useMemo(() => {
    const map = new Map<string, DayScheduleSummary>();
    for (const e of filtered) {
      let row = map.get(e.dateYmd);
      if (!row) {
        row = {
          dateYmd: e.dateYmd,
          pickups: 0,
          deliveries: 0,
          fixedCosts: 0,
          expenses: 0,
          staff: 0,
          events: [],
        };
        map.set(e.dateYmd, row);
      }
      row.events.push(e);
      if (e.kind === "pickup") row.pickups += 1;
      if (e.kind === "delivery") row.deliveries += 1;
      if (e.kind === "fixed_cost") row.fixedCosts += 1;
      if (e.kind === "expense") row.expenses += 1;
      if (e.kind === "staff") row.staff += 1;
    }
    return map;
  }, [filtered]);

  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="text-lg font-bold text-slate-800">
          {format(month, "yyyy년 M월", { locale: ko })}
        </h2>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onMonthChange(new Date())}>
            오늘
          </Button>
          <div className="flex border rounded-md overflow-hidden">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-none border-r"
              onClick={() => onMonthChange(subMonths(month, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-none"
              onClick={() => onMonthChange(addMonths(month, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b bg-slate-50">
        {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
          <div
            key={d}
            className={cn(
              "py-2 text-center text-xs font-semibold",
              i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-slate-500",
            )}
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 divide-x divide-y border-b border-r">
        {days.map((day) => {
          const dateYmd = format(day, "yyyy-MM-dd");
          const row = byDate.get(dateYmd);
          const inMonth = isSameMonth(day, monthStart);
          const today = isToday(day);

          return (
            <button
              key={dateYmd}
              type="button"
              onClick={() => onDayClick(dateYmd, row?.events ?? [])}
              className={cn(
                "min-h-[108px] p-2 text-left transition-colors hover:bg-slate-50",
                !inMonth && "bg-slate-50/60 text-slate-400",
                inMonth && "bg-white",
              )}
            >
              <div className="flex justify-between items-start mb-1">
                <span
                  className={cn(
                    "text-sm font-medium h-6 w-6 flex items-center justify-center rounded-full",
                    today && "bg-blue-600 text-white",
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>
              {row ? (
                <div className="flex flex-col gap-0.5 items-start">
                  {filters.pickup && row.pickups > 0 ? (
                    <BadgeChip icon={Package} label={row.pickups} className="bg-amber-50 text-amber-800 border-amber-100" />
                  ) : null}
                  {filters.delivery && row.deliveries > 0 ? (
                    <BadgeChip icon={Truck} label={row.deliveries} className="bg-blue-50 text-blue-800 border-blue-100" />
                  ) : null}
                  {filters.fixed_cost && row.fixedCosts > 0 ? (
                    maskFixedCosts ? (
                      <BadgeChip
                        icon={Lock}
                        label=""
                        hideLabel
                        className="bg-violet-50 text-violet-700 border-violet-200"
                        title="고정비 (암호 잠금)"
                      />
                    ) : (
                      <BadgeChip icon={CreditCard} label={row.fixedCosts} className="bg-violet-50 text-violet-800 border-violet-100" />
                    )
                  ) : null}
                  {filters.expense && row.expenses > 0 ? (
                    <BadgeChip icon={Wallet} label={row.expenses} className="bg-emerald-50 text-emerald-800 border-emerald-100" />
                  ) : null}
                  {filters.staff && row.staff > 0 ? (
                    <BadgeChip icon={Users} label={row.staff} className="bg-purple-50 text-purple-800 border-purple-100" />
                  ) : null}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BadgeChip({
  icon: Icon,
  label,
  className,
  hideLabel,
  title,
}: {
  icon: typeof Package;
  label: number | string;
  className: string;
  hideLabel?: boolean;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold",
        className,
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {hideLabel ? null : label}
    </span>
  );
}
