import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, resolveLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/getMessages";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value ?? null);
  const tf = getMessages(locale).tenantFlows;
  return {
    title: tf.f00204,
    description: tf.f00210,
  };
}

export default function PrintMessageLayout({ children }: { children: ReactNode }) {
  return children;
}
