"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Bell, Building2, Headphones, Loader2, Megaphone } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { dateFnsLocaleForBase } from "@/lib/date-fns-locale";
import {
  PLATFORM_CATEGORY_LABELS,
  type NotificationInboxItem,
} from "@/lib/platform-announcements/types";

export function NotificationBell() {
  const router = useRouter();
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const dfLoc = dateFnsLocaleForBase(baseLocale);

  const [items, setItems] = useState<NotificationInboxItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/platform/announcements/inbox?uiLocale=${encodeURIComponent(locale)}`,
        { credentials: "include" },
      );
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setItems((json.items as NotificationInboxItem[]) ?? []);
        setUnreadCount(Number(json.unreadCount) || 0);
      }
    } catch (e) {
      console.warn("[NotificationBell] load failed", e);
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 60_000);
    return () => clearInterval(t);
  }, [load]);

  const markRead = async (item: NotificationInboxItem) => {
    if (item.read_at) {
      router.push(item.href);
      setOpen(false);
      return;
    }

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
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      /* ignore */
    }

    router.push(item.href);
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-all outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 relative"
        aria-label="알림"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-4 py-3 font-bold text-sm flex items-center justify-between">
            <span>알림</span>
            {unreadCount > 0 && (
              <span className="text-[10px] font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                {unreadCount}건 미확인
              </span>
            )}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="m-0" />
        <div className="max-h-[min(420px,60vh)] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-10 px-4">새 알림이 없습니다.</p>
          ) : (
            items.map((item) => (
              <button
                key={`${item.source}-${item.id}`}
                type="button"
                onClick={() => void markRead(item)}
                className={cn(
                  "w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors",
                  !item.read_at && "bg-indigo-50/40",
                )}
              >
                <div className="flex items-start gap-2">
                  <div
                    className={cn(
                      "mt-0.5 shrink-0 rounded-md p-1",
                      item.source === "platform"
                        ? "bg-indigo-100 text-indigo-600"
                        : item.source === "support_ticket" || item.source === "support_reply"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-violet-100 text-violet-600",
                    )}
                  >
                    {item.source === "platform" ? (
                      <Megaphone className="h-3.5 w-3.5" />
                    ) : item.source === "support_ticket" || item.source === "support_reply" ? (
                      <Headphones className="h-3.5 w-3.5" />
                    ) : (
                      <Building2 className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-500">
                        {item.source === "platform"
                          ? item.category
                            ? PLATFORM_CATEGORY_LABELS[item.category]
                            : "FloXync"
                          : item.source === "support_ticket" || item.source === "support_reply"
                            ? "고객센터"
                            : item.organization_name ?? "본사"}
                      </span>
                      {item.priority === "high" && (
                        <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-1 rounded">중요</span>
                      )}
                      {!item.read_at && (
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-sm font-semibold text-slate-800 line-clamp-1 mt-0.5">{item.title}</p>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{item.body}</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {format(new Date(item.created_at), "yyyy.MM.dd HH:mm", { locale: dfLoc })}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <div className="p-2">
          <Link
            href="/dashboard/notifications"
            onClick={() => setOpen(false)}
            className="flex h-8 w-full items-center justify-center rounded-md text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            알림함 전체 보기
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
