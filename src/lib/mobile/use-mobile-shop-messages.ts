"use client";

import { useMemo } from "react";
import { toBaseLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/getMessages";
import { dateFnsLocaleForBase } from "@/lib/date-fns-locale";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import type { MobileShopMessages } from "@/i18n/types";
import type { TenantFlowMessages } from "@/i18n/types";

export function useMobileShopMessages() {
  const locale = usePreferredLocale();
  const messages = getMessages(locale);
  const m = messages.mobileShop;
  const tf = messages.tenantFlows;
  const dateLocale = useMemo(
    () => dateFnsLocaleForBase(toBaseLocale(locale)),
    [locale],
  );
  return { m, tf, locale, dateLocale };
}

export function mobilePaymentLabels(m: MobileShopMessages) {
  return {
    card: m.payment.card,
    cash: m.payment.cash,
    transfer: m.payment.transfer,
    mainpay: m.payment.mainpay,
    epay: m.payment.epay,
    kakao: m.payment.kakao,
  } as const;
}

export function receiptTypeLabel(
  value: "store_pickup" | "pickup_reservation" | "delivery_reservation",
  tf: TenantFlowMessages,
) {
  if (value === "store_pickup") return tf.f00194 ?? tf.f00191 ?? "Store pickup";
  if (value === "pickup_reservation") return tf.f00753 ?? "Pickup";
  return tf.f00240 ?? "Delivery";
}
