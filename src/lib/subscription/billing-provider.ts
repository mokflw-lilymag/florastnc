export type SubscriptionBillingProvider = "toss" | "stripe";

/** 운영 국가 코드 (system_settings.data.country) */
export function resolveBillingProvider(
  countryCode: string | null | undefined,
): SubscriptionBillingProvider {
  const code = (countryCode || "KR").toUpperCase();
  if (code === "KR") return "toss";
  return "stripe";
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function isTossConfigured(): boolean {
  return Boolean(process.env.TOSS_SECRET_KEY?.trim());
}
