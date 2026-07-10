"use client";

import Link from "next/link";
import { format, differenceInDays } from "date-fns";
import { Sparkles, ArrowRight } from "lucide-react";
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
import { dateFnsLocaleForBase } from "@/lib/date-fns-locale";
import { toBaseLocale } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { planIdLabel } from "@/lib/subscription/subscription-events";

const PLAN_BADGE: Record<string, string> = {
  ribbon_only: "bg-pink-50 text-pink-700",
  light: "bg-emerald-50 text-emerald-700",
  pro: "bg-indigo-50 text-indigo-700",
  pro_plus: "bg-violet-50 text-violet-700",
  free: "bg-slate-100 text-slate-600",
};

export function NewTenantsPanel({
  tenants,
  locale = "ko",
  maxRows = 12,
  tenantsHref = "/dashboard/tenants",
  compact = false,
  newDaysThreshold = 7,
}: {
  tenants: any[]; // Expecting TenantWithProfile array
  locale?: string;
  maxRows?: number;
  tenantsHref?: string;
  compact?: boolean;
  newDaysThreshold?: number;
}) {
  const dfLoc = dateFnsLocaleForBase(toBaseLocale(locale as Parameters<typeof toBaseLocale>[0]));
  
  // 가입일이 newDaysThreshold(기본 7)일 이내인 회원사 필터링
  const now = new Date();
  const newTenants = tenants
    .filter((t) => {
      if (!t.created_at) return false;
      const createdDate = new Date(t.created_at);
      const diff = differenceInDays(now, createdDate);
      return diff <= newDaysThreshold;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); // 최신 가입자가 먼저 오도록 정렬

  const rows = newTenants.slice(0, maxRows);

  if (newTenants.length === 0) {
    return null; // 신규 가입자가 없으면 패널을 숨김
  }

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
        <CardHeader className={cn("border-b border-indigo-50 bg-indigo-50/40", compact ? "py-3 px-4" : "pb-4")}>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className={cn("flex items-center gap-2 text-indigo-900", compact ? "text-base" : "text-lg")}>
                <Sparkles className="h-5 w-5 text-indigo-500" />
                신규 가입 회원사
                <Badge className="bg-indigo-200 text-indigo-900 hover:bg-indigo-200 border-0">
                  {newTenants.length}곳
                </Badge>
              </CardTitle>
              {!compact && (
                <CardDescription className="text-xs mt-1">
                  최근 {newDaysThreshold}일 이내 신규 등록된 매장
                </CardDescription>
              )}
            </div>
            <Link href={tenantsHref}>
              <Button variant="ghost" size="sm" className="text-xs text-indigo-800 gap-1">
                전체 매장 <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80">
                <TableHead className="text-xs">매장</TableHead>
                <TableHead className="text-xs">플랜</TableHead>
                <TableHead className="text-xs">국가</TableHead>
                <TableHead className="text-xs">가입일</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((t) => (
                <TableRow key={t.id} className="hover:bg-indigo-50/30">
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
                  <TableCell className="text-xs text-slate-600">
                    {t.country || "KR"}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 font-medium">
                    {t.created_at ? format(new Date(t.created_at), "yyyy.MM.dd", { locale: dfLoc }) : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
