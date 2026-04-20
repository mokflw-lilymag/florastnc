/**
 * 엑셀 첫 행 헤더 → 공동상품 일괄등록 행 (클라이언트·서버 공통)
 */

export type CatalogImportRow = {
  name: string;
  price: number;
  code: string | null;
  main_category: string | null;
  mid_category: string | null;
  status: string;
};

function normKey(k: string): string {
  return k.replace(/\s/g, "").toLowerCase();
}

/** 헤더 후보에 해당하는 셀 값 (첫 매칭 컬럼) */
function cell(row: Record<string, unknown>, headerCandidates: string[]): string {
  const map = new Map<string, string>();
  for (const k of Object.keys(row)) {
    map.set(normKey(k), k);
  }
  for (const h of headerCandidates) {
    const col = map.get(normKey(h));
    if (col !== undefined) {
      const v = row[col];
      if (v === null || v === undefined) return "";
      return String(v).trim();
    }
  }
  return "";
}

export function parsePriceCell(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = String(v ?? "")
    .replace(/[,원\s₩]/g, "")
    .trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/** 시트 행에 상품명이 있는지(빈 행 제외용) */
export function peekSheetRowName(row: Record<string, unknown>): string {
  return cell(row, ["상품명", "품명", "name", "상품", "product", "productname"]);
}

/** sheet_to_json 한 행에서 카탈로그 행 추출 (헤더 없는 빈 행은 스킵). 대분류·중분류(2차) 필수. */
export function mapExcelRowToImport(row: Record<string, unknown>): CatalogImportRow | null {
  const name = peekSheetRowName(row);
  if (!name) return null;

  let p = parsePriceCell(cell(row, ["가격", "단가", "price", "금액", "판매가", "amount"]));
  if (p === 0) {
    for (const k of Object.keys(row)) {
      if (/가격|단가|price|금액|amount|판매/i.test(k)) {
        p = parsePriceCell(row[k]);
        if (p !== 0) break;
      }
    }
  }

  const codeRaw = cell(row, ["코드", "상품코드", "code", "sku", "바코드"]);
  const code = codeRaw ? codeRaw : null;

  const mainCat = cell(row, [
    "대분류(1차)",
    "대분류",
    "1차카테고리",
    "1차",
    "main_category",
    "메인분류",
    "대카테고리",
  ]);
  const midCat = cell(row, [
    "중분류(2차)",
    "중분류",
    "2차카테고리",
    "2차",
    "mid_category",
    "중카테고리",
    "소분류",
  ]);
  if (!mainCat || !midCat) return null;

  const status = cell(row, ["상태", "status", "판매상태"]) || "active";

  return {
    name,
    price: p,
    code,
    main_category: mainCat,
    mid_category: midCat,
    status: status || "active",
  };
}

export function parseExcelJsonToImportRows(rows: Record<string, unknown>[]): CatalogImportRow[] {
  const out: CatalogImportRow[] = [];
  for (const row of rows) {
    const m = mapExcelRowToImport(row);
    if (m) out.push(m);
  }
  return out;
}

/** API bulk-import 본문 한 행 정규화 (대분류·중분류 필수) */
export function normalizeImportRowFromApi(r: Record<string, unknown>): CatalogImportRow | null {
  const name = String(r.name ?? "").trim();
  if (!name) return null;
  const main_category =
    r.main_category != null && String(r.main_category).trim()
      ? String(r.main_category).trim()
      : null;
  const mid_category =
    r.mid_category != null && String(r.mid_category).trim()
      ? String(r.mid_category).trim()
      : null;
  if (!main_category || !mid_category) return null;

  const codeRaw = r.code != null ? String(r.code).trim() : "";
  return {
    name,
    price: parsePriceCell(r.price),
    code: codeRaw ? codeRaw : null,
    main_category,
    mid_category,
    status: String(r.status ?? "active").trim() || "active",
  };
}
