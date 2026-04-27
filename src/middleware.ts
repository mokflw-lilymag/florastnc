import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import { DEFAULT_LOCALE, isSupportedLocale, LOCALE_COOKIE, resolveLocale } from "@/i18n/config";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isStatic =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    /\.[a-zA-Z0-9]+$/.test(pathname);

  /** Country code mix-up: Korean UI uses language segment `ko`, not ISO country `kr`. */
  if (!isStatic) {
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
