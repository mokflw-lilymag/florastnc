"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Loader2, Megaphone, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { LinkifiedText } from "@/components/ui/linkified-text";
import { htmlToPlainText } from "@/lib/html-plain-text";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";

type Ann = {
  id: string;
  organization_id: string;
  organization_name: string | null;
  title: string;
  body: string;
  priority: string;
  created_at: string;
  attachment_urls?: string[];
  confirmedAt?: string | null;
};

const DISMISS_PREFIX = "floxync_org_ann_dismiss_";

export function OrgAnnouncementBanner() {
  const pathname = usePathname();
  const { isLoading, isSuperAdmin, profile } = useAuth();
  const [list, setList] = useState<Ann[]>([]);
  const [dismissTick, setDismissTick] = useState(0);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const tr = (ko: string, en: string, vi: string) => pickUiText(baseLocale, ko, en, vi);

  useEffect(() => {
    if (isLoading || isSuperAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/hq/announcements?branchOnly=1", { credentials: "include" });
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setList(json.announcements ?? []);
      } catch {
        /* 테이블 미적용 등 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoading, isSuperAdmin]);

  const refetchAnnouncements = async () => {
    try {
      const res = await fetch("/api/hq/announcements?branchOnly=1", { credentials: "include" });
      if (!res.ok) return;
      const json = await res.json();
      setList(json.announcements ?? []);
    } catch {
      /* ignore */
    }
  };

  const confirmRead = async (id: string) => {
    setConfirmingId(id);
    try {
      const res = await fetch(`/api/hq/announcements/${id}/read`, {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(
          typeof json?.error === "string"
            ? json.error
            : tr(
                "확인 기록에 실패했습니다.",
                "Failed to save read confirmation.",
                "Không thể lưu xác nhận đã đọc."
              )
        );
        return;
      }
      await refetchAnnouncements();
    } finally {
      setConfirmingId(null);
    }
  };

  if (
    isSuperAdmin ||
    pathname?.startsWith("/dashboard/hq") ||
    pathname?.startsWith("/dashboard/org-board")
  ) {
    return null;
  }

  const visible = list
    .filter((a) => {
      try {
        return typeof window !== "undefined" && localStorage.getItem(DISMISS_PREFIX + a.id) !== "1";
      } catch {
        return true;
    }
    })
    .sort((a, b) => {
      if (a.priority === "high" && b.priority !== "high") return -1;
      if (b.priority === "high" && a.priority !== "high") return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .slice(0, 2);

  if (!profile || visible.length === 0) return null;

  const dismiss = (id: string) => {
    try {
      localStorage.setItem(DISMISS_PREFIX + id, "1");
    } catch {
      /* ignore */
    }
    setDismissTick((t) => t + 1);
  };

  return (
    <div className="mb-4 space-y-2" key={dismissTick}>
      {visible.map((a) => (
        <div
          key={a.id}
          role="status"
          className={cn(
            "relative rounded-xl border px-4 py-3 pr-12 shadow-sm",
            a.priority === "high"
              ? "border-amber-200 bg-amber-50/90 text-amber-950 dark:bg-amber-950/40 dark:text-amber-50 dark:border-amber-800"
              : "border-indigo-100 bg-indigo-50/80 text-slate-900 dark:bg-indigo-950/30 dark:text-indigo-50 dark:border-indigo-900"
          )}
        >
          <div className="flex items-start gap-2">
            <Megaphone className="h-4 w-4 shrink-0 mt-0.5 opacity-80" aria-hidden />
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {tr("본사 공지", "HQ announcement", "Thông báo trụ sở")}
                {a.organization_name ? ` · ${a.organization_name}` : ""}
              </p>
              <p className="text-sm font-bold leading-snug">{a.title}</p>
              <p className="text-xs leading-relaxed opacity-90 line-clamp-6">
                <LinkifiedText text={htmlToPlainText(a.body)} />
              </p>
              {a.attachment_urls?.[0] ? (
                <a
                  href={a.attachment_urls[0]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block max-w-[220px] rounded-md border bg-white/50 dark:bg-slate-950/40 overflow-hidden"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.attachment_urls[0]}
                    alt=""
                    className="max-h-28 w-full object-contain"
                    loading="lazy"
                  />
                </a>
              ) : null}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                {a.confirmedAt ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                    <CheckCircle2 className="h-3 w-3" aria-hidden />
                    {tr("본사에 확인 기록됨", "Confirmed to HQ", "Đã xác nhận với trụ sở")}
                  </span>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-8 text-xs font-semibold"
                    disabled={confirmingId === a.id}
                    onClick={() => confirmRead(a.id)}
                  >
                    {confirmingId === a.id ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        {tr("처리 중…", "Processing...", "Đang xử lý…")}
                      </>
                    ) : (
                      tr(
                        "내용 확인(본사에 전달)",
                        "Confirm content (notify HQ)",
                        "Xác nhận nội dung (thông báo trụ sở)"
                      )
                    )}
                  </Button>
                )}
                <Link
                  href="/dashboard/org-board"
                  className="text-[10px] font-semibold underline underline-offset-2 opacity-90 hover:opacity-100"
                >
                  {tr("본사 게시판", "HQ board", "Bảng tin trụ sở")}
                </Link>
              </div>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 h-8 w-8 text-current opacity-60 hover:opacity-100"
            onClick={() => dismiss(a.id)}
            aria-label={tr("닫기", "Close", "Đóng")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
