"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  ANNOUNCEMENT_COUNTRY_REGIONS,
  ANNOUNCEMENT_PLAN_OPTIONS,
} from "@/lib/platform-announcements/targeting";

type Props = {
  selectedCountries: string[];
  selectedPlans: string[];
  onCountriesChange: (codes: string[]) => void;
  onPlansChange: (plans: string[]) => void;
};

function Chip({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "border-indigo-400 bg-indigo-50 text-indigo-800"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function AnnouncementTargetingFields({
  selectedCountries,
  selectedPlans,
  onCountriesChange,
  onPlansChange,
}: Props) {
  const allCountries = selectedCountries.length === 0;
  const allPlans = selectedPlans.length === 0;

  const toggleCountry = (code: string) => {
    if (allCountries) {
      onCountriesChange([code]);
      return;
    }
    const next = selectedCountries.includes(code)
      ? selectedCountries.filter((x) => x !== code)
      : [...selectedCountries, code];
    onCountriesChange(next);
  };

  const toggleRegion = (codes: string[]) => {
    if (allCountries) {
      onCountriesChange(codes);
      return;
    }
    const allSelected = codes.every((c) => selectedCountries.includes(c));
    if (allSelected) {
      onCountriesChange(selectedCountries.filter((c) => !codes.includes(c)));
      return;
    }
    onCountriesChange([...new Set([...selectedCountries, ...codes])]);
  };

  const regionAllSelected = (codes: string[]) =>
    !allCountries && codes.length > 0 && codes.every((c) => selectedCountries.includes(c));

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <div>
        <p className="text-sm font-semibold text-slate-800 mb-1">대상 국가</p>
        <p className="text-[11px] text-slate-500 mb-3">
          아무것도 고르지 않으면 운영 중인 전체 국가({ANNOUNCEMENT_COUNTRY_REGIONS.reduce((n, g) => n + g.countries.length, 0)}개국)에 표시됩니다.
        </p>
        <div className="mb-3">
          <Chip active={allCountries} onClick={() => onCountriesChange([])}>
            🌐 전체 국가
          </Chip>
        </div>
        <div className="space-y-3 max-h-[min(360px,45vh)] overflow-y-auto pr-1">
          {ANNOUNCEMENT_COUNTRY_REGIONS.map((group) => {
            const codes = group.countries.map((c) => c.code);
            return (
              <div key={group.region} className="rounded-lg border border-slate-200/80 bg-white/70 p-2.5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-xs font-bold text-slate-700">{group.label}</p>
                  <button
                    type="button"
                    onClick={() => toggleRegion(codes)}
                    className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors",
                      regionAllSelected(codes)
                        ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 text-slate-500 hover:border-slate-300",
                    )}
                  >
                    {regionAllSelected(codes) ? "지역 해제" : "지역 전체"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {group.countries.map((c) => (
                    <Chip
                      key={c.code}
                      active={!allCountries && selectedCountries.includes(c.code)}
                      onClick={() => toggleCountry(c.code)}
                    >
                      {c.flag} {c.nameKo}
                    </Chip>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-800 mb-1">대상 요금제</p>
        <p className="text-[11px] text-slate-500 mb-2">아무것도 고르지 않으면 전체 요금제에 표시됩니다.</p>
        <div className="flex flex-wrap gap-1.5">
          <Chip active={allPlans} onClick={() => onPlansChange([])}>
            전체 요금제
          </Chip>
          {ANNOUNCEMENT_PLAN_OPTIONS.map((p) => (
            <Chip
              key={p.id}
              active={!allPlans && selectedPlans.includes(p.id)}
              onClick={() => {
                if (allPlans) {
                  onPlansChange([p.id]);
                  return;
                }
                const next = selectedPlans.includes(p.id)
                  ? selectedPlans.filter((x) => x !== p.id)
                  : [...selectedPlans, p.id];
                onPlansChange(next);
              }}
            >
              {p.label}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}
