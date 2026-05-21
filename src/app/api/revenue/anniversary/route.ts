import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { resolveEffectiveTenantId } from "@/lib/revenue/resolve-tenant";
import { createAdminClient } from "@/utils/supabase/admin";

/** GET — 고객 기념일 목록 / POST — 기념일 추가 */
export async function GET(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const tenantId = await resolveEffectiveTenantId(gate.supabase, gate.userId);
  if (!tenantId) return NextResponse.json({ error: "TENANT_REQUIRED" }, { status: 400 });

  const sp = new URL(req.url).searchParams;
  const customerId = sp.get("customerId");

  const db = createAdminClient() ?? gate.supabase;
  let q = db
    .from("customer_anniversaries")
    .select("*, customers(id, name, contact, marketing_consent)")
    .eq("tenant_id", tenantId)
    .order("anniversary_date", { ascending: true });

  if (customerId) q = q.eq("customer_id", customerId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ anniversaries: data ?? [] });
}

export async function POST(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const tenantId = await resolveEffectiveTenantId(gate.supabase, gate.userId);
  if (!tenantId) return NextResponse.json({ error: "TENANT_REQUIRED" }, { status: 400 });

  let body: {
    customer_id: string;
    label?: string;
    anniversary_date: string;
    recurring_yearly?: boolean;
    preferred_flowers?: string;
    allergies?: string;
    marketing_consent?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  if (!body.customer_id || !body.anniversary_date) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  const db = createAdminClient() ?? gate.supabase;

  if (typeof body.marketing_consent === "boolean" && body.marketing_consent) {
    await db
      .from("customers")
      .update({ marketing_consent: true })
      .eq("id", body.customer_id)
      .eq("tenant_id", tenantId);
  }

  const { data: existingAnniv, error: dupErr } = await db
    .from("customer_anniversaries")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("customer_id", body.customer_id)
    .eq("anniversary_date", body.anniversary_date)
    .maybeSingle();

  if (dupErr) return NextResponse.json({ error: dupErr.message }, { status: 500 });

  if (existingAnniv) {
    return NextResponse.json({ anniversary: existingAnniv, duplicate: true });
  }

  const { data, error } = await db
    .from("customer_anniversaries")
    .insert({
      tenant_id: tenantId,
      customer_id: body.customer_id,
      label: body.label ?? "기념일",
      anniversary_date: body.anniversary_date,
      recurring_yearly: body.recurring_yearly ?? true,
      preferred_flowers: body.preferred_flowers ?? null,
      allergies: body.allergies ?? null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ anniversary: data }, { status: 201 });
}

/** PUT — 고객 기념일 일괄 동기화 (추가·수정·삭제) */
export async function PUT(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const tenantId = await resolveEffectiveTenantId(gate.supabase, gate.userId);
  if (!tenantId) return NextResponse.json({ error: "TENANT_REQUIRED" }, { status: 400 });

  let body: {
    customer_id: string;
    marketing_consent?: boolean;
    anniversaries?: {
      id?: string;
      label?: string;
      anniversary_date: string;
      recurring_yearly?: boolean;
      preferred_flowers?: string;
      allergies?: string;
    }[];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  if (!body.customer_id) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  const db = createAdminClient() ?? gate.supabase;
  const rows = (body.anniversaries ?? []).filter((row) => row.anniversary_date?.trim());

  if (typeof body.marketing_consent === "boolean") {
    await db
      .from("customers")
      .update({ marketing_consent: body.marketing_consent })
      .eq("id", body.customer_id)
      .eq("tenant_id", tenantId);
  }

  const { data: existing, error: fetchError } = await db
    .from("customer_anniversaries")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("customer_id", body.customer_id);

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  const keepIds = new Set(rows.map((row) => row.id).filter(Boolean) as string[]);
  const deleteIds = (existing ?? [])
    .map((row) => row.id as string)
    .filter((id) => !keepIds.has(id));

  if (deleteIds.length > 0) {
    const { error: deleteError } = await db
      .from("customer_anniversaries")
      .delete()
      .in("id", deleteIds)
      .eq("tenant_id", tenantId)
      .eq("customer_id", body.customer_id);
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  const synced: unknown[] = [];

  for (const row of rows) {
    const payload = {
      label: row.label?.trim() || "기념일",
      anniversary_date: row.anniversary_date,
      recurring_yearly: row.recurring_yearly ?? true,
      preferred_flowers: row.preferred_flowers ?? null,
      allergies: row.allergies ?? null,
    };

    if (row.id) {
      const { data, error } = await db
        .from("customer_anniversaries")
        .update(payload)
        .eq("id", row.id)
        .eq("tenant_id", tenantId)
        .eq("customer_id", body.customer_id)
        .select("*")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      synced.push(data);
      continue;
    }

    const { data, error } = await db
      .from("customer_anniversaries")
      .insert({
        tenant_id: tenantId,
        customer_id: body.customer_id,
        ...payload,
      })
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    synced.push(data);
  }

  return NextResponse.json({ anniversaries: synced });
}
