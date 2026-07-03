import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

export type DeleteRowsResult = {
  ok: boolean;
  count: number;
  error: PostgrestError | null;
};

function applyEqFilters<Q extends { eq: (column: string, value: string | number) => Q }>(
  query: Q,
  filters: Record<string, string | number>,
): Q {
  let next = query;
  for (const [column, value] of Object.entries(filters)) {
    next = next.eq(column, value);
  }
  return next;
}

/** RLS가 테넌트 범위를 제어 — id만 지정하고 count로 삭제 여부 확인 */
export async function deleteById(
  supabase: SupabaseClient,
  table: string,
  id: string,
): Promise<DeleteRowsResult> {
  return deleteRows(supabase, table, { id });
}

export async function deleteRows(
  supabase: SupabaseClient,
  table: string,
  filters: Record<string, string | number>,
): Promise<DeleteRowsResult> {
  let query = supabase.from(table).delete({ count: "exact" });
  query = applyEqFilters(query, filters);
  const { error, count } = await query;
  const n = count ?? 0;
  if (error) return { ok: false, error, count: n };
  if (n === 0) return { ok: false, error: null, count: 0 };
  return { ok: true, error: null, count: n };
}

export function isDeleteBlockedByRls(error: PostgrestError | null): boolean {
  if (!error) return false;
  const code = String(error.code ?? "");
  const msg = String(error.message ?? "");
  return code === "42501" || /permission denied|row-level security/i.test(msg);
}

export function isDeleteNoRows(result: DeleteRowsResult): boolean {
  return !result.ok && !result.error && result.count === 0;
}
