"use client";
import { getMessages } from "@/i18n/getMessages";

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
import { dateFnsLocaleForBase } from "@/lib/date-fns-locale";
import { toast } from "sonner";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";

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
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const dfLoc = dateFnsLocaleForBase(toBaseLocale(locale));
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
      const params = new URLSearchParams();
      if (!isSuperAdmin) params.set("branchOnly", "1");
      params.set("uiLocale", locale);
      const res = await fetch(`/api/hq/announcements?${params.toString()}`, { credentials: "include" });
      if (!res.ok) {
        setList([]);
        return;
      }
      const json = await res.json();
      setList(json.announcements ?? []);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, locale]);

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading, load]);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/hq/compose-context?uiLocale=${encodeURIComponent(locale)}`,
          { credentials: "include" }
        );
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
  }, [authLoading, locale]);

  const confirmRead = async (id: string) => {
    setConfirmingId(id);
    try {
      const res = await fetch(`/api/hq/announcements/${id}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ uiLocale: locale }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof json?.error === "string" ? json.error : tf.f02216);
        return;
      }
      await load();
      toast.success(tf.f01282);
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
        title={tf.f01266}
        description={tf.f01265}
        icon={Megaphone}
      >
        {composeCtx.canManage && composeCtx.organizations.length > 0 ? (
          <Button type="button" className="gap-2 font-semibold" onClick={() => setComposeOpen(true)}>
            <PenLine className="h-4 w-4" aria-hidden />
            {tf.f01371}
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
            <CardTitle className="text-base">{tf.f02118}</CardTitle>
            <CardDescription>
              {isSuperAdmin
                ? tf.f02145
                : tf.f01855}
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
                      {a.priority === "high" ? tf.f01890 : tf.f00525}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {a.organization_name ?? ""}
                      {a.organization_name ? " · " : ""}
                      {format(new Date(a.created_at), "PPp", { locale: dfLoc })}
                    </span>
                    {a.expires_at ? (
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {tf.f01142}{" "}
                        {format(new Date(a.expires_at), "Pp", { locale: dfLoc })}
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
                          {tf.f01283} ·{" "}
                          {format(new Date(a.confirmedAt), "Pp", { locale: dfLoc })}
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
                              {tf.f01977}
                            </>
                          ) : (
                            tf.f01034
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
