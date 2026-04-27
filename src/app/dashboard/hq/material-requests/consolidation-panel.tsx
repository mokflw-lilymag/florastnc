"use client";

import { Fragment, useMemo, useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  buildMaterialRequestConsolidation,
  consolidationToCsv,
  consolidationToTsv,
  requestIdsInConsolidation,
  type ConsolidatedMaterialRow,
  type HqRequestInput,
} from "@/lib/hq-material-request-consolidation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Textarea from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronDown,
  ChevronRight,
  ClipboardCopy,
  Download,
  FileSpreadsheet,
  Loader2,
  Printer,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/getMessages";

type Props = {
  requests: HqRequestInput[];
  onReload: () => void | Promise<void>;
};

function openPrintableConsolidation(opts: {
  title: string;
  batchRef: string;
  generatedAt: string;
  hqNote: string;
  rows: ConsolidatedMaterialRow[];
  filterSummary: string;
  baseLocale: "ko" | "en";
}) {
  const { title, batchRef, generatedAt, hqNote, rows, filterSummary, baseLocale } = opts;
  const tr = (koText: string, enText: string) => (baseLocale === "ko" ? koText : enText);
  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) {
    toast.error(tr("팝업이 차단되었습니다. 브라우저에서 팝업을 허용해 주세요.", "Popup was blocked. Please allow popups in your browser."));
    return;
  }

  const rowsHtml = rows
    .map((r, i) => {
      const byBranch = new Map<string, number>();
      for (const b of r.breakdown) {
        byBranch.set(b.tenant_name, (byBranch.get(b.tenant_name) ?? 0) + b.quantity);
      }
      const branchCells = [...byBranch.entries()]
        .sort((a, b) => a[0].localeCompare(b[0], "ko"))
        .map(
          ([name, q]) =>
            `<tr><td colspan="2" style="padding:4px 8px;border:1px solid #ccc;font-size:12px;">${escapeHtml(
              name
            )}</td><td style="padding:4px 8px;border:1px solid #ccc;text-align:right;font-size:12px;">${q} ${escapeHtml(
              r.unit
            )}</td></tr>`
        )
        .join("");
      const spec = r.specs.length ? escapeHtml(r.specs.join("; ")) : "—";
      return `
        <tbody style="page-break-inside:avoid;">
          <tr style="background:#f5f5f5;">
            <td style="padding:8px;border:1px solid #ccc;width:40px;text-align:center;font-weight:600;">${i + 1}</td>
            <td style="padding:8px;border:1px solid #ccc;font-weight:600;">${escapeHtml(r.name)}</td>
            <td style="padding:8px;border:1px solid #ccc;">${escapeHtml(r.main_category)} / ${escapeHtml(r.mid_category)}</td>
            <td style="padding:8px;border:1px solid #ccc;text-align:right;white-space:nowrap;">${r.totalQuantity} ${escapeHtml(r.unit)}</td>
            <td style="padding:8px;border:1px solid #ccc;font-size:12px;">${spec}</td>
          </tr>
          <tr><td colspan="5" style="padding:0;border:1px solid #ccc;background:#fafafa;">
            <table style="width:100%;border-collapse:collapse;margin:0;">
              <tbody>${branchCells}</tbody>
            </table>
          </td></tr>
        </tbody>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title>
<style>
  body { font-family: system-ui, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif; padding: 24px; color: #111; }
  h1 { font-size: 20px; margin: 0 0 8px; }
  .meta { font-size: 13px; color: #444; margin-bottom: 16px; line-height: 1.5; }
  table.main { width: 100%; border-collapse: collapse; font-size: 14px; }
  table.main thead th { background: #222; color: #fff; padding: 10px 8px; border: 1px solid #222; text-align: left; }
  .note { margin: 16px 0; padding: 12px; background: #fffbeb; border: 1px solid #f59e0b; border-radius: 6px; font-size: 13px; }
  @media print { body { padding: 12px; } }
</style></head><body>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">
    <div><strong>${escapeHtml(tr("문서번호", "Ref No."))}</strong> ${escapeHtml(batchRef)}</div>
    <div><strong>${escapeHtml(tr("작성일시", "Generated At"))}</strong> ${escapeHtml(generatedAt)}</div>
    <div><strong>${escapeHtml(tr("취합 조건", "Filter"))}</strong> ${escapeHtml(filterSummary)}</div>
  </div>
  ${hqNote.trim() ? `<div class="note"><strong>${escapeHtml(tr("본사 메모", "HQ Note"))}</strong><br/>${escapeHtml(hqNote.trim()).replace(/\n/g, "<br/>")}</div>` : ""}
  <table class="main">
    <thead><tr>
      <th style="width:48px;">No</th>
      <th>${escapeHtml(tr("품목", "Item"))}</th>
      <th style="width:22%;">${escapeHtml(tr("분류", "Category"))}</th>
      <th style="width:100px;">${escapeHtml(tr("취합수량", "Quantity"))}</th>
      <th style="width:18%;">${escapeHtml(tr("비고", "Note"))}</th>
    </tr></thead>
    ${rowsHtml}
  </table>
  <p style="margin-top:20px;font-size:12px;color:#666;">${escapeHtml(tr("지점별 수량은 각 품목 아래 표에 표시됩니다. 발주·입고 후 지점 배분에 활용하세요.", "Per-branch quantities are shown below each item. Use for distribution after ordering/receiving."))}</p>
  <script>window.onload=function(){window.print();};</script>
</body></html>`;

  w.document.write(html);
  w.document.close();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function MaterialRequestsConsolidationPanel({ requests, onReload }: Props) {
  const [statusPending, setStatusPending] = useState(true);
  const [statusReviewing, setStatusReviewing] = useState(true);
  const [statusFulfilled, setStatusFulfilled] = useState(false);
  const [statusCancelled, setStatusCancelled] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [hqNote, setHqNote] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [patching, setPatching] = useState(false);
  const locale = usePreferredLocale();
  const baseLocale: "ko" | "en" = toBaseLocale(locale) === "ko" ? "ko" : "en";
  const tr = (koText: string, enText: string) => (baseLocale === "ko" ? koText : enText);
  const ribbonMsgs = getMessages(locale).dashboard.ribbon;

  const statuses = useMemo(() => {
    const s = new Set<string>();
    if (statusPending) s.add("pending");
    if (statusReviewing) s.add("reviewing");
    if (statusFulfilled) s.add("fulfilled");
    if (statusCancelled) s.add("cancelled");
    return s;
  }, [statusPending, statusReviewing, statusFulfilled, statusCancelled]);

  const df = dateFrom ? new Date(dateFrom + "T00:00:00") : null;
  const dt = dateTo ? new Date(dateTo + "T00:00:00") : null;

  const consolidated = useMemo(
    () =>
      buildMaterialRequestConsolidation(requests, {
        statuses,
        dateFrom: df,
        dateTo: dt,
      }),
    [requests, statuses, df, dt]
  );

  const includedRequestIds = useMemo(() => requestIdsInConsolidation(consolidated), [consolidated]);

  const stats = useMemo(() => {
    const branchTenants = new Set<string>();
    let lineCount = 0;
    for (const r of consolidated) {
      lineCount += r.breakdown.length;
      for (const b of r.breakdown) branchTenants.add(b.tenant_id);
    }
    return {
      skuCount: consolidated.length,
      lineCount,
      branchCount: branchTenants.size,
      requestCount: includedRequestIds.length,
    };
  }, [consolidated, includedRequestIds.length]);

  const batchRef = useMemo(
    () => `MR-${format(new Date(), "yyyyMMdd-HHmm")}-${String(includedRequestIds.length).padStart(2, "0")}`,
    [includedRequestIds.length]
  );

  const filterSummary = [
    `${ribbonMsgs.matReqFilterStatus} ${[...statuses].join(", ") || "—"}`,
    dateFrom ? `${ribbonMsgs.matReqFilterFrom} ${dateFrom}` : null,
    dateTo ? `${ribbonMsgs.matReqFilterTo} ${dateTo}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const pendingInScope = useMemo(() => {
    const idSet = new Set(includedRequestIds);
    return requests.filter((r) => idSet.has(r.id) && r.status === "pending").map((r) => r.id);
  }, [requests, includedRequestIds]);

  const reviewingInScope = useMemo(() => {
    const idSet = new Set(includedRequestIds);
    return requests.filter((r) => idSet.has(r.id) && r.status === "reviewing").map((r) => r.id);
  }, [requests, includedRequestIds]);

  const toggleRow = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const copyTsv = async () => {
    if (consolidated.length === 0) {
      toast.message(tr("취합할 품목이 없습니다. 상태·기간 필터를 확인하세요.", "No items to consolidate. Check status/date filters."));
      return;
    }
    try {
      await navigator.clipboard.writeText(consolidationToTsv(consolidated));
      toast.success(tr("표 형식이 클립보드에 복사되었습니다. Excel에 붙여넣기 하세요.", "Copied table to clipboard. Paste into Excel."));
    } catch {
      toast.error(tr("복사에 실패했습니다.", "Copy failed."));
    }
  };

  const downloadCsv = () => {
    if (consolidated.length === 0) {
      toast.message(tr("취합할 품목이 없습니다.", "No items to consolidate."));
      return;
    }
    const blob = new Blob([consolidationToCsv(consolidated)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${batchRef}-${tr("취합발주", "consolidated-order")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success(tr("CSV 파일을 내려받았습니다.", "Downloaded CSV file."));
  };

  const printDoc = () => {
    if (consolidated.length === 0) {
      toast.message(tr("인쇄할 품목이 없습니다.", "No items to print."));
      return;
    }
    openPrintableConsolidation({
      title: tr("지점 자재 요청 — 취합 발주안", "Branch Material Requests — Consolidated Draft"),
      batchRef,
      generatedAt: baseLocale === "ko" ? format(new Date(), "yyyy년 M월 d일 HH:mm", { locale: ko }) : format(new Date(), "yyyy-MM-dd HH:mm"),
      hqNote,
      rows: consolidated,
      filterSummary,
      baseLocale,
    });
  };

  const patchStatus = async (requestIds: string[], status: string, successMsg: string) => {
    if (requestIds.length === 0) {
      toast.message(tr("변경할 요청이 없습니다.", "No requests to update."));
      return;
    }
    setPatching(true);
    try {
      const res = await fetch("/api/branch/material-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ requestIds, status }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof j.error === "string" ? j.error : tr("상태 변경에 실패했습니다.", "Failed to change status."));
        return;
      }
      toast.success(successMsg);
      await onReload();
    } finally {
      setPatching(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-violet-200/80 dark:border-violet-900/50 bg-gradient-to-b from-violet-50/60 to-transparent dark:from-violet-950/20">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                {tr("취합 발주안", "Consolidated Draft")}
              </CardTitle>
              <CardDescription className="mt-1 max-w-2xl">
                {tr("지점별 요청 줄을 품목·단위 기준으로 합산합니다. 자재코드(material_id)가 같으면 한 줄로 묶이고, 수기 품목은 품명·분류·단위가 같을 때만 합칩니다. 아래 표를 그대로 발주서·내부 결재에 붙이거나 Excel로 넘기면 됩니다.", "Consolidates branch request lines by item/unit. Same material_id merges into one row; manual items merge only when name/category/unit match. Use table for ordering or Excel.")}
              </CardDescription>
            </div>
            <div className="rounded-lg border bg-background/80 px-3 py-2 text-xs font-mono text-muted-foreground shrink-0">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground/80">{tr("문서 참조번호", "Document Ref.")}</div>
              <div className="text-foreground font-semibold">{batchRef}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{tr("포함 상태", "Included Status")}</Label>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={statusPending} onCheckedChange={(v) => setStatusPending(v === true)} />
                  {tr("대기(pending)", "Pending")}
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={statusReviewing} onCheckedChange={(v) => setStatusReviewing(v === true)} />
                  {tr("검토중", "Reviewing")}
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={statusFulfilled} onCheckedChange={(v) => setStatusFulfilled(v === true)} />
                  {tr("처리완료", "Fulfilled")}
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={statusCancelled} onCheckedChange={(v) => setStatusCancelled(v === true)} />
                  {tr("취소", "Cancelled")}
                </label>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="space-y-1">
                <Label htmlFor="mr-df" className="text-xs text-muted-foreground">
                  {tr("요청일 시작", "Request Date From")}
                </Label>
                <Input id="mr-df" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 w-[150px]" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="mr-dt" className="text-xs text-muted-foreground">
                  {tr("요청일 끝", "Request Date To")}
                </Label>
                <Input id="mr-dt" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 w-[150px]" />
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border bg-card px-4 py-3">
              <div className="text-xs text-muted-foreground">{tr("취합 품목 수", "Consolidated Items")}</div>
              <div className="text-2xl font-semibold tabular-nums">{stats.skuCount}</div>
            </div>
            <div className="rounded-xl border bg-card px-4 py-3">
              <div className="text-xs text-muted-foreground">{tr("포함 지점 수", "Included Branches")}</div>
              <div className="text-2xl font-semibold tabular-nums">{stats.branchCount}</div>
            </div>
            <div className="rounded-xl border bg-card px-4 py-3">
              <div className="text-xs text-muted-foreground">{tr("원본 요청 건", "Original Requests")}</div>
              <div className="text-2xl font-semibold tabular-nums">{stats.requestCount}</div>
            </div>
            <div className="rounded-xl border bg-card px-4 py-3">
              <div className="text-xs text-muted-foreground">{tr("원본 품목 줄", "Original Item Lines")}</div>
              <div className="text-2xl font-semibold tabular-nums">{stats.lineCount}</div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hq-memo" className="text-xs text-muted-foreground">
              {ribbonMsgs.hqMemoFieldLabel}
            </Label>
            <Textarea
              id="hq-memo"
              value={hqNote}
              onChange={(e) => setHqNote(e.target.value)}
              placeholder={tr("예: 이번 주 발주 마감 4/25, ○○도매 우선 배송 요청", "e.g. Order deadline this week 4/25, prioritize OO wholesale delivery")}
              rows={2}
              className="resize-none text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="default" size="sm" className="gap-1.5" onClick={printDoc} disabled={consolidated.length === 0}>
              <Printer className="h-4 w-4" />
              {tr("인쇄 / PDF 저장", "Print / Save PDF")}
            </Button>
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={copyTsv}>
              <ClipboardCopy className="h-4 w-4" />
              {tr("Excel용 복사", "Copy for Excel")}
            </Button>
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={downloadCsv}>
              <Download className="h-4 w-4" />
              {tr("CSV 내려받기", "Download CSV")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-1.5"
              disabled={patching || pendingInScope.length === 0}
              onClick={() =>
                patchStatus(
                  pendingInScope,
                  "reviewing",
                  `${tr("대기", "Pending")} ${pendingInScope.length}${tr("건을 검토중으로 표시했습니다.", " set to reviewing.")}`
                )
              }
            >
              {patching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
              {tr("취합 범위 중 대기 → 검토중", "In scope: Pending → Reviewing")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={patching || reviewingInScope.length === 0}
              onClick={() =>
                patchStatus(
                  reviewingInScope,
                  "fulfilled",
                  `${tr("검토중", "Reviewing")} ${reviewingInScope.length}${tr("건을 처리완료로 표시했습니다.", " set to fulfilled.")}`
                )
              }
            >
              {tr("취합 범위 중 검토중 → 처리완료", "In scope: Reviewing → Fulfilled")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {tr("발주 전에는 「대기 → 검토중」으로 바꿔 두면 지점 화면에서도 진행 상태를 구분하기 쉽습니다. 입고·배분이 끝나면 「처리완료」로 마무리하세요.", "Before ordering, switch Pending to Reviewing for clearer branch status. After receiving/distributing, finish as Fulfilled.")}
          </p>
        </CardContent>
      </Card>

      {consolidated.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center border rounded-lg bg-muted/20">
          {tr("조건에 맞는 요청이 없습니다. 상태 필터에 \"대기\" 또는 \"검토중\"을 켜 보세요.", "No requests match conditions. Enable Pending or Reviewing filters.")}
        </p>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{tr("취합 품목 표", "Consolidated Item Table")}</CardTitle>
            <CardDescription>{tr("행을 펼치면 지점·요청별 수량을 확인할 수 있습니다.", "Expand rows to see per-branch/per-request quantities.")}</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead className="w-10">No</TableHead>
                  <TableHead>{tr("품목", "Item")}</TableHead>
                  <TableHead>{tr("분류", "Category")}</TableHead>
                  <TableHead className="text-right">{tr("취합", "Total")}</TableHead>
                  <TableHead>{tr("지점", "Branches")}</TableHead>
                  <TableHead className="hidden md:table-cell">{tr("비고", "Note")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consolidated.map((row, idx) => {
                  const open = expanded.has(row.key);
                  const byBranch = new Map<string, number>();
                  for (const b of row.breakdown) {
                    byBranch.set(b.tenant_name, (byBranch.get(b.tenant_name) ?? 0) + b.quantity);
                  }
                  return (
                    <Fragment key={row.key}>
                      <TableRow className={cn(open && "bg-muted/40")}>
                        <TableCell className="p-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => toggleRow(row.key)}
                            aria-expanded={open}
                          >
                            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                        <TableCell className="tabular-nums text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell>
                          <div className="font-medium">{row.name}</div>
                          {row.material_id ? (
                            <div className="text-[11px] text-muted-foreground font-mono mt-0.5">{tr("자재 ID", "Material ID")} · {row.material_id.slice(0, 8)}…</div>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-sm">
                          {row.main_category}
                          <span className="text-muted-foreground"> · </span>
                          {row.mid_category}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums whitespace-nowrap">
                          {row.totalQuantity} {row.unit}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-normal">
                            {row.branchCount}{tr("곳", " branches")}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[200px] truncate">
                          {row.specs.length ? row.specs.join("; ") : "—"}
                        </TableCell>
                      </TableRow>
                      {open ? (
                        <TableRow className="bg-muted/25 hover:bg-muted/25">
                          <TableCell colSpan={7} className="p-0 border-b">
                            <div className="px-4 py-3 text-sm space-y-2">
                              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{tr("지점별 수량", "Quantity by Branch")}</div>
                              <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                                {[...byBranch.entries()]
                                  .sort((a, b) => a[0].localeCompare(b[0], "ko"))
                                  .map(([name, q]) => (
                                    <li
                                      key={name}
                                      className="flex justify-between gap-2 rounded-md border bg-background px-2 py-1.5"
                                    >
                                      <span className="truncate">{name}</span>
                                      <span className="tabular-nums font-medium shrink-0">
                                        {q} {row.unit}
                                      </span>
                                    </li>
                                  ))}
                              </ul>
                              <div className="text-xs text-muted-foreground pt-1 border-t">
                                {tr("요청 줄 상세", "Request line details")} ·{" "}
                                {row.breakdown.map((b, i) => (
                                  <span key={b.line_id}>
                                    {i > 0 ? " · " : null}
                                    <Link
                                      href={`/dashboard/hq/branches/${b.tenant_id}`}
                                      className="text-primary underline underline-offset-2"
                                    >
                                      {b.tenant_name}
                                    </Link>{" "}
                                    {b.quantity}
                                    {row.unit}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
