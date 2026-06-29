"use client";

import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  type SubscriptionTenure,
  tenureDaysLabelKo,
  tenureBucketLabelKo,
  TENURE_BADGE_CLASS,
} from "@/lib/subscription/subscription-tenure";
import { dateFnsLocaleForBase } from "@/lib/date-fns-locale";
import { toBaseLocale } from "@/i18n/config";

export function SubscriptionTenureBadge({
  tenure,
  locale = "ko",
  showEndDate = false,
  className,
}: {
  tenure: SubscriptionTenure;
  locale?: string;
  showEndDate?: boolean;
  className?: string;
}) {
  const dfLoc = dateFnsLocaleForBase(toBaseLocale(locale as Parameters<typeof toBaseLocale>[0]));
  const daysLabel = tenureDaysLabelKo(tenure);
  const bucketLabel = tenureBucketLabelKo(tenure.bucket);

  return (
    <div className={cn("flex flex-col gap-0.5 items-start", className)}>
      <Badge
        variant="outline"
        className={cn(
          "text-[10px] px-2 py-0.5 border font-medium",
          TENURE_BADGE_CLASS[tenure.bucket],
        )}
      >
        {daysLabel}
        <span className="mx-1 opacity-40">·</span>
        {bucketLabel}
      </Badge>
      {showEndDate && tenure.endDate && !tenure.isLifetime && (
        <span className="text-[10px] text-slate-500 font-normal">
          {format(tenure.endDate, "yyyy.MM.dd", { locale: dfLoc })}
        </span>
      )}
      {showEndDate && tenure.isLifetime && (
        <span className="text-[10px] text-blue-600 font-normal">무제한 이용</span>
      )}
    </div>
  );
}
