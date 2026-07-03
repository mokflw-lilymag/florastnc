import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { resolvePostLoginPath } from "@/lib/auth/post-login-path";
import { DEFAULT_LOCALE, LOCALE_COOKIE, resolveLocale } from "@/i18n/config";

/** 로그인 직후 HTTP 302 — RSC 소프트 네비게이션 없이 대시보드로 전체 페이지 이동 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  const origin = new URL(request.url).origin;

  if (error || !user) {
    const cookieStore = await cookies();
    const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value ?? DEFAULT_LOCALE);
    return NextResponse.redirect(`${origin}/${locale}/login`, 303);
  }

  const redirectTo = await resolvePostLoginPath(supabase, user.id, user.email ?? undefined);
  const waitingUrl = new URL("/auth/waiting", origin);
  waitingUrl.searchParams.set("next", redirectTo);
  return NextResponse.redirect(waitingUrl.toString(), 303);
}
