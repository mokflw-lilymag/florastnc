"use client";

import { Package, Truck, CreditCard, Wallet, Users, FileText, Lock, CalendarOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScheduleEventKind, ScheduleLayerFilters } from "@/types/schedule-calendar";

const LAYERS: {
  key: ScheduleEventKind;
  label: string;
  icon: typeof Package;
  activeClass: string;
}[] = [
  { key: "pickup", label: "픽업", icon: Package, activeClass: "border-amber-300 bg-amber-50 text-amber-900" },
  { key: "delivery", label: "배송", icon: Truck, activeClass: "border-blue-300 bg-blue-50 text-blue-900" },
  { key: "fixed_cost", label: "고정비", icon: CreditCard, activeClass: "border-violet-300 bg-violet-50 text-violet-900" },
  { key: "expense", label: "지출", icon: Wallet, activeClass: "border-emerald-300 bg-emerald-50 text-emerald-900" },
  { key: "staff", label: "직원 스케줄", icon: Users, activeClass: "border-purple-300 bg-purple-50 text-purple-900" },
  { key: "note", label: "특이/전달사항", icon: FileText, activeClass: "border-gray-300 bg-gray-50 text-gray-900" },
  { key: "leave", label: "직원 휴가", icon: CalendarOff, activeClass: "border-teal-300 bg-teal-50 text-teal-900" },
];

type Props = {
  filters: ScheduleLayerFilters;
  onChange: (next: ScheduleLayerFilters) => void;
  fixedCostLocked?: boolean;
};

export function ScheduleLayerFiltersBar({ filters, onChange, fixedCostLocked }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {LAYERS.map(({ key, label, icon: Icon, activeClass }) => {
        const on = filters[key];
        const isLocked = key === "fixed_cost" && fixedCostLocked;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange({ ...filters, [key]: !on })}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              on ? activeClass : "border-slate-200 bg-white text-slate-400 line-through",
            )}
          >
            {isLocked ? <Lock className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
            {label}
          </button>
        );
      })}
    </div>
  );
}
