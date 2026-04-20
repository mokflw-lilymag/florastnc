"use client";

import { useCallback, useEffect, useState } from "react";
import { Megaphone, Loader2, CheckCircle2, PenLine } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnnouncementBody } from "@/components/hq/announcement-body";
import { OrgAnnouncementComposeDialog } from "@/components/hq/org-announcement-compose-dialog";
import type { OrgRow } from "@/components/hq/org-announcement-compose-dialog";
import { OrgAnnouncementThread } from "@/components/hq/org-announcement-thread";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "sonner";

type Ann = {
  id: string;
  organization_id: string;
  organization_name: string | null;
  title: string;
  body: string;
  priority: string;
  created_at: string;
  expires_at?: string | null;
  attachment_urls?: string[];
  confirmedAt?: string | null;
};

export default function OrgBoardPage() {
  const { user, profile, isLoading: authLoading, isSuperAdmin } = useAuth();
  const [list, setList] = useState<Ann[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeCtx, setComposeCtx] = useState<{ organizations: OrgRow[]; canManage: boolean }>({
    organizations: [],
    canManage: false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = isSuperAdmin ? "" : "?branchOnly=1";
      const res = await fetch(`/api/hq/announcements${q}`, { credentials: "include" });
      if (!res.ok) {
        setList([]);
        return;
      }
      const json = await res.json();
      setList(json.announcements ?? []);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading, load]);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/hq/compose-context", { credentials: "include" });
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) {
          setComposeCtx({
            organizations: json.organizations ?? [],
            canManage: json.canManageAnnouncements === true,
          });
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading]);

  const confirmRead = async (id: string) => {
    setConfirmingId(id);
    try {
      const res = await fetch(`/api/hq/announcements/${id}/read`, {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof json?.error === "string" ? json.error : "확인 기록에 실패했습니다.");
        return;
      }
      await load();
      toast.success("본사에 확인 기록되었습니다.");
    } finally {
      setConfirmingId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <PageHeader
        title="본사 게시판"
        description="본사 게시·이미지·링크를 지점에 전달합니다. 게시물은 등록일 기준 약 30일 후 자동으로 사라집니다. 조직에 연결된 사용자는 댓글을 남길 수 있습니다. 게시물 삭제는 플랫폼 관리자 또는 해당 조직 본사 관리자(org_admin)만 할 수 있습니다."
        icon={Megaphone}
      >
        {composeCtx.canManage && composeCtx.organizations.length > 0 ? (
          <Button type="button" className="gap-2 font-semibold" onClick={() => setComposeOpen(true)}>
            <PenLine className="h-4 w-4" aria-hidden />
            새 게시물
          </Button>
        ) : null}
      </PageHeader>

      <OrgAnnouncementComposeDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        organizations={composeCtx.organizations}
        onPosted={load}
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : list.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">표시할 게시물이 없습니다</CardTitle>
            <CardDescription>
              {isSuperAdmin
                ? "플랫폼 관리자 계정은 조직 멤버십이 없으면 여기가 비어 있을 수 있습니다. 조직에 멤버로 배정되었는지 확인하거나, 위에서 새 게시물을 등록해 보세요."
                : "조직에 연결된 매장이거나 본사 멤버일 때만 본사 게시가 보입니다. 아직 글이 없거나 모두 만료되었을 수 있습니다."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ul className="space-y-5">
          {list.map((a) => {
            const canModerate =
              isSuperAdmin ||
              (composeCtx.canManage && composeCtx.organizations.some((o) => o.id === a.organization_id));
            return (
            <li key={a.id}>
              <Card
                className={
                  a.priority === "high"
                    ? "border-amber-200/80 bg-amber-50/40 dark:bg-amber-950/20"
                    : undefined
                }
              >
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={a.priority === "high" ? "destructive" : "secondary"}>
                      {a.priority === "high" ? "중요" : "일반"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {a.organization_name ?? ""}
                      {a.organization_name ? " · " : ""}
                      {format(new Date(a.created_at), "yyyy.M.d HH:mm", { locale: ko })}
                    </span>
                    {a.expires_at ? (
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        만료 {format(new Date(a.expires_at), "M/d HH:mm", { locale: ko })}
                      </span>
                    ) : null}
                  </div>
                  <CardTitle className="text-lg mt-2">{a.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <AnnouncementBody htmlOrText={a.body} />

                  {a.attachment_urls && a.attachment_urls.length > 0 ? (
                    <div className="flex flex-wrap gap-3">
                      {a.attachment_urls.map((url) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border bg-slate-50/80 dark:bg-slate-900/40 overflow-hidden shrink-0"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt=""
                            className="max-h-56 max-w-full w-auto object-contain block"
                            loading="lazy"
                          />
                        </a>
                      ))}
                    </div>
                  ) : null}

                  {!isSuperAdmin && profile?.tenant_id ? (
                    <div className="pt-1">
                      {a.confirmedAt ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/80 dark:bg-emerald-950/50 px-3 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                          본사에 확인 기록됨 ·{" "}
                          {format(new Date(a.confirmedAt), "M/d HH:mm", { locale: ko })}
                        </span>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          disabled={confirmingId === a.id}
                          onClick={() => confirmRead(a.id)}
                        >
                          {confirmingId === a.id ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                              처리 중…
                            </>
                          ) : (
                            "내용 확인(본사에 전달)"
                          )}
                        </Button>
                      )}
                    </div>
                  ) : null}

                  <div className="pt-2">
                    <OrgAnnouncementThread
                      announcementId={a.id}
                      title={a.title}
                      canDeletePost={canModerate}
                      canModerateComments={canModerate}
                      currentUserId={user?.id ?? null}
                      onDeleted={load}
                    />
                  </div>
                </CardContent>
              </Card>
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
