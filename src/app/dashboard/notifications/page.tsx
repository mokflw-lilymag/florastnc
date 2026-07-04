"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Bell, Building2, Headphones, Loader2, Megaphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { dateFnsLocaleForBase } from "@/lib/date-fns-locale";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  PLATFORM_CATEGORY_LABELS,
  type NotificationInboxItem,
} from "@/lib/platform-announcements/types";

export default function NotificationsPage() {
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const dfLoc = dateFnsLocaleForBase(baseLocale);
  const searchParams = useSearchParams();
  const highlightPlatformId = searchParams.get("platform");

  const [items, setItems] = useState<NotificationInboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<NotificationInboxItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/platform/announcements/inbox?uiLocale=${encodeURIComponent(locale)}`,
        { credentials: "include" },
      );
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        return (json.items as NotificationInboxItem[]) ?? [];
      }
    } finally {
      setLoading(false);
    }
    return [];
  }, [locale]);

  useEffect(() => {
    void (async () => {
      const list = await load();
      setItems(list);
      if (highlightPlatformId) {
        const hit = list.find((i) => i.source === "platform" && i.id === highlightPlatformId);
        if (hit) setSelected(hit);
      } else if (list.length > 0) {
        setSelected((prev) => prev ?? list[0]);
      }
    })();
  }, [load, highlightPlatformId]);

  const unreadCount = useMemo(() => items.filter((i) => !i.read_at).length, [items]);

  const markRead = async (item: NotificationInboxItem) => {
    setSelected(item);
    if (item.read_at) return;

    const readUrl =
      item.source === "platform"
        ? `/api/platform/announcements/${item.id}/read`
        : item.source === "hq"
          ? `/api/hq/announcements/${item.id}/read`
          : item.source === "support_ticket" || item.source === "support_reply"
            ? `/api/support/notifications/${item.id}/read`
            : `/api/hq/announcements/${item.id}/read`;

    try {
      await fetch(readUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ uiLocale: locale }),
      });
      setItems((prev) =>
        prev.map((x) =>
          x.id === item.id && x.source === item.source
            ? { ...x, read_at: new Date().toISOString() }
            : x,
        ),
      );
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="알림함"
        description="FloXync 업데이트 소식과 본사 공지를 한곳에서 확인합니다."
        icon={Bell}
      />

      {unreadCount > 0 && (
        <p className="text-sm text-red-600 font-medium">미확인 알림 {unreadCount}건</p>
      )}

      {loading ? (
        <div className="flex justify-center py-20 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-slate-500 text-sm">알림이 없습니다.</CardContent>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2 space-y-2">
            {items.map((item) => (
              <button
                key={`${item.source}-${item.id}`}
                type="button"
                onClick={() => void markRead(item)}
                className={cn(
                  "w-full text-left rounded-xl border p-4 transition-all hover:border-indigo-200",
                  selected?.id === item.id && selected?.source === item.source
                    ? "border-indigo-400 bg-indigo-50/50"
                    : "bg-white",
                  !item.read_at && "ring-1 ring-red-100",
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  {item.source === "platform" ? (
                    <Megaphone className="h-3.5 w-3.5 text-indigo-500" />
                  ) : item.source === "support_ticket" || item.source === "support_reply" ? (
                    <Headphones className="h-3.5 w-3.5 text-amber-600" />
                  ) : (
                    <Building2 className="h-3.5 w-3.5 text-violet-500" />
                  )}
                  <span className="text-[10px] font-bold text-slate-500">
                    {item.source === "platform"
                      ? item.category
                        ? PLATFORM_CATEGORY_LABELS[item.category]
                        : "FloXync"
                      : item.source === "support_ticket" || item.source === "support_reply"
                        ? "고객센터"
                        : item.organization_name ?? "본사"}
                  </span>
                  {!item.read_at && <span className="h-1.5 w-1.5 rounded-full bg-red-500" />}
                </div>
                <p className="font-semibold text-sm text-slate-800 line-clamp-1">{item.title}</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  {format(new Date(item.created_at), "yyyy.MM.dd HH:mm", { locale: dfLoc })}
                </p>
              </button>
            ))}
          </div>

          <Card className="lg:col-span-3">
            {selected ? (
              <>
                <CardHeader>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge variant="outline">
                      {selected.source === "platform"
                        ? selected.category
                          ? PLATFORM_CATEGORY_LABELS[selected.category]
                          : "FloXync"
                        : "본사 공지"}
                    </Badge>
                    {selected.priority === "high" && <Badge className="bg-orange-500">중요</Badge>}
                  </div>
                  <CardTitle>{selected.title}</CardTitle>
                  <p className="text-xs text-slate-400">
                    {format(new Date(selected.created_at), "yyyy.MM.dd HH:mm", { locale: dfLoc })}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{selected.body}</p>
                  {selected.source === "hq" && (
                    <Link
                      href="/dashboard/org-board"
                      className="inline-flex h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-xs font-medium hover:bg-slate-50"
                    >
                      본사 게시판에서 댓글 보기
                    </Link>
                  )}
                </CardContent>
              </>
            ) : (
              <CardContent className="py-16 text-center text-slate-400 text-sm">
                왼쪽에서 알림을 선택하세요.
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
