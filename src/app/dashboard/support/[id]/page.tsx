"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Loader2, Lock } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { dateFnsLocaleForBase } from "@/lib/date-fns-locale";
import { supportCategoryLabel } from "@/lib/support-tickets/categories";
import type { SupportTicketListItem, SupportTicketReplyRow } from "@/lib/support-tickets/types";
import { SupportStatusBadge } from "../components/support-status-badge";

type AttachmentWithUrl = { url: string; mime: string };

type TicketDetail = SupportTicketListItem & {
  body?: string;
  body_locale?: string;
  attachment_paths?: AttachmentWithUrl[];
};

type ReplyWithAttachments = SupportTicketReplyRow & {
  attachments?: AttachmentWithUrl[];
};

export default function SupportTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const dfLoc = dateFnsLocaleForBase(baseLocale);

  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [replies, setReplies] = useState<ReplyWithAttachments[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/support/tickets/${id}?uiLocale=${encodeURIComponent(locale)}`,
        { credentials: "include" },
      );
      const json = await res.json().catch(() => ({}));
      if (res.status === 403 && json.denied) {
        setDenied(true);
        setTicket(json.ticket as TicketDetail);
        return;
      }
      if (!res.ok) {
        router.push("/dashboard/support");
        return;
      }
      setDenied(false);
      setTicket(json.ticket as TicketDetail);
      setReplies((json.replies as ReplyWithAttachments[]) ?? []);
      await fetch(`/api/support/notifications/${id}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ uiLocale: locale }),
      }).catch(() => {});
    } finally {
      setLoading(false);
    }
  }, [id, locale, router]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!ticket) return null;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/support"
          className="inline-flex h-8 items-center rounded-md px-3 text-sm text-slate-600 hover:bg-slate-100"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          목록
        </Link>
      </div>

      <PageHeader
        title={ticket.title}
        description={`${ticket.ticket_no} · ${supportCategoryLabel(ticket.category, baseLocale)}`}
      >
        <SupportStatusBadge status={ticket.status} locale={baseLocale} />
      </PageHeader>

      {denied ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Lock className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">
              비밀글입니다. 작성자와 관리자만 열람할 수 있습니다.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">문의 내용</CardTitle>
              <p className="text-xs text-slate-400">
                {format(new Date(ticket.created_at), "yyyy.MM.dd HH:mm", { locale: dfLoc })}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{ticket.body}</p>
              {(ticket.attachment_paths?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-2">
                  {ticket.attachment_paths!.map((a, i) => (
                    <a key={i} href={a.url} target="_blank" rel="noreferrer">
                      <img
                        src={a.url}
                        alt=""
                        className="h-24 w-24 object-cover rounded-lg border"
                      />
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {replies.map((r) => (
            <Card key={r.id} className="border-emerald-100 bg-emerald-50/30">
              <CardHeader>
                <CardTitle className="text-base text-emerald-800">답변</CardTitle>
                <p className="text-xs text-slate-400">
                  {format(new Date(r.created_at), "yyyy.MM.dd HH:mm", { locale: dfLoc })}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {r.body_translated && r.body_translated !== r.body_original ? (
                  <>
                    <p className="text-sm text-slate-800 whitespace-pre-wrap">{r.body_translated}</p>
                    <div className="border-t border-emerald-100 pt-3">
                      <p className="text-[10px] font-bold text-slate-500 mb-1">원문</p>
                      <p className="text-sm text-slate-600 whitespace-pre-wrap">{r.body_original}</p>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-800 whitespace-pre-wrap">{r.body_original}</p>
                )}
                {(r.attachments?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {r.attachments!.map((a, i) => (
                      <a key={i} href={a.url} target="_blank" rel="noreferrer">
                        <img
                          src={a.url}
                          alt=""
                          className="h-24 w-24 object-cover rounded-lg border"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
