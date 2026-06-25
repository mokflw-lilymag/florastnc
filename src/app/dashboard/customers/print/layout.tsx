import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, resolveLocale } from "@/i18n/config";
import { getServerMessages } from "@/i18n/getMessages.server";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value ?? null);
  const tf = (await getServerMessages(locale)).tenantFlows;
  return {
    title: tf.f00023,
  };
}

export default function CustomerPrintLayout({ children }: { children: ReactNode }) {
  return children;
}
