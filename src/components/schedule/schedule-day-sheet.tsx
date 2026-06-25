"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { Package, Truck, CreditCard, Wallet, Users, Trash2, Pencil, Lock } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ScheduleCalendarEvent, ScheduleEventKind } from "@/types/schedule-calendar";

const KIND_META: Record<
  ScheduleEventKind,
  { label: string; icon: typeof Package; badge: string }
> = {
  pickup: { label: "픽업", icon: Package, badge: "bg-amber-100 text-amber-800" },
  delivery: { label: "배송", icon: Truck, badge: "bg-blue-100 text-blue-800" },
  fixed_cost: { label: "고정비", icon: CreditCard, badge: "bg-violet-100 text-violet-800" },
  expense: { label: "지출", icon: Wallet, badge: "bg-emerald-100 text-emerald-800" },
  staff: { label: "직원", icon: Users, badge: "bg-purple-100 text-purple-800" },
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateYmd: string | null;
  events: ScheduleCalendarEvent[];
  onAddStaff?: (dateYmd: string) => void;
  onEditStaff?: (eventId: string) => void;
  onDeleteStaff?: (eventId: string) => void;
  maskFixedCosts?: boolean;
  onUnlockFixedCosts?: () => void;
};

export function ScheduleDaySheet({
  open,
  onOpenChange,
  dateYmd,
  events,
  onAddStaff,
  onEditStaff,
  onDeleteStaff,
  maskFixedCosts = false,
  onUnlockFixedCosts,
}: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!dateYmd || !mounted) return null;

  const titleDate = format(parseISO(dateYmd), "M월 d일 (EEE)", { locale: ko });
  const hasMaskedFixedCosts = maskFixedCosts && events.some((e) => e.kind === "fixed_cost");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{titleDate} 일정</SheetTitle>
          <SheetDescription>{events.length}건 · 체크한 항목만 표시</SheetDescription>
        </SheetHeader>

        {hasMaskedFixedCosts && onUnlockFixedCosts ? (
          <div className="mt-4 rounded-lg border border-violet-200 bg-violet-50/80 px-3 py-2.5 flex items-center justify-between gap-2">
            <p className="text-xs text-violet-900 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 shrink-0" />
              고정비 항목·금액은 암호 입력 후 표시됩니다.
            </p>
            <Button type="button" variant="outline" size="sm" className="h-7 shrink-0 text-xs" onClick={onUnlockFixedCosts}>
              암호 입력
            </Button>
          </div>
        ) : null}

        <div className="mt-4 flex flex-col gap-2">
          {onAddStaff ? (
            <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => onAddStaff(dateYmd)}>
              + 직원 스케줄 추가
            </Button>
          ) : null}

          {events.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">표시할 일정이 없습니다.</p>
          ) : (
            events.map((ev) => {
              const meta = KIND_META[ev.kind];
              const Icon = ev.kind === "fixed_cost" && maskFixedCosts ? Lock : meta.icon;
              const isStaff = ev.kind === "staff";
              const staffId = isStaff ? ev.id.replace(/^staff-/, "") : "";
              const isMaskedFixed = ev.kind === "fixed_cost" && maskFixedCosts;

              return (
                <div key={ev.id} className="rounded-lg border p-3 shadow-sm">
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
                  </div>
                  <div className="mt-2 flex items-start gap-2">
                    <Icon className="h-4 w-4 mt-0.5 text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{ev.title}</p>
                      {ev.subtitle ? (
                        <p className={cn("text-xs truncate", isMaskedFixed ? "text-violet-700" : "text-muted-foreground")}>
                          {ev.subtitle}
                        </p>
                      ) : null}
                      {ev.amount != null && ev.amount > 0 ? (
                        <p className="text-xs font-medium text-slate-700 mt-0.5">
                          ₩{Math.round(ev.amount).toLocaleString()}
                        </p>
                      ) : null}
                      {ev.href && !isStaff && !isMaskedFixed ? (
                        <Link href={ev.href} className="text-xs text-blue-600 hover:underline mt-1 inline-block">
                          상세 보기
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function cnBadge(c: string) {
  return `${c} hover:${c}`;
}
