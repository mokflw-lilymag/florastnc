"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Headphones, Loader2, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { dateFnsLocaleForBase } from "@/lib/date-fns-locale";
import {
  SUPPORT_TICKET_CATEGORIES,
  supportCategoryLabel,
} from "@/lib/support-tickets/categories";
import type { AdminSupportTicketListItem } from "@/lib/support-tickets/admin-list";
import { SupportStatusBadge } from "@/app/dashboard/support/components/support-status-badge";
import { SupportTenantHealthBadges } from "./components/support-tenant-health-badges";

export default function AdminSupportPage() {
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const dfLoc = dateFnsLocaleForBase(baseLocale);

  const [tickets, setTickets] = useState<AdminSupportTicketListItem[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("__all__");
  const [category, setCategory] = useState("__all__");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ uiLocale: locale });
      if (status !== "__all__") params.set("status", status);
      if (category !== "__all__") params.set("category", category);
      if (search.trim()) params.set("q", search.trim());

      const res = await fetch(`/api/admin/support/tickets?${params}`, {
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setTickets((json.tickets as AdminSupportTicketListItem[]) ?? []);
        setOpenCount(Number(json.openCount) || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [locale, status, category, search]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="고객 문의 관리"
        description="사용자 1:1 문의를 확인하고 답변합니다."
        icon={Headphones}
      >
        <div className="flex gap-2">
          {openCount > 0 && (
            <Badge variant="destructive" className="h-9 px-3">
              미답변 {openCount}건
            </Badge>
          )}
          <Link
            href="/dashboard/admin/support/trash"
            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            휴지통
          </Link>
        </div>
      </PageHeader>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="제목·문의번호·매장 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void load()}
              />
            </div>
            <Select value={status} onValueChange={(v) => setStatus(v ?? "__all__")}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">전체 상태</SelectItem>
                <SelectItem value="open">접수중</SelectItem>
                <SelectItem value="answered">답변완료</SelectItem>
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={(v) => setCategory(v ?? "__all__")}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="카테고리" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">전체</SelectItem>
                {SUPPORT_TICKET_CATEGORIES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {supportCategoryLabel(c.id, baseLocale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : tickets.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-12">문의가 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500 text-xs">
                    <th className="py-2 pr-3">매장</th>
                    <th className="py-2 pr-3">건강</th>
                    <th className="py-2 pr-3">번호</th>
                    <th className="py-2 pr-3">제목</th>
                    <th className="py-2 pr-3">카테고리</th>
                    <th className="py-2 pr-3">상태</th>
                    <th className="py-2">등록일</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-3 pr-3 text-slate-600">{t.store_name ?? "—"}</td>
                      <td className="py-3 pr-3">
                        <SupportTenantHealthBadges
                          status={t.status}
                          has_admin_reply={t.has_admin_reply}
                          tenant_suspended={t.tenant_suspended}
                          tenant_subscription_expired={t.tenant_subscription_expired}
                          tenant_plan={t.tenant_plan}
                          compact
                        />
                      </td>
                      <td className="py-3 pr-3 font-mono text-xs text-slate-400">{t.ticket_no}</td>
                      <td className="py-3 pr-3">
                        <Link
                          href={`/dashboard/admin/support/${t.id}`}
                          className="font-medium text-indigo-600 hover:underline"
                        >
                          {t.title}
                        </Link>
                      </td>
                      <td className="py-3 pr-3 text-slate-500">
                        {supportCategoryLabel(t.category, baseLocale)}
                      </td>
                      <td className="py-3 pr-3">
                        <SupportStatusBadge status={t.status} locale={baseLocale} />
                      </td>
                      <td className="py-3 text-slate-400 text-xs">
                        {format(new Date(t.created_at), "yyyy.MM.dd HH:mm", { locale: dfLoc })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
