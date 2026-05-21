import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { resolveEffectiveTenantId } from "@/lib/revenue/resolve-tenant";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  listAnniversaryD7Targets,
  processAnniversaryTarget,
  runAnniversaryD7Batch,
} from "@/lib/revenue/anniversary-d7-service";
import { DEFAULT_ANNIVERSARY_EXPECTED_KRW } from "@/lib/revenue/anniversary-utils";
import { assertRevenueFeature } from "@/lib/revenue/tenant-access";

/** GET — D-7 미리보기 / POST — 수동 발송 또는 배치 dry-run */
export async function GET(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const tenantId = await resolveEffectiveTenantId(gate.supabase, gate.userId);
  if (!tenantId) return NextResponse.json({ error: "TENANT_REQUIRED" }, { status: 400 });

  const db = createAdminClient() ?? gate.supabase;
  const runAt = new Date();

  try {
    const targets = await listAnniversaryD7Targets(db, runAt, { tenantId });
    const expectedTotal = targets.length * DEFAULT_ANNIVERSARY_EXPECTED_KRW;

    const { data: settings } = await db
      .from("revenue_autopilot_settings")
      .select("anniversary_autopilot")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    return NextResponse.json({
      runDate: runAt.toISOString(),
      autopilotOn: settings?.anniversary_autopilot ?? false,
      targetCount: targets.length,
      expectedTotalKrw: expectedTotal,
      targets: targets.map((t) => ({
        anniversaryId: t.anniversaryId,
        customerId: t.customerId,
        customerName: t.customerName,
        contact: t.contact.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2"),
        label: t.label,
        eventDateYmd: t.eventDateYmd,
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const tenantId = await resolveEffectiveTenantId(gate.supabase, gate.userId);
  if (!tenantId) return NextResponse.json({ error: "TENANT_REQUIRED" }, { status: 400 });

  let body: { action?: string; anniversaryId?: string; dryRun?: boolean };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const db = createAdminClient() ?? gate.supabase;
  const annGate = await assertRevenueFeature(db, tenantId, "anniversary_d7");
  if (!annGate.ok) {
    return NextResponse.json({ error: annGate.error, upgradeUrl: "/dashboard/subscription?highlight=revenue" }, { status: annGate.status });
  }

  const runAt = new Date();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  try {
    if (body.action === "batch" || !body.anniversaryId) {
      const summary = await runAnniversaryD7Batch(db, runAt, {
        tenantId,
        dryRun: body.dryRun === true,
        appUrl,
      });
      return NextResponse.json(summary);
    }

    const targets = await listAnniversaryD7Targets(db, runAt, { tenantId });
    const target = targets.find((t) => t.anniversaryId === body.anniversaryId);
    if (!target) {
      return NextResponse.json({ error: "TARGET_NOT_FOUND" }, { status: 404 });
    }

    const result = await processAnniversaryTarget(db, target, runAt, {
      dryRun: body.dryRun === true,
      appUrl,
    });
    return NextResponse.json({ result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
