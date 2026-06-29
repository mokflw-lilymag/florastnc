import { differenceInCalendarDays, parseISO, isValid } from "date-fns";

export type SubscriptionTenureBucket =
  | "lifetime"
  | "suspended"
  | "expired"
  | "critical" // 0-3 days
  | "warning" // 4-7 days
  | "soon" // 8-30 days
  | "healthy"; // 31+ days

export interface SubscriptionTenureInput {
  subscription_end: string | null | undefined;
  status?: string | null;
  plan?: string | null;
}

export interface SubscriptionTenure {
  bucket: SubscriptionTenureBucket;
  daysLeft: number | null;
  isExpired: boolean;
  isLifetime: boolean;
  isSuspended: boolean;
  endDate: Date | null;
}

const LIFETIME_YEAR = 2090;

function parseEnd(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = parseISO(iso);
  return isValid(d) ? d : null;
}

export function resolveSubscriptionTenure(
  input: SubscriptionTenureInput,
  now: Date = new Date(),
): SubscriptionTenure {
  const isSuspended = input.status === "suspended";
  const endDate = parseEnd(input.subscription_end);

  if (isSuspended) {
    return {
      bucket: "suspended",
      daysLeft: endDate ? differenceInCalendarDays(endDate, now) : null,
      isExpired: endDate ? endDate < now : false,
      isLifetime: false,
      isSuspended: true,
      endDate,
    };
  }

  if (!endDate) {
    return {
      bucket: "lifetime",
      daysLeft: null,
      isExpired: false,
      isLifetime: true,
      isSuspended: false,
      endDate: null,
    };
  }

  if (endDate.getFullYear() >= LIFETIME_YEAR) {
    return {
      bucket: "lifetime",
      daysLeft: null,
      isExpired: false,
      isLifetime: true,
      isSuspended: false,
      endDate,
    };
  }

  const daysLeft = differenceInCalendarDays(endDate, now);

  if (daysLeft < 0) {
    return {
      bucket: "expired",
      daysLeft,
      isExpired: true,
      isLifetime: false,
      isSuspended: false,
      endDate,
    };
  }

  let bucket: SubscriptionTenureBucket = "healthy";
  if (daysLeft <= 3) bucket = "critical";
  else if (daysLeft <= 7) bucket = "warning";
  else if (daysLeft <= 30) bucket = "soon";

  return {
    bucket,
    daysLeft,
    isExpired: false,
    isLifetime: false,
    isSuspended: false,
    endDate,
  };
}

export type TenureFilter =
  | "ALL"
  | "HEALTHY"
  | "SOON"
  | "WARNING"
  | "CRITICAL"
  | "EXPIRED"
  | "LIFETIME"
  | "SUSPENDED";

export function matchesTenureFilter(
  tenure: SubscriptionTenure,
  filter: TenureFilter,
): boolean {
  switch (filter) {
    case "ALL":
      return true;
    case "SUSPENDED":
      return tenure.isSuspended;
    case "LIFETIME":
      return tenure.isLifetime;
    case "EXPIRED":
      return tenure.isExpired;
    case "CRITICAL":
      return tenure.bucket === "critical";
    case "WARNING":
      return tenure.bucket === "warning";
    case "SOON":
      return tenure.bucket === "soon";
    case "HEALTHY":
      return tenure.bucket === "healthy";
    default:
      return true;
  }
}

export function tenureBucketLabelKo(bucket: SubscriptionTenureBucket): string {
  switch (bucket) {
    case "lifetime":
      return "평생";
    case "suspended":
      return "정지";
    case "expired":
      return "만료";
    case "critical":
      return "긴급";
    case "warning":
      return "임박";
    case "soon":
      return "만기 예정";
    case "healthy":
      return "정상";
    default:
      return bucket;
  }
}

export function tenureDaysLabelKo(tenure: SubscriptionTenure): string {
  if (tenure.isSuspended) return "정지";
  if (tenure.isLifetime) return "평생";
  if (tenure.daysLeft == null) return "-";
  if (tenure.daysLeft < 0) return `만료 ${Math.abs(tenure.daysLeft)}일`;
  if (tenure.daysLeft === 0) return "오늘 만료";
  return `D-${tenure.daysLeft}`;
}

export const TENURE_BADGE_CLASS: Record<SubscriptionTenureBucket, string> = {
  lifetime: "bg-blue-50 text-blue-700 border-blue-100",
  suspended: "bg-red-50 text-red-700 border-red-100",
  expired: "bg-slate-100 text-slate-600 border-slate-200",
  critical: "bg-red-50 text-red-700 border-red-200 font-bold",
  warning: "bg-amber-50 text-amber-800 border-amber-200 font-semibold",
  soon: "bg-orange-50 text-orange-700 border-orange-100",
  healthy: "bg-emerald-50 text-emerald-700 border-emerald-100",
};

export interface TenantSubscriptionRow {
  id: string;
  name: string;
  plan: string | null;
  status: string | null;
  subscription_end: string | null;
  subscription_start?: string | null;
  created_at?: string;
  profiles?: { email: string }[];
}

export interface SubscriptionOverview {
  total: number;
  activePaid: number;
  expiring7: number;
  expiring30: number;
  expired: number;
  lifetime: number;
  suspended: number;
  expiringSoonList: Array<TenantSubscriptionRow & { tenure: SubscriptionTenure }>;
  expiredList: Array<TenantSubscriptionRow & { tenure: SubscriptionTenure }>;
}

export function buildSubscriptionOverview(
  tenants: TenantSubscriptionRow[],
  now: Date = new Date(),
): SubscriptionOverview {
  const withTenure = tenants.map((t) => ({
    ...t,
    tenure: resolveSubscriptionTenure(t, now),
  }));

  const paid = (t: TenantSubscriptionRow) => (t.plan ?? "free") !== "free";

  const expiringSoonList = withTenure
    .filter(
      (t) =>
        !t.tenure.isSuspended &&
        !t.tenure.isLifetime &&
        !t.tenure.isExpired &&
        t.tenure.daysLeft != null &&
        t.tenure.daysLeft <= 30 &&
        paid(t),
    )
    .sort((a, b) => (a.tenure.daysLeft ?? 999) - (b.tenure.daysLeft ?? 999));

  const expiredList = withTenure
    .filter((t) => t.tenure.isExpired && paid(t))
    .sort(
      (a, b) =>
        (a.tenure.daysLeft ?? 0) - (b.tenure.daysLeft ?? 0),
    );

  return {
    total: tenants.length,
    activePaid: withTenure.filter(
      (t) => paid(t) && !t.tenure.isExpired && !t.tenure.isSuspended,
    ).length,
    expiring7: withTenure.filter(
      (t) =>
        paid(t) &&
        !t.tenure.isExpired &&
        t.tenure.daysLeft != null &&
        t.tenure.daysLeft >= 0 &&
        t.tenure.daysLeft <= 7,
    ).length,
    expiring30: expiringSoonList.length,
    expired: expiredList.length,
    lifetime: withTenure.filter((t) => t.tenure.isLifetime).length,
    suspended: withTenure.filter((t) => t.tenure.isSuspended).length,
    expiringSoonList,
    expiredList,
  };
}
