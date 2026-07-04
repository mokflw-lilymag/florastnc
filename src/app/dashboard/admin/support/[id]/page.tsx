"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Textarea from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { dateFnsLocaleForBase } from "@/lib/date-fns-locale";
import { supportCategoryLabel } from "@/lib/support-tickets/categories";
import type { SupportTicketListItem, SupportTicketReplyRow } from "@/lib/support-tickets/types";
import { fileToDataUrl } from "@/lib/support-tickets/compress-image";
import { SupportStatusBadge } from "@/app/dashboard/support/components/support-status-badge";
import { AdminSupportHub } from "@/app/dashboard/admin/support/components/admin-support-hub";

type AttachmentWithUrl = { url: string; mime: string };
type TicketDetail = SupportTicketListItem & {
  body?: string;
  attachment_paths?: AttachmentWithUrl[];
  store_name?: string | null;
  is_remote_settings?: boolean;
  has_remote_assist_code?: boolean;
};
type ReplyWithAttachments = SupportTicketReplyRow & { attachments?: AttachmentWithUrl[] };

export default function AdminSupportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const dfLoc = dateFnsLocaleForBase(baseLocale);

  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [replies, setReplies] = useState<ReplyWithAttachments[]>([]);
  const [replyBody, setReplyBody] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/support/tickets/${id}?uiLocale=${encodeURIComponent(locale)}`,
        { credentials: "include" },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        router.push("/dashboard/admin/support");
        return;
      }
      setTicket(json.ticket as TicketDetail);
      setReplies((json.replies as ReplyWithAttachments[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, [id, locale, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAttach = async (files: FileList | null) => {
    if (!files?.length) return;
    const next = [...attachments];
    for (const file of Array.from(files).slice(0, 3 - next.length)) {
      try {
        next.push(await fileToDataUrl(file));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "첨부 실패");
      }
    }
    setAttachments(next.slice(0, 3));
  };

  const submitReply = async () => {
    if (!replyBody.trim()) {
      toast.error("답변 내용을 입력하세요.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/support/tickets/${id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          uiLocale: locale,
          body: replyBody.trim(),
          originalLocale: baseLocale,
          attachments,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast.error((json.error as string) || "답변 등록 실패");
        return;
      }
      toast.success("답변이 등록되었습니다.");
      setReplyBody("");
      setAttachments([]);
      void load();
    } finally {
      setSubmitting(false);
    }
  };

  const softDelete = async () => {
    if (!confirm("이 문의를 삭제(휴지통)하시겠습니까?")) return;
    const res = await fetch(`/api/admin/support/tickets/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ uiLocale: locale }),
    });
    if (res.ok) {
      toast.success("휴지통으로 이동했습니다.");
      router.push("/dashboard/admin/support");
    } else {
      toast.error("삭제 실패");
    }
  };

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
      <Link
        href="/dashboard/admin/support"
        className="inline-flex h-8 items-center rounded-md px-3 text-sm text-slate-600 hover:bg-slate-100"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        목록
      </Link>

      <PageHeader
        title={ticket.title}
        description={`${ticket.store_name ?? "매장"} · ${ticket.ticket_no} · ${supportCategoryLabel(ticket.category, baseLocale)}`}
      >
        <div className="flex gap-2 items-center flex-wrap">
          <SupportStatusBadge status={ticket.status} locale={baseLocale} />
          <Button variant="destructive" size="sm" onClick={() => void softDelete()}>
            <Trash2 className="h-4 w-4 mr-1" />
            삭제
          </Button>
        </div>
      </PageHeader>

      <AdminSupportHub ticketId={id} onApplyTemplate={(body) => setReplyBody(body)} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">문의 본문</CardTitle>
          <p className="text-xs text-slate-400">
            {format(new Date(ticket.created_at), "yyyy.MM.dd HH:mm", { locale: dfLoc })}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm whitespace-pre-wrap">{ticket.body}</p>
          {(ticket.attachment_paths?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2">
              {ticket.attachment_paths!.map((a, i) => (
                <a key={i} href={a.url} target="_blank" rel="noreferrer">
                  <img src={a.url} alt="" className="h-28 rounded-lg border object-cover" />
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {replies.map((r) => (
        <Card key={r.id} className="bg-slate-50">
          <CardHeader>
            <CardTitle className="text-sm">관리자 답변</CardTitle>
            <p className="text-xs text-slate-400">
              {format(new Date(r.created_at), "yyyy.MM.dd HH:mm", { locale: dfLoc })}
            </p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="whitespace-pre-wrap">{r.body_original}</p>
            {r.body_translated && (
              <p className="text-slate-500 text-xs border-t pt-2 whitespace-pre-wrap">
                번역({r.target_locale}): {r.body_translated}
              </p>
            )}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">답변 작성</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>답변 내용</Label>
            <Textarea value={replyBody} onChange={(e) => setReplyBody(e.target.value)} rows={6} />
          </div>
          <div>
            <Label>첨부 (최대 3장)</Label>
            <Input type="file" accept="image/*" multiple onChange={(e) => void handleAttach(e.target.files)} />
          </div>
          <Button onClick={() => void submitReply()} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "답변 등록"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
