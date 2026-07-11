"use client";

import { useMemo } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StaffLeaveRequest } from "@/types/staff-salary";
import {
  expandLeaveToDayMarkers,
  leaveStatusColor,
  markersForMonth,
} from "@/lib/staff-leave-calendar";

type Props = {
  month: Date;
  onMonthChange: (d: Date) => void;
  requests: StaffLeaveRequest[];
  onDayClick: (dateYmd: string) => void;
  onLeaveClick?: (leaveId: string) => void;
};

export function StaffLeaveCalendar({
  month,
  onMonthChange,
  requests,
  onDayClick,
  onLeaveClick,
}: Props) {
  const monthStart = startOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const markersByDate = useMemo(() => {
    const markers = expandLeaveToDayMarkers(requests);
    return markersForMonth(markers, month);
  }, [requests, month]);

  const handleDayClick = (dateYmd: string) => {
    onDayClick(dateYmd);
  };

  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            {format(month, "yyyy년 M월", { locale: ko })}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            날짜를 클릭하면 휴가 등록 창이 열립니다
          </p>
        </div>
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

      <div className="flex flex-wrap gap-3 px-4 py-2 border-b bg-slate-50 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-emerald-200 border border-emerald-300" />
          승인
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-amber-200 border border-amber-300" />
          승인대기
        </span>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-300 bg-slate-50">
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

      <div className="grid grid-cols-7 divide-x divide-y divide-slate-300 border-b border-r border-slate-300">
        {days.map((day) => {
          const dateYmd = format(day, "yyyy-MM-dd");
          const inMonth = isSameMonth(day, monthStart);
          const today = isToday(day);
          const isSunday = getDay(day) === 0;
          const markers = markersByDate.get(dateYmd) ?? [];

          return (
            <button
              key={dateYmd}
              type="button"
              onClick={() => handleDayClick(dateYmd)}
              className={cn(
                "min-h-[100px] p-1.5 flex flex-col text-left transition-colors hover:bg-indigo-50/50",
                !inMonth && "bg-slate-50/60 text-slate-400",
                inMonth && "bg-white",
                markers.some((m) => m.status === "approved") && inMonth && "bg-emerald-50/40",
                markers.some((m) => m.status === "pending") &&
                  !markers.some((m) => m.status === "approved") &&
                  inMonth &&
                  "bg-amber-50/40",
              )}
            >
              <div className="flex justify-end mb-1">
                <span
                  className={cn(
                    "text-sm font-medium h-6 w-6 flex items-center justify-center rounded-full",
                    today ? "bg-indigo-600 text-white" : isSunday ? "text-red-500" : "",
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {markers.slice(0, 3).map((m) => (
                  <span
                    key={`${m.leaveId}-${m.dateYmd}`}
                    role={onLeaveClick ? "button" : undefined}
                    onClick={(e) => {
                      if (onLeaveClick) {
                        e.stopPropagation();
                        onLeaveClick(m.leaveId);
                      }
                    }}
                    className={cn(
                      "truncate rounded px-1 py-0.5 text-[10px] font-medium border",
                      leaveStatusColor(m.status),
                    )}
                    title={`${m.staffName} ${m.leaveType}`}
                  >
                    {m.staffName} {m.leaveType}
                  </span>
                ))}
                {markers.length > 3 && (
                  <span className="text-[10px] text-slate-500 px-1">+{markers.length - 3}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
