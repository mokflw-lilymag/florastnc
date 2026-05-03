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
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/getMessages";
import { pickUiText } from "@/i18n/pick-ui-text";

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
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const tf = getMessages(locale).tenantFlows;
  const L = (ko: string, en: string, vi?: string) => pickUiText(baseLocale, ko, en, vi);
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
    const bl = toBaseLocale(locale);
    const flows = getMessages(locale).tenantFlows;
    setLoading(true);
    try {
      const res = await fetch("/api/hq/catalog", { credentials: "include" });
      const j = await res.json();
      if (!res.ok) {
        toast.error(
          j.error ??
            pickUiText(
              bl,
              "목록을 불러오지 못했습니다.",
              "Could not load the list.",
              "Không thể tải danh sách.",
            ),
        );
        return;
      }
      setItems(j.items ?? []);
      setWarning(j.warning ?? null);
    } catch {
      toast.error(flows.f01047);
    } finally {
      setLoading(false);
    }
  }, [locale]);

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
      toast.error(
        L("조직·상품명을 확인하세요.", "Check organization and product name.", "Kiểm tra tổ chức và tên sản phẩm."),
      );
      return;
    }
    if (!main || !mid) {
      toast.error(
        L(
          "대분류(1차)·중분류(2차 카테고리)를 모두 입력하세요.",
          "Enter both main and sub (2nd-level) categories.",
          "Nhập cả danh mục chính và phụ (cấp 2).",
        ),
      );
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
        toast.error(j.error ?? L("저장 실패", "Save failed.", "Lưu thất bại."));
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
        const errDetail =
          typeof sj?.error === "string" ? sj.error : L("오류", "Error", "Lỗi");
        toast.warning(
          L(
            `상품은 저장했으나 지점 동기화 실패: ${errDetail}`,
            `Saved the product, but branch sync failed: ${errDetail}`,
            `Đã lưu sản phẩm nhưng đồng bộ chi nhánh thất bại: ${errDetail}`,
          ),
        );
      } else {
        const st = sj?.syncTotals as
          | { inserted: number; updated: number; skipped: number }
          | undefined;
        if (st) {
          toast.success(
            L(
              `공유 상품 추가 · 전 지점: 신규 ${st.inserted} · 갱신 ${st.updated} · 건너뜀 ${st.skipped}`,
              `Shared product added · all branches: new ${st.inserted} · updated ${st.updated} · skipped ${st.skipped}`,
              `Đã thêm sản phẩm dùng chung · toàn chi nhánh: mới ${st.inserted} · cập nhật ${st.updated} · bỏ qua ${st.skipped}`,
            ),
          );
        } else {
          toast.success(
            L("공유 상품을 추가했습니다.", "Shared product added.", "Đã thêm sản phẩm dùng chung."),
          );
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
    XLSX.writeFile(
      wb,
      L(
        "floxync_공동상품_양식.xlsx",
        "floxync_shared_catalog_template.xlsx",
        "floxync_shared_catalog_template.xlsx",
      ),
    );
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
          L(
            "유효한 행이 없습니다. 상품명·대분류·중분류(2차)·가격 열을 확인하세요. (대분류/중분류는 필수)",
            "No valid rows. Check name, main/sub category, and price columns (main/sub required).",
            "Không có dòng hợp lệ. Kiểm tra tên, danh mục chính/phụ và cột giá (bắt buộc có chính/phụ).",
          ),
        );
        return;
      }
      if (dataRowCount > rows.length) {
        const skipped = dataRowCount - rows.length;
        toast.warning(
          L(
            `${skipped}행은 대분류·중분류(2차) 누락 등으로 제외했습니다.`,
            `${skipped} row(s) were skipped (missing main/sub category, etc.).`,
            `${skipped} dòng đã bị bỏ qua (thiếu danh mục chính/phụ, v.v.).`,
          ),
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
        toast.error(
          typeof j?.error === "string"
            ? j.error
            : L("일괄 등록에 실패했습니다.", "Bulk import failed.", "Nhập hàng loạt thất bại."),
        );
        return;
      }

      const st = j?.syncTotals as
        | { inserted: number; updated: number; skipped: number }
        | undefined;
      const written = typeof j?.catalogWritten === "number" ? j.catalogWritten : rows.length;
      if (j?.syncError) {
        toast.warning(
          L(
            `카탈로그 ${written}건 저장했으나 지점 동기화 오류: ${j.syncError}`,
            `Saved ${written} catalog row(s), but branch sync error: ${j.syncError}`,
            `Đã lưu ${written} dòng danh mục nhưng lỗi đồng bộ chi nhánh: ${j.syncError}`,
          ),
        );
      } else if (st) {
        toast.success(
          L(
            `카탈로그 ${written}건 반영 · 전 지점 동기화: 신규 ${st.inserted} · 갱신 ${st.updated} · 건너뜀 ${st.skipped}`,
            `Applied ${written} catalog row(s) · all branches: new ${st.inserted} · updated ${st.updated} · skipped ${st.skipped}`,
            `Đã áp dụng ${written} dòng danh mục · toàn chi nhánh: mới ${st.inserted} · cập nhật ${st.updated} · bỏ qua ${st.skipped}`,
          ),
        );
      } else {
        toast.success(
          L(
            `카탈로그 ${written}건을 저장했습니다.`,
            `Saved ${written} catalog row(s).`,
            `Đã lưu ${written} dòng danh mục.`,
          ),
        );
      }
      if (Array.isArray(j?.importErrors) && j.importErrors.length > 0) {
        toast.message(L("일부 행 오류", "Some rows had errors", "Một số dòng lỗi"), {
          description: String(j.importErrors[0]).slice(0, 200),
        });
      }
      await load();
    } catch {
      toast.error(
        L(
          "엑셀을 읽는 중 오류가 났습니다.",
          "Failed while reading the spreadsheet.",
          "Lỗi khi đọc tệp bảng tính.",
        ),
      );
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
            {L("브랜드 공유 상품", "Brand shared catalog", "Danh mục dùng chung thương hiệu")}
          </CardTitle>
          <CardDescription>
            {L(
              "엑셀 일괄 등록 시 카탈로그에 저장한 뒤 ",
              "When bulk-importing from Excel, rows are saved to the catalog and ",
              "Khi nhập hàng loạt từ Excel, dữ liệu được lưu vào danh mục và ",
            )}
            <strong className="text-foreground">
              {L("조직 소속 모든 지점 상품", "every branch catalog in the organization", "mọi danh mục chi nhánh trong tổ chức")}
            </strong>
            {L("에 자동 반영합니다. ", " are updated automatically. ", " được cập nhật tự động. ")}
            {L("지점 ", "If the branch ", "Nếu ")}
            <strong className="text-foreground">{L("코드", "product code", "mã sản phẩm")}</strong>
            {L(
              "가 같으면 가격·이름 등을 갱신하고, 없으면 신규로 넣습니다.",
              " matches, price and name are updated; otherwise a new row is created.",
              " trùng, giá và tên được cập nhật; nếu không sẽ tạo dòng mới.",
            )}{" "}
            {L(
              "코드가 비어 있으면 매번 새 행으로 들어가므로 동기화에는 코드 사용을 권장합니다.",
              "Empty codes create duplicate rows—using codes is recommended for sync.",
              "Mã trống dễ tạo dòng trùng—nên dùng mã khi đồng bộ.",
            )}{" "}
            <strong className="text-foreground">
              {L("대분류·중분류(2차)", "Main and sub (2nd-level) categories", "Danh mục chính và phụ (cấp 2)")}
            </strong>
            {L("는 개별 추가·엑셀 모두 필수입니다.", " are required for manual adds and Excel.", " là bắt buộc cho thêm thủ công và Excel.")}
          </CardDescription>
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-1 shrink-0" onClick={() => load()} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          {L("새로고침", "Refresh", "Làm mới")}
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
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {L("엑셀 일괄 등록 · 전 지점 동기화", "Excel bulk import · sync all branches", "Nhập Excel hàng loạt · đồng bộ mọi chi nhánh")}
            </p>
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
                {L("엑셀 업로드", "Upload Excel", "Tải lên Excel")}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={downloadExcelTemplate}>
                {L("양식 다운로드", "Download template", "Tải mẫu")}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {L(
                "첫 번째 시트, 1행 헤더 — ",
                "Use the first sheet with a header row — ",
                "Dùng sheet đầu, hàng tiêu đề — ",
              )}
              <strong className="text-foreground">
                {L("상품명·대분류·중분류(2차)·가격", "Name, main & sub category, price", "Tên, danh mục chính/phụ, giá")}
              </strong>
              {L(
                " 필수, 코드·상태 선택. 헤더 예: ",
                " required; code and status optional. Headers like ",
                " bắt buộc; mã và trạng thái tùy chọn. Ví dụ tiêu đề: ",
              )}
              <span className="font-mono">2차카테고리</span>·
              <span className="font-mono">중분류</span>
              {L(
                " 모두 인식합니다. CSV도 동일하면 업로드 가능합니다.",
                " are recognized. CSV works if columns match.",
                " đều được nhận. CSV được nếu cột khớp.",
              )}
            </p>

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
              {L("항목 개별 추가", "Add items one by one", "Thêm từng mục")}
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {orgNames.length > 1 ? (
                <label className="text-xs space-y-1 sm:col-span-2 xl:col-span-2">
                  <span className="text-muted-foreground">{L("조직", "Organization", "Tổ chức")}</span>
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
                <span className="text-muted-foreground">
                  {L("대분류 (1차) · 필수", "Main category · required", "Danh mục chính · bắt buộc")}
                </span>
                <Input
                  value={mainCategory}
                  onChange={(e) => setMainCategory(e.target.value)}
                  placeholder={L("예: 꽃다발", "e.g. Bouquet", "vd: Hoa bó")}
                />
              </label>
              <label className="text-xs space-y-1">
                <span className="text-muted-foreground">
                  {L("중분류 (2차) · 필수", "Sub category (2nd) · required", "Danh mục phụ (cấp 2) · bắt buộc")}
                </span>
                <Input
                  value={midCategory}
                  onChange={(e) => setMidCategory(e.target.value)}
                  placeholder={L("예: M", "e.g. M", "vd: M")}
                />
              </label>
              <label className="text-xs space-y-1">
                <span className="text-muted-foreground">{L("상품명", "Product name", "Tên sản phẩm")}</span>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={L("예: 꽃다발 M", "e.g. Bouquet M", "vd: Hoa bó M")}
                />
              </label>
              <label className="text-xs space-y-1">
                <span className="text-muted-foreground">{L("가격", "Price", "Giá")}</span>
                <Input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min={0} />
              </label>
              <label className="text-xs space-y-1">
                <span className="text-muted-foreground">{L("코드 (선택)", "Code (optional)", "Mã (tùy chọn)")}</span>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={L("중복 시 스킵", "Skip if duplicate", "Trùng thì bỏ qua")}
                />
              </label>
            </div>
            <Button type="button" size="sm" className="w-fit gap-1" onClick={addItem} disabled={saving}>
              <Plus className="h-3.5 w-3.5" />
              {L("추가", "Add", "Thêm")}
            </Button>
          </div>
        ) : null}

        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{tf.f01292}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {L("등록된 공유 상품이 없습니다.", "No shared catalog items yet.", "Chưa có mục danh mục dùng chung.")}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{L("상품명", "Name", "Tên")}</TableHead>
                <TableHead>{L("대분류", "Main", "Chính")}</TableHead>
                <TableHead>{L("중분류", "Sub", "Phụ")}</TableHead>
                <TableHead>{L("코드", "Code", "Mã")}</TableHead>
                <TableHead className="text-right">{L("가격", "Price", "Giá")}</TableHead>
                <TableHead>{L("상태", "Status", "Trạng thái")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="font-medium">{it.name}</TableCell>
                  <TableCell className="text-sm">{it.main_category ?? "—"}</TableCell>
                  <TableCell className="text-sm">{it.mid_category ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{it.code ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {Number(it.price).toLocaleString()}
                    {L("원", " KRW", " KRW")}
                  </TableCell>
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
