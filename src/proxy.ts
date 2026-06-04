import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import { DEFAULT_LOCALE, isSupportedLocale, LOCALE_COOKIE, resolveLocale } from "@/i18n/config";

// 간단한 인메모리 방식의 Rate Limiting (Edge 환경에서는 인스턴스별로 캐시되므로 완벽하지는 않으나, 기본적인 방지용으로 적합)
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT = 100; // 1분당 최대 요청 수
const WINDOW_MS = 60 * 1000; // 1분

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isStatic =
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    /\.[a-zA-Z0-9]+$/.test(pathname);

  // /api 경로에 대한 Rate Limiting 적용
  if (pathname.startsWith("/api/")) {
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? '127.0.0.1';
    const now = Date.now();
    const windowStart = now - WINDOW_MS;

    const record = rateLimitMap.get(ip);

    if (!record || record.lastReset < windowStart) {
      rateLimitMap.set(ip, { count: 1, lastReset: now });
    } else {
      record.count += 1;
      if (record.count > RATE_LIMIT) {
        return new NextResponse(
          JSON.stringify({ error: 'Too Many Requests', message: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.' }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
  }

  /** Country code mix-up: Korean UI uses language segment `ko`, not ISO country `kr`. */
  if (!isStatic && !pathname.startsWith("/api/")) {
    const segmentsEarly = pathname.split("/").filter(Boolean);
    if (segmentsEarly[0]?.toLowerCase() === "kr") {
      const target = request.nextUrl.clone();
      const tail = segmentsEarly.slice(1);
      target.pathname = tail.length > 0 ? `/ko/${tail.join("/")}` : "/ko";
      return NextResponse.redirect(target, 308);
    }
  }

  const shouldLocalize =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/terms" ||
    pathname === "/privacy" ||
    pathname.startsWith("/features/");

  if (!isStatic && shouldLocalize) {
    const segments = pathname.split("/").filter(Boolean);
    const first = segments[0];
    const canonicalFirst = first ? resolveLocale(first) : DEFAULT_LOCALE;
    const hasLocalePrefix = Boolean(first) && canonicalFirst === first && isSupportedLocale(canonicalFirst);
    const preferredLocale = resolveLocale(request.cookies.get(LOCALE_COOKIE)?.value ?? DEFAULT_LOCALE);

    if (!hasLocalePrefix) {
      const target = request.nextUrl.clone();
      target.pathname = pathname === "/" ? `/${preferredLocale}` : `/${preferredLocale}${pathname}`;
      return NextResponse.redirect(target);
    }
  }

  const response = await updateSession(request);
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];
  if (first) {
    const canonicalFirst = resolveLocale(first);
    if (canonicalFirst === first && isSupportedLocale(canonicalFirst)) {
      response.cookies.set(LOCALE_COOKIE, canonicalFirst, { path: "/", maxAge: 60 * 60 * 24 * 365 });
    }
  }
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
