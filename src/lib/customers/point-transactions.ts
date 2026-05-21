export type PointTransactionRow = {
  id: string;
  amount: number;
  created_at: string;
  balance_after?: number | null;
};

/** 최신순 거래 목록에 거래 직후 잔액 부여 (balance_after 우선) */
export function attachPointBalances<T extends PointTransactionRow>(
  transactions: T[],
  currentBalance: number,
): (T & { balanceAfter: number })[] {
  let cursor = currentBalance;
  return transactions.map((tx) => {
    const balanceAfter = tx.balance_after != null ? tx.balance_after : cursor;
    cursor = balanceAfter - tx.amount;
    return { ...tx, balanceAfter };
  });
}

export function defaultPointAdjustmentDescription(
  delta: number,
  reason?: string,
): string {
  const trimmed = reason?.trim();
  if (trimmed) return trimmed;
  return delta > 0 ? "고객 정보 수정 — 포인트 적립" : "고객 정보 수정 — 포인트 차감";
}
