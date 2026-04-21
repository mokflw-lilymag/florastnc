/**
 * Google Sheets → tenant master seed (TS)
 * 우선순위: data/tenant-master-seed-source/*.csv (전체 시트 내보내기) > *.md (미리보기 스냅샷)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "data", "tenant-master-seed-source");
const OUT = path.join(ROOT, "src", "lib", "tenant-master-seed", "seeds", "v2026-04-22-eastpole.generated.ts");

/** @returns {{ kind: "csv"|"md", text: string, label: string }} */
function readSource(base) {
  const csvPath = path.join(SRC, `${base}.csv`);
  const mdPath = path.join(SRC, `${base}.md`);
  if (fs.existsSync(csvPath)) {
    return { kind: "csv", text: fs.readFileSync(csvPath, "utf8"), label: `${base}.csv` };
  }
  if (fs.existsSync(mdPath)) {
    return { kind: "md", text: fs.readFileSync(mdPath, "utf8"), label: `${base}.md` };
  }
  throw new Error(`missing_source: ${base}.csv 또는 ${base}.md (${SRC})`);
}

/** RFC4180 수준 CSV (따옴표·쉼표·줄바꿈) */
function parseCsv(text) {
  let t = text;
  if (t.charCodeAt(0) === 0xfeff) t = t.slice(1);
  const rows = [];
  let row = [];
  let field = "";
  let i = 0;
  let inQuotes = false;
  const pushRow = () => {
    row.push(field);
    field = "";
    if (row.some((x) => String(x).trim() !== "")) rows.push(row);
    row = [];
  };
  while (i < t.length) {
    const c = t[i];
    if (inQuotes) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\r") {
      i++;
      if (t[i] === "\n") i++;
      pushRow();
      continue;
    }
    if (c === "\n") {
      i++;
      pushRow();
      continue;
    }
    field += c;
    i++;
  }
  if (field.length || row.length) pushRow();
  return rows;
}

function headerIdx(headerRow, ...names) {
  const h = headerRow.map((x) => String(x).replace(/^\uFEFF/, "").trim());
  for (const n of names) {
    const i = h.indexOf(n);
    if (i >= 0) return i;
  }
  return -1;
}

function parseProductsCsv(rows) {
  const catPairs = [];
  const out = [];
  if (rows.length < 2) return { rows: out, categories: buildCategoryData(catPairs) };
  const h = rows[0];
  const ic = headerIdx(h, "상품코드");
  const iname = headerIdx(h, "상품명");
  const imain = headerIdx(h, "대분류");
  const imid = headerIdx(h, "중분류");
  const iprice = headerIdx(h, "가격");
  const istock = headerIdx(h, "재고");
  const istatus = headerIdx(h, "상태");
  if (ic < 0 || iname < 0) {
    throw new Error("products.csv: '상품코드'·'상품명' 열을 찾을 수 없습니다. 시트 1행 헤더를 확인하세요.");
  }
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const code = String(row[ic] ?? "").trim();
    const name = String(row[iname] ?? "").trim();
    if (!code || !name) continue;
    const mainCat = imain >= 0 ? String(row[imain] ?? "").trim() : "";
    const midCat = imid >= 0 ? String(row[imid] ?? "").trim() : "";
    const priceStr = iprice >= 0 ? row[iprice] : "";
    const stockStr = istock >= 0 ? row[istock] : "";
    const statusKo = istatus >= 0 ? String(row[istatus] ?? "").trim() : "";
    catPairs.push([mainCat, midCat]);
    let status = "active";
    if (statusKo.includes("품절")) status = "sold_out";
    else if (statusKo.includes("비활성") || statusKo.includes("단종")) status = "inactive";
    out.push({
      name,
      main_category: mainCat,
      mid_category: midCat,
      code,
      price: parseMoney(priceStr),
      stock: parseMoney(stockStr),
      status,
    });
  }
  return { rows: out, categories: buildCategoryData(catPairs) };
}

function parseMaterialsCsv(rows) {
  const catPairs = [];
  const out = [];
  if (rows.length < 2) return { rows: out, categories: buildCategoryData(catPairs) };
  const h = rows[0];
  const iid = headerIdx(h, "자재ID");
  const iname = headerIdx(h, "자재명");
  const imain = headerIdx(h, "대분류");
  const imid = headerIdx(h, "중분류");
  const iunit = headerIdx(h, "단위");
  if (iid < 0 || iname < 0) {
    throw new Error("materials.csv: '자재ID'·'자재명' 열을 찾을 수 없습니다. 시트 1행 헤더를 확인하세요.");
  }
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const id = String(row[iid] ?? "").trim();
    const name = String(row[iname] ?? "").trim();
    if (!id || !name) continue;
    const mainCat = imain >= 0 ? String(row[imain] ?? "").trim() : "";
    const midCat = imid >= 0 ? String(row[imid] ?? "").trim() : "";
    let unit = iunit >= 0 ? String(row[iunit] ?? "").trim() : "";
    if (!unit) unit = "개";
    /** 시트의 지점·단가·재고·색상 등은 시드에 넣지 않고, 내부 추적용 ID만 둡니다. */
    catPairs.push([mainCat, midCat]);
    out.push({
      name,
      main_category: mainCat,
      mid_category: midCat,
      unit,
      spec: `ID ${id}`,
    });
  }
  return { rows: out, categories: buildCategoryData(catPairs) };
}

function parsePartnersCsv(rows) {
  const out = [];
  const seen = new Set();
  const stats = {
    csvBodyRows: 0,
    skippedEmptyName: 0,
    skippedDuplicateName: 0,
  };
  if (rows.length < 2) return { rows: out, stats };
  const h = rows[0];
  const iname = headerIdx(h, "거래처명");
  const itype = headerIdx(h, "유형");
  const icon = headerIdx(h, "연락처");
  const idetail = headerIdx(h, "담당자");
  const iemail = headerIdx(h, "이메일");
  const iaddr = headerIdx(h, "주소");
  const imemoCol = headerIdx(h, "메모");
  const ireg = headerIdx(h, "등록일");
  if (iname < 0) {
    throw new Error("partners.csv: '거래처명' 열을 찾을 수 없습니다. 시트 1행 헤더를 확인하세요.");
  }
  for (let r = 1; r < rows.length; r++) {
    stats.csvBodyRows += 1;
    const row = rows[r];
    const name = String(row[iname] ?? "").trim();
    if (!name) {
      stats.skippedEmptyName += 1;
      continue;
    }
    const key = name.toLowerCase();
    if (seen.has(key)) {
      stats.skippedDuplicateName += 1;
      continue;
    }
    seen.add(key);
    const typ = itype >= 0 ? String(row[itype] ?? "").trim() : "";
    const parts = [];
    if (icon >= 0) parts.push(String(row[icon] ?? "").trim());
    if (idetail >= 0) parts.push(String(row[idetail] ?? "").trim());
    if (iemail >= 0) parts.push(String(row[iemail] ?? "").trim());
    if (iaddr >= 0) parts.push(String(row[iaddr] ?? "").trim());
    if (imemoCol >= 0) parts.push(String(row[imemoCol] ?? "").trim());
    if (ireg >= 0) parts.push(String(row[ireg] ?? "").trim());
    const memo = parts.filter(Boolean).join(" | ").slice(0, 480);
    out.push({
      name,
      supplier_type: typ || undefined,
      memo: memo || undefined,
    });
  }
  return { rows: out, stats };
}

function splitRow(line) {
  const t = line.trim();
  if (!t.startsWith("|")) return null;
  const inner = t.slice(1, t.endsWith("|") ? -1 : undefined);
  return inner.split("|").map((s) => s.trim());
}

function isSepRow(parts) {
  return parts?.length && parts[0].includes("---");
}

/** 스프레드시트 내보내기의 열 문자 행(| A | B | C |) 제외 */
function isColumnLetterRow(parts) {
  const a = parts[1]?.trim?.() ?? "";
  const b = parts[2]?.trim?.() ?? "";
  return /^[A-Z]$/.test(a) && /^[A-Z]$/.test(b);
}

function parseMoney(s) {
  const n = String(s ?? "")
    .replace(/,/g, "")
    .trim();
  if (!n) return 0;
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

function isNumericToken(s) {
  return /^[\d,]+$/.test(String(s ?? "").replace(/\s/g, ""));
}

function buildCategoryData(pairs) {
  /** @type {Map<string, Set<string>>} */
  const mid = new Map();
  const mains = [];
  for (const [mainRaw, midRaw] of pairs) {
    const main = String(mainRaw ?? "").trim();
    const m = String(midRaw ?? "").trim();
    if (!main || !m) continue;
    if (!mid.has(main)) {
      mid.set(main, new Set());
      mains.push(main);
    }
    mid.get(main).add(m);
  }
  return {
    main: mains,
    mid: Object.fromEntries(
      mains.map((k) => [k, Array.from(mid.get(k) ?? []).sort((a, b) => a.localeCompare(b, "ko"))])
    ),
  };
}

function parseProducts(md) {
  const rows = [];
  const catPairs = [];
  for (const line of md.split("\n")) {
    const p = splitRow(line);
    if (!p || p.length < 12 || isSepRow(p) || isColumnLetterRow(p)) continue;
    if (p[1] === "상품코드" || p[2] === "상품명") continue;
    const code = p[1];
    const name = p[2];
    const mainCat = p[3];
    const midCat = p[4];
    const priceStr = p[5];
    const stockStr = p[7];
    const statusKo = p[11] ?? "";
    if (!code || !name) continue;
    catPairs.push([mainCat, midCat]);
    let status = "active";
    const sk = String(statusKo).trim();
    if (sk.includes("품절")) status = "sold_out";
    else if (sk.includes("비활성") || sk.includes("단종")) status = "inactive";
    rows.push({
      name,
      main_category: mainCat,
      mid_category: midCat,
      code,
      price: parseMoney(priceStr),
      stock: parseMoney(stockStr),
      status,
    });
  }
  return { rows, categories: buildCategoryData(catPairs) };
}

function parseMaterials(md) {
  const rows = [];
  const catPairs = [];
  for (const line of md.split("\n")) {
    const p = splitRow(line);
    if (!p || p.length < 11 || isSepRow(p) || isColumnLetterRow(p)) continue;
    if (p[2] === "자재ID" || p[3] === "자재명" || p[2] === "번호") continue;
    const id = p[2];
    const name = p[3];
    const mainCat = p[4];
    const midCat = p[5];
    const g = p[6];
    if (!id || !name) continue;
    catPairs.push([mainCat, midCat]);
    let unit = "개";
    if (g && !isNumericToken(g)) unit = g;
    rows.push({
      name,
      main_category: mainCat,
      mid_category: midCat,
      unit,
      spec: `ID ${id}`,
    });
  }
  return { rows, categories: buildCategoryData(catPairs) };
}

function parsePartners(md) {
  const rows = [];
  const seen = new Set();
  for (const line of md.split("\n")) {
    const p = splitRow(line);
    if (!p || p.length < 5 || isSepRow(p) || isColumnLetterRow(p)) continue;
    if (p[1] === "거래처명") continue;
    const name = p[1];
    const typ = p[2];
    const contact = p[3];
    const detail = p[4] ?? "";
    const extra = p[5] ?? "";
    if (!name) continue;
    const key = name.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const memo = [contact, detail, extra].filter(Boolean).join(" | ").slice(0, 480);
    rows.push({
      name: name.trim(),
      supplier_type: typ?.trim() || undefined,
      memo: memo || undefined,
    });
  }
  return rows;
}

function tsEscape(s) {
  return String(s)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "")
    .replace(/\n/g, "\\n");
}

function emitCategoryData(obj) {
  const main = obj.main.map((m) => `"${tsEscape(m)}"`).join(", ");
  const mids = obj.main
    .map((k) => {
      const arr = obj.mid[k] ?? [];
      const inner = arr.map((x) => `"${tsEscape(x)}"`).join(", ");
      return `    "${tsEscape(k)}": [${inner}],`;
    })
    .join("\n");
  return `{\n  main: [${main}],\n  mid: {\n${mids}\n  },\n}`;
}

function emit() {
  const prodSrc = readSource("products");
  const matSrc = readSource("materials");
  const parSrc = readSource("partners");

  let products;
  let productCategories;
  if (prodSrc.kind === "csv") {
    const parsed = parseProductsCsv(parseCsv(prodSrc.text));
    products = parsed.rows;
    productCategories = parsed.categories;
  } else {
    const parsed = parseProducts(prodSrc.text);
    products = parsed.rows;
    productCategories = parsed.categories;
  }

  let materials;
  let materialCategories;
  if (matSrc.kind === "csv") {
    const parsed = parseMaterialsCsv(parseCsv(matSrc.text));
    materials = parsed.rows;
    materialCategories = parsed.categories;
  } else {
    const parsed = parseMaterials(matSrc.text);
    materials = parsed.rows;
    materialCategories = parsed.categories;
  }

  let suppliers;
  /** @type {{ csvBodyRows: number; skippedEmptyName: number; skippedDuplicateName: number } | null} */
  let partnerCsvStats = null;
  if (parSrc.kind === "csv") {
    const parsed = parsePartnersCsv(parseCsv(parSrc.text));
    suppliers = parsed.rows;
    partnerCsvStats = parsed.stats;
  } else {
    suppliers = parsePartners(parSrc.text);
  }

  const header = `/**
 * AUTO-GENERATED by scripts/generate-eastpole-tenant-seed.mjs
 * Source: data/tenant-master-seed-source/
 *   우선: products.csv, materials.csv, partners.csv (시트 전체 > 파일 > 다운로드 > CSV)
 *   없으면: *.md 미리보기 스냅샷(행 수 제한으로 약 99행일 수 있음)
 */
import { DEFAULT_EXPENSE_CATEGORIES } from "@/lib/category-defaults";
import type { TenantMasterSeed } from "../types";

`;

  const productsTs = products
    .map(
      (p) =>
        `    { name: "${tsEscape(p.name)}", main_category: "${tsEscape(p.main_category)}", mid_category: "${tsEscape(p.mid_category)}", code: "${tsEscape(p.code)}", price: ${p.price}, stock: ${p.stock}, status: "${p.status}" },`
    )
    .join("\n");

  const materialsTs = materials
    .map(
      (m) =>
        `    { name: "${tsEscape(m.name)}", main_category: "${tsEscape(m.main_category)}", mid_category: "${tsEscape(m.mid_category)}", unit: "${tsEscape(m.unit)}", spec: "${tsEscape(m.spec)}" },`
    )
    .join("\n");

  const suppliersTs = suppliers
    .map((s) => {
      const memo = s.memo ? `, memo: "${tsEscape(s.memo)}"` : "";
      const st = s.supplier_type ? `, supplier_type: "${tsEscape(s.supplier_type)}"` : "";
      return `    { name: "${tsEscape(s.name)}"${st}${memo} },`;
    })
    .join("\n");

  const body = `export const TENANT_MASTER_SEED_V2026_04_22_EASTPOLE: TenantMasterSeed = {
  version: "v2026-04-22-eastpole",
  label: "릴리맥NC 이스트폴 시트 스냅샷 (상품·자재·거래처)",
  productCategories: ${emitCategoryData(productCategories)},
  materialCategories: ${emitCategoryData(materialCategories)},
  expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
  suppliers: [
${suppliersTs}
  ],
  products: [
${productsTs}
  ],
  materials: [
${materialsTs}
  ],
};
`;

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, header + body, "utf8");
  console.log("Wrote", OUT);
  console.log({
    products: products.length,
    materials: materials.length,
    suppliers: suppliers.length,
    sources: {
      products: prodSrc.label,
      materials: matSrc.label,
      partners: parSrc.label,
    },
    ...(partnerCsvStats && {
      partnersCsv: {
        bodyRows: partnerCsvStats.csvBodyRows,
        uniqueNamesEmitted: suppliers.length,
        skippedEmptyName: partnerCsvStats.skippedEmptyName,
        skippedDuplicateName: partnerCsvStats.skippedDuplicateName,
        note: "거래처는 DB·시드 모두 '이름' 단위로 구분합니다. 같은 거래처명이 여러 행이면 첫 행만 남깁니다.",
      },
    }),
  });
}

emit();
