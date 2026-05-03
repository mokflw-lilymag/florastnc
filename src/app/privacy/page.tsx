import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LOCALE_COOKIE, resolveLocale } from "@/i18n/config";

export default async function PrivacyRedirectPage() {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value ?? null);
  redirect(`/${locale}/privacy`);
}
