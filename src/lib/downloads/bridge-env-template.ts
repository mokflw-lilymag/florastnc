/**
 * PP 브릿지 설치 폴더용 .env (서버 env + 선택적 tenantId).
 * Vercel에 SERVICE_ROLE_KEY가 있으면 사용, 없으면 bridge exe 내장값으로 설치 시 보강됩니다.
 */
export function bundledSupabaseEnvLines(tenantId: string): string[] {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";

  const lines = [
    url ? `SUPABASE_URL=${url}` : "# SUPABASE_URL= (ppbridge.exe 내장값 사용)",
    key ? `SUPABASE_SERVICE_KEY=${key}` : "# SUPABASE_SERVICE_KEY= (ppbridge.exe 내장값 사용)",
  ];

  if (tenantId) {
    lines.push(`CURRENT_BRANCH_ID=${tenantId}`, `TENANT_ID=${tenantId}`);
  }

  return lines;
}
