import { task, wait, logger } from "@trigger.dev/sdk/v3";

type FollowupStep = "order_followup_d1" | "order_followup_d7" | "order_followup_d30";

const STEPS: { step: FollowupStep; waitDays: number }[] = [
  { step: "order_followup_d1", waitDays: 1 },
  { step: "order_followup_d7", waitDays: 6 },
  { step: "order_followup_d30", waitDays: 23 },
];

/**
 * 배송/픽업 완료(order.status=completed) 후 D+1 · D+7 · D+30 시퀀스
 * @see docs/revenue_engine_task_list.md P1-S5
 */
export const orderDelivered = task({
  id: "revenue.order-delivered",
  maxDuration: 60 * 60 * 24 * 35,
  run: async (payload: { orderId: string; tenantId: string; deliveredAt?: string }) => {
    logger.info("revenue.order-delivered start", payload);

    const { createTriggerSupabaseAdmin } = await import("./lib/supabase-admin");
    const { sendOrderFollowupStep } = await import("../../src/lib/revenue/order-followup-service");

    const db = createTriggerSupabaseAdmin();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const results: unknown[] = [];

    for (const { step, waitDays } of STEPS) {
      if (waitDays > 0) {
        logger.info(`waiting ${waitDays} days before ${step}`);
        await wait.for({ days: waitDays });
      }

      const result = await sendOrderFollowupStep(db, {
        orderId: payload.orderId,
        tenantId: payload.tenantId,
        step,
        appUrl,
      });
      logger.info(`${step} result`, result);
      results.push({ step, ...result });
    }

    return { orderId: payload.orderId, results };
  },
});
