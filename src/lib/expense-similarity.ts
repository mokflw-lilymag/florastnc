import type { Expense } from "@/types/expense";
import { format } from "date-fns";

function expenseCalendarYmd(e: Expense): string {
  return format(new Date(e.expense_date), "yyyy-MM-dd");
}

function normalizeDescription(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

/** 금액이 같은 영수증으로 볼 만큼 가까운지 (0.5% 또는 최소 1원). */
export function amountsClose(a: number, b: number): boolean {
  const hi = Math.max(Math.abs(a), Math.abs(b));
  const tol = Math.max(1, Math.floor(hi * 0.005));
  return Math.abs(a - b) <= tol;
}

/**
 * 레퍼런스 엑셀 일괄등록과 동일: 날짜 + 거래처 + 품목명 + 금액 완전 일치.
 */
export function findExactDuplicateExpenses(
  expenses: Expense[],
  input: {
    expenseDateYmd: string;
    supplierId: string;
    headerDescription: string;
    headerAmount: number;
    lineItems: { description?: string; amount: number }[];
    excludeExpenseId?: string;
  },
): Expense[] {
  const pool = input.excludeExpenseId
    ? expenses.filter((e) => e.id !== input.excludeExpenseId)
    : expenses;

  const sup = input.supplierId === "none" ? null : input.supplierId;
  if (!sup) return [];

  const matchRow = (description: string, amount: number) =>
    pool.filter(
      (e) =>
        expenseCalendarYmd(e) === input.expenseDateYmd &&
        e.supplier_id === sup &&
        normalizeDescription(e.description || "") === normalizeDescription(description) &&
        Math.trunc(Number(e.amount) || 0) === Math.trunc(Number(amount) || 0),
    );

  const out = new Map<string, Expense>();

  if (input.lineItems.length > 0) {
    for (const item of input.lineItems) {
      const desc = item.description || input.headerDescription;
      for (const hit of matchRow(desc, item.amount)) {
        out.set(hit.id, hit);
      }
    }
  } else {
    for (const hit of matchRow(input.headerDescription, input.headerAmount)) {
      out.set(hit.id, hit);
    }
  }

  return Array.from(out.values())
    .sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime())
    .slice(0, 15);
}

/** 다른 지출에 이미 등록된 영수증 URL */
export function findReceiptUrlConflict(
  expenses: Expense[],
  receiptUrl: string,
  excludeExpenseId?: string,
): Expense[] {
  const url = receiptUrl.trim();
  if (!url) return [];
  return expenses.filter(
    (e) => e.id !== excludeExpenseId && (e.receipt_url || "").trim() === url,
  );
}

/**
 * 새로 저장하려는 지출과 비슷한 기존 지출을 찾습니다 (차단하지 않고 경고용).
 */
export function findExpensesSimilarToDraft(
  expenses: Expense[],
  input: {
    expenseDateYmd: string;
    supplierId: string;
    headerAmount: number;
    lineItems: { amount: number }[];
    receiptUrl?: string;
    excludeExpenseId?: string;
  },
): Expense[] {
  const pool = input.excludeExpenseId
    ? expenses.filter((e) => e.id !== input.excludeExpenseId)
    : expenses;

  const out = new Map<string, Expense>();
  const add = (list: Expense[]) => {
    for (const e of list) out.set(e.id, e);
  };

  const url = input.receiptUrl?.trim();
  if (url) {
    add(pool.filter((e) => e.receipt_url && e.receipt_url === url));
  }

  const sup = input.supplierId === "none" ? null : input.supplierId;
  if (!sup) {
    return Array.from(out.values())
      .sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime())
      .slice(0, 15);
  }

  const total =
    input.lineItems.length > 0
      ? input.lineItems.reduce((s, it) => s + (Number(it.amount) || 0), 0)
      : input.headerAmount;

  if (total > 0) {
    const sameDayAndSupplier = (e: Expense) =>
      expenseCalendarYmd(e) === input.expenseDateYmd && e.supplier_id === sup;

    add(pool.filter((e) => sameDayAndSupplier(e) && amountsClose(e.amount, total)));

    if (input.lineItems.length >= 2) {
      const sameDayPool = pool.filter(sameDayAndSupplier);
      const used = new Set<string>();
      const matched: Expense[] = [];
      for (const it of input.lineItems) {
        const amt = Number(it.amount) || 0;
        const hit = sameDayPool.find((e) => !used.has(e.id) && amountsClose(e.amount, amt));
        if (hit) {
          used.add(hit.id);
          matched.push(hit);
        }
      }
      if (matched.length === input.lineItems.length) {
        add(matched);
      }
    }
  }

  return Array.from(out.values())
    .sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime())
    .slice(0, 15);
}

function compactLower(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

/** 품목/메모 문자열이 같은 걸로 볼 만큼 겹치는지 (정정 영수증 vs 다른 품목 구매 구분). */
export function expenseDescriptionsOverlap(
  expenseDesc: string,
  headerDescription: string,
  lineItems: { material_name?: string; description?: string }[],
): boolean {
  const exp = compactLower(expenseDesc || "");
  if (exp.length < 2) return false;

  const blobs: string[] = [];
  const h = compactLower(headerDescription || "");
  if (h.length >= 2) blobs.push(h);
  for (const it of lineItems) {
    const blob = compactLower(`${it.material_name || ""} ${it.description || ""}`);
    if (blob.length >= 2) blobs.push(blob);
  }
  if (blobs.length === 0) return false;

  return blobs.some((b) => b.includes(exp) || exp.includes(b));
}

/**
 * 같은 거래일·같은 거래처에 지출이 있는데, 이번 합계와 맞는 금액의 행이 없고,
 * 기존 행 설명과 이번 품목/메모가 겹치는 경우(정정 영수증 가능성).
 */
export function findSameDaySupplierAmountMismatch(
  expenses: Expense[],
  input: {
    expenseDateYmd: string;
    supplierId: string;
    headerAmount: number;
    headerDescription: string;
    lineItems: { amount: number; material_name?: string; description?: string }[];
    excludeExpenseId?: string;
  },
): Expense[] {
  const pool = input.excludeExpenseId
    ? expenses.filter((e) => e.id !== input.excludeExpenseId)
    : expenses;

  const sup = input.supplierId === "none" ? null : input.supplierId;
  if (!sup) return [];

  const draftTotal =
    input.lineItems.length > 0
      ? input.lineItems.reduce((s, it) => s + (Number(it.amount) || 0), 0)
      : input.headerAmount;
  if (draftTotal <= 0) return [];

  const sameDaySupplier = pool.filter(
    (e) => expenseCalendarYmd(e) === input.expenseDateYmd && e.supplier_id === sup,
  );
  if (sameDaySupplier.length === 0) return [];

  const anyClose = sameDaySupplier.some((e) => amountsClose(e.amount, draftTotal));
  if (anyClose) return [];

  const withItemSignal = sameDaySupplier.filter((e) =>
    expenseDescriptionsOverlap(e.description || "", input.headerDescription, input.lineItems),
  );
  if (withItemSignal.length === 0) return [];

  return withItemSignal
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);
}

export type DuplicateCheckInput = {
  expenseDateYmd: string;
  supplierId: string;
  headerDescription: string;
  headerAmount: number;
  lineItems: { description?: string; amount: number; material_name?: string }[];
  receiptUrl?: string;
  excludeExpenseId?: string;
};

export type DuplicateCheckResult = {
  exact: Expense[];
  receiptUrlConflicts: Expense[];
  similar: Expense[];
  amountMismatch: Expense[];
};

/** 신규·수정 공통 중복 검사 (tenant 범위 expenses 배열 기준) */
export function runExpenseDuplicateChecks(
  expenses: Expense[],
  input: DuplicateCheckInput,
): DuplicateCheckResult {
  const exact = findExactDuplicateExpenses(expenses, input);
  const exactIds = new Set(exact.map((e) => e.id));

  const receiptUrlConflicts = input.receiptUrl
    ? findReceiptUrlConflict(expenses, input.receiptUrl, input.excludeExpenseId)
    : [];

  const similar = findExpensesSimilarToDraft(expenses, {
    expenseDateYmd: input.expenseDateYmd,
    supplierId: input.supplierId,
    headerAmount: input.headerAmount,
    lineItems: input.lineItems,
    receiptUrl: input.receiptUrl,
    excludeExpenseId: input.excludeExpenseId,
  }).filter((e) => !exactIds.has(e.id));

  const amountMismatch = findSameDaySupplierAmountMismatch(expenses, {
    expenseDateYmd: input.expenseDateYmd,
    supplierId: input.supplierId,
    headerAmount: input.headerAmount,
    headerDescription: input.headerDescription,
    lineItems: input.lineItems,
    excludeExpenseId: input.excludeExpenseId,
  }).filter((e) => !exactIds.has(e.id));

  return { exact, receiptUrlConflicts, similar, amountMismatch };
}

/** 레venshtein 기반 문자열 유사도 (0~1) */
export function stringSimilarity(a: string, b: string): number {
  const s1 = a.trim().toLowerCase();
  const s2 = b.trim().toLowerCase();
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;

  const track: number[][] = Array.from({ length: s2.length + 1 }, () =>
    Array.from({ length: s1.length + 1 }, () => 0),
  );
  for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;
  for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;
  for (let j = 1; j <= s2.length; j += 1) {
    for (let i = 1; i <= s1.length; i += 1) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator,
      );
    }
  }
  const distance = track[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);
  return 1 - distance / maxLength;
}

export function findSimilarNamedItems(
  name: string,
  existing: { id: string; name: string }[],
  threshold = 0.7,
): { id: string; name: string }[] {
  if (name.trim().length < 2) return [];
  return existing
    .filter((item) => {
      const sim = stringSimilarity(name, item.name);
      return sim >= threshold && item.name.trim() !== name.trim();
    })
    .slice(0, 5);
}
