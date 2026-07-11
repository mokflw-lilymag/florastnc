"use client";

import { format, parseISO, type Locale } from "date-fns";
import { History, Loader2 } from "lucide-react";
import type { TenantSubscriptionEventRow } from "@/lib/subscription/subscription-events";
import {
  eventTypeLabelKo,
  periodLabelKo,
  planIdLabel,
} from "@/lib/subscription/subscription-events";
import { dateFnsLocaleForBase } from "@/lib/date-fns-locale";
import { toBaseLocale } from "@/i18n/config";
import { useCurrency } from "@/hooks/use-currency";

function formatAmount(amountCents: number | null, currency: string | null): string {
  if (amountCents == null) return "-";
  const cur = (currency ?? "KRW").toUpperCase();
  if (cur === "KRW") return `₩${amountCents.toLocaleString("en-US")}`;
  if (cur === "USD") return `$${(amountCents / 100).toLocaleString("en-US")}`;
  return `${amountCents} ${cur}`;
}

function formatEnd(iso: string | null, dfLoc: Locale): string {
  if (!iso) return "무제한/미설정";
  const d = parseISO(iso);
  if (d.getFullYear() >= 2099) return "평생";
  return format(d, "yyyy.MM.dd", { locale: dfLoc });
}

export function SubscriptionEventTimeline({
  events,
  loading,
  locale,
}: {
  events: TenantSubscriptionEventRow[];
  loading?: boolean;
  locale: string;
}) {
    const { symbol: currencySymbol } = useCurrency();
  const dfLoc = dateFnsLocaleForBase(toBaseLocale(locale as Parameters<typeof toBaseLocale>[0]));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-xs">이력 불러오는 중…</span>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center">
        <History className="h-5 w-5 mx-auto text-slate-300 mb-2" />
        <p className="text-xs text-slate-500">구독·결제 이력이 없습니다.</p>
        <p className="text-[10px] text-slate-400 mt-1">
          실결제 또는 관리자 부여 후 여기에 기록됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
      {events.map((ev) => {
        const grantKind = ev.metadata?.grant_kind as string | undefined;
        return (
          <div
            key={ev.id}
            className="p-3 rounded-xl bg-white border border-slate-100 text-[11px] space-y-1.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="font-semibold text-slate-800">
                  {eventTypeLabelKo(ev.event_type, ev.source)}
                </span>
                {grantKind && grantKind !== "manual" && (
                  <span className="ml-1.5 text-slate-400">({grantKind})</span>
                )}
              </div>
              <span className="text-slate-400 font-mono shrink-0">
                {format(parseISO(ev.created_at), "yyyy.MM.dd HH:mm", { locale: dfLoc })}
              </span>
            </div>
            <div className="text-slate-600 leading-relaxed">
              {ev.event_type === "admin_grant" && (
                <p>
                  <span className="text-slate-500">처리:</span>{" "}
                  {ev.actor_email ?? ev.actor_user_id ?? "관리자"}
                  {ev.reason ? (
                    <>
                      {" "}
                      · <span className="text-slate-500">사유:</span> {ev.reason}
                    </>
                  ) : null}
                </p>
              )}
              {ev.event_type === "payment" && ev.actor_email && (
                <p>
                  <span className="text-slate-500">결제:</span> {ev.actor_email}
                </p>
              )}
              <p>
                <span className="text-slate-500">플랜:</span>{" "}
                {planIdLabel(ev.plan_before)} → {planIdLabel(ev.plan_after)}
                {ev.period ? ` · ${periodLabelKo(ev.period)}` : null}
                {ev.months_granted != null ? ` · ${ev.months_granted}개월` : null}
              </p>
              <p>
                <span className="text-slate-500">만료:</span>{" "}
                {formatEnd(ev.subscription_end_before, dfLoc)} →{" "}
                {formatEnd(ev.subscription_end_after, dfLoc)}
              </p>
              {ev.amount_cents != null && (
                <p>
                  <span className="text-slate-500">금액:</span>{" "}
                  {formatAmount(ev.amount_cents, ev.currency)}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
