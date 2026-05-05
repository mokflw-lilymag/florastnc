"use client";

import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
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
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/getMessages";
import { pickUiText } from "@/i18n/pick-ui-text";
import { dateFnsLocaleForBase } from "@/lib/date-fns-locale";

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
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const tf = getMessages(locale).tenantFlows;
  const L = (
    ko: string,
    en: string,
    vi?: string,
    ja?: string,
    zh?: string,
    es?: string,
    pt?: string,
    fr?: string,
    de?: string,
    ru?: string,
  ) => pickUiText(baseLocale, ko, en, vi, ja, zh, es, pt, fr, de, ru);
  const dfLoc = dateFnsLocaleForBase(baseLocale);

  const loadComments = useCallback(async () => {
    const bl = toBaseLocale(locale);
    const flows = getMessages(locale).tenantFlows;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/hq/announcements/${announcementId}/comments?uiLocale=${encodeURIComponent(locale)}`,
        { credentials: "include" }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 503) {
          toast.error(
            typeof json?.error === "string"
              ? json.error
              : pickUiText(
                  bl,
                  "댓글을 불러올 수 없습니다.",
                  "Could not load comments.",
                  "Không thể tải bình luận.",
                  "コメントを読み込めませんでした",
                  "无法加载评论",
                  "No se pudieron cargar los comentarios.",
                  "Não foi possível carregar os comentários.",
                  "Impossible de charger les commentaires.",
                  "Kommentare konnten nicht geladen werden.",
                  "Не удалось загрузить комментарии.",
                ),
          );
        } else if (res.status === 401) {
          toast.error(flows.f00176);
        }
        setComments([]);
        return;
      }
      setComments(json.comments ?? []);
    } finally {
      setLoading(false);
    }
  }, [announcementId, locale]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const postComment = async () => {
    const t = draft.trim();
    if (!t) {
      toast.error(
        L(
          "댓글 내용을 입력하세요.",
          "Please enter a comment.",
          "Vui lòng nhập nội dung bình luận.",
          "コメントを入力してください。",
          "请输入评论内容。",
          "Escriba un comentario.",
          "Digite um comentário.",
          "Saisissez un commentaire.",
          "Bitte geben Sie einen Kommentar ein.",
          "Введите текст комментария.",
        ),
      );
      return;
    }
    setPosting(true);
    try {
      const res = await fetch(`/api/hq/announcements/${announcementId}/comments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: t, uiLocale: locale }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(
          typeof json?.error === "string"
            ? json.error
            : L(
                "등록 실패",
                "Failed to post.",
                "Đăng thất bại.",
                "投稿に失敗しました",
                "发布失败",
                "Error al publicar.",
                "Falha ao publicar.",
                "Échec de la publication.",
                "Beitrag fehlgeschlagen.",
                "Не удалось опубликовать.",
              ),
        );
        return;
      }
      setDraft("");
      await loadComments();
      toast.success(
        L(
          "댓글이 등록되었습니다.",
          "Comment posted.",
          "Đã đăng bình luận.",
          "コメントを投稿しました。",
          "评论已发布。",
          "Comentario publicado.",
          "Comentário publicado.",
          "Commentaire publié.",
          "Kommentar veröffentlicht.",
          "Комментарий опубликован.",
        ),
      );
    } finally {
      setPosting(false);
    }
  };

  const removeComment = async (commentId: string) => {
    setDeletingCommentId(commentId);
    try {
      const res = await fetch(
        `/api/hq/announcements/${announcementId}/comments/${commentId}?uiLocale=${encodeURIComponent(locale)}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(
          typeof json?.error === "string"
            ? json.error
            : L(
                "삭제 실패",
                "Delete failed.",
                "Xóa thất bại.",
                "削除に失敗しました",
                "删除失败",
                "Error al eliminar.",
                "Falha ao excluir.",
                "Échec de la suppression.",
                "Löschen fehlgeschlagen.",
                "Не удалось удалить.",
              ),
        );
        return;
      }
      await loadComments();
      toast.success(
        L(
          "댓글을 삭제했습니다.",
          "Comment deleted.",
          "Đã xóa bình luận.",
          "コメントを削除しました。",
          "评论已删除。",
          "Comentario eliminado.",
          "Comentário excluído.",
          "Commentaire supprimé.",
          "Kommentar gelöscht.",
          "Комментарий удалён.",
        ),
      );
    } finally {
      setDeletingCommentId(null);
    }
  };

  const removeAnnouncement = async () => {
    setDeletingAnn(true);
    try {
      const res = await fetch(
        `/api/hq/announcements/${announcementId}?uiLocale=${encodeURIComponent(locale)}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(
          typeof json?.error === "string"
            ? json.error
            : L(
                "삭제 실패",
                "Delete failed.",
                "Xóa thất bại.",
                "削除に失敗しました",
                "删除失败",
                "Error al eliminar.",
                "Falha ao excluir.",
                "Échec de la suppression.",
                "Löschen fehlgeschlagen.",
                "Не удалось удалить.",
              ),
        );
        return;
      }
      setDeleteAnnOpen(false);
      toast.success(
        L(
          "게시물을 삭제했습니다.",
          "Post deleted.",
          "Đã xóa bài viết.",
          "投稿を削除しました。",
          "帖子已删除。",
          "Publicación eliminada.",
          "Post excluído.",
          "Publication supprimée.",
          "Beitrag gelöscht.",
          "Запись удалена.",
        ),
      );
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
              {L(
                "게시물 삭제",
                "Delete post",
                "Xóa bài viết",
                "投稿を削除",
                "删除帖子",
                "Eliminar publicación",
                "Excluir post",
                "Supprimer la publication",
                "Beitrag löschen",
                "Удалить запись",
              )}
            </Button>
          </div>
        ) : null}

        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5" aria-hidden />
            {L("댓글", "Comments", "Bình luận", "コメント", "评论", "Comentarios", "Comentários", "Commentaires", "Kommentare", "Комментарии")}
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              {tf.f01292}
            </div>
          ) : comments.length === 0 ? (
            <p className="text-xs text-muted-foreground py-1">
              {L(
                "아직 댓글이 없습니다.",
                "No comments yet.",
                "Chưa có bình luận.",
                "まだコメントはありません。",
                "暂无评论。",
                "Aún no hay comentarios.",
                "Ainda não há comentários.",
                "Pas encore de commentaires.",
                "Noch keine Kommentare.",
                "Комментариев пока нет.",
              )}
            </p>
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
                        aria-label={L(
                          "댓글 삭제",
                          "Delete comment",
                          "Xóa bình luận",
                          "コメントを削除",
                          "删除评论",
                          "Eliminar comentario",
                          "Excluir comentário",
                          "Supprimer le commentaire",
                          "Kommentar löschen",
                          "Удалить комментарий",
                        )}
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
                    {c.author_name ?? tf.f00501} ·{" "}
                    {format(new Date(c.created_at), "Pp", { locale: dfLoc })}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Textarea
            value={draft}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDraft(e.target.value)}
            placeholder={L(
              "댓글을 입력하세요",
              "Enter a comment",
              "Nhập bình luận",
              "コメントを入力",
              "输入评论",
              "Escriba un comentario",
              "Digite um comentário",
              "Saisir un commentaire",
              "Kommentar eingeben",
              "Введите комментарий",
            )}
            className="min-h-[72px] text-sm resize-y"
            disabled={posting}
          />
          <Button type="button" size="sm" className="h-8" disabled={posting} onClick={postComment}>
            {posting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" aria-hidden />
                {L(
                  "등록 중…",
                  "Posting…",
                  "Đang đăng…",
                  "投稿中…",
                  "发布中…",
                  "Publicando…",
                  "Publicando…",
                  "Publication…",
                  "Wird veröffentlicht…",
                  "Публикация…",
                )}
              </>
            ) : (
              L(
                "댓글 등록",
                "Post comment",
                "Đăng bình luận",
                "コメントを投稿",
                "发表评论",
                "Publicar comentario",
                "Publicar comentário",
                "Publier le commentaire",
                "Kommentar posten",
                "Опубликовать комментарий",
              )
            )}
          </Button>
        </div>
      </div>

      <AlertDialog open={deleteAnnOpen} onOpenChange={setDeleteAnnOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {L(
                "게시물을 삭제할까요?",
                "Delete this post?",
                "Xóa bài viết này?",
                "この投稿を削除しますか？",
                "要删除此帖子吗？",
                "¿Eliminar esta publicación?",
                "Excluir esta publicação?",
                "Supprimer cette publication ?",
                "Diesen Beitrag löschen?",
                "Удалить эту запись?",
              )}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              {L(
                `「${title}」 항목과 첨부 이미지·댓글이 함께 삭제됩니다. 되돌릴 수 없습니다.`,
                `「${title}」 and any attached images and comments will be removed. This cannot be undone.`,
                `「${title}」 và mọi hình ảnh đính kèm, bình luận sẽ bị xóa. Không thể hoàn tác.`,
                `「${title}」と添付画像・コメントがまとめて削除されます。元に戻せません。`,
                `「${title}」及其附件图片与评论将一并删除，无法恢复。`,
                `Se eliminarán «${title}», imágenes adjuntas y comentarios. No se puede deshacer.`,
                `«${title}», imagens anexas e comentários serão removidos. Não dá para desfazer.`,
                `« ${title} », images jointes et commentaires seront supprimés. Action irréversible.`,
                `„${title}“, Anhänge und Kommentare werden gelöscht. Nicht rückgängig zu machen.`,
                `«${title}», вложения и комментарии будут удалены. Отменить нельзя.`,
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row gap-2 justify-end sm:justify-end">
            <AlertDialogCancel disabled={deletingAnn}>{tf.f00702}</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deletingAnn}
              onClick={() => removeAnnouncement()}
            >
              {deletingAnn ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" aria-hidden />
                  {L(
                    "삭제 중…",
                    "Deleting…",
                    "Đang xóa…",
                    "削除中…",
                    "删除中…",
                    "Eliminando…",
                    "Excluindo…",
                    "Suppression…",
                    "Wird gelöscht…",
                    "Удаление…",
                  )}
                </>
              ) : (
                L("삭제", "Delete", "Xóa", "削除", "删除", "Eliminar", "Excluir", "Supprimer", "Löschen", "Удалить")
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
