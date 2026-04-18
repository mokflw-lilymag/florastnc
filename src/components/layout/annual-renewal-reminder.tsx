"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { differenceInCalendarDays, format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const STORAGE_KEY_PREFIX = "florasync_renewal_notice_dismissed";

/** 결제 시 subscription_start~end 간격이 길면 연간(12m) 등 장기 플랜으로 간주 (6m·월간 제외) */
export function isAnnualBillingPeriod(
  subscriptionStart: string | null | undefined,
  subscriptionEnd: string | null | undefined
): boolean {
  if (!subscriptionStart || !subscriptionEnd) return false;
  const days = differenceInCalendarDays(new Date(subscriptionEnd), new Date(subscriptionStart));
  return days >= 300;
}

type Props = {
  userId: string;
  subscriptionStart: string | null | undefined;
  subscriptionEnd: string | null | undefined;
  isSuperAdmin: boolean;
  isExpired: boolean;
  plan: string;
};

export function AnnualRenewalReminder({
  userId,
  subscriptionStart,
  subscriptionEnd,
  isSuperAdmin,
  isExpired,
  plan,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isSuperAdmin || isExpired || !subscriptionEnd || plan === "free") return;
    if (!isAnnualBillingPeriod(subscriptionStart, subscriptionEnd)) return;

    const end = new Date(subscriptionEnd);
    const daysLeft = differenceInCalendarDays(end, new Date());
    if (daysLeft < 1 || daysLeft > 7) return;

    const key = `${STORAGE_KEY_PREFIX}:${userId}`;
    try {
      if (localStorage.getItem(key) === subscriptionEnd) return;
    } catch {
      /* ignore */
    }

    const id = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(id);
  }, [isSuperAdmin, isExpired, subscriptionEnd, subscriptionStart, plan, userId]);

  const persistDismiss = () => {
    if (!subscriptionEnd) return;
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}:${userId}`, subscriptionEnd);
    } catch {
      /* ignore */
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) persistDismiss();
    setOpen(next);
  };

  const endLabel = subscriptionEnd
    ? format(new Date(subscriptionEnd), "yyyy년 M월 d일", { locale: ko })
    : "";

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-[min(100%-2rem,380px)] sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>구독 만료 예정 안내</AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            연간 이용 중이신 매장입니다. 서비스 이용 기한이 <strong>{endLabel}</strong>에 종료됩니다. 중단 없이
            사용하시려면 미리 연장해 주세요.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>닫기</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              persistDismiss();
              setOpen(false);
              router.push("/dashboard/subscription");
            }}
          >
            구독 · 플랜 확인
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
