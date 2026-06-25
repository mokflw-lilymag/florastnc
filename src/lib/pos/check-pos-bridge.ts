/** 로컬 PP/단말 브릿지(8004) 온라인 여부 — 브라우저에서만 호출 */
export async function checkPosBridgeOnline(
  tenantId?: string | null
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const endpoint = tenantId
      ? `http://127.0.0.1:8004/set_tenant?id=${tenantId}`
      : "http://127.0.0.1:8004/";
    const res = await fetch(endpoint, {
      signal: AbortSignal.timeout(2500),
      mode: "cors",
      credentials: "omit",
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { status?: string; success?: boolean };
    return (
      data.status === "ok" ||
      data.status === "success" ||
      data.success === true
    );
  } catch {
    return false;
  }
}
