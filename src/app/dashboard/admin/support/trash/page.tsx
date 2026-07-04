"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { dateFnsLocaleForBase } from "@/lib/date-fns-locale";
import type { SupportTicketListItem } from "@/lib/support-tickets/types";

export default function AdminSupportTrashPage() {
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const dfLoc = dateFnsLocaleForBase(baseLocale);

  const [tickets, setTickets] = useState<SupportTicketListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [purgeId, setPurgeId] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/support/trash?uiLocale=${encodeURIComponent(locale)}`, {
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) setTickets((json.tickets as SupportTicketListItem[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const restore = async (id: string) => {
    const res = await fetch(`/api/admin/support/tickets/${id}/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ uiLocale: locale }),
    });
    if (res.ok) {
      toast.success("복구되었습니다.");
      void load();
    } else {
      toast.error("복구 실패");
    }
  };

  const purge = async (id: string) => {
    if (confirmText !== "영구삭제") {
      toast.error("'영구삭제'를 정확히 입력하세요.");
      return;
    }
    const res = await fetch(`/api/admin/support/tickets/${id}/purge`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ uiLocale: locale, confirm: confirmText }),
    });
    if (res.ok) {
      toast.success("영구 삭제되었습니다.");
      setPurgeId(null);
      setConfirmText("");
      void load();
    } else {
      toast.error("영구 삭제 실패");
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <Link
        href="/dashboard/admin/support"
        className="inline-flex h-8 items-center rounded-md px-3 text-sm text-slate-600 hover:bg-slate-100"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        문의 관리
      </Link>

      <PageHeader
        title="문의 휴지통"
        description="소프트 삭제된 문의입니다. 90일 후 자동 영구 삭제됩니다."
      />

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : tickets.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-12">휴지통이 비어 있습니다.</p>
          ) : (
            <ul className="divide-y">
              {tickets.map((t) => (
                <li key={t.id} className="py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs text-slate-400">{t.ticket_no}</p>
                    <p className="font-medium truncate">{t.title}</p>
                    <p className="text-xs text-slate-400">
                      {t.store_name} ·{" "}
                      {format(new Date(t.updated_at), "yyyy.MM.dd HH:mm", { locale: dfLoc })}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => void restore(t.id)}>
                      <RotateCcw className="h-4 w-4 mr-1" />
                      복구
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setPurgeId(t.id)}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      영구 삭제
                    </Button>
                  </div>
                  {purgeId === t.id && (
                    <div className="w-full flex gap-2 items-center border-t pt-3 mt-2">
                      <Input
                        placeholder="영구삭제 입력"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        className="max-w-xs"
                      />
                      <Button size="sm" variant="destructive" onClick={() => void purge(t.id)}>
                        확인
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setPurgeId(null);
                          setConfirmText("");
                        }}
                      >
                        취소
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
