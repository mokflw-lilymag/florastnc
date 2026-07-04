"use client";

import { cn } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/support-tickets/mask";
import type { SupportTicketStatus } from "@/lib/support-tickets/types";

export function SupportStatusBadge({
  status,
  locale = "ko",
  className,
}: {
  status: SupportTicketStatus;
  locale?: string;
  className?: string;
}) {
  const row = STATUS_LABELS[status] ?? STATUS_LABELS.open;
  const label = locale.startsWith("en") ? row.en : row.ko;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold",
        row.tone,
        className,
      )}
    >
      {label}
    </span>
  );
}
