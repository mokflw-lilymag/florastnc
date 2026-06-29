"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
  History,
  Loader2,
  RefreshCw,
  Download,
  Search,
  Store,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { AccessDenied } from "@/components/access-denied";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { SubscriptionEventWithTenant } from "@/lib/subscription/record-subscription-event";
import {
  eventTypeLabelKo,
  periodLabelKo,
  planIdLabel,
} from "@/lib/subscription/subscription-events";

const FILTER_ALL = "__all__";

function formatAmount(amountCents: number | null, currency: string | null): string {
  if (amountCents == null) return "-";
  const cur = (currency ?? "KRW").toUpperCase();
  if (cur === "KRW") return `₩${amountCents.toLocaleString("en-US")}`;
  if (cur === "USD") return `$${(amountCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  return `${amountCents} ${cur}`;
}

function formatEnd(iso: string | null): string {
  if (!iso) return "-";
  const d = parseISO(iso);
  if (d.getFullYear() >= 2099) return "평생";
  return format(d, "yyyy.MM.dd");
}

function exportCsv(rows: SubscriptionEventWithTenant[]) {
  const header = [
    "일시",
    "매장",
    "유형",
    "출처",
    "처리자",
    "플랜(전)",
    "플랜(후)",
    "기간",
    "개월",
    "금액",
    "만료(전)",
    "만료(후)",
    "사유",
    "external_ref",
  ];
  const lines = rows.map((ev) =>
    [
      ev.created_at,
      ev.tenant_name ?? ev.tenant_id,
      ev.event_type,
      ev.source,
      ev.actor_email ?? "",
      ev.plan_before ?? "",
      ev.plan_after ?? "",
      ev.period ?? "",
      ev.months_granted ?? "",
      ev.amount_cents ?? "",
      ev.subscription_end_before ?? "",
      ev.subscription_end_after ?? "",
      (ev.reason ?? "").replace(/"/g, '""'),
      ev.external_ref ?? "",
    ]
      .map((c) => `"${String(c)}"`)
      .join(",")
  );
  const blob = new Blob(["\uFEFF" + [header.join(","), ...lines].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `subscription-events-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SubscriptionEventsAdminPage() {
  const searchParams = useSearchParams();
  const { isSuperAdmin, isLoading: authLoading } = useAuth();
  const [events, setEvents] = useState<SubscriptionEventWithTenant[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [eventType, setEventType] = useState(FILTER_ALL);
  const [source, setSource] = useState(FILTER_ALL);
  const [tenantFilter, setTenantFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (eventType !== FILTER_ALL) params.set("eventType", eventType);
      if (source !== FILTER_ALL) params.set("source", source);
      if (tenantFilter.trim()) params.set("tenantId", tenantFilter.trim());
      const res = await fetch(`/api/admin/subscription-events?${params}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? res.statusText);
      setEvents(json.events ?? []);
      setTotal(json.total ?? 0);
    } catch (e) {
      console.error(e);
      toast.error("구독·결제 이력을 불러오지 못했습니다.");
      setEvents([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [eventType, source, tenantFilter]);

  useEffect(() => {
    const tid = searchParams.get("tenantId");
    if (tid) setTenantFilter(tid);
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && isSuperAdmin) load();
    else if (!authLoading) setLoading(false);
  }, [authLoading, isSuperAdmin, load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return events;
    return events.filter((ev) => {
      const hay = [
        ev.tenant_name,
        ev.tenant_id,
        ev.actor_email,
        ev.reason,
        ev.external_ref,
        planIdLabel(ev.plan_after),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [events, search]);

  if (authLoading || (isSuperAdmin && loading && events.length === 0)) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }
  if (!isSuperAdmin) return <AccessDenied requiredTier="System Admin" />;

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow">
            <History className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">구독·결제 이력</h1>
            <p className="text-slate-500 text-sm">
              실결제(토스·Stripe)와 관리자 부여를 통합 조회합니다.{" "}
              <Link href="/dashboard/admin/billing" className="text-violet-600 hover:underline">
                SaaS 구독 대시보드
              </Link>
              {" · "}
              <Link href="/dashboard/tenants" className="text-violet-600 hover:underline">
                매장 관리
              </Link>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportCsv(filtered)}>
            <Download className="w-3.5 h-3.5" /> CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={load} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> 새로고침
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-sm ring-1 ring-slate-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-600">
            전체 {total.toLocaleString()}건 · 표시 {filtered.length}건
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="매장명, 이메일, 사유, 결제 참조…"
                className="pl-9 rounded-xl"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={eventType} onValueChange={(v) => setEventType(v ?? FILTER_ALL)}>
              <SelectTrigger className="w-[140px] rounded-xl">
                <SelectValue placeholder="유형" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={FILTER_ALL}>전체 유형</SelectItem>
                <SelectItem value="payment">실결제</SelectItem>
                <SelectItem value="admin_grant">관리자 부여</SelectItem>
              </SelectContent>
            </Select>
            <Select value={source} onValueChange={(v) => setSource(v ?? FILTER_ALL)}>
              <SelectTrigger className="w-[140px] rounded-xl">
                <SelectValue placeholder="출처" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={FILTER_ALL}>전체 출처</SelectItem>
                <SelectItem value="toss">토스</SelectItem>
                <SelectItem value="stripe">Stripe</SelectItem>
                <SelectItem value="admin">관리자</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-xs">일시</TableHead>
                  <TableHead className="text-xs">매장</TableHead>
                  <TableHead className="text-xs">유형</TableHead>
                  <TableHead className="text-xs">플랜</TableHead>
                  <TableHead className="text-xs">기간</TableHead>
                  <TableHead className="text-xs">금액</TableHead>
                  <TableHead className="text-xs">만료 변경</TableHead>
                  <TableHead className="text-xs">처리·사유</TableHead>
                  <TableHead className="text-xs w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((ev) => (
                  <TableRow key={ev.id} className="text-xs">
                    <TableCell className="font-mono text-slate-500 whitespace-nowrap">
                      {format(parseISO(ev.created_at), "yyyy.MM.dd HH:mm")}
                    </TableCell>
                    <TableCell className="font-medium max-w-[140px] truncate">
                      {ev.tenant_name ?? ev.tenant_id.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ev.event_type === "payment" ? "default" : "secondary"} className="text-[10px]">
                        {eventTypeLabelKo(ev.event_type, ev.source)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {planIdLabel(ev.plan_before)} → {planIdLabel(ev.plan_after)}
                    </TableCell>
                    <TableCell>
                      {ev.period ? periodLabelKo(ev.period) : "-"}
                      {ev.months_granted != null ? ` · ${ev.months_granted}개월` : ""}
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatAmount(ev.amount_cents, ev.currency)}
                    </TableCell>
                    <TableCell className="text-slate-600 whitespace-nowrap">
                      {formatEnd(ev.subscription_end_before)} → {formatEnd(ev.subscription_end_after)}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="truncate text-slate-600">
                        {ev.actor_email ?? (ev.event_type === "admin_grant" ? "관리자" : "-")}
                      </div>
                      {ev.reason && (
                        <div className="truncate text-slate-400 text-[10px]">{ev.reason}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/dashboard/admin/subscription-events?tenantId=${ev.tenant_id}`}
                        title="이 매장 이력만"
                        className={buttonVariants({ variant: "ghost", size: "icon", className: "h-7 w-7" })}
                      >
                        <Store className="h-3.5 w-3.5" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-16 text-slate-400">
                      {events.length === 0
                        ? "이력이 없거나 tenant_subscription_events 테이블이 아직 적용되지 않았습니다."
                        : "검색 조건에 맞는 이력이 없습니다."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <p className="text-[11px] text-slate-400 flex items-center gap-1">
        <ExternalLink className="w-3 h-3" />
        매장별 상세 이력은 매장 관리 → 구독 수정 다이얼로그에서도 확인할 수 있습니다.
      </p>
    </div>
  );
}
