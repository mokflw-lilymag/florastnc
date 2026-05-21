import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, resolveLocale } from "@/i18n/config";
import {
  GUEST_BROWSE_COOKIE,
  isGuestBrowseCookieValue,
} from "@/lib/subscription/guest-trial";

/** getUser() 갱신 쿠키를 redirect 응답에도 붙임 (누락 시 로그인 루프 발생) */
function redirectWithSessionCookies(url: URL, sessionResponse: NextResponse) {
  const redirectResponse = NextResponse.redirect(url);
  for (const cookie of sessionResponse.cookies.getAll()) {
    redirectResponse.cookies.set(cookie);
  }
  return redirectResponse;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const sessionUser = user;
  const isGuestTryRoute =
    pathname === "/try" || pathname.startsWith("/try/");
  const isGuestBrowse =
    isGuestBrowseCookieValue(request.cookies.get(GUEST_BROWSE_COOKIE)?.value);

  // Redirect users to login if they are not authenticated and try to access /dashboard
  if (
    !sessionUser &&
    pathname.startsWith("/dashboard") &&
    !isGuestTryRoute &&
    !isGuestBrowse
  ) {
    const url = request.nextUrl.clone();
    const locale = resolveLocale(request.cookies.get(LOCALE_COOKIE)?.value ?? DEFAULT_LOCALE);
    url.pathname = `/${locale}/login`;
    return redirectWithSessionCookies(url, supabaseResponse);
  }

  // 로그인 경로 → 대시보드 강제 리다이렉트는 하지 않음.
  // (깨진/불일치 세션 + Link prefetch 시 login↔dashboard 307 루프 발생)

  return supabaseResponse;
}
