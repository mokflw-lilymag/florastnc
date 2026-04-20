import { createClient } from "@supabase/supabase-js";

/**
 * 서버 전용 — SUPABASE_SERVICE_ROLE_KEY 필요.
 * RLS를 우회하므로 반드시 API 라우트에서 세션·권한 검증 후에만 사용.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
