"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getNewOrderPaymentMethodLabel,
  quickSwitchPaymentAfterFailure,
  type OrderPaymentMethod,
} from "@/lib/order-payment-methods";
import type { PaymentStatus } from "@/types/order";
import { getMessages } from "@/i18n/getMessages";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";

const QUICK_SWITCH_METHODS: OrderPaymentMethod[] = [
  "cash",
  "transfer",
  "unknown",
];

type PaymentApprovalFailedBannerProps = {
  message: string;
  onClear: () => void;
  setPaymentMethod: (method: OrderPaymentMethod) => void;
  setPaymentStatus: (status: PaymentStatus) => void;
};

export function PaymentApprovalFailedBanner({
  message,
  onClear,
  setPaymentMethod,
  setPaymentStatus,
}: PaymentApprovalFailedBannerProps) {
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;

  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-3"
    >
      <div className="flex gap-2">
        <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div className="space-y-1 min-w-0">
          <p className="text-sm font-semibold text-destructive">{message}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            주문은 저장되지 않았습니다. 아래에서 다른 결제 수단을 선택한 뒤 다시 접수해 주세요.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {QUICK_SWITCH_METHODS.map((method) => (
          <Button
            key={method}
            type="button"
            size="sm"
            variant="secondary"
            className="h-8 text-xs"
            onClick={() =>
              quickSwitchPaymentAfterFailure(
                method,
                setPaymentMethod,
                setPaymentStatus,
                onClear
              )
            }
          >
            {getNewOrderPaymentMethodLabel(method, tf)}으로 변경
          </Button>
        ))}
      </div>
    </div>
  );
}
