"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { OrderPaymentMethod } from "@/lib/order-payment-methods";
import { getNewOrderPaymentMethodLabel } from "@/lib/order-payment-methods";
import { getMessages } from "@/i18n/getMessages";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { useCurrency } from "@/hooks/use-currency";
import { CreditCard, XCircle, CheckCircle2 } from "lucide-react";

type CardPaymentConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  method: OrderPaymentMethod;
  onApproved: () => void;
  onFailed: () => void;
};

export function CardPaymentConfirmDialog({
  open,
  onOpenChange,
  amount,
  method,
  onApproved,
  onFailed,
}: CardPaymentConfirmDialogProps) {
  const locale = usePreferredLocale();
    const { format: formatCurrency } = useCurrency();
  const tf = getMessages(locale).tenantFlows;
  const methodLabel = getNewOrderPaymentMethodLabel(method, tf);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            {methodLabel} 결제 확인
          </DialogTitle>
          <DialogDescription className="text-left pt-2 space-y-2">
            <span className="block">
              단말/PG에서 <strong>{formatCurrency(amount)}</strong> 결제를 진행한 뒤 결과를 선택해 주세요.
            </span>
            <span className="block text-amber-700 text-sm">
              승인 실패 시 주문은 저장되지 않으며, 입력한 내용은 그대로 유지됩니다.
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-col gap-2 pt-2">
          <Button
            className="w-full h-11"
            onClick={onApproved}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            승인 완료 — 주문 저장
          </Button>
          <Button
            variant="outline"
            className="w-full h-11 border-destructive/40 text-destructive hover:bg-destructive/5"
            onClick={onFailed}
          >
            <XCircle className="h-4 w-4 mr-2" />
            승인 실패 — 다른 수단으로
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
