import { cookies } from "next/headers";
import { LOCALE_COOKIE, resolveLocale, toBaseLocale } from "@/i18n/config";

function baseFromAcceptLanguage(header: string | null): string | null {
  if (!header) return null;
  const first = header.split(",")[0]?.split(";")[0]?.trim();
  if (!first) return null;
  return toBaseLocale(resolveLocale(first));
}

/**
 * HQ API 응답 메시지용 UI 베이스 로케일.
 * 우선순위: body.uiLocale → preferred_locale 쿠키 → Accept-Language → 기본(ko).
 */
export async function hqApiUiBase(req: Request, bodyUiLocale?: string | null): Promise<string> {
  if (typeof bodyUiLocale === "string" && bodyUiLocale.trim()) {
    return toBaseLocale(resolveLocale(bodyUiLocale.trim()));
  }
  try {
    const cookieStore = await cookies();
    const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
    if (fromCookie) {
      return toBaseLocale(resolveLocale(fromCookie));
    }
  } catch {
    /* cookies() unavailable outside a request */
  }
  const fromAl = baseFromAcceptLanguage(req.headers.get("accept-language"));
  if (fromAl) return fromAl;
  return toBaseLocale(resolveLocale(undefined));
}
