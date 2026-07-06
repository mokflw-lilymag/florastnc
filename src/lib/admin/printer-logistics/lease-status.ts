import { differenceInDays, parseISO, startOfDay } from "date-fns";

export type LeaseExpiryType = "normal" | "overdue" | "today" | "expiring" | "unknown";

export type LeaseExpiryStatus = {
  type: LeaseExpiryType;
  days: number;
};

/** 임대 만료 = tenants.subscription_end (구독 만료일과 동일) */
export function getLeaseStatus(
  leaseEndStr: string | null,
  returnCompleted: boolean,
  leased: boolean,
): LeaseExpiryStatus {
  if (!leased || returnCompleted) {
    return { type: "normal", days: 0 };
  }
  if (!leaseEndStr) {
    return { type: "unknown", days: 0 };
  }

  try {
    const today = startOfDay(new Date());
    const end = startOfDay(parseISO(leaseEndStr.length === 10 ? `${leaseEndStr}T00:00:00` : leaseEndStr));
    const diff = differenceInDays(end, today);

    if (diff < 0) return { type: "overdue", days: Math.abs(diff) };
    if (diff === 0) return { type: "today", days: 0 };
    if (diff <= 7) return { type: "expiring", days: diff };
    return { type: "normal", days: diff };
  } catch {
    return { type: "unknown", days: 0 };
  }
}

export function leaseExpiryNeedsAttention(status: LeaseExpiryStatus): boolean {
  return status.type === "overdue" || status.type === "today" || status.type === "expiring";
}
