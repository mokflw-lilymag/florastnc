"use client";

import { useCallback, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useExpenses } from "@/hooks/use-expenses";
import { useSuppliers } from "@/hooks/use-suppliers";
import { useMaterials } from "@/hooks/use-materials";
import type { Expense } from "@/types/expense";
import { findExactDuplicateExpenses, findSimilarNamedItems } from "@/lib/expense-similarity";
import { DuplicateCheckDialog, type DuplicateNameCheck } from "@/components/expenses/duplicate-check-dialog";

type ExcelRow = {
  dateYmd: string;
  supplierName: string;
  category: string;
  subCategory: string;
  description: string;
  amount: number;
  paymentMethod: string;
  rowIndex: number;
};

type MaterialRef = { id: string; name: string };

const CATEGORY_LABEL_TO_KEY: Record<string, string> = {
  자재비: "materials",
  materials: "materials",
  운송비: "transportation",
  transportation: "transportation",
  임대료: "rent",
  rent: "rent",
  공과금: "utility",
  utility: "utility",
  인건비: "labor",
  labor: "labor",
  마케팅: "marketing",
  marketing: "marketing",
  기타: "etc",
  etc: "etc",
};

const PAYMENT_LABEL_TO_KEY: Record<string, string> = {
  카드: "card",
  card: "card",
  현금: "cash",
  cash: "cash",
  계좌: "transfer",
  이체: "transfer",
  transfer: "transfer",
};

function parseExcelDate(raw: unknown, rowIndex: number): string {
  let d: Date;
  if (typeof raw === "number") {
    const utcDaysSince1900 = raw - 25569;
    d = new Date(utcDaysSince1900 * 86400000);
  } else {
    d = new Date(String(raw));
  }
  if (Number.isNaN(d.getTime())) {
    throw new Error(`행 ${rowIndex}: 유효하지 않은 날짜 (${String(raw)})`);
  }
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (d > today) {
    throw new Error(`행 ${rowIndex}: 미래 날짜는 등록할 수 없습니다.`);
  }
  return format(d, "yyyy-MM-dd");
}

type Props = {
  expenses: Expense[];
};

/** tenant 기준 지출(expenses) 엑셀 일괄 등록 — 4키 중복 제외 + 거래처·품목 유사도 */
export function ExpenseExcelImportCard({ expenses }: Props) {
  const { tenantId } = useAuth();
  const { addExpenses } = useExpenses();
  const { suppliers, addSupplier } = useSuppliers();
  const { addMaterial } = useMaterials();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ExcelRow[]>([]);
  const [skippedDuplicates, setSkippedDuplicates] = useState(0);
  const [uploading, setUploading] = useState(false);

  const [dupDialogOpen, setDupDialogOpen] = useState(false);
  const [dupInfo, setDupInfo] = useState<DuplicateNameCheck | null>(null);
  const nameResolveRef = useRef<{
    resolve: (name: string) => void;
    reject: () => void;
  } | null>(null);

  const promptSimilarName = useCallback(
    (type: "supplier" | "material", inputName: string, similarItems: { id: string; name: string }[]) =>
      new Promise<string>((resolve, reject) => {
        nameResolveRef.current = {
          resolve,
          reject: () => reject(new Error("cancelled")),
        };
        setDupInfo({ type, inputName, similarItems });
        setDupDialogOpen(true);
      }),
    [],
  );

  const resolveSupplierName = useCallback(
    async (name: string): Promise<string> => {
      const trimmed = name.trim();
      if (trimmed.length < 2) return trimmed;

      const exact = suppliers.find((s) => s.name.trim() === trimmed);
      if (exact) return exact.name;

      const similar = findSimilarNamedItems(
        trimmed,
        suppliers.filter((s) => s.id && s.name).map((s) => ({ id: s.id!, name: s.name })),
      );
      if (similar.length === 0) return trimmed;

      return promptSimilarName("supplier", trimmed, similar);
    },
    [suppliers, promptSimilarName],
  );

  const resolveMaterialName = useCallback(
    async (name: string, allMaterials: MaterialRef[]): Promise<string> => {
      const trimmed = name.trim();
      if (trimmed.length < 2) return trimmed;

      const exact = allMaterials.find((m) => m.name.trim() === trimmed);
      if (exact) return exact.name;

      const similar = findSimilarNamedItems(trimmed, allMaterials);
      if (similar.length === 0) return trimmed;

      return promptSimilarName("material", trimmed, similar);
    },
    [promptSimilarName],
  );

  const fetchAllMaterials = useCallback(async (): Promise<MaterialRef[]> => {
    if (!tenantId) return [];
    const supabase = createClient();
    const { data, error } = await supabase
      .from("materials")
      .select("id, name")
      .eq("tenant_id", tenantId);
    if (error) {
      console.warn("[ExpenseExcelImport] materials fetch failed", error);
      return [];
    }
    return (data || []).filter((m): m is MaterialRef => !!m.id && !!m.name);
  }, [tenantId]);

  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1 });

      if (jsonData.length < 2) {
        toast.error("엑셀 파일에 데이터가 없습니다.");
        return;
      }

      const headers = (jsonData[0] as string[]).map((h) => String(h || "").trim());
      const required = ["날짜", "거래처", "분류", "품목명", "금액"];
      const missing = required.filter((h) => !headers.includes(h));
      if (missing.length > 0) {
        toast.error(`필수 헤더 누락: ${missing.join(", ")}`);
        return;
      }

      const parsed: ExcelRow[] = [];
      for (let i = 1; i < jsonData.length; i += 1) {
        const row = jsonData[i];
        if (!row || !row.some((c) => c !== null && c !== undefined && c !== "")) continue;

        const rowData: Record<string, unknown> = {};
        headers.forEach((header, colIndex) => {
          rowData[header] = row[colIndex] ?? "";
        });

        const rowIndex = i + 1;
        if (!rowData["날짜"] || !rowData["거래처"] || !rowData["분류"] || !rowData["품목명"]) {
          throw new Error(`행 ${rowIndex}: 필수 데이터가 누락되었습니다.`);
        }

        const categoryLabel = String(rowData["분류"]).trim();
        const category = CATEGORY_LABEL_TO_KEY[categoryLabel] || categoryLabel;
        if (!Object.values(CATEGORY_LABEL_TO_KEY).includes(category)) {
          throw new Error(`행 ${rowIndex}: 알 수 없는 분류 "${categoryLabel}"`);
        }

        const payLabel = String(rowData["결제수단"] || "카드").trim();
        const paymentMethod = PAYMENT_LABEL_TO_KEY[payLabel] || "card";

        parsed.push({
          dateYmd: parseExcelDate(rowData["날짜"], rowIndex),
          supplierName: String(rowData["거래처"]).trim(),
          category,
          subCategory: String(rowData["세부분류"] || "").trim(),
          description: String(rowData["품목명"]).trim(),
          amount: Math.trunc(Number(rowData["금액"]) || 0),
          paymentMethod,
          rowIndex,
        });
      }

      let dupSkip = 0;
      const unique: ExcelRow[] = [];
      for (const row of parsed) {
        const sup = suppliers.find((s) => s.name.trim() === row.supplierName);
        if (!sup?.id) {
          unique.push(row);
          continue;
        }
        const hits = findExactDuplicateExpenses(expenses, {
          expenseDateYmd: row.dateYmd,
          supplierId: sup.id,
          headerDescription: row.description,
          headerAmount: row.amount,
          lineItems: [],
        });
        if (hits.length > 0) {
          dupSkip += 1;
        } else {
          unique.push(row);
        }
      }

      setRows(unique);
      setSkippedDuplicates(dupSkip);
      toast.success(
        dupSkip > 0
          ? `${unique.length}건 로드 (중복 ${dupSkip}건 제외)`
          : `${unique.length}건 로드되었습니다.`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "엑셀 처리 중 오류");
    }
  };

  const downloadTemplate = () => {
    const sample = [
      ["날짜", "거래처", "분류", "세부분류", "품목명", "금액", "결제수단"],
      ["2026-06-01", "OO꽃 도매", "자재비", "생화", "장미 50송이", 85000, "카드"],
      ["2026-06-01", "건물관리", "임대료", "관리비", "6월 관리비", 120000, "이체"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "지출");
    XLSX.writeFile(wb, "지출_일괄등록_템플릿.xlsx");
  };

  const handleBulkRegister = async () => {
    if (rows.length === 0) return;
    setUploading(true);
    try {
      const supplierIdCache = new Map<string, string>();
      const materialIdCache = new Map<string, string>();
      let allMaterials = await fetchAllMaterials();
      const payloads: Omit<Expense, "id" | "tenant_id" | "created_at">[] = [];
      let linkedMaterials = 0;

      for (const row of rows) {
        let supplierId = supplierIdCache.get(row.supplierName);
        if (!supplierId) {
          const resolvedName = await resolveSupplierName(row.supplierName);
          const existing = suppliers.find((s) => s.name.trim() === resolvedName.trim());
          if (existing?.id) {
            supplierId = existing.id;
          } else {
            const created = await addSupplier({ name: resolvedName });
            supplierId = created?.id;
          }
          if (!supplierId) {
            throw new Error(`거래처 "${resolvedName}" 등록 실패 (행 ${row.rowIndex})`);
          }
          supplierIdCache.set(row.supplierName, supplierId);
        }

        let materialId: string | undefined;
        if (row.category === "materials" && row.description.trim().length >= 2) {
          const cacheKey = row.description.trim();
          materialId = materialIdCache.get(cacheKey);
          if (!materialId) {
            const resolvedMatName = await resolveMaterialName(cacheKey, allMaterials);
            const existingMat = allMaterials.find((m) => m.name.trim() === resolvedMatName.trim());
            if (existingMat) {
              materialId = existingMat.id;
            } else {
              const createdMat = await addMaterial({
                name: resolvedMatName,
                main_category: row.subCategory || "기타",
                mid_category: row.subCategory || undefined,
                unit: "ea",
                price: row.amount,
                stock: 0,
                current_stock: 0,
                supplier_id: supplierId,
              });
              materialId = createdMat?.id;
              if (createdMat?.id) {
                allMaterials = [...allMaterials, { id: createdMat.id, name: createdMat.name }];
              }
            }
            if (materialId) {
              materialIdCache.set(cacheKey, materialId);
              linkedMaterials += 1;
            }
          } else {
            linkedMaterials += 1;
          }
        }

        payloads.push({
          category: row.category,
          sub_category: row.subCategory || undefined,
          amount: row.amount,
          description: row.description,
          expense_date: new Date(`${row.dateYmd}T12:00:00`).toISOString(),
          payment_method: row.paymentMethod,
          supplier_id: supplierId,
          material_id: materialId,
        });
      }

      const inserted = await addExpenses(payloads);
      if (inserted) {
        if (linkedMaterials > 0) {
          toast.info(`자재 ${linkedMaterials}건이 연결·등록되었습니다.`);
        }
        setRows([]);
        setSkippedDuplicates(0);
      }
    } catch (e) {
      if (!(e instanceof Error && e.message === "cancelled")) {
        toast.error(e instanceof Error ? e.message : "일괄 등록 실패");
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Card className="border-emerald-100 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            엑셀 일괄 등록
          </CardTitle>
          <CardDescription>
            4키 중복 자동 제외 · 거래처·품목(자재비) 유사도 확인 · 자재 자동 연결
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
              템플릿 다운로드
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="h-3.5 w-3.5 mr-1" />
              엑셀 선택
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => void handleExcelUpload(e)}
            />
          </div>
          {rows.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{rows.length}건 대기</Badge>
              {skippedDuplicates > 0 && (
                <Badge variant="outline" className="text-amber-700">
                  중복 {skippedDuplicates}건 제외됨
                </Badge>
              )}
              <Button type="button" size="sm" disabled={uploading} onClick={() => void handleBulkRegister()}>
                {uploading ? "등록 중…" : "일괄 등록"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <DuplicateCheckDialog
        open={dupDialogOpen}
        onOpenChange={setDupDialogOpen}
        duplicates={dupInfo}
        onConfirm={(name) => {
          setDupDialogOpen(false);
          nameResolveRef.current?.resolve(name);
          nameResolveRef.current = null;
        }}
        onCancel={() => {
          setDupDialogOpen(false);
          nameResolveRef.current?.reject();
          nameResolveRef.current = null;
          setUploading(false);
        }}
      />
    </>
  );
}
