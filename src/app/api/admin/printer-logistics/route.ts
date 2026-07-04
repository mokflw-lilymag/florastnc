import { NextResponse } from "next/server";
import { requireEmailHubAdmin } from "@/lib/admin/email-hub/guard";
import { sendPlatformEmail } from "@/lib/admin/email-hub/send-platform-email";
import {
  logisticsFieldPrefix,
  type LeaseDeviceType,
  type PrinterLeaseRow,
} from "@/lib/admin/printer-logistics/types";

function readLeaseRow(
  tenantId: string,
  tenantName: string,
  deviceType: LeaseDeviceType,
  d: Record<string, unknown>,
  leaseEnd: string | null,
  contactEmail: string | null,
  contactName: string | null,
): PrinterLeaseRow | null {
  const prefix = logisticsFieldPrefix(deviceType);
  const leased = !!d[`${prefix}_leased`];
  const model = (d[`${prefix}_model`] as string) || "";
  const returnCompleted = !!d[`${prefix}_return_completed`];

  if (!leased && !returnCompleted) return null;

  return {
    tenant_id: tenantId,
    tenant_name: tenantName,
    device_type: deviceType,
    model_name: model,
    leased,
    lease_start: (d[`${prefix}_date`] as string) ?? null,
    lease_end: leaseEnd,
    courier: (d[`${prefix}_courier`] as string) ?? null,
    tracking_number: (d[`${prefix}_tracking_number`] as string) ?? null,
    return_completed: returnCompleted,
    returned_at: (d[`${prefix}_returned_at`] as string) ?? null,
    contact_email: contactEmail,
    contact_name: contactName,
  };
}

export async function GET(req: Request) {
  const auth = await requireEmailHubAdmin(req);
  if (!auth.ok) return auth.response;

  const sp = new URL(req.url).searchParams;
  const q = (sp.get("q") || "").trim().toLowerCase();

  const [{ data: tenants }, { data: settings }, { data: profiles }] = await Promise.all([
    auth.admin.from("tenants").select("id, name, subscription_end"),
    auth.admin.from("system_settings").select("tenant_id, data").like("id", "settings_%"),
    auth.admin.from("profiles").select("tenant_id, email, full_name").not("tenant_id", "is", null),
  ]);

  const tenantMap = new Map((tenants ?? []).map((t) => [t.id, t]));
  const emailByTenant = new Map<string, { email: string; name: string }>();
  for (const p of profiles ?? []) {
    const tid = p.tenant_id as string;
    if (!tid || emailByTenant.has(tid)) continue;
    emailByTenant.set(tid, {
      email: String(p.email ?? ""),
      name: String((p as { full_name?: string }).full_name ?? ""),
    });
  }

  const leases: PrinterLeaseRow[] = [];

  for (const s of settings ?? []) {
    if (!s.tenant_id || !s.data || typeof s.data !== "object") continue;
    const t = tenantMap.get(s.tenant_id);
    if (!t) continue;
    const d = s.data as Record<string, unknown>;
    const storeEmail = (d.storeEmail as string)?.trim() || null;
    const prof = emailByTenant.get(s.tenant_id);
    const contactEmail = storeEmail || prof?.email || null;
    const contactName = (d.representative as string)?.trim() || prof?.name || null;
    const leaseEnd = t.subscription_end ? String(t.subscription_end).slice(0, 10) : null;

    for (const dt of ["pos", "label"] as const) {
      const row = readLeaseRow(s.tenant_id, t.name, dt, d, leaseEnd, contactEmail, contactName);
      if (row) leases.push(row);
    }
  }

  leases.sort((a, b) => a.tenant_name.localeCompare(b.tenant_name, "ko"));

  const filtered = q
    ? leases.filter(
        (l) =>
          l.tenant_name.toLowerCase().includes(q) ||
          l.model_name.toLowerCase().includes(q) ||
          (l.tracking_number ?? "").toLowerCase().includes(q),
      )
    : leases;

  return NextResponse.json({ leases: filtered });
}

export async function PATCH(req: Request) {
  const auth = await requireEmailHubAdmin(req);
  if (!auth.ok) return auth.response;

  let body: {
    tenantId?: string;
    deviceType?: LeaseDeviceType;
    courier?: string;
    tracking_number?: string;
    return_completed?: boolean;
    returned_at?: string;
    sendEmail?: "shipment" | "return" | null;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const tenantId = body.tenantId?.trim();
  const deviceType = body.deviceType;
  if (!tenantId || !deviceType) {
    return NextResponse.json({ error: "TENANT_AND_DEVICE_REQUIRED" }, { status: 400 });
  }

  const settingsId = `settings_${tenantId}`;
  const { data: existing } = await auth.admin
    .from("system_settings")
    .select("data, tenant_id")
    .eq("id", settingsId)
    .maybeSingle();

  const currentData =
    existing?.data && typeof existing.data === "object"
      ? ({ ...existing.data } as Record<string, unknown>)
      : {};

  const prefix = logisticsFieldPrefix(deviceType);
  const returnCompleted = !!body.return_completed;
  const returnedAt =
    body.returned_at?.trim() ||
    (returnCompleted ? new Date().toISOString().slice(0, 10) : null);

  if (body.courier !== undefined) {
    currentData[`${prefix}_courier`] = body.courier.trim() || null;
  }
  if (body.tracking_number !== undefined) {
    currentData[`${prefix}_tracking_number`] = body.tracking_number.trim() || null;
  }
  currentData[`${prefix}_return_completed`] = returnCompleted;
  currentData[`${prefix}_returned_at`] = returnCompleted ? returnedAt : null;

  if (returnCompleted) {
    currentData[`${prefix}_leased`] = false;
  }

  const { error: upsertErr } = await auth.admin.from("system_settings").upsert({
    id: settingsId,
    tenant_id: tenantId,
    data: currentData,
    updated_at: new Date().toISOString(),
  });

  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  let emailResult = null;
  if (body.sendEmail && body.sendEmail !== null) {
    const { data: tenant } = await auth.admin.from("tenants").select("name, subscription_end").eq("id", tenantId).maybeSingle();
    const storeEmail = (currentData.storeEmail as string)?.trim();
    const { data: prof } = await auth.admin
      .from("profiles")
      .select("email, full_name")
      .eq("tenant_id", tenantId)
      .limit(1)
      .maybeSingle();

    const to = storeEmail || prof?.email;
    if (!to) {
      emailResult = { ok: false, status: "failed", error: "NO_CONTACT_EMAIL" };
    } else {
      const templateSlug =
        body.sendEmail === "return" ? "pos-printer-return" : "pos-printer-shipment";
      const model = (currentData[`${prefix}_model`] as string) || "";
      const courier = (currentData[`${prefix}_courier`] as string) || "";
      const tracking = (currentData[`${prefix}_tracking_number`] as string) || "";

      emailResult = await sendPlatformEmail(auth.admin, {
        templateSlug,
        to,
        recipientName: (currentData.representative as string) || prof?.full_name || undefined,
        tenantId,
        sentBy: auth.userId,
        variables: {
          상호: tenant?.name ?? "",
          기종명: model,
          운송장번호: tracking,
          택배사: courier,
          반납기한: returnedAt ?? "",
          반납주소: "FloXync 본사 (이메일 회신으로 안내)",
          만료일: tenant?.subscription_end ? String(tenant.subscription_end).slice(0, 10) : "",
        },
      });
    }
  }

  return NextResponse.json({ ok: true, email: emailResult });
}
