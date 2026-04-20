"use client";

import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Loader2, MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Textarea from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Comment = {
  id: string;
  body: string;
  created_at: string;
  created_by: string;
  author_name: string | null;
};

export function OrgAnnouncementThread(props: {
  announcementId: string;
  title: string;
  /** 이 조직의 org_admin 또는 플랫폼 슈퍼: 게시글 삭제·타인 댓글 삭제 */
  canDeletePost: boolean;
  canModerateComments: boolean;
  currentUserId: string | null;
  onDeleted: () => void;
}) {
  const { announcementId, title, canDeletePost, canModerateComments, currentUserId, onDeleted } = props;
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [deleteAnnOpen, setDeleteAnnOpen] = useState(false);
  const [deletingAnn, setDeletingAnn] = useState(false);

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hq/announcements/${announcementId}/comments`, { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 503) {
          toast.error(typeof json?.error === "string" ? json.error : "댓글을 불러올 수 없습니다.");
        } else if (res.status === 401) {
          toast.error("로그인이 필요합니다.");
        }
        setComments([]);
        return;
      }
      setComments(json.comments ?? []);
    } finally {
      setLoading(false);
    }
  }, [announcementId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const postComment = async () => {
    const t = draft.trim();
    if (!t) {
      toast.error("댓글 내용을 입력하세요.");
      return;
    }
    setPosting(true);
    try {
      const res = await fetch(`/api/hq/announcements/${announcementId}/comments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: t }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof json?.error === "string" ? json.error : "등록 실패");
        return;
      }
      setDraft("");
      await loadComments();
      toast.success("댓글이 등록되었습니다.");
    } finally {
      setPosting(false);
    }
  };

  const removeComment = async (commentId: string) => {
    setDeletingCommentId(commentId);
    try {
      const res = await fetch(`/api/hq/announcements/${announcementId}/comments/${commentId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof json?.error === "string" ? json.error : "삭제 실패");
        return;
      }
      await loadComments();
      toast.success("댓글을 삭제했습니다.");
    } finally {
      setDeletingCommentId(null);
    }
  };

  const removeAnnouncement = async () => {
    setDeletingAnn(true);
    try {
      const res = await fetch(`/api/hq/announcements/${announcementId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof json?.error === "string" ? json.error : "삭제 실패");
        return;
      }
      setDeleteAnnOpen(false);
      toast.success("게시물을 삭제했습니다.");
      onDeleted();
    } finally {
      setDeletingAnn(false);
    }
  };

  const showTrashForComment = (c: Comment) =>
    Boolean(currentUserId && c.created_by === currentUserId) || canModerateComments;

  return (
    <>
      <div className="rounded-lg border border-slate-200/90 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-900/25 p-3 space-y-3">
        {canDeletePost ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setDeleteAnnOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" aria-hidden />
              게시물 삭제
            </Button>
          </div>
        ) : null}

        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5" aria-hidden />
            댓글
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              불러오는 중…
            </div>
          ) : comments.length === 0 ? (
            <p className="text-xs text-muted-foreground py-1">아직 댓글이 없습니다.</p>
          ) : (
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {comments.map((c) => (
                <li key={c.id} className="rounded-md bg-background/90 border px-2 py-1.5 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <p className="whitespace-pre-wrap break-words flex-1">{c.body}</p>
                    {showTrashForComment(c) ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                        disabled={deletingCommentId === c.id}
                        onClick={() => removeComment(c.id)}
                        aria-label="댓글 삭제"
                      >
                        {deletingCommentId === c.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                        ) : (
                          <Trash2 className="h-3 w-3" aria-hidden />
                        )}
                      </Button>
                    ) : null}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">
                    {c.author_name ?? "이름 없음"} · {format(new Date(c.created_at), "M/d HH:mm", { locale: ko })}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Textarea
            value={draft}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDraft(e.target.value)}
            placeholder="댓글을 입력하세요"
            className="min-h-[72px] text-sm resize-y"
            disabled={posting}
          />
          <Button type="button" size="sm" className="h-8" disabled={posting} onClick={postComment}>
            {posting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" aria-hidden />
                등록 중…
              </>
            ) : (
              "댓글 등록"
            )}
          </Button>
        </div>
      </div>

      <AlertDialog open={deleteAnnOpen} onOpenChange={setDeleteAnnOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>게시물을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              「{title}」 항목과 첨부 이미지·댓글이 함께 삭제됩니다. 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row gap-2 justify-end sm:justify-end">
            <AlertDialogCancel disabled={deletingAnn}>취소</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deletingAnn}
              onClick={() => removeAnnouncement()}
            >
              {deletingAnn ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" aria-hidden />
                  삭제 중…
                </>
              ) : (
                "삭제"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
