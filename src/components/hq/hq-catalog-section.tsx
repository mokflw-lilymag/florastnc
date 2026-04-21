"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import * as XLSX from "xlsx";
import { FileSpreadsheet, Package, Plus, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { parseExcelJsonToImportRows, peekSheetRowName } from "@/lib/hq/catalog-excel-map";

type Org = { id: string; name: string };

type CatalogItem = {
  id: string;
  organization_id: string;
  name: string;
  main_category: string | null;
  mid_category: string | null;
  price: number;
  code: string | null;
  status: string;
  created_at: string;
};

export function HqCatalogSection({
  orgNames,
  canManage,
}: {
  orgNames: Org[];
  canManage: boolean;
}) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgId, setOrgId] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("0");
  const [code, setCode] = useState("");
  const [mainCategory, setMainCategory] = useState("");
  const [midCategory, setMidCategory] = useState("");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hq/catalog", { credentials: "include" });
      const j = await res.json();
      if (!res.ok) {
        toast.error(j.error ?? "목록을 불러오지 못했습니다.");
        return;
      }
      setItems(j.items ?? []);
      setWarning(j.warning ?? null);
    } catch {
      toast.error("네트워크 오류");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (orgNames.length > 0 && !orgId) {
      setOrgId(orgNames[0].id);
    }
  }, [orgNames, orgId]);

  const addItem = async () => {
    const n = name.trim();
    const main = mainCategory.trim();
    const mid = midCategory.trim();
    if (!orgId || !n) {
      toast.error("조직·상품명을 확인하세요.");
      return;
    }
    if (!main || !mid) {
      toast.error("대분류(1차)·중분류(2차 카테고리)를 모두 입력하세요.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/hq/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          organizationId: orgId,
          name: n,
          price: Number(price) || 0,
          code: code.trim() || null,
          main_category: main,
          mid_category: mid,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        toast.error(j.error ?? "저장 실패");
        return;
      }
      const syncRes = await fetch("/api/hq/catalog/sync-branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ organizationId: orgId }),
      });
      const sj = await syncRes.json().catch(() => ({}));
      if (!syncRes.ok) {
        toast.warning(
          `상품은 저장했으나 지점 동기화 실패: ${typeof sj?.error === "string" ? sj.error : "오류"}`
        );
      } else {
        const st = sj?.syncTotals as
          | { inserted: number; updated: number; skipped: number }
          | undefined;
        if (st) {
          toast.success(
            `공유 상품 추가 · 전 지점: 신규 ${st.inserted} · 갱신 ${st.updated} · 건너뜀 ${st.skipped}`
          );
        } else {
          toast.success("공유 상품을 추가했습니다.");
        }
      }
      setName("");
      setPrice("0");
      setCode("");
      setMainCategory("");
      setMidCategory("");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const downloadExcelTemplate = () => {
    const wb = XLSX.utils.book_new();
    const data = [
      ["상품명", "가격", "코드", "대분류(1차)", "중분류(2차)", "상태"],
      ["샘플 꽃다발 M", 45000, "FL-M-001", "꽃다발", "M", "active"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "공동상품");
    XLSX.writeFile(wb, "floxync_공동상품_양식.xlsx");
  };

  const onExcelSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !orgId) return;

    setImporting(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const rows = parseExcelJsonToImportRows(json);
      const dataRowCount = json.filter((r) => peekSheetRowName(r).length > 0).length;
      if (rows.length === 0) {
        toast.error(
          "유효한 행이 없습니다. 상품명·대분류·중분류(2차)·가격 열을 확인하세요. (대분류/중분류는 필수)"
        );
        return;
      }
      if (dataRowCount > rows.length) {
        toast.warning(
          `${dataRowCount - rows.length}행은 대분류·중분류(2차) 누락 등으로 제외했습니다.`
        );
      }

      const res = await fetch("/api/hq/catalog/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          organizationId: orgId,
          items: rows,
          syncToBranches: true,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof j?.error === "string" ? j.error : "일괄 등록에 실패했습니다.");
        return;
      }

      const st = j?.syncTotals as
        | { inserted: number; updated: number; skipped: number }
        | undefined;
      const written = typeof j?.catalogWritten === "number" ? j.catalogWritten : rows.length;
      if (j?.syncError) {
        toast.warning(
          `카탈로그 ${written}건 저장했으나 지점 동기화 오류: ${j.syncError}`
        );
      } else if (st) {
        toast.success(
          `카탈로그 ${written}건 반영 · 전 지점 동기화: 신규 ${st.inserted} · 갱신 ${st.updated} · 건너뜀 ${st.skipped}`
        );
      } else {
        toast.success(`카탈로그 ${written}건을 저장했습니다.`);
      }
      if (Array.isArray(j?.importErrors) && j.importErrors.length > 0) {
        toast.message("일부 행 오류", {
          description: String(j.importErrors[0]).slice(0, 200),
        });
      }
      await load();
    } catch {
      toast.error("엑셀을 읽는 중 오류가 났습니다.");
    } finally {
      setImporting(false);
    }
  };

  if (orgNames.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            브랜드 공유 상품
          </CardTitle>
          <CardDescription>
            엑셀 일괄 등록 시 카탈로그에 저장한 뒤 <strong className="text-foreground">조직 소속 모든 지점 상품</strong>에
            자동 반영합니다. 지점 <strong className="text-foreground">코드</strong>가 같으면 가격·이름 등을 갱신하고, 없으면
            신규로 넣습니다.             코드가 비어 있으면 매번 새 행으로 들어가므로 동기화에는 코드 사용을 권장합니다.{" "}
            <strong className="text-foreground">대분류·중분류(2차)</strong>는 개별 추가·엑셀 모두 필수입니다.
          </CardDescription>
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-1 shrink-0" onClick={() => load()} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          새로고침
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {warning ? (
          <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 rounded-lg px-3 py-2">
            {warning}
          </p>
        ) : null}

        {canManage ? (
          <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/30">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">엑셀 일괄 등록 · 전 지점 동기화</p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="sr-only"
                onChange={onExcelSelected}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-1.5"
                disabled={importing || !orgId}
                onClick={() => fileRef.current?.click()}
              >
                {importing ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                )}
                엑셀 업로드
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={downloadExcelTemplate}>
                양식 다운로드
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              첫 번째 시트, 1행 헤더 — <strong className="text-foreground">상품명·대분류·중분류(2차)·가격</strong> 필수,
              코드·상태 선택. 헤더 예: <span className="font-mono">2차카테고리</span>·
              <span className="font-mono">중분류</span> 모두 인식합니다. CSV도 동일하면 업로드 가능합니다.
            </p>

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
              항목 개별 추가
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {orgNames.length > 1 ? (
                <label className="text-xs space-y-1 sm:col-span-2 xl:col-span-2">
                  <span className="text-muted-foreground">조직</span>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={orgId}
                    onChange={(e) => setOrgId(e.target.value)}
                  >
                    {orgNames.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="text-xs space-y-1">
                <span className="text-muted-foreground">대분류 (1차) · 필수</span>
                <Input
                  value={mainCategory}
                  onChange={(e) => setMainCategory(e.target.value)}
                  placeholder="예: 꽃다발"
                />
              </label>
              <label className="text-xs space-y-1">
                <span className="text-muted-foreground">중분류 (2차) · 필수</span>
                <Input
                  value={midCategory}
                  onChange={(e) => setMidCategory(e.target.value)}
                  placeholder="예: M"
                />
              </label>
              <label className="text-xs space-y-1">
                <span className="text-muted-foreground">상품명</span>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 꽃다발 M" />
              </label>
              <label className="text-xs space-y-1">
                <span className="text-muted-foreground">가격</span>
                <Input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min={0} />
              </label>
              <label className="text-xs space-y-1">
                <span className="text-muted-foreground">코드 (선택)</span>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="중복 시 스킵" />
              </label>
            </div>
            <Button type="button" size="sm" className="w-fit gap-1" onClick={addItem} disabled={saving}>
              <Plus className="h-3.5 w-3.5" />
              추가
            </Button>
          </div>
        ) : null}

        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">불러오는 중…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">등록된 공유 상품이 없습니다.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>상품명</TableHead>
                <TableHead>대분류</TableHead>
                <TableHead>중분류</TableHead>
                <TableHead>코드</TableHead>
                <TableHead className="text-right">가격</TableHead>
                <TableHead>상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="font-medium">{it.name}</TableCell>
                  <TableCell className="text-sm">{it.main_category ?? "—"}</TableCell>
                  <TableCell className="text-sm">{it.mid_category ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{it.code ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{Number(it.price).toLocaleString()}원</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{it.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
