"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Copy, Heart, Package, RefreshCw, Send, Settings2, Sparkles, TrendingUp, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Textarea from "@/components/ui/textarea";
import { toast } from "sonner";
import { useUiText } from "@/hooks/use-ui-text";
import { pickUiText } from "@/i18n/pick-ui-text";
import { PageHeader } from "@/components/page-header";
import { RevenueSettingsPanel } from "@/components/revenue/revenue-settings-panel";
import { RevenueSnsAutopilotPanel } from "@/components/revenue/revenue-sns-autopilot-panel";
import { RevenuePlanUpsell } from "@/components/revenue/revenue-plan-upsell";
import { RevenueFlashPanel } from "@/components/revenue/revenue-flash-panel";
import { notifyCopiedForPublish, requestPublishNotificationPermission } from "@/lib/revenue/notify-client";
import snsHarness from "@/lib/revenue/harness/sns-content-7types.json";
import { NAVER_SEO_TEMPLATES } from "@/lib/revenue/naver-seo-pack";

interface PreviewTarget {
  anniversaryId: string;
  customerId: string;
  customerName: string;
  contact: string;
  label: string;
  eventDateYmd: string;
}

interface PreviewResponse {
  autopilotOn: boolean;
  targetCount: number;
  expectedTotalKrw: number;
  targets: PreviewTarget[];
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  orderDate: string;
  itemSummary: string;
  photoUrl: string | null;
}

interface SuggestResult {
  orderId: string;
  orderNumber: string;
  topic: string;
  contentTypeLabel?: string;
  naverSeoTemplate?: string;
  abVariants?: { segment: string; label: string; caption: string }[];
  instagram: { caption: string; draftId?: string };
  naver: { title: string; content: string; draftId?: string };
}

interface RevenueAccess {
  plan: string;
  features: string[];
}

interface AttributionRow {
  id: string;
  attributed_amount: number;
  matched_at: string;
  campaign_id: string;
}

const CONTENT_TYPES = snsHarness.content_types as { id: string; label: string }[];

function formatKrw(n: number) {
  return new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(n);
}

async function copyText(text: string, draftId?: string) {
  await navigator.clipboard.writeText(text);
  if (draftId) {
    await fetch("/api/marketing/drafts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: draftId, status: "copied" }),
    });
  }
}

export default function RevenueCalendarPage() {
  const { tr, baseLocale } = useUiText();

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [anniversaryAutopilot, setAnniversaryAutopilot] = useState(false);
  const [followupAutopilot, setFollowupAutopilot] = useState(false);
  const [snsAutopilot, setSnsAutopilot] = useState(false);
  const [snsRequiresApproval, setSnsRequiresApproval] = useState(true);
  const [flashAutopilot, setFlashAutopilot] = useState(false);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [attributedTotal, setAttributedTotal] = useState(0);
  const [attributionCount, setAttributionCount] = useState(0);
  const [snsStats, setSnsStats] = useState<{ snsCampaignCount?: number; snsAttributedTotalKrw?: number } | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [contentType, setContentType] = useState(CONTENT_TYPES[0]?.id ?? "work_showcase");
  const [promoTopicIndex, setPromoTopicIndex] = useState(0);
  const [abTest, setAbTest] = useState(false);
  const [naverSeoTemplateId, setNaverSeoTemplateId] = useState<string | null>(null);
  const [access, setAccess] = useState<RevenueAccess | null>(null);
  const [generating, setGenerating] = useState(false);
  const [suggest, setSuggest] = useState<SuggestResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [autoRes, prevRes, attrRes, ordersRes, snsStatsRes, accessRes] = await Promise.all([
        fetch("/api/revenue/autopilot"),
        fetch("/api/revenue/anniversary/preview"),
        fetch("/api/revenue/attributions?limit=100"),
        fetch("/api/revenue/recent-orders?limit=10"),
        fetch("/api/revenue/sns/stats"),
        fetch("/api/revenue/access"),
      ]);
      const autoJson = await autoRes.json();
      const prevJson = await prevRes.json();
      const attrJson = await attrRes.json();
      const ordersJson = await ordersRes.json();
      const snsJson = await snsStatsRes.json();
      const accessJson = await accessRes.json();

      if (autoRes.ok) {
        setAnniversaryAutopilot(autoJson.settings?.anniversary_autopilot ?? false);
        setFollowupAutopilot(autoJson.settings?.order_followup_autopilot ?? false);
        setSnsAutopilot(autoJson.settings?.sns_autopilot ?? false);
        setSnsRequiresApproval(autoJson.settings?.sns_requires_approval !== false);
        setFlashAutopilot(autoJson.settings?.flash_autopilot ?? false);
      }
      if (prevRes.ok) setPreview(prevJson);
      if (attrRes.ok) {
        const rows = (attrJson.attributions ?? []) as AttributionRow[];
        setAttributionCount(rows.length);
        setAttributedTotal(rows.reduce((s, r) => s + Number(r.attributed_amount ?? 0), 0));
      }
      if (ordersRes.ok) {
        const orders = (ordersJson.orders ?? []) as RecentOrder[];
        setRecentOrders(orders);
        setSelectedOrderId((prev) => prev ?? orders[0]?.id ?? null);
      }
      if (snsStatsRes.ok) setSnsStats(snsJson);
      if (accessRes.ok) setAccess({ plan: accessJson.plan, features: accessJson.features ?? [] });
    } catch {
      toast.error(pickUiText(baseLocale, "불러오기 실패", "Failed to load"));
    } finally {
      setLoading(false);
    }
  }, [baseLocale]);

  useEffect(() => {
    load();
    requestPublishNotificationPermission();
  }, [load]);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const postiz = sp.get("postiz");
    if (postiz === "connected") toast.success(pickUiText(baseLocale, "Instagram 연결 완료", "Instagram connected"));
    else if (postiz === "missing_tenant") toast.error(pickUiText(baseLocale, "Instagram 연결에 실패했습니다.", "Instagram connection failed."));
    else if (postiz === "db_error" || postiz === "error") toast.error(pickUiText(baseLocale, "Instagram 연결 중 오류가 발생했습니다.", "An error occurred while connecting Instagram."));
    else if (postiz && postiz !== "connected") toast.info(pickUiText(baseLocale, "Instagram 연결을 완료하지 못했습니다. 다시 시도해 주세요.", "Could not complete Instagram connection. Please try again."));
  }, [baseLocale]);

  const patchAutopilot = async (patch: Record<string, boolean>) => {
    const res = await fetch("/api/revenue/autopilot", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      toast.error(tr("저장 실패", "Save failed"));
      return false;
    }
    const json = await res.json();
    if (json.settings) {
      setSnsAutopilot(json.settings.sns_autopilot ?? snsAutopilot);
      setSnsRequiresApproval(json.settings.sns_requires_approval !== false);
      setFlashAutopilot(json.settings.flash_autopilot ?? flashAutopilot);
    }
    return true;
  };

  const toggleAnniversaryAutopilot = async (on: boolean) => {
    setAnniversaryAutopilot(on);
    const ok = await patchAutopilot({ anniversary_autopilot: on });
    if (!ok) setAnniversaryAutopilot(!on);
    else toast.success(on ? tr("기념일 Auto-Pilot ON", "Anniversary Auto-Pilot ON") : tr("OFF", "OFF"));
  };

  const toggleFollowupAutopilot = async (on: boolean) => {
    setFollowupAutopilot(on);
    const ok = await patchAutopilot({ order_followup_autopilot: on });
    if (!ok) setFollowupAutopilot(!on);
    else toast.success(on ? tr("구매 후 Auto-Pilot ON", "Order follow-up Auto-Pilot ON") : tr("OFF", "OFF"));
  };

  const sendOne = async (anniversaryId: string) => {
    setSending(anniversaryId);
    try {
      const res = await fetch("/api/revenue/anniversary/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anniversaryId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "send failed");
      if (json.result?.status === "sent") toast.success(tr("발송 완료", "Sent"));
      else toast.info(json.result?.reason ?? tr("발송 스킵", "Skipped"));
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("발송 실패", "Send failed"));
    } finally {
      setSending(null);
    }
  };

  const sendBatch = async () => {
    setSending("batch");
    try {
      const res = await fetch("/api/revenue/anniversary/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "batch" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "batch failed");
      toast.success(tr(`발송 ${json.sent}건 · 스킵 ${json.skipped}건`, `Sent ${json.sent} · skipped ${json.skipped}`));
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("배치 실패", "Batch failed"));
    } finally {
      setSending(null);
    }
  };

  const generateSuggest = async () => {
    if (!selectedOrderId) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/marketing/suggest-from-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrderId,
          contentType,
          promoTopicIndex,
          abTest: abTest && (access?.features.includes("sns_autopilot") ?? false),
          naverSeoTemplateId: naverSeoTemplateId ?? undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "generate failed");
      setSuggest(json);
      toast.success(tr("AI 초안 생성 완료", "Drafts generated"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("생성 실패", "Generate failed"));
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async (
    text: string,
    draftId: string | undefined,
    label: string,
    channel: "instagram" | "naver",
    orderNumber?: string,
  ) => {
    try {
      await copyText(text, draftId);
      notifyCopiedForPublish(channel, orderNumber);
      toast.success(`${label} ${tr("복사됨 — 게시해 주세요!", "copied — please publish!")}`);
    } catch {
      toast.error(tr("복사 실패", "Copy failed"));
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title={tr("매출 캘린더", "Revenue calendar")}
        description={tr(
          "Floxync가 벌어주는 매출 — 기념일 · 구매 후 · SNS 초안",
          "Revenue driven by Floxync — anniversaries, follow-ups, SNS drafts",
        )}
      />

      <RevenuePlanUpsell />

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white md:col-span-1">
          <CardHeader className="pb-2">
            <CardDescription>{tr("Floxync가 번 돈", "Floxync attributed")}</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              {loading ? "…" : formatKrw(attributedTotal)}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{tr(`${attributionCount}건 귀속`, `${attributionCount} attributions`)}</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{tr("이번 주 예상 (D-7)", "This week estimate (D-7)")}</CardDescription>
            <CardTitle className="text-2xl">{loading ? "…" : formatKrw(preview?.expectedTotalKrw ?? 0)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{tr("D-7 대상", "D-7 targets")}</CardDescription>
            <CardTitle className="text-2xl">{loading ? "…" : preview?.targetCount ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" /> Auto-Pilot
            </CardDescription>
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2">
                <Switch checked={anniversaryAutopilot} onCheckedChange={toggleAnniversaryAutopilot} />
                <Label className="text-xs">{tr("기념일 D-7", "Anniversary D-7")}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={followupAutopilot} onCheckedChange={toggleFollowupAutopilot} />
                <Label className="text-xs">{tr("구매 후 D+1/7/30", "Order follow-up")}</Label>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="anniversary">
        <TabsList className="flex h-10 w-full max-w-full flex-nowrap gap-1 overflow-x-auto">
          <TabsTrigger value="anniversary" className="h-9 shrink-0 flex-none whitespace-nowrap px-3">
            {tr("기념일 D-7", "Anniversary D-7")}
          </TabsTrigger>
          <TabsTrigger value="followup" className="h-9 shrink-0 flex-none whitespace-nowrap px-3">
            {tr("구매 후", "Follow-up")}
          </TabsTrigger>
          <TabsTrigger value="sns" className="h-9 shrink-0 flex-none whitespace-nowrap px-3">
            {tr("SNS 초안", "SNS drafts")}
          </TabsTrigger>
          <TabsTrigger value="report" className="h-9 shrink-0 flex-none whitespace-nowrap px-3">
            {tr("성과 리포트", "Report")}
          </TabsTrigger>
          <TabsTrigger value="settings" className="h-9 shrink-0 flex-none whitespace-nowrap px-3">
            <Settings2 className="w-3.5 h-3.5 shrink-0" />
            {tr("설정", "Settings")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="anniversary" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-rose-500" />
                  {tr("D-7 기념일 알림", "D-7 anniversary reminders")}
                </CardTitle>
                <CardDescription>
                  {tr("마케팅 동의 + Auto-Pilot ON 매장만 자동 발송 (매일 09:00)", "Auto send when consented + Auto-Pilot ON (09:00 daily)")}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                  <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
                  {tr("새로고침", "Refresh")}
                </Button>
                {(preview?.targetCount ?? 0) > 0 && (
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={sendBatch} disabled={!!sending}>
                    <Send className="w-4 h-4 mr-1" />
                    {tr("전체 발송", "Send all")}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">{tr("불러오는 중…", "Loading…")}</p>
              ) : (preview?.targets.length ?? 0) === 0 ? (
                <div className="text-center py-10 space-y-3">
                  <p className="text-muted-foreground text-sm">
                    {tr("7일 후 기념일 대상이 없어요. 고객에게 기념일·마케팅 동의를 등록해 주세요.", "No D-7 targets.")}
                  </p>
                  <Link href="/dashboard/customers" className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm hover:bg-accent">
                    {tr("고객 관리", "Customers")}
                  </Link>
                </div>
              ) : (
                <ul className="divide-y">
                  {preview!.targets.map((t) => (
                    <li key={t.anniversaryId} className="py-3 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{t.customerName}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.label} · {t.eventDateYmd} · {t.contact}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">D-7</Badge>
                        <Button size="sm" variant="outline" disabled={sending === t.anniversaryId} onClick={() => sendOne(t.anniversaryId)}>
                          {tr("발송", "Send")}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="followup" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-500" />
                {tr("구매 후 시퀀스 D+1 · D+7 · D+30", "Post-purchase sequence")}
              </CardTitle>
              <CardDescription>
                {tr(
                  "배송·픽업 「완료」 처리 시 Trigger.dev가 시퀀스를 시작합니다.",
                  "Marking order complete starts the Trigger.dev sequence.",
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <ol className="list-decimal list-inside space-y-2">
                <li>{tr("배송 관리 또는 주문에서 상태를 「완료」로 변경", "Set order status to completed")}</li>
                <li>{tr("D+1 감사 → D+7 재구매 → D+30 시즌 (자동 대기)", "D+1 → D+7 → D+30 with auto delays")}</li>
                <li>{tr("「설정」 탭에서 메시지 문구를 수정할 수 있습니다", "Edit message copy in the Settings tab")}</li>
              </ol>
              <Link href="/dashboard/delivery" className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm hover:bg-accent text-foreground">
                {tr("배송 관리 열기", "Open delivery")}
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sns" className="mt-4 space-y-4">
          <RevenueSnsAutopilotPanel
            snsAutopilot={snsAutopilot}
            snsRequiresApproval={snsRequiresApproval}
            flashAutopilot={flashAutopilot}
            features={access?.features}
            onToggle={patchAutopilot}
          />
          <RevenueFlashPanel />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-500" />
                {tr("작품 사진 → AI 추천 글", "Product photo → AI copy")}
              </CardTitle>
              <CardDescription>
                {tr("완료 주문 · 콘텐츠 유형 · 홍보 주제를 선택한 뒤 생성하세요.", "Pick order, content type, promo topic, then generate.")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground">{tr("완료된 주문이 없습니다.", "No completed orders yet.")}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {recentOrders.map((o) => (
                    <Button
                      key={o.id}
                      size="sm"
                      variant={selectedOrderId === o.id ? "default" : "outline"}
                      onClick={() => {
                        setSelectedOrderId(o.id);
                        setSuggest(null);
                      }}
                    >
                      {o.orderNumber}
                      {o.itemSummary ? ` · ${o.itemSummary}` : ""}
                    </Button>
                  ))}
                </div>
              )}
              <div className="space-y-2">
                <Label>{tr("콘텐츠 유형 (7종)", "Content type (7)")}</Label>
                <div className="flex flex-wrap gap-2">
                  {CONTENT_TYPES.map((c) => (
                    <Button key={c.id} size="sm" variant={contentType === c.id ? "default" : "outline"} onClick={() => setContentType(c.id)}>
                      {c.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>{tr("홍보 주제", "Promo topic")}</Label>
                <div className="flex flex-wrap gap-2">
                  {[0, 1, 2].map((i) => (
                    <Button key={i} size="sm" variant={promoTopicIndex === i ? "default" : "outline"} onClick={() => setPromoTopicIndex(i)}>
                      {tr(`주제 ${i + 1}`, `Topic ${i + 1}`)}
                    </Button>
                  ))}
                </div>
              </div>
              {access?.features.includes("naver_seo_pack") && (
                <div className="space-y-2">
                  <Label>{tr("네이버 SEO 템플릿 (PRO)", "Naver SEO template (PRO)")}</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={!naverSeoTemplateId ? "default" : "outline"}
                      onClick={() => setNaverSeoTemplateId(null)}
                    >
                      {tr("기본", "Default")}
                    </Button>
                    {NAVER_SEO_TEMPLATES.map((t) => (
                      <Button
                        key={t.id}
                        size="sm"
                        variant={naverSeoTemplateId === t.id ? "default" : "outline"}
                        onClick={() => setNaverSeoTemplateId(t.id)}
                      >
                        {t.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {access?.features.includes("sns_autopilot") && (
                <div className="flex items-center gap-2">
                  <Switch checked={abTest} onCheckedChange={setAbTest} id="ab-test" />
                  <Label htmlFor="ab-test">{tr("Limbic A/B 카피 (PRO)", "Limbic A/B copy (PRO)")}</Label>
                </div>
              )}
              <Button onClick={generateSuggest} disabled={!selectedOrderId || generating} className="bg-violet-600 hover:bg-violet-700">
                <Sparkles className="w-4 h-4 mr-1" />
                {generating ? tr("생성 중…", "Generating…") : tr("AI 초안 생성", "Generate drafts")}
              </Button>
            </CardContent>
          </Card>

          {suggest && (
            <div className="grid gap-4 md:grid-cols-2">
              {suggest.contentTypeLabel && (
                <p className="md:col-span-2 text-sm text-muted-foreground">
                  {tr("생성 유형", "Type")}: {suggest.contentTypeLabel}
                  {suggest.naverSeoTemplate ? ` · SEO: ${suggest.naverSeoTemplate}` : ""} · {suggest.topic}
                </p>
              )}
              {suggest.abVariants && suggest.abVariants.length > 0 && (
                <Card className="md:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{tr("A/B 카피 변형", "A/B copy variants")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {suggest.abVariants.map((v) => (
                      <div key={v.segment} className="rounded-lg border p-3 space-y-2">
                        <Badge variant="secondary">{v.label}</Badge>
                        <p className="text-sm whitespace-pre-wrap">{v.caption}</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopy(v.caption, undefined, v.label, "instagram", suggest.orderNumber)}
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          {tr("복사", "Copy")}
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">Instagram</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleCopy(suggest.instagram.caption, suggest.instagram.draftId, "Instagram", "instagram", suggest.orderNumber)
                    }
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    {tr("복사", "Copy")}
                  </Button>
                </CardHeader>
                <CardContent>
                  <Textarea readOnly value={suggest.instagram.caption} rows={10} className="text-sm" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">{tr("네이버 블로그", "Naver blog")}</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleCopy(
                        `${suggest.naver.title}\n\n${suggest.naver.content}`,
                        suggest.naver.draftId,
                        tr("네이버", "Naver"),
                        "naver",
                        suggest.orderNumber,
                      )
                    }
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    {tr("복사", "Copy")}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="font-medium text-sm">{suggest.naver.title}</p>
                  <Textarea readOnly value={suggest.naver.content} rows={9} className="text-sm" />
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="report" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{tr("Floxync가 번 돈", "Revenue attributed to Floxync")}</CardTitle>
              <CardDescription>{tr("UTM·campaign_code로 귀속된 주문 매출 합계", "Sum attributed via UTM / campaign_code")}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-emerald-700">{loading ? "…" : formatKrw(attributedTotal)}</p>
              <p className="text-sm text-muted-foreground mt-2">{tr(`${attributionCount}건의 귀속 기록`, `${attributionCount} records`)}</p>
              {snsStats && (
                <p className="text-sm text-muted-foreground mt-4">
                  {tr(
                    `SNS (30일): 캠페인 ${snsStats.snsCampaignCount ?? 0}건 · 귀속 ${formatKrw(snsStats.snsAttributedTotalKrw ?? 0)}`,
                    `SNS (30d): ${snsStats.snsCampaignCount ?? 0} campaigns · ${formatKrw(snsStats.snsAttributedTotalKrw ?? 0)} attributed`,
                  )}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <RevenueSettingsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
