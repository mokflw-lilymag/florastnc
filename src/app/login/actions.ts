"use server";

import { createClient } from "@/utils/supabase/server";

export type LoginWithPasswordResult =
  | { ok: true }
  | { ok: false; message: string };

/** 서버에서 세션 쿠키 설정. 이동은 클라이언트에서 /auth/enter 로 전체 페이지 이동 */
export async function loginWithPassword(
  email: string,
  password: string
): Promise<LoginWithPasswordResult> {
  const trimmedEmail = email.trim();
  if (!trimmedEmail || !password) {
    return { ok: false, message: "missing_credentials" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: trimmedEmail,
    password,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "session_not_persisted" };
  }

  return { ok: true };
}
