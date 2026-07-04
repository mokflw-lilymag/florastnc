import { NextResponse } from "next/server";
import { requireEmailHubAdmin } from "@/lib/admin/email-hub/guard";

/** GET ?q=상호 — 이메일 허브 발송용 매장 검색 */
export async function GET(req: Request) {
  const auth = await requireEmailHubAdmin(req);
  if (!auth.ok) return auth.response;

  const q = new URL(req.url).searchParams.get("q")?.trim().toLowerCase() ?? "";
  if (q.length < 1) {
    return NextResponse.json({ tenants: [] });
  }

  const { data: tenants, error } = await auth.admin
    .from("tenants")
    .select("id, name, subscription_end")
    .ilike("name", `%${q}%`)
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ids = (tenants ?? []).map((t) => t.id);
  if (ids.length === 0) {
    return NextResponse.json({ tenants: [] });
  }

  const [{ data: settings }, { data: profiles }] = await Promise.all([
    auth.admin.from("system_settings").select("tenant_id, data").in("tenant_id", ids),
    auth.admin.from("profiles").select("tenant_id, email, full_name").in("tenant_id", ids),
  ]);

  const settingsMap = new Map<string, Record<string, unknown>>();
  for (const s of settings ?? []) {
    if (s.data && typeof s.data === "object") {
      settingsMap.set(s.tenant_id, s.data as Record<string, unknown>);
    }
  }

  const emailMap = new Map<string, { email: string; name: string }>();
  for (const p of profiles ?? []) {
    const tid = p.tenant_id as string;
    if (!tid || emailMap.has(tid)) continue;
    emailMap.set(tid, {
      email: String(p.email ?? ""),
      name: String((p as { full_name?: string }).full_name ?? ""),
    });
  }

  const results = (tenants ?? []).map((t) => {
    const d = settingsMap.get(t.id) ?? {};
    const prof = emailMap.get(t.id);
    const email = ((d.storeEmail as string) || prof?.email || "").trim();
    const name = ((d.representative as string) || prof?.name || "").trim();
    return {
      id: t.id,
      name: t.name,
      email,
      contact_name: name || null,
      subscription_end: t.subscription_end,
      pos_leased: !!d.pos_printer_leased,
      label_leased: !!d.label_printer_leased,
    };
  });

  return NextResponse.json({ tenants: results });
}
