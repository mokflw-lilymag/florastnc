import { schedules, logger } from "@trigger.dev/sdk/v3";

/**
 * 월·수·금 10:00 KST — SNS Auto-Pilot (Postiz 예약 게시)
 * @see docs/revenue_engine_task_list.md P2-S3
 */
export const dailyAutopilot = schedules.task({
  id: "revenue.daily-autopilot",
  cron: {
    pattern: "0 10 * * 1,3,5",
    timezone: "Asia/Seoul",
  },
  run: async (payload) => {
    logger.info("revenue.daily-autopilot start", { ts: payload.timestamp.toISOString() });

    const { createTriggerSupabaseAdmin } = await import("./lib/supabase-admin");
    const { listTenantsForSnsAutopilot } = await import("../../src/lib/revenue/postiz-service");
    const { runDailyAutopilotForTenant } = await import("../../src/lib/revenue/daily-autopilot-service");

    const db = createTriggerSupabaseAdmin();
    const tenants = await listTenantsForSnsAutopilot(db);
    const results = [];

    for (const t of tenants) {
      const r = await runDailyAutopilotForTenant(db, {
        tenantId: t.tenantId,
        integrationId: t.integrationId,
        requiresApproval: t.requiresApproval,
        runAt: payload.timestamp,
      });
      logger.info("tenant result", { ...r });
      results.push(r);
    }

    return { tenantCount: tenants.length, results };
  },
});
