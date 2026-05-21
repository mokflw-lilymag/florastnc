"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Instagram, Bell, Check, X, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";

interface ScheduledPost {
  id: string;
  content: string;
  scheduled_at: string;
  status: string;
  media_url?: string;
}

interface RevenueSnsAutopilotPanelProps {
  snsAutopilot: boolean;
  snsRequiresApproval: boolean;
  flashAutopilot: boolean;
  features?: string[];
  onToggle: (patch: Record<string, boolean>) => Promise<boolean>;
}

export function RevenueSnsAutopilotPanel({
  snsAutopilot,
  snsRequiresApproval,
  flashAutopilot,
  features = [],
  onToggle,
}: RevenueSnsAutopilotPanelProps) {
  const { isSuperAdmin } = useAuth();
  const locale = usePreferredLocale();
  const tr = (ko: string, en: string) => pickUiText(toBaseLocale(locale), ko, en);
  const canSnsAutopilot = features.includes("sns_autopilot");
  const canFlash = features.includes("flash_sale");
  const [instagramConnected, setInstagramConnected] = useState(false);
  const [integrationReady, setIntegrationReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pendingPosts, setPendingPosts] = useState<ScheduledPost[]>([]);
  const [flashTargets, setFlashTargets] = useState<{ productName: string; stock: number }[]>([]);

  const load = useCallback(async () => {
    const [statusRes, schedRes, flashRes] = await Promise.all([
      fetch("/api/integrations/postiz/status"),
      fetch("/api/revenue/sns/scheduled"),
      fetch("/api/revenue/flash"),
    ]);
    const statusJson = await statusRes.json();
    const schedJson = await schedRes.json();
    const flashJson = await flashRes.json();
    if (statusRes.ok) {
      setInstagramConnected(statusJson.instagramConnected);
      setIntegrationReady(statusJson.postizConfigured);
    }
    if (schedRes.ok) setPendingPosts(schedJson.posts ?? []);
    if (flashRes.ok) setFlashTargets(flashJson.lowStockTargets ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const formatConnectError = (reason?: string) => {
    if (!reason) return tr("연결 실패", "Connect failed");
    if (isSuperAdmin) return reason;
    const friendly: Record<string, string> = {
      postiz_not_configured: tr(
        "Instagram 연동이 아직 준비되지 않았습니다. Floxync 고객센터에 문의해 주세요.",
        "Instagram integration is not ready yet. Please contact Floxync support.",
      ),
      instagram_not_found_in_postiz: tr(
        "Instagram 계정 연결을 아직 확인하지 못했습니다. [Instagram 계정 연결]을 다시 눌러 Facebook·Instagram 로그인을 완료해 주세요.",
        "We could not verify your Instagram account yet. Tap [Connect Instagram account] and complete Facebook/Instagram login.",
      ),
      POSTIZ_NOT_CONFIGURED: tr(
        "Instagram 연동이 아직 준비되지 않았습니다. Floxync 고객센터에 문의해 주세요.",
        "Instagram integration is not ready yet. Please contact Floxync support.",
      ),
    };
    return friendly[reason] ?? tr("Instagram 연결에 실패했습니다. 다시 시도해 주세요.", "Instagram connection failed. Please try again.");
  };

  const syncInstagram = async (silent = false) => {
    setSyncing(true);
    try {
      const res = await fetch("/api/integrations/postiz/status", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(formatConnectError(json.reason ?? json.error));
      if (!silent) toast.success(tr("Instagram 계정 연결 완료", "Instagram account connected"));
      else toast.success(tr("Instagram 계정이 연결되었습니다", "Your Instagram account is connected"));
      await load();
    } catch (e) {
      if (!silent) toast.error(e instanceof Error ? e.message : tr("연결 실패", "Connect failed"));
      else toast.info(tr("Instagram 로그인 후 잠시 기다렸다가 [연결 상태 다시 확인]을 눌러 주세요.", "After Instagram login, wait a moment and tap [Check connection again]."));
    } finally {
      setSyncing(false);
    }
  };

  const openInstagramConnect = () => {
    sessionStorage.setItem("instagram_connect_pending", "1");
    window.location.href = "/api/integrations/postiz/connect";
  };

  const approvePost = async (id: string) => {
    const res = await fetch("/api/revenue/sns/scheduled", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "publish" }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? tr("게시 실패", "Publish failed"));
      return;
    }
    toast.success(tr("Instagram 게시 예약 완료", "Scheduled to Instagram"));
    await load();
  };

  const cancelPost = async (id: string) => {
    await fetch("/api/revenue/sns/scheduled", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  };

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const shouldVerify =
      sp.get("instagram") === "check" || sessionStorage.getItem("instagram_connect_pending") === "1";
    if (!shouldVerify) return;

    sessionStorage.removeItem("instagram_connect_pending");
    if (sp.get("instagram") === "check") {
      sp.delete("instagram");
      const next = `${window.location.pathname}${sp.toString() ? `?${sp}` : ""}`;
      window.history.replaceState({}, "", next);
    }

    void (async () => {
      setSyncing(true);
      try {
        const res = await fetch("/api/integrations/postiz/status", { method: "POST" });
        if (!res.ok) {
          toast.info(
            pickUiText(
              toBaseLocale(locale),
              "Instagram 로그인을 마치셨다면 잠시 후 [연결 상태 다시 확인]을 눌러 주세요.",
              "If you finished Instagram login, wait a moment and tap [Check connection again].",
            ),
          );
          return;
        }
        toast.success(
          pickUiText(toBaseLocale(locale), "Instagram 계정이 연결되었습니다", "Your Instagram account is connected"),
        );
        await load();
      } finally {
        setSyncing(false);
      }
    })();
    // OAuth 복귀 시 1회만 자동 확인
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Instagram className="w-4 h-4 text-pink-500" />
            {tr("Instagram 계정 연결", "Connect Instagram account")}
          </CardTitle>
          <CardDescription className="space-y-1">
            {isSuperAdmin ? (
              <span>
                {tr(
                  "사용자: [Instagram 계정 연결] → Meta 로그인. 수퍼: Postiz URL/키는 연동 센터 → 매출엔진.",
                  "User: [Connect Instagram account] → Meta login. Super admin: Postiz URL/key in Integration Center.",
                )}
              </span>
            ) : (
              <>
                <span className="block">
                  {tr(
                    "1. [Instagram 계정 연결] 클릭 → Facebook·Instagram 로그인",
                    "1. Tap [Connect Instagram account] → sign in with Facebook/Instagram",
                  )}
                </span>
                <span className="block">
                  {tr(
                    "2. 본인 꽃집 인스타 계정 선택·승인 → Floxync로 돌아오면 자동 확인",
                    "2. Select your shop Instagram account → Floxync verifies when you return",
                  )}
                </span>
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant={instagramConnected ? "default" : "secondary"}>
              {instagramConnected ? tr("연결됨", "Connected") : tr("미연결", "Not connected")}
            </Badge>
            {!integrationReady && (
              <span className="text-xs text-amber-600">
                {isSuperAdmin
                  ? tr("수퍼: 연동 센터 → 매출엔진 탭에서 Instagram 연동 URL/키 설정", "Super admin: set Instagram integration URL/key in Integration Center")
                  : tr(
                      "Instagram 자동 게시 준비 중입니다. 문의가 필요하면 Floxync 고객센터로 연락해 주세요.",
                      "Instagram auto-publish is being set up. Contact Floxync support if you need help.",
                    )}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="bg-gradient-to-r from-pink-500 to-purple-600 text-white" onClick={openInstagramConnect} disabled={!integrationReady}>
              {tr("Instagram 계정 연결", "Connect Instagram account")}
            </Button>
            {!instagramConnected && integrationReady && (
              <Button size="sm" variant="outline" onClick={() => syncInstagram()} disabled={syncing}>
                {syncing ? tr("확인 중…", "Checking…") : tr("연결 상태 다시 확인", "Check connection again")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{tr("SNS · 재고 Auto-Pilot", "SNS · Flash Auto-Pilot")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Switch
              checked={snsAutopilot}
              disabled={!canSnsAutopilot}
              onCheckedChange={async (on) => {
                if (!canSnsAutopilot) return;
                const ok = await onToggle({ sns_autopilot: on });
                if (ok) toast.success(on ? tr("SNS Auto-Pilot ON", "SNS Auto-Pilot ON") : "OFF");
                else toast.error(tr("FLORA PRO 필요", "FLORA PRO required"));
              }}
            />
            <Label className={!canSnsAutopilot ? "text-muted-foreground" : undefined}>
              {tr("SNS Auto-Pilot (월·수·금 10:00)", "SNS Auto-Pilot (Mon/Wed/Fri 10:00)")}
            </Label>
            {!canSnsAutopilot && (
              <Link href="/dashboard/subscription?highlight=revenue" className="text-xs text-indigo-600 flex items-center gap-1">
                <Lock className="w-3 h-3" /> PRO
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={snsRequiresApproval}
              disabled={!canSnsAutopilot}
              onCheckedChange={async (on) => {
                if (!canSnsAutopilot) return;
                const ok = await onToggle({ sns_requires_approval: on });
                if (ok) toast.success(on ? tr("승인 모드 ON", "Approval mode ON") : tr("자동 게시", "Auto publish"));
              }}
            />
            <Label className={!canSnsAutopilot ? "text-muted-foreground" : undefined}>
              {tr("게시 30분 전 승인", "Approve ~30min before publish")}
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={flashAutopilot}
              disabled={!canFlash}
              onCheckedChange={async (on) => {
                if (!canFlash) return;
                const ok = await onToggle({ flash_autopilot: on });
                if (ok) toast.success(on ? tr("재고 플래시 ON", "Flash ON") : "OFF");
                else toast.error(tr("FLORA PRO 필요", "FLORA PRO required"));
              }}
            />
            <Label className={!canFlash ? "text-muted-foreground" : undefined}>
              {tr("재고 플래시 (매일 08:00)", "Flash inventory (daily 08:00)")}
            </Label>
            {!canFlash && (
              <Link href="/dashboard/subscription?highlight=revenue" className="text-xs text-indigo-600 flex items-center gap-1">
                <Lock className="w-3 h-3" /> PRO
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      {pendingPosts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="w-4 h-4" />
              {tr("승인 대기 SNS", "Pending SNS approval")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingPosts.map((p) => (
              <div key={p.id} className="rounded-lg border p-3 space-y-2">
                <p className="text-xs text-muted-foreground">{new Date(p.scheduled_at).toLocaleString("ko-KR")}</p>
                <p className="text-sm line-clamp-3">{p.content}</p>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-emerald-600" onClick={() => approvePost(p.id)}>
                    <Check className="w-3 h-3 mr-1" />{tr("승인·게시", "Approve")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => cancelPost(p.id)}>
                    <X className="w-3 h-3 mr-1" />{tr("취소", "Cancel")}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {flashTargets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{tr("재고 임박 (플래시 후보)", "Low stock flash candidates")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              {flashTargets.map((t, i) => (
                <li key={i}>{t.productName} — {tr("재고", "stock")} {t.stock}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
