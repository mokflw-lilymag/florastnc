import type { Expense } from "@/types/expense";
import { format } from "date-fns";

function expenseCalendarYmd(e: Expense): string {
  return format(new Date(e.expense_date), "yyyy-MM-dd");
}

/** 금액이 같은 영수증으로 볼 만큼 가까운지 (0.5% 또는 최소 1원). */
export function amountsClose(a: number, b: number): boolean {
  const hi = Math.max(Math.abs(a), Math.abs(b));
  const tol = Math.max(1, Math.floor(hi * 0.005));
  return Math.abs(a - b) <= tol;
}

/**
 * 새로 저장하려는 지출과 비슷한 기존 지출을 찾습니다 (차단하지 않고 경고용).
 *
 * - 동일 증빙 URL(같은 링크를 두 번 넣은 경우)
 * - **같은 거래일 + 같은 거래처 + 합계 금액 유사** — 날짜만 다르고 금액이 같다면 중복으로 보지 않음
 * - 품목 여러 줄: 같은 거래일·같은 거래처에서 각 줄 금액이 기존 행과 1:1로 모두 짝이면 중복 업로드 가능성
 *
 * 거래처가 없으면(`none`) 날짜·금액만으로는 경고하지 않습니다(우연한 동액 방지). URL 일치는 그대로 봅니다.
 *
 * 비교 대상은 화면에 로드된 `expenses` 전체입니다. `useExpenses`는 기본적으로 기간 제한 없이 조회하므로,
 * 일주일(또는 그 이전) 거래일을 폼에 맞춰 넣으면 그 날짜의 기존 지출과 비교됩니다.
 */
export function findExpensesSimilarToDraft(
  expenses: Expense[],
  input: {
    expenseDateYmd: string;
    supplierId: string;
    headerAmount: number;
    lineItems: { amount: number }[];
    receiptUrl?: string;
  }
): Expense[] {
  const out = new Map<string, Expense>();
  const add = (list: Expense[]) => {
    for (const e of list) out.set(e.id, e);
  };

  const url = input.receiptUrl?.trim();
  if (url) {
    add(expenses.filter((e) => e.receipt_url && e.receipt_url === url));
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

    add(
      expenses.filter((e) => sameDayAndSupplier(e) && amountsClose(e.amount, total))
    );

    if (input.lineItems.length >= 2) {
      const pool = expenses.filter(sameDayAndSupplier);
      const used = new Set<string>();
      const matched: Expense[] = [];
      for (const it of input.lineItems) {
        const amt = Number(it.amount) || 0;
        const hit = pool.find((e) => !used.has(e.id) && amountsClose(e.amount, amt));
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
  lineItems: { material_name?: string; description?: string }[]
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
  }
): Expense[] {
  const sup = input.supplierId === "none" ? null : input.supplierId;
  if (!sup) return [];

  const draftTotal =
    input.lineItems.length > 0
      ? input.lineItems.reduce((s, it) => s + (Number(it.amount) || 0), 0)
      : input.headerAmount;
  if (draftTotal <= 0) return [];

  const sameDaySupplier = expenses.filter(
    (e) => expenseCalendarYmd(e) === input.expenseDateYmd && e.supplier_id === sup
  );
  if (sameDaySupplier.length === 0) return [];

  const anyClose = sameDaySupplier.some((e) => amountsClose(e.amount, draftTotal));
  if (anyClose) return [];

  const withItemSignal = sameDaySupplier.filter((e) =>
    expenseDescriptionsOverlap(e.description || "", input.headerDescription, input.lineItems)
  );
  if (withItemSignal.length === 0) return [];

  return withItemSignal
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);
}
