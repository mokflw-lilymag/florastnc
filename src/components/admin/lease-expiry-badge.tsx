"use client";

import { Badge } from "@/components/ui/badge";
import { getLeaseStatus, type LeaseExpiryStatus } from "@/lib/admin/printer-logistics/lease-status";

export function LeaseExpiryBadge({
  leaseEnd,
  leased,
  returnCompleted = false,
  compact = false,
}: {
  leaseEnd: string | null;
  leased: boolean;
  returnCompleted?: boolean;
  compact?: boolean;
}) {
  const status = getLeaseStatus(leaseEnd, returnCompleted, leased);
  return <LeaseExpiryBadgeFromStatus status={status} compact={compact} />;
}

export function LeaseExpiryBadgeFromStatus({
  status,
  compact = false,
}: {
  status: LeaseExpiryStatus;
  compact?: boolean;
}) {
  const cls = compact ? "text-[10px] py-0 px-1.5 font-bold" : "text-xs font-bold";

  if (status.type === "unknown") {
    return (
      <Badge variant="outline" className={`${cls} border-slate-300 text-slate-500`}>
        만료일 미설정
      </Badge>
    );
  }
  if (status.type === "overdue") {
    return (
      <Badge className={`${cls} bg-red-100 text-red-800 hover:bg-red-100 animate-pulse`}>
        연체 D+{status.days}
      </Badge>
    );
  }
  if (status.type === "today") {
    return (
      <Badge className={`${cls} bg-amber-100 text-amber-800 hover:bg-amber-100`}>
        오늘 만료
      </Badge>
    );
  }
  if (status.type === "expiring") {
    return (
      <Badge className={`${cls} bg-orange-100 text-orange-800 hover:bg-orange-100`}>
        만료 임박 D-{status.days}
      </Badge>
    );
  }
  if (status.days > 0) {
    return (
      <span className={`${compact ? "text-[10px]" : "text-xs"} text-slate-400 font-mono font-semibold`}>
        D-{status.days}
      </span>
    );
  }
  return null;
}
