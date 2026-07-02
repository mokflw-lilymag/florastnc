"use client";

import Link from "next/link";
import { useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, ArrowRight, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SubscriptionTenureBadge } from "@/components/admin/SubscriptionTenureBadge";
import {
  type SubscriptionOverview,
  tenureDaysLabelKo,
} from "@/lib/subscription/subscription-tenure";
import { planIdLabel } from "@/lib/subscription/subscription-events";
import { dateFnsLocaleForBase } from "@/lib/date-fns-locale";
import { toBaseLocale } from "@/i18n/config";
import { cn } from "@/lib/utils";

const PLAN_BADGE: Record<string, string> = {
  ribbon_only: "bg-pink-50 text-pink-700",
  light: "bg-emerald-50 text-emerald-700",
  pro: "bg-indigo-50 text-indigo-700",
  pro_plus: "bg-violet-50 text-violet-700",
  free: "bg-slate-100 text-slate-600",
};

export function SubscriptionOverviewCards({
  overview,
  activeFilter,
  onFilter,
}: {
  overview: SubscriptionOverview;
  activeFilter?: string;
  onFilter?: (key: string) => void;
}) {
  const items = [
    { key: "ALL", label: "전체 매장", value: overview.total, color: "text-slate-800", bg: "bg-slate-50" },
    { key: "HEALTHY", label: "정상 구독", value: overview.activePaid, color: "text-emerald-700", bg: "bg-emerald-50" },
    { key: "CRITICAL", label: "3일 이내", value: overview.expiringSoonList.filter((t) => (t.tenure.daysLeft ?? 99) <= 3).length, color: "text-red-700", bg: "bg-red-50" },
    { key: "WARNING", label: "7일 이내", value: overview.expiring7, color: "text-amber-700", bg: "bg-amber-50" },
    { key: "SOON", label: "30일 이내", value: overview.expiring30, color: "text-orange-700", bg: "bg-orange-50" },
    { key: "EXPIRED", label: "만료·연체", value: overview.expired, color: "text-slate-600", bg: "bg-slate-100" },
    { key: "SUSPENDED", label: "정지", value: overview.suspended, color: "text-red-600", bg: "bg-red-50/60" },
    { key: "LIFETIME", label: "평생/무제한", value: overview.lifetime, color: "text-blue-700", bg: "bg-blue-50" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onFilter?.(item.key)}
          className={cn(
            "rounded-2xl border p-3 text-left transition-all hover:shadow-md",
            item.bg,
            activeFilter === item.key ? "ring-2 ring-indigo-400 border-indigo-200" : "border-transparent",
          )}
        >
          <p className="text-[10px] font-medium text-slate-500 truncate">{item.label}</p>
          <p className={cn("text-xl font-bold tabular-nums", item.color)}>{item.value}</p>
        </button>
      ))}
    </div>
  );
}

export function ExpiringTenantsPanel({
  overview,
  locale = "ko",
  maxRows = 12,
  tenantsHref = "/dashboard/tenants",
  billingHref = "/dashboard/admin/billing",
  compact = false,
}: {
  overview: SubscriptionOverview;
  locale?: string;
  maxRows?: number;
  tenantsHref?: string;
  billingHref?: string;
  compact?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const dfLoc = dateFnsLocaleForBase(toBaseLocale(locale as Parameters<typeof toBaseLocale>[0]));
  const rows = overview.expiringSoonList.slice(0, maxRows);
  const expiredPreview = isExpanded ? overview.expiredList : overview.expiredList.slice(0, compact ? 3 : 5);

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
        <CardHeader className={cn("border-b border-amber-50 bg-amber-50/40", compact ? "py-3 px-4" : "pb-4")}>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className={cn("flex items-center gap-2 text-amber-900", compact ? "text-base" : "text-lg")}>
                <Clock className="h-5 w-5" />
                30일 이내 구독 만료 예정
                <Badge className="bg-amber-200 text-amber-900 hover:bg-amber-200 border-0">
                  {overview.expiring30}곳
                </Badge>
              </CardTitle>
              {!compact && (
                <CardDescription className="text-xs mt-1">
                  D-day 기준 · 유료 플랜만 표시 · 만료일 가까운 순
                </CardDescription>
              )}
            </div>
            <Link href={tenantsHref}>
              <Button variant="ghost" size="sm" className="text-xs text-amber-800 gap-1">
                전체 매장 <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-10">30일 이내 만료 예정 매장이 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead className="text-xs">매장</TableHead>
                  <TableHead className="text-xs">플랜</TableHead>
                  <TableHead className="text-xs">잔여</TableHead>
                  <TableHead className="text-xs">만료일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((t) => (
                  <TableRow key={t.id} className="hover:bg-amber-50/30">
                    <TableCell className="py-3">
                      <Link href={tenantsHref} className="font-medium text-sm text-slate-800 hover:text-indigo-600">
                        {t.name}
                      </Link>
                      {t.profiles?.[0]?.email && (
                        <p className="text-[10px] text-slate-400 truncate max-w-[160px]">{t.profiles[0].email}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn("text-[10px]", PLAN_BADGE[t.plan ?? "free"])}>
                        {planIdLabel(t.plan)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "text-sm font-bold tabular-nums",
                          (t.tenure.daysLeft ?? 99) <= 3 && "text-red-600",
                          (t.tenure.daysLeft ?? 99) > 3 && (t.tenure.daysLeft ?? 99) <= 7 && "text-amber-700",
                        )}
                      >
                        {tenureDaysLabelKo(t.tenure)}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {t.tenure.endDate ? format(t.tenure.endDate, "yyyy.MM.dd", { locale: dfLoc }) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {overview.expired > 0 && (
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden border-red-100">
          <CardHeader className="py-3 px-4 border-b bg-red-50/50">
            <CardTitle className="text-base flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-4 w-4" />
              만료·연체 매장
              <Badge variant="destructive" className="text-[10px]">{overview.expired}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                {expiredPreview.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="py-2.5 font-medium text-sm">{t.name}</TableCell>
                    <TableCell className="py-2.5">
                      <SubscriptionTenureBadge tenure={t.tenure} locale={locale} />
                    </TableCell>
                    <TableCell className="py-2.5 text-xs text-slate-500">
                      {t.tenure.endDate ? format(t.tenure.endDate, "yyyy.MM.dd", { locale: dfLoc }) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!isExpanded && overview.expired > expiredPreview.length && (
              <div className="p-3 text-center border-t">
                <button 
                  onClick={() => setIsExpanded(true)} 
                  className="text-xs text-red-600 hover:underline cursor-pointer bg-transparent border-0"
                >
                  +{overview.expired - expiredPreview.length}곳 더 보기
                </button>
              </div>
            )}
            {isExpanded && overview.expired > (compact ? 3 : 5) && (
              <div className="p-3 text-center border-t">
                <button 
                  onClick={() => setIsExpanded(false)} 
                  className="text-xs text-slate-500 hover:underline cursor-pointer bg-transparent border-0"
                >
                  접기
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
