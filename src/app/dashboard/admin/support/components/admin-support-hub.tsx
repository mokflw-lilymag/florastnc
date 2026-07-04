"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  CalendarPlus,
  ExternalLink,
  KeyRound,
  Link2,
  Loader2,
  Settings,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { dateFnsLocaleForBase } from "@/lib/date-fns-locale";
import { toBaseLocale } from "@/i18n/config";
import type { TenantHealth, SupportTimelineItem, RelatedSupportTicket } from "@/lib/support-tickets/hub";
import { TIMELINE_ACTION_LABELS } from "@/lib/support-tickets/hub";
import type { SupportReplyTemplate } from "@/lib/support-tickets/reply-templates";

type HubFlags = {
  is_remote_settings: boolean;
  has_remote_assist_code: boolean;
  requires_assist_code: boolean;
  category: string;
  ticket_no: string;
};

type Props = {
  ticketId: string;
  onApplyTemplate: (body: string) => void;
};

export function AdminSupportHub({ ticketId, onApplyTemplate }: Props) {
  const router = useRouter();
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const dfLoc = dateFnsLocaleForBase(baseLocale);
  const { refreshAuth } = useAuth();

  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<TenantHealth | null>(null);
  const [timeline, setTimeline] = useState<SupportTimelineItem[]>([]);
  const [templates, setTemplates] = useState<SupportReplyTemplate[]>([]);
  const [flags, setFlags] = useState<HubFlags | null>(null);
  const [relatedTickets, setRelatedTickets] = useState<RelatedSupportTicket[]>([]);

  const [unlockOpen, setUnlockOpen] = useState(false);
  const [unlockMode, setUnlockMode] = useState<"settings" | "password">("settings");
  const [unlockCode, setUnlockCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetUserId, setResetUserId] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/support/tickets/${ticketId}/hub?uiLocale=${encodeURIComponent(locale)}`,
        { credentials: "include" },
      );
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setHealth(json.health as TenantHealth);
        setTimeline((json.timeline as SupportTimelineItem[]) ?? []);
        setTemplates((json.templates as SupportReplyTemplate[]) ?? []);
        setFlags(json.flags as HubFlags);
        setRelatedTickets((json.relatedTickets as RelatedSupportTicket[]) ?? []);
        const users = (json.health as TenantHealth)?.users ?? [];
        if (users[0]) setResetUserId(users[0].id);
      }
    } finally {
      setLoading(false);
    }
  }, [ticketId, locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const runUnlock = async () => {
    setBusy(true);
    try {
      if (unlockMode === "settings") {
        const res = await fetch(`/api/admin/support/tickets/${ticketId}/open-settings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ code: unlockCode, uiLocale: locale }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error((json.error as string) || "실패");
          return;
        }
        await refreshAuth();
        setUnlockOpen(false);
        router.push((json.redirectUrl as string) || `/dashboard/settings?supportTicket=${ticketId}`);
      } else {
        const res = await fetch(`/api/admin/support/tickets/${ticketId}/reset-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            code: unlockCode,
            newPassword,
            userId: resetUserId,
            sendEmail,
            uiLocale: locale,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error((json.error as string) || "실패");
          return;
        }
        toast.success("비밀번호가 초기화되었습니다.");
        setUnlockOpen(false);
        void load();
      }
    } finally {
      setBusy(false);
    }
  };

  const extendSub = async (days: number) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/support/tickets/${ticketId}/extend-subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ days, uiLocale: locale }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error((json.error as string) || "연장 실패");
        return;
      }
      toast.success(`${days}일 연장 완료`);
      void load();
    } finally {
      setBusy(false);
    }
  };

  const magicLink = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/support/tickets/${ticketId}/magic-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ uiLocale: locale }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error((json.error as string) || "발송 실패");
        return;
      }
      const link = json.actionLink as string;
      try {
        await navigator.clipboard.writeText(link);
        toast.success("로그인 링크가 클립보드에 복사되었습니다.");
      } catch {
        toast.success("로그인 링크가 생성되었습니다.");
      }
      void load();
    } finally {
      setBusy(false);
    }
  };

  const openDashboard = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/support/tickets/${ticketId}/open-dashboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ uiLocale: locale }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error((json.error as string) || "실패");
        return;
      }
      await refreshAuth();
      router.push((json.redirectUrl as string) || `/dashboard?supportTicket=${ticketId}`);
    } finally {
      setBusy(false);
    }
  };

  const createFaq = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/support/tickets/${ticketId}/create-faq`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ uiLocale: locale }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error((json.error as string) || "FAQ 등록 실패");
        return;
      }
      const faqId = json.faqId as string;
      toast.success("FAQ 초안 등록됨", {
        action: {
          label: "편집하기",
          onClick: () => router.push(`/dashboard/admin/faq?highlight=${faqId}&filter=draft`),
        },
      });
      void load();
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  if (!health) return null;

  return (
    <>
      <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50/80 to-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-indigo-600" />
            매장 지원 허브
            <Badge variant="outline" className="font-mono text-[10px]">
              {flags?.ticket_no}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            <div className="rounded-lg bg-white border p-3">
              <p className="text-[10px] text-slate-500 uppercase">매장</p>
              <p className="font-semibold truncate">{health.tenant_name}</p>
            </div>
            <div className="rounded-lg bg-white border p-3">
              <p className="text-[10px] text-slate-500 uppercase">플랜</p>
              <p className="font-semibold">{health.plan}</p>
            </div>
            <div className="rounded-lg bg-white border p-3">
              <p className="text-[10px] text-slate-500 uppercase">구독</p>
              <p className={`font-semibold ${health.is_expired || health.is_suspended ? "text-red-600" : "text-emerald-700"}`}>
                {health.is_suspended ? "정지" : health.is_expired ? "만료" : "정상"}
                {health.subscription_end ? ` · ${health.subscription_end.slice(0, 10)}` : ""}
              </p>
            </div>
            <div className="rounded-lg bg-white border p-3">
              <p className="text-[10px] text-slate-500 uppercase">작성자</p>
              <p className="font-semibold truncate text-xs">{health.author_email ?? "—"}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {flags?.is_remote_settings && flags.has_remote_assist_code && (
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={busy}
                onClick={() => {
                  setUnlockMode("settings");
                  setUnlockOpen(true);
                }}
              >
                <Settings className="h-4 w-4 mr-1" />
                환경설정 열기
              </Button>
            )}
            {flags?.category === "login-help" && flags.has_remote_assist_code && (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setUnlockMode("password");
                  setUnlockOpen(true);
                }}
              >
                <KeyRound className="h-4 w-4 mr-1" />
                비밀번호 초기화
              </Button>
            )}
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void extendSub(7)}>
              <CalendarPlus className="h-4 w-4 mr-1" />
              +7일
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void extendSub(14)}>
              +14일
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void extendSub(30)}>
              +30일
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void magicLink()}>
              <Link2 className="h-4 w-4 mr-1" />
              로그인 링크
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void openDashboard()}>
              <ExternalLink className="h-4 w-4 mr-1" />
              매장 화면
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void createFaq()}>
              <Sparkles className="h-4 w-4 mr-1" />
              FAQ 등록
            </Button>
          </div>

          {templates.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">답변 템플릿</p>
              <div className="flex flex-wrap gap-1.5">
                {templates.map((t) => (
                  <Button
                    key={t.id}
                    size="sm"
                    variant="secondary"
                    className="h-7 text-xs"
                    onClick={() => onApplyTemplate(t.body)}
                  >
                    {t.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {relatedTickets.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">같은 매장 최근 문의</p>
              <ul className="text-xs space-y-1">
                {relatedTickets.map((rt) => (
                  <li key={rt.id}>
                    <Link
                      href={`/dashboard/admin/support/${rt.id}`}
                      className="text-indigo-600 hover:underline"
                    >
                      <span className="font-mono text-slate-400 mr-1">{rt.ticket_no}</span>
                      {rt.title}
                    </Link>
                    <span className="text-slate-400 ml-1">
                      · {format(new Date(rt.created_at), "MM.dd", { locale: dfLoc })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {timeline.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">지원 이력</p>
              <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
                {timeline.map((ev) => (
                  <li key={ev.id} className="flex gap-2 text-slate-600">
                    <span className="text-slate-400 shrink-0">
                      {format(new Date(ev.created_at), "MM.dd HH:mm", { locale: dfLoc })}
                    </span>
                    <span>{TIMELINE_ACTION_LABELS[ev.action] ?? ev.action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={unlockOpen} onOpenChange={setUnlockOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {unlockMode === "settings" ? "환경설정 열기" : "비밀번호 초기화"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            문의에 적힌 <strong>확인용 비밀번호</strong>를 입력하세요.
          </p>
          <div>
            <Label>확인용 비밀번호</Label>
            <Input
              inputMode="numeric"
              maxLength={6}
              value={unlockCode}
              onChange={(e) => setUnlockCode(e.target.value.replace(/\D/g, ""))}
              className="font-mono tracking-widest"
            />
          </div>
          {unlockMode === "password" && (
            <>
              <div>
                <Label>새 임시 비밀번호</Label>
                <Input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
                이메일로 임시 비밀번호 발송
              </label>
            </>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlockOpen(false)}>
              취소
            </Button>
            <Button disabled={busy} onClick={() => void runUnlock()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "확인"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
