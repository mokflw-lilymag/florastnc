"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  ChevronDown,
  Headphones,
  Loader2,
  Lock,
  Plus,
  Search,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Textarea from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { dateFnsLocaleForBase } from "@/lib/date-fns-locale";
import {
  SUPPORT_TICKET_CATEGORIES,
  supportCategoryLabel,
} from "@/lib/support-tickets/categories";
import {
  REMOTE_SETTINGS_CATEGORY_ID,
  isValidRemoteAssistCode,
} from "@/lib/support-tickets/remote-settings";
import {
  categoryNeedsConsent,
  defaultTitleForCategory,
  bodyPlaceholderForCategory,
} from "@/lib/support-tickets/category-templates";
import type { SupportTicketListItem } from "@/lib/support-tickets/types";
import { fileToDataUrl } from "@/lib/support-tickets/compress-image";
import { SupportStatusBadge } from "./components/support-status-badge";
import { SupportSelfCheckPanel } from "./components/support-self-check-panel";

type FaqRow = {
  id: string;
  category: string;
  question: string;
  answer: string;
  category_icon?: string;
};

export default function SupportPage() {
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const dfLoc = dateFnsLocaleForBase(baseLocale);

  const [tickets, setTickets] = useState<SupportTicketListItem[]>([]);
  const [faqs, setFaqs] = useState<FaqRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("__all__");
  const [mineOnly, setMineOnly] = useState(false);
  const [faqCategory, setFaqCategory] = useState<string>("__all__");
  const [faqOpen, setFaqOpen] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<string>(SUPPORT_TICKET_CATEGORIES[0].id);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [remoteAssistCode, setRemoteAssistCode] = useState("");
  const [remoteConsent, setRemoteConsent] = useState(false);

  const needsConsent = categoryNeedsConsent(category);
  const isSubscriptionHelp = category === "subscription-help";

  useEffect(() => {
    const defaultTitle = defaultTitleForCategory(category);
    const placeholder = bodyPlaceholderForCategory(category);
    if (defaultTitle) setTitle((prev) => prev || defaultTitle);
    if (placeholder) setBody((prev) => prev || placeholder);
  }, [category]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ uiLocale: locale });
      if (mineOnly) params.set("mine", "1");
      if (categoryFilter !== "__all__") params.set("category", categoryFilter);
      if (search.trim()) params.set("q", search.trim());

      const [ticketRes, faqRes] = await Promise.all([
        fetch(`/api/support/tickets?${params}`, { credentials: "include" }),
        fetch(`/api/support/faq?uiLocale=${encodeURIComponent(locale)}`, {
          credentials: "include",
        }),
      ]);
      const ticketJson = await ticketRes.json().catch(() => ({}));
      const faqJson = await faqRes.json().catch(() => ({}));
      if (ticketRes.ok) setTickets((ticketJson.tickets as SupportTicketListItem[]) ?? []);
      if (faqRes.ok) setFaqs((faqJson.faqs as FaqRow[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, [locale, mineOnly, categoryFilter, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredFaqs = useMemo(() => {
    if (faqCategory === "__all__") return faqs;
    return faqs.filter((f) => f.category === faqCategory);
  }, [faqs, faqCategory]);

  const relatedFaqs = useMemo(
    () => faqs.filter((f) => f.category === category).slice(0, 3),
    [faqs, category],
  );

  const handleAttach = async (files: FileList | null) => {
    if (!files?.length) return;
    const next = [...attachments];
    for (const file of Array.from(files).slice(0, 3 - next.length)) {
      try {
        const dataUrl = await fileToDataUrl(file);
        next.push(dataUrl);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "이미지 첨부 실패");
      }
    }
    setAttachments(next.slice(0, 3));
  };

  const submitTicket = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("제목과 내용을 입력해 주세요.");
      return;
    }
    if (needsConsent) {
      if (!remoteConsent) {
        toast.error("동의에 체크해 주세요.");
        return;
      }
      if (!isValidRemoteAssistCode(remoteAssistCode)) {
        toast.error("확인용 비밀번호는 4~6자리 숫자로 입력해 주세요.");
        return;
      }
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          uiLocale: locale,
          title: title.trim(),
          body: body.trim(),
          category,
          bodyLocale: baseLocale,
          attachments: needsConsent ? [] : attachments,
          remoteAssistCode: needsConsent ? remoteAssistCode : undefined,
          remoteAssistConsent: needsConsent ? remoteConsent : undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error((json.error as string) || "문의 등록에 실패했습니다.");
        return;
      }
      toast.success("문의가 접수되었습니다.");
      setModalOpen(false);
      setTitle("");
      setBody("");
      setAttachments([]);
      setRemoteAssistCode("");
      setRemoteConsent(false);
      void load();
      if (json.id) {
        window.location.href = `/dashboard/support/${json.id}`;
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="고객센터"
        description="1:1 문의와 자주 묻는 질문을 확인하세요."
        icon={Headphones}
      >
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          문의하기
        </Button>
      </PageHeader>

      <SupportSelfCheckPanel />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="제목 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void load()}
              />
            </div>
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "__all__")}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="카테고리">
                  {categoryFilter === "__all__" ? "전체 카테고리" : (
                    <span className="flex items-center gap-1.5">
                      {SUPPORT_TICKET_CATEGORIES.find(c => c.id === categoryFilter)?.icon}
                      <span>{supportCategoryLabel(categoryFilter, baseLocale)}</span>
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">전체 카테고리</SelectItem>
                {SUPPORT_TICKET_CATEGORIES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.icon} {supportCategoryLabel(c.id, baseLocale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={mineOnly ? "default" : "outline"}
              onClick={() => setMineOnly((v) => !v)}
            >
              내 문의만
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : tickets.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-12">등록된 문의가 없습니다.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {tickets.map((t) => (
                <li key={t.id}>
                  <Link
                    href={t.can_open ? `/dashboard/support/${t.id}` : "#"}
                    onClick={(e) => {
                      if (!t.can_open) {
                        e.preventDefault();
                        toast.info("비밀글입니다. 작성자와 관리자만 열람할 수 있습니다.");
                      }
                    }}
                    className="flex items-center gap-3 py-3 px-1 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    <Lock className="h-4 w-4 text-slate-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono text-slate-400">{t.ticket_no}</span>
                        <span className="text-[10px] text-slate-500">
                          {supportCategoryLabel(t.category, baseLocale)}
                        </span>
                        {t.is_mine && (
                          <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 rounded">
                            내 글
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-slate-800 truncate">{t.title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {format(new Date(t.created_at), "yyyy.MM.dd HH:mm", { locale: dfLoc })}
                      </p>
                    </div>
                    <SupportStatusBadge status={t.status} locale={baseLocale} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">자주 묻는 질문</CardTitle>
          <div className="flex flex-wrap gap-2 mt-2">
            <Button
              size="sm"
              variant={faqCategory === "__all__" ? "default" : "outline"}
              onClick={() => setFaqCategory("__all__")}
            >
              전체
            </Button>
            {SUPPORT_TICKET_CATEGORIES.map((c) => (
              <Button
                key={c.id}
                size="sm"
                variant={faqCategory === c.id ? "default" : "outline"}
                onClick={() => setFaqCategory(c.id)}
              >
                {c.icon} {supportCategoryLabel(c.id, baseLocale)}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredFaqs.length === 0 ? (
            <p className="text-sm text-slate-500 py-4">FAQ가 아직 없습니다.</p>
          ) : (
            filteredFaqs.map((f) => (
              <div key={f.id} className="border border-slate-100 rounded-lg overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50"
                  onClick={() => setFaqOpen(faqOpen === f.id ? null : f.id)}
                >
                  <span className="text-sm font-medium text-slate-800">
                    {f.category_icon ? `${f.category_icon} ` : ""}
                    {f.question}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 transition-transform ${
                      faqOpen === f.id ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {faqOpen === f.id && (
                  <div className="px-4 pb-4 text-sm text-slate-600 whitespace-pre-wrap border-t border-slate-50 pt-3">
                    {f.answer}
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>1:1 문의하기</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>카테고리</Label>
              <Select
                value={category}
                onValueChange={(v) => {
                  if (!v) return;
                  setCategory(v);
                  if (!categoryNeedsConsent(v)) {
                    setRemoteAssistCode("");
                    setRemoteConsent(false);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue>
                    <span className="flex items-center gap-1.5">
                      {SUPPORT_TICKET_CATEGORIES.find(c => c.id === category)?.icon}
                      <span>{supportCategoryLabel(category, baseLocale)}</span>
                    </span>
                  </SelectValue>
                </SelectTrigger>

                <SelectContent>
                  {SUPPORT_TICKET_CATEGORIES.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.icon} {supportCategoryLabel(c.id, baseLocale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {needsConsent && (
              <div className="rounded-lg border border-indigo-200 bg-indigo-50/80 p-4 space-y-3 text-sm">
                <p className="font-semibold text-indigo-950">
                  {category === REMOTE_SETTINGS_CATEGORY_ID
                    ? "환경설정 대리 안내"
                    : "로그인·비밀번호 대리 지원 안내"}
                </p>
                <p className="text-indigo-900/90 text-xs leading-relaxed">
                  {category === REMOTE_SETTINGS_CATEGORY_ID
                    ? "관리자가 이 문의를 통해 매장 환경설정을 대신 해드립니다."
                    : "관리자가 계정 확인·임시 비밀번호 발급을 도와드립니다."}{" "}
                  아래 동의 후 <strong>4~6자리 확인용 숫자</strong>를 정해 주세요.
                </p>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remoteConsent}
                    onChange={(e) => setRemoteConsent(e.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-xs text-indigo-950">
                    {category === REMOTE_SETTINGS_CATEGORY_ID
                      ? "Floxync 관리자가 제 매장 환경설정을 대신 해주는 것에 동의합니다."
                      : "Floxync 관리자가 로그인·비밀번호 지원을 해주는 것에 동의합니다."}
                  </span>
                </label>
                <div>
                  <Label htmlFor="remoteAssistCode">확인용 비밀번호 (4~6자리 숫자)</Label>
                  <Input
                    id="remoteAssistCode"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="예: 4829"
                    value={remoteAssistCode}
                    onChange={(e) => setRemoteAssistCode(e.target.value.replace(/\D/g, ""))}
                    className="mt-1 max-w-[160px] font-mono tracking-widest"
                  />
                </div>
              </div>
            )}
            {isSubscriptionHelp && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900">
                결제 영수증·카드사 문자 캡처를 첨부해 주시면 더 빠르게 처리됩니다.
              </div>
            )}
            {relatedFaqs.length > 0 && !needsConsent && (
              <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 text-xs text-amber-900">
                <p className="font-bold mb-1">비슷한 FAQ</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {relatedFaqs.map((f) => (
                    <li key={f.id}>{f.question}</li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <Label>제목</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
            </div>
            <div>
              <Label>{needsConsent ? "도움 받고 싶은 내용" : "내용"}</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} />
            </div>
            {!needsConsent && (
            <div>
              <Label>스크린샷 (최대 3장)</Label>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => void handleAttach(e.target.files)}
              />
              {attachments.length > 0 && (
                <p className="text-xs text-slate-500 mt-1">{attachments.length}장 첨부됨</p>
              )}
            </div>
            )}
            <p className="text-xs text-slate-500">
              🔒 제목만 공개되며, 본문은 작성자와 관리자만 볼 수 있습니다.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              취소
            </Button>
            <Button onClick={() => void submitTicket()} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "접수"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
