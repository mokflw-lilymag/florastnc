import * as React from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { ScheduleCalendarEvent } from "@/types/schedule-calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pencil, Trash2, Plus, Package, Truck, Wallet, CreditCard, User, StickyNote, Lock, CalendarOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/use-currency";

const KIND_META: Record<string, { label: string; badge: string; icon: any }> = {
  pickup: { label: "픽업", badge: "bg-blue-100 text-blue-700", icon: Package },
  delivery: { label: "배송", badge: "bg-purple-100 text-purple-700", icon: Truck },
  fixed_cost: { label: "고정비", badge: "bg-rose-100 text-rose-700", icon: Wallet },
  expense: { label: "지출", badge: "bg-orange-100 text-orange-700", icon: CreditCard },
  staff: { label: "근무", badge: "bg-indigo-100 text-indigo-700", icon: User },
  note: { label: "메모", badge: "bg-slate-200 text-slate-700", icon: StickyNote },
  leave: { label: "휴가", badge: "bg-teal-100 text-teal-800", icon: CalendarOff },
};

type Props = {
  dateYmd: string;
  events: ScheduleCalendarEvent[];
  maskFixedCosts?: boolean;
  onAddStaff?: (dateYmd?: string) => void;
  onEditStaff?: (id: string) => void;
  onDeleteStaff?: (id: string) => void;
  onAddNote?: (dateYmd?: string) => void;
  onEditNote?: (id: string) => void;
  onDeleteNote?: (id: string) => void;
  onUnlockFixedCosts?: () => void;
};

export function ScheduleDayView({
  dateYmd,
  events,
  maskFixedCosts = false,
  onAddStaff,
  onEditStaff,
  onDeleteStaff,
  onAddNote,
  onEditNote,
  onDeleteNote,
  onUnlockFixedCosts,
}: Props) {
    const { symbol: currencySymbol } = useCurrency();
  if (!dateYmd) return null;
  const dateObj = parseISO(dateYmd);

  const groupedEvents = [
    { label: "픽업/배송", events: events.filter((e) => e.kind === "pickup" || e.kind === "delivery") },
    { label: "특이사항 및 전달사항", events: events.filter((e) => e.kind === "note") },
    { label: "직원 스케줄", events: events.filter((e) => e.kind === "staff") },
    { label: "직원 휴가", events: events.filter((e) => e.kind === "leave") },
    { label: "고정비 지출", events: events.filter((e) => e.kind === "fixed_cost") },
    { label: "지출 일반", events: events.filter((e) => e.kind === "expense") },
  ].filter((group) => group.events.length > 0);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h3 className="text-lg font-bold text-slate-900">
          {format(dateObj, "M월 d일 (E)", { locale: ko })} 일정
        </h3>
      </div>
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-4 p-4">
          <div className="flex gap-2">
            {onAddNote ? (
              <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => onAddNote(dateYmd)}>
                + 특이/전달사항
              </Button>
            ) : null}
            {onAddStaff ? (
              <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => onAddStaff(dateYmd)}>
                + 직원 스케줄
              </Button>
            ) : null}
          </div>

          {events.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">표시할 일정이 없습니다.</p>
          ) : (
            groupedEvents.map((group, groupIdx) => (
              <div key={group.label} className="flex flex-col gap-2">
                {groupIdx > 0 && <div className="my-2 border-t border-slate-100" />}
                <h4 className="text-sm font-bold text-slate-700 px-1">{group.label}</h4>
                {group.events.map((ev) => (
                  <EventItem
                    key={ev.id}
                    ev={ev}
                    maskFixedCosts={maskFixedCosts}
                    onEditStaff={onEditStaff}
                    onDeleteStaff={onDeleteStaff}
                    onEditNote={onEditNote}
                    onDeleteNote={onDeleteNote}
                    onUnlockFixedCosts={onUnlockFixedCosts}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function cnBadge(c: string) {
  return `${c} hover:${c}`;
}

function EventItem({
  ev,
  maskFixedCosts,
  onEditStaff,
  onDeleteStaff,
  onEditNote,
  onDeleteNote,
  onUnlockFixedCosts,
}: {
  ev: ScheduleCalendarEvent;
  maskFixedCosts: boolean;
  onEditStaff?: (id: string) => void;
  onDeleteStaff?: (id: string) => void;
  onEditNote?: (id: string) => void;
  onDeleteNote?: (id: string) => void;
  onUnlockFixedCosts?: () => void;
}) {
    const { symbol: currencySymbol } = useCurrency();
  const [expanded, setExpanded] = React.useState(false);

  const meta = KIND_META[ev.kind];
  const Icon = ev.kind === "fixed_cost" && maskFixedCosts ? Lock : meta.icon;
  const isStaff = ev.kind === "staff";
  const isNote = ev.kind === "note";
  const staffId = isStaff ? ev.id.replace(/^staff-/, "") : "";
  const noteId = isNote ? ev.id.replace(/^note-/, "") : "";
  const isMaskedFixed = ev.kind === "fixed_cost" && maskFixedCosts;

  return (
    <div className={cn("rounded-lg border p-3 shadow-sm", isMaskedFixed && "bg-slate-50")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Badge className={cnBadge(meta.badge)}>{meta.label}</Badge>
          {ev.time ? <span className="text-xs text-muted-foreground">{ev.time}</span> : null}
        </div>
        {isStaff && onEditStaff && onDeleteStaff ? (
          <div className="flex gap-1 shrink-0">
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditStaff(staffId)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDeleteStaff(staffId)}>
              <Trash2 className="h-3.5 w-3.5 text-rose-500" />
            </Button>
          </div>
        ) : null}
        {isNote && onEditNote && onDeleteNote ? (
          <div className="flex gap-1 shrink-0">
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditNote(noteId)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDeleteNote(noteId)}>
              <Trash2 className="h-3.5 w-3.5 text-rose-500" />
            </Button>
          </div>
        ) : null}
      </div>
      <div className="mt-2">
        {isMaskedFixed && onUnlockFixedCosts ? (
          <button
            type="button"
            onClick={onUnlockFixedCosts}
            className="flex items-start gap-2 text-left w-full hover:bg-slate-100 p-1.5 -m-1.5 rounded-md transition-colors"
          >
            <Icon className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <div className="min-w-0 flex flex-col flex-1 gap-1">
              <p className="font-semibold text-sm text-slate-400">잠김 (클릭하여 금액 잠금 해제)</p>
              {ev.subtitle ? (
                <p className="text-xs text-violet-700">
                  {ev.subtitle}
                </p>
              ) : null}
            </div>
          </button>
        ) : (
          <div className="flex items-start gap-2">
            <Icon className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <div className="min-w-0 flex flex-col flex-1 gap-1">
              {isNote ? (
                <button 
                  onClick={() => setExpanded(!expanded)} 
                  className="text-left font-semibold text-sm hover:text-blue-600 transition-colors"
                >
                  <p className={cn("break-all whitespace-pre-wrap", !expanded && "line-clamp-1 truncate whitespace-normal")}>
                    {ev.title}
                  </p>
                </button>
              ) : (
                <p className="font-semibold text-sm truncate break-all">{ev.title}</p>
              )}
              
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {ev.subtitle ? (
                  <p className={cn("text-xs truncate", isMaskedFixed ? "text-violet-700" : "text-muted-foreground")}>
                    {ev.subtitle}
                  </p>
                ) : null}
                {ev.amount != null && ev.amount > 0 ? (
                  <p className="text-xs font-medium text-slate-700">
                    {currencySymbol}{Math.round(ev.amount).toLocaleString()}
                  </p>
                ) : null}
                {ev.href && !isStaff && !isMaskedFixed ? (
                  <Link href={ev.href} className="text-xs text-blue-600 hover:underline inline-block">
                    상세 보기
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
