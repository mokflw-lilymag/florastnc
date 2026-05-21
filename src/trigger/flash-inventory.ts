import { schedules, logger } from "@trigger.dev/sdk/v3";

/**
 * 매일 08:00 KST — 재고 임박 플래시 캠페인 draft 생성
 * @see docs/revenue_engine_task_list.md P3-S1
 */
export const flashInventory = schedules.task({
  id: "revenue.flash-inventory",
  cron: {
    pattern: "0 8 * * *",
    timezone: "Asia/Seoul",
  },
  run: async (payload) => {
    logger.info("revenue.flash-inventory start", { ts: payload.timestamp.toISOString() });

    const { createTriggerSupabaseAdmin } = await import("./lib/supabase-admin");
    const { runFlashInventoryForTenant } = await import("../../src/lib/revenue/flash-inventory-service");

    const db = createTriggerSupabaseAdmin();
    const { data: tenants, error } = await db
      .from("revenue_autopilot_settings")
      .select("tenant_id")
      .eq("flash_autopilot", true);
    if (error) throw error;

    const results = [];
    for (const t of tenants ?? []) {
      const r = await runFlashInventoryForTenant(db, t.tenant_id as string);
      results.push({ tenantId: t.tenant_id, ...r });
    }

    return { tenantCount: tenants?.length ?? 0, results };
  },
});
