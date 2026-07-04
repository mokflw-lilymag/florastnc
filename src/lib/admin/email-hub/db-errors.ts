/** Postgres 42P01 · PostgREST PGRST205(스키마 캐시) 등 — 테이블 자체가 없을 때 */
export function isMissingDbTableError(
  error: { code?: string; message?: string } | null | undefined,
  tableHint?: string,
): boolean {
  if (!error) return false;
  const msg = error.message ?? "";
  const code = error.code ?? "";
  if (msg.includes("column") && msg.includes("does not exist")) return false;
  if (tableHint && !msg.includes(tableHint) && code !== "PGRST205" && code !== "42P01") {
    return false;
  }
  return (
    code === "PGRST205" ||
    code === "42P01" ||
    msg.includes("schema cache") ||
    msg.includes("Could not find the table") ||
    (/does not exist/i.test(msg) && /relation|table/i.test(msg))
  );
}
