"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Mail,
  Send,
  Loader2,
  Save,
  FlaskConical,
  History,
  FileText,
  Settings,
  Users,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { AccessDenied } from "@/components/access-denied";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import Textarea from "@/components/ui/textarea";
import { EmailTemplateEditor } from "@/components/email-template-editor";
import { EMAIL_TEMPLATE_CATEGORIES, type BetaApplicationRow, type EmailSendLogRow, type PlatformEmailTemplate } from "@/lib/admin/email-hub/types";
import { categoryLabelKo } from "@/lib/admin/email-hub/default-templates";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

const BETA_STATUS_OPTIONS = [
  { value: "pending", label: "신청" },
  { value: "shortlisted", label: "후보" },
  { value: "selected", label: "선정" },
  { value: "contracted", label: "계약완료" },
  { value: "shipped", label: "출고" },
  { value: "rejected", label: "미선정" },
];

export function EmailHubClient() {
  const { isSuperAdmin, isLoading } = useAuth();

  const [smtp, setSmtp] = useState({
    smtpEnabled: true,
    smtpHost: "smtp.gmail.com",
    smtpPort: "587",
    smtpUser: "",
    smtpPass: "",
    smtpSenderName: "FloXync",
  });
  const [smtpLoading, setSmtpLoading] = useState(true);
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [testEmail, setTestEmail] = useState("");

  const [templates, setTemplates] = useState<PlatformEmailTemplate[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [templateSaving, setTemplateSaving] = useState(false);

  const [sendSlug, setSendSlug] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualName, setManualName] = useState("");
  const [extraVars, setExtraVars] = useState("");
  const [sendSubject, setSendSubject] = useState("");
  const [sendBody, setSendBody] = useState("");
  const [tenantQuery, setTenantQuery] = useState("");
  const [tenantResults, setTenantResults] = useState<
    { id: string; name: string; email: string; contact_name: string | null }[]
  >([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [tenantSearching, setTenantSearching] = useState(false);
  const [sending, setSending] = useState(false);

  const [betaApps, setBetaApps] = useState<BetaApplicationRow[]>([]);
  const [betaSelected, setBetaSelected] = useState<Record<string, boolean>>({});

  const [schemaWarning, setSchemaWarning] = useState<string | null>(null);
  const [logs, setLogs] = useState<EmailSendLogRow[]>([]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.slug === selectedSlug) ?? null,
    [templates, selectedSlug],
  );

  const sendTemplate = useMemo(
    () => templates.find((t) => t.slug === sendSlug) ?? null,
    [templates, sendSlug],
  );

  useEffect(() => {
    if (sendTemplate) {
      setSendSubject(sendTemplate.subject);
      setSendBody(sendTemplate.body_html);
    } else {
      setSendSubject("");
      setSendBody("");
    }
  }, [sendTemplate]);

  const loadSmtp = useCallback(async () => {
    setSmtpLoading(true);
    try {
      const res = await fetch("/api/admin/system-settings/hq");
      const data = await res.json();
      if (data.data) {
        const d = data.data;
        setSmtp({
          smtpEnabled: d.smtpEnabled ?? true,
          smtpHost: d.smtpHost ?? "smtp.gmail.com",
          smtpPort: String(d.smtpPort ?? "587"),
          smtpUser: d.smtpUser ?? "",
          smtpPass: d.smtpPass ?? "",
          smtpSenderName: d.smtpSenderName ?? "FloXync",
        });
      }
    } catch {
      toast.error("SMTP 설정을 불러오지 못했습니다.");
    } finally {
      setSmtpLoading(false);
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    const res = await fetch("/api/admin/email-hub/templates");
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "템플릿 로드 실패");
      return;
    }
    setTemplates(data.templates ?? []);
    if (data.warning) {
      setSchemaWarning(String(data.warning));
      toast.warning("이메일 허브 DB 테이블이 없습니다. Supabase에서 SQL을 실행해 주세요.", { duration: 8000 });
    } else {
      setSchemaWarning(null);
    }
  }, []);

  useEffect(() => {
    if (templates.length > 0) {
      if (!selectedSlug) {
        setSelectedSlug(templates[0].slug);
        setEditSubject(templates[0].subject);
        setEditBody(templates[0].body_html);
      }
      if (!sendSlug) {
        const sendableTemplates = templates.filter(
          (t) => t.category === "contract" || t.category === "marketing" || t.category === "hardware"
        );
        if (sendableTemplates.length > 0) {
          setSendSlug(sendableTemplates[0].slug);
        }
      }
    }
  }, [templates, selectedSlug, sendSlug]);

  const loadBeta = useCallback(async () => {
    const res = await fetch("/api/admin/email-hub/beta-applications?limit=200");
    const data = await res.json();
    if (res.ok) setBetaApps(data.applications ?? []);
  }, []);

  const loadLogs = useCallback(async () => {
    const res = await fetch("/api/admin/email-hub/send-log?limit=80");
    const data = await res.json();
    if (res.ok) {
      setLogs(data.logs ?? []);
      if (data.warning) setSchemaWarning(String(data.warning));
    }
  }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      void loadSmtp();
      void loadTemplates();
      void loadBeta();
      void loadLogs();
    }
  }, [isSuperAdmin, loadSmtp, loadTemplates, loadBeta, loadLogs]);

  useEffect(() => {
    if (selectedTemplate) {
      setEditSubject(selectedTemplate.subject);
      setEditBody(selectedTemplate.body_html);
    }
  }, [selectedTemplate]);

  const saveSmtp = async () => {
    setSmtpSaving(true);
    try {
      const resGet = await fetch("/api/admin/system-settings/hq");
      const existing = await resGet.json();
      const merged = { ...(existing.data || {}), ...smtp, smtpPort: Number(smtp.smtpPort) || 587 };
      const res = await fetch("/api/admin/system-settings/hq", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: merged }),
      });
      if (!res.ok) throw new Error("저장 실패");
      toast.success("SMTP 설정이 저장되었습니다.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "저장 오류");
    } finally {
      setSmtpSaving(false);
    }
  };

  const testSmtp = async () => {
    if (!testEmail.trim()) {
      toast.error("테스트 수신 이메일을 입력하세요.");
      return;
    }
    const res = await fetch("/api/admin/email-hub/test-smtp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: testEmail.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "테스트 실패");
      return;
    }
    toast.success(data.simulated ? "SMTP 미설정 — 시뮬레이션" : "테스트 메일을 발송했습니다.");
  };

  const saveTemplate = async () => {
    if (!selectedSlug) return;
    setTemplateSaving(true);
    try {
      const res = await fetch(`/api/admin/email-hub/templates/${encodeURIComponent(selectedSlug)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: editSubject, body_html: editBody }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장 실패");
      toast.success("템플릿이 저장되었습니다.");
      await loadTemplates();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "저장 오류");
    } finally {
      setTemplateSaving(false);
    }
  };

  const parseExtraVars = (): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const line of extraVars.split("\n")) {
      const idx = line.indexOf("=");
      if (idx > 0) {
        out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
      }
    }
    return out;
  };

  const searchTenants = async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 1) {
      setTenantResults([]);
      return;
    }
    setTenantSearching(true);
    try {
      const res = await fetch(`/api/admin/email-hub/tenant-search?q=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (res.ok) setTenantResults(data.tenants ?? []);
    } catch {
      toast.error("매장 검색 실패");
    } finally {
      setTenantSearching(false);
    }
  };

  const pickTenant = (t: { id: string; name: string; email: string; contact_name: string | null }) => {
    setSelectedTenantId(t.id);
    setTenantQuery(t.name);
    setTenantResults([]);
    if (t.email) setManualEmail(t.email);
    if (t.contact_name) setManualName(t.contact_name);
    const lines = extraVars.split("\n").filter((l) => !l.trim().startsWith("상호="));
    setExtraVars([`상호=${t.name}`, ...lines].join("\n"));
  };

  const sendEmails = async (
    recipients: {
      email: string;
      name?: string;
      variables?: Record<string, string>;
      tenantId?: string;
    }[],
  ) => {
    if (!sendSlug) {
      toast.error("템플릿을 선택하세요.");
      return;
    }
    if (recipients.length === 0) {
      toast.error("수신자가 없습니다.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/admin/email-hub/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateSlug: sendSlug,
          subjectOverride: sendSubject || undefined,
          bodyOverride: sendBody || undefined,
          recipients,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "발송 실패");
      const s = data.summary;
      toast.success(`발송 완료 — 성공 ${s.sent}, 시뮬 ${s.simulated}, 실패 ${s.failed}`);
      await loadLogs();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "발송 오류");
    } finally {
      setSending(false);
    }
  };

  const updateBetaStatus = async (id: string, selection_status: string) => {
    const res = await fetch("/api/admin/email-hub/beta-applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, selection_status }),
    });
    if (res.ok) {
      await loadBeta();
    }
  };

  if (isLoading || smtpLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return <AccessDenied requiredTier="System Admin" />;
  }

  const templatesByCategory = EMAIL_TEMPLATE_CATEGORIES.map((cat) => ({
    ...cat,
    items: templates.filter((t) => t.category === cat.id),
  }));

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-6xl">
      <PageHeader
        title="이메일 · SMTP 허브"
        description="운영 메일 템플릿, SMTP, 베타 신청자·개별/일괄 발송을 한곳에서 관리합니다."
        icon={Mail}
      />

      {schemaWarning && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex gap-2 items-start">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
          <div>
            <p className="font-semibold">DB 설정 필요</p>
            <p className="mt-1 text-amber-800">
              템플릿·발송 이력 테이블이 아직 없습니다. Supabase SQL Editor에서{" "}
              <code className="text-xs bg-amber-100 px-1 rounded">supabase/platform_email_hub_schema.sql</code>{" "}
              파일 내용을 실행한 뒤 페이지를 새로고침하세요. (지금은 기본 템플릿 미리보기만 가능합니다.)
            </p>
          </div>
        </div>
      )}

      <Tabs defaultValue="smtp" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-slate-100 p-1 rounded-xl mb-6">
          <TabsTrigger value="smtp" className="gap-1.5 rounded-lg">
            <Settings className="w-4 h-4" /> SMTP
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5 rounded-lg">
            <FileText className="w-4 h-4" /> 템플릿
          </TabsTrigger>
          <TabsTrigger value="send" className="gap-1.5 rounded-lg">
            <Send className="w-4 h-4" /> 발송
          </TabsTrigger>
          <TabsTrigger value="beta" className="gap-1.5 rounded-lg">
            <FlaskConical className="w-4 h-4" /> 베타 신청
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 rounded-lg">
            <History className="w-4 h-4" /> 발송 이력
          </TabsTrigger>
        </TabsList>

        <TabsContent value="smtp">
          <Card>
            <CardHeader>
              <CardTitle>본사 SMTP (전역)</CardTitle>
              <CardDescription>
                슈퍼관리자·베타 안내·계약·출고 메일 발송에 사용됩니다. 매장별 SMTP는 각 매장 환경 설정에서 별도 관리합니다.
                <Link href="/dashboard/system-settings" className="text-emerald-700 underline ml-1">
                  플랫폼 전역 설정 (사이트명·수수료)
                </Link>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>SMTP 활성화</Label>
                <Switch
                  checked={smtp.smtpEnabled}
                  onCheckedChange={(v) => setSmtp((s) => ({ ...s, smtpEnabled: v }))}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>호스트</Label>
                  <Input value={smtp.smtpHost} onChange={(e) => setSmtp((s) => ({ ...s, smtpHost: e.target.value }))} />
                </div>
                <div>
                  <Label>포트</Label>
                  <Input value={smtp.smtpPort} onChange={(e) => setSmtp((s) => ({ ...s, smtpPort: e.target.value }))} />
                </div>
                <div>
                  <Label>발신 이메일</Label>
                  <Input type="email" value={smtp.smtpUser} onChange={(e) => setSmtp((s) => ({ ...s, smtpUser: e.target.value }))} />
                </div>
                <div>
                  <Label>앱 비밀번호</Label>
                  <Input type="password" value={smtp.smtpPass} onChange={(e) => setSmtp((s) => ({ ...s, smtpPass: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <Label>발신인 표시 이름</Label>
                  <Input value={smtp.smtpSenderName} onChange={(e) => setSmtp((s) => ({ ...s, smtpSenderName: e.target.value }))} />
                </div>
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button onClick={saveSmtp} disabled={smtpSaving} className="gap-2">
                  {smtpSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  SMTP 저장
                </Button>
                <div className="flex gap-2 flex-1 min-w-[200px]">
                  <Input
                    placeholder="테스트 수신 이메일"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                  />
                  <Button type="button" variant="outline" onClick={testSmtp}>
                    테스트 발송
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid lg:grid-cols-[280px_1fr] gap-4">
            <Card className="h-fit">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">카테고리</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[70vh] overflow-y-auto">
                {templatesByCategory.map((cat) =>
                  cat.items.length === 0 ? null : (
                    <div key={cat.id}>
                      <p className="text-[10px] font-black uppercase text-slate-500 mb-1">{cat.labelKo}</p>
                      <ul className="space-y-1">
                        {cat.items.map((t) => (
                          <li key={t.slug}>
                            <button
                              type="button"
                              onClick={() => setSelectedSlug(t.slug)}
                              className={`w-full text-left text-xs px-2 py-1.5 rounded-lg border transition-colors ${
                                selectedSlug === t.slug
                                  ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold"
                                  : "border-transparent hover:bg-slate-50"
                              }`}
                            >
                              {t.name_ko}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ),
                )}
              </CardContent>
            </Card>

            {selectedTemplate ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-lg">{selectedTemplate.name_ko}</CardTitle>
                        <CardDescription>
                          {categoryLabelKo(selectedTemplate.category)} · <code className="text-xs">{selectedTemplate.slug}</code>
                        </CardDescription>
                      </div>
                      <Button size="sm" onClick={saveTemplate} disabled={templateSaving} className="gap-1">
                        {templateSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        저장
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>제목</Label>
                      <Input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} />
                    </div>
                    <EmailTemplateEditor
                      templateName={selectedTemplate.name_ko}
                      value={editBody}
                      onChange={setEditBody}
                      variables={selectedTemplate.variables}
                      sampleData={{ 상호: "○○플라워", 이름: "홍길동" }}
                    />
                  </CardContent>
                </Card>
              </div>
            ) : (
              <p className="text-sm text-slate-500 p-8">왼쪽에서 템플릿을 선택하세요.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="send" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" /> 매장 검색 · 개별 발송
              </CardTitle>
              <CardDescription>
                상호로 매장을 찾아 수신 정보를 채운 뒤, 템플릿을 고르고 제목·본문을 수정해 발송합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>매장 검색 (상호)</Label>
                <div className="flex gap-2">
                  <Input
                    value={tenantQuery}
                    onChange={(e) => {
                      setTenantQuery(e.target.value);
                      setSelectedTenantId(null);
                    }}
                    placeholder="○○플라워"
                    onKeyDown={(e) => e.key === "Enter" && void searchTenants(tenantQuery)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={tenantSearching}
                    onClick={() => void searchTenants(tenantQuery)}
                  >
                    {tenantSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "검색"}
                  </Button>
                </div>
                {tenantResults.length > 0 && (
                  <ul className="mt-2 border rounded-lg divide-y max-h-40 overflow-y-auto">
                    {tenantResults.map((t) => (
                      <li key={t.id}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-emerald-50"
                          onClick={() => pickTenant(t)}
                        >
                          <span className="font-medium">{t.name}</span>
                          <span className="text-slate-500 ml-2">{t.email || "이메일 없음"}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <Label>템플릿</Label>
                <Select value={sendSlug} onValueChange={(v) => v && setSendSlug(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="템플릿 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.slug} value={t.slug}>
                        [{categoryLabelKo(t.category)}] {t.name_ko}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>수신 이메일 *</Label>
                  <Input value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} placeholder="owner@flower.com" />
                </div>
                <div>
                  <Label>수신자 이름</Label>
                  <Input value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="홍길동" />
                </div>
              </div>
              <div>
                <Label>제목 (수정 가능)</Label>
                <Input value={sendSubject} onChange={(e) => setSendSubject(e.target.value)} />
              </div>
              <div>
                <Label>본문 HTML (수정 가능)</Label>
                <Textarea value={sendBody} onChange={(e) => setSendBody(e.target.value)} rows={8} className="font-mono text-xs" />
              </div>
              <div>
                <Label>추가 변수 (한 줄에 키=값)</Label>
                <Textarea
                  value={extraVars}
                  onChange={(e) => setExtraVars(e.target.value)}
                  placeholder={"상호=○○플라워\n기종명=세우 TP-300\n운송장번호=1234567890"}
                  rows={4}
                />
              </div>
              {sendTemplate && (
                <p className="text-xs text-slate-500">
                  사용 변수: {sendTemplate.variables.map((v) => `{${v}}`).join(", ")}
                </p>
              )}
              <Button
                disabled={sending}
                className="gap-2"
                onClick={() =>
                  void sendEmails([
                    {
                      email: manualEmail.trim(),
                      name: manualName.trim() || undefined,
                      tenantId: selectedTenantId ?? undefined,
                      variables: {
                        이름: manualName.trim() || "사장님",
                        ...parseExtraVars(),
                      },
                    },
                  ])
                }
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                발송하기
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="beta" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="w-5 h-5" /> 베타 신청 · 일괄 발송
              </CardTitle>
              <CardDescription>
                랜딩 베타 신청 목록입니다. 선정 후 「베타 테스터 — 포스프린터 무상 임대 계약 안내」 템플릿으로 일괄 발송하세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[200px]">
                  <Label>발송 템플릿</Label>
                  <Select value={sendSlug} onValueChange={(v) => v && setSendSlug(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="템플릿 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates
                        .filter((t) => t.category === "contract" || t.category === "marketing" || t.category === "hardware")
                        .map((t) => (
                          <SelectItem key={t.slug} value={t.slug}>
                            {t.name_ko}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="secondary"
                  disabled={sending}
                  onClick={() => {
                    const recipients = betaApps
                      .filter((a) => betaSelected[a.id])
                      .map((a) => ({
                        email: a.email,
                        name: a.full_name,
                        variables: {
                          이름: a.full_name,
                          상호: a.business_name,
                          연락처: a.contact,
                          이메일: a.email,
                        },
                      }));
                    void sendEmails(recipients);
                  }}
                >
                  선택 {Object.values(betaSelected).filter(Boolean).length}명 발송
                </Button>
              </div>

              <div className="overflow-x-auto border rounded-xl">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left">
                    <tr>
                      <th className="p-2 w-8" />
                      <th className="p-2">신청일</th>
                      <th className="p-2">이름·상호</th>
                      <th className="p-2">이메일</th>
                      <th className="p-2">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {betaApps.map((a) => (
                      <tr key={a.id} className="border-t">
                        <td className="p-2">
                          <Checkbox
                            checked={!!betaSelected[a.id]}
                            onCheckedChange={(c) =>
                              setBetaSelected((prev) => ({ ...prev, [a.id]: !!c }))
                            }
                          />
                        </td>
                        <td className="p-2 text-xs text-slate-500 whitespace-nowrap">
                          {new Date(a.created_at).toLocaleDateString("ko-KR")}
                        </td>
                        <td className="p-2">
                          <div className="font-medium">{a.full_name}</div>
                          <div className="text-xs text-slate-500">{a.business_name}</div>
                        </td>
                        <td className="p-2 text-xs">{a.email}</td>
                        <td className="p-2">
                          <Select
                            value={a.selection_status || "pending"}
                            onValueChange={(v) => v && void updateBetaStatus(a.id, v)}
                          >
                            <SelectTrigger className="h-8 text-xs w-[110px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {BETA_STATUS_OPTIONS.map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {betaApps.length === 0 && (
                  <p className="p-8 text-center text-slate-400 text-sm">베타 신청이 없습니다.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>발송 이력</CardTitle>
              <Button size="sm" variant="outline" onClick={() => void loadLogs()}>
                새로고침
              </Button>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {logs.map((log) => (
                  <li key={log.id} className="flex items-start gap-2 p-2 rounded-lg border border-slate-100">
                    {log.status === "sent" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : log.status === "failed" ? (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    ) : (
                      <Mail className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="font-medium truncate">{log.recipient_email}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {log.status}
                        </Badge>
                        {log.template_slug && (
                          <code className="text-[10px] text-slate-400">{log.template_slug}</code>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{log.subject}</p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(log.created_at).toLocaleString("ko-KR")}
                        {log.error_message ? ` · ${log.error_message}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
                {logs.length === 0 && <p className="text-slate-400 text-sm py-8 text-center">발송 이력이 없습니다.</p>}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
