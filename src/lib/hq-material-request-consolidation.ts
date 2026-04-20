import { compactMaterialName } from "@/lib/material-request-name-similarity";

export type HqRequestLineInput = {
  id: string;
  material_id?: string | null;
  name: string;
  main_category: string;
  mid_category: string;
  quantity: number;
  unit: string;
  spec: string | null;
};

export type HqRequestInput = {
  id: string;
  tenant_id: string;
  tenant_name?: string;
  status: string;
  branch_note: string | null;
  created_at: string;
  lines: HqRequestLineInput[];
};

export type BranchQtyBreakdown = {
  tenant_id: string;
  tenant_name: string;
  quantity: number;
  request_id: string;
  line_id: string;
};

export type ConsolidatedMaterialRow = {
  key: string;
  sortKey: string;
  name: string;
  main_category: string;
  mid_category: string;
  unit: string;
  material_id: string | null;
  totalQuantity: number;
  branchCount: number;
  breakdown: BranchQtyBreakdown[];
  specs: string[];
};

function lineMergeKey(line: HqRequestLineInput): string {
  const unit = String(line.unit ?? "ea").trim() || "ea";
  const mid = line.material_id?.trim();
  if (mid) return `m:${mid}:${unit}`;
  const nc = compactMaterialName(line.name);
  const main = line.main_category.trim();
  const middle = line.mid_category.trim();
  return `n:${nc}:${main}:${middle}:${unit}`;
}

export type BuildConsolidationOptions = {
  statuses: Set<string>;
  dateFrom: Date | null;
  dateTo: Date | null;
};

export function buildMaterialRequestConsolidation(
  requests: HqRequestInput[],
  options: BuildConsolidationOptions
): ConsolidatedMaterialRow[] {
  const { statuses, dateFrom, dateTo } = options;
  const fromMs = dateFrom ? dateFrom.getTime() : null;
  const toMs = dateTo
    ? new Date(
        dateTo.getFullYear(),
        dateTo.getMonth(),
        dateTo.getDate(),
        23,
        59,
        59,
        999
      ).getTime()
    : null;

  type Acc = {
    key: string;
    sortKey: string;
    name: string;
    main_category: string;
    mid_category: string;
    unit: string;
    material_id: string | null;
    totalQuantity: number;
    breakdown: BranchQtyBreakdown[];
    specSet: Set<string>;
  };

  const map = new Map<string, Acc>();

  for (const req of requests) {
    if (!statuses.has(req.status)) continue;
    const t = new Date(req.created_at).getTime();
    if (fromMs != null && t < fromMs) continue;
    if (toMs != null && t > toMs) continue;

    const tenantName = req.tenant_name ?? req.tenant_id.slice(0, 8);

    for (const ln of req.lines ?? []) {
      const key = lineMergeKey(ln);
      const qty = Number(ln.quantity);
      if (!Number.isFinite(qty) || qty <= 0) continue;

      let row = map.get(key);
      if (!row) {
        row = {
          key,
          sortKey: `${ln.main_category}\0${ln.mid_category}\0${ln.name}`,
          name: ln.name,
          main_category: ln.main_category,
          mid_category: ln.mid_category,
          unit: String(ln.unit ?? "ea").trim() || "ea",
          material_id: ln.material_id?.trim() ? ln.material_id.trim() : null,
          totalQuantity: 0,
          breakdown: [],
          specSet: new Set(),
        };
        map.set(key, row);
      }

      row.totalQuantity += qty;
      row.breakdown.push({
        tenant_id: req.tenant_id,
        tenant_name: tenantName,
        quantity: qty,
        request_id: req.id,
        line_id: ln.id,
      });

      if (ln.spec?.trim()) row.specSet.add(ln.spec.trim());
    }
  }

  const rows: ConsolidatedMaterialRow[] = [...map.values()].map((r) => ({
    key: r.key,
    sortKey: r.sortKey,
    name: r.name,
    main_category: r.main_category,
    mid_category: r.mid_category,
    unit: r.unit,
    material_id: r.material_id,
    totalQuantity: r.totalQuantity,
    branchCount: new Set(r.breakdown.map((b) => b.tenant_id)).size,
    breakdown: r.breakdown,
    specs: [...r.specSet].sort((a, b) => a.localeCompare(b, "ko")),
  }));

  rows.sort((a, b) => a.sortKey.localeCompare(b.sortKey, "ko", { numeric: true }));
  return rows;
}

export function requestIdsInConsolidation(rows: ConsolidatedMaterialRow[]): string[] {
  const s = new Set<string>();
  for (const r of rows) for (const b of r.breakdown) s.add(b.request_id);
  return [...s];
}

/** 탭 구분, Excel 붙여넣기용 */
export function consolidationToTsv(rows: ConsolidatedMaterialRow[]): string {
  const esc = (v: string) => v.replace(/\r?\n/g, " ").replace(/\t/g, " ");
  const header = ["No", "품목", "대분류", "중분류", "단위", "취합수량", "지점수", "지점별(수량)", "비고"];
  const body = rows.map((r, i) => {
    const byBranch = new Map<string, number>();
    for (const b of r.breakdown) {
      byBranch.set(b.tenant_name, (byBranch.get(b.tenant_name) ?? 0) + b.quantity);
    }
    const detail = [...byBranch.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], "ko"))
      .map(([name, q]) => `${name} ${q}${r.unit}`)
      .join(" | ");
    return [
      String(i + 1),
      esc(r.name),
      esc(r.main_category),
      esc(r.mid_category),
      r.unit,
      String(r.totalQuantity),
      String(r.branchCount),
      esc(detail),
      esc(r.specs.join("; ")),
    ].join("\t");
  });
  return [header.join("\t"), ...body].join("\n");
}

export function consolidationToCsv(rows: ConsolidatedMaterialRow[]): string {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const header = ["No", "품목", "대분류", "중분류", "단위", "취합수량", "지점수", "지점별(수량)", "비고"];
  const body = rows.map((r, i) => {
    const byBranch = new Map<string, number>();
    for (const b of r.breakdown) {
      byBranch.set(b.tenant_name, (byBranch.get(b.tenant_name) ?? 0) + b.quantity);
    }
    const detail = [...byBranch.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], "ko"))
      .map(([name, q]) => `${name} ${q}${r.unit}`)
      .join(" | ");
    return [
      esc(String(i + 1)),
      esc(r.name),
      esc(r.main_category),
      esc(r.mid_category),
      esc(r.unit),
      esc(String(r.totalQuantity)),
      esc(String(r.branchCount)),
      esc(detail),
      esc(r.specs.join("; ")),
    ].join(",");
  });
  return "\uFEFF" + [header.join(","), ...body].join("\r\n");
}
