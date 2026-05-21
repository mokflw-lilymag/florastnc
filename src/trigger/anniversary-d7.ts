import { schedules, logger } from "@trigger.dev/sdk/v3";

/**
 * 매일 09:00 KST — D-7 기념일 Auto-Pilot 배치
 * @see docs/revenue_engine_task_list.md P1-S1
 */
export const anniversaryD7 = schedules.task({
  id: "revenue.anniversary-d7",
  cron: {
    pattern: "0 9 * * *",
    timezone: "Asia/Seoul",
  },
  run: async (payload) => {
    logger.info("revenue.anniversary-d7 run", {
      timestamp: payload.timestamp.toISOString(),
      timezone: payload.timezone,
    });

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      logger.warn("Supabase env missing — abort");
      return { sent: 0, mode: "no_supabase" };
    }

    const { createTriggerSupabaseAdmin } = await import("./lib/supabase-admin");
    const { runAnniversaryD7Batch } = await import("../../src/lib/revenue/anniversary-d7-service");

    const db = createTriggerSupabaseAdmin();
    const summary = await runAnniversaryD7Batch(db, payload.timestamp, {
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
    });

    logger.info("revenue.anniversary-d7 complete", summary);
    return summary;
  },
});
