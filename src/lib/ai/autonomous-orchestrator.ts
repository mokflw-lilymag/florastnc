import { createClient } from '@/utils/supabase/client';
import { MarketingEngine } from './marketing-engine';
import { triggerRevenueTask } from '@/lib/revenue/trigger-client';

/**
 * AI Global Engine Orchestrator (The CEO Agent) V5
 * Phase 2: n8n 제거 → Trigger.dev revenue.daily-autopilot 위임
 */
export class AutonomousOrchestrator {
  private supabase = createClient();

  async runGlobalCycle() {
    console.log("[V5-CEO] Global Marketing Battle initiated (Trigger.dev mode).");

    const { data: settings, error } = await this.supabase
      .from('revenue_autopilot_settings')
      .select('tenant_id')
      .eq('sns_autopilot', true);

    if (error || !settings?.length) {
      console.warn("[V5-CEO] No SNS autopilot tenants.", error);
      return;
    }

    for (const row of settings) {
      void row;
      await this.logAgentAction(row.tenant_id as string, 'CEO', 'Queued', 'SNS autopilot tenant registered for daily-autopilot cron.');
    }

    await triggerRevenueTask('revenue.daily-autopilot', {
      source: 'autonomous_orchestrator',
      triggeredAt: new Date().toISOString(),
    });
  }

  private async processShopCampaign(shop: { user_id: string; store_persona?: string; marketing_theme?: string }) {
    const userId = shop.user_id;
    const persona = shop.store_persona || 'Warm & Emotional';
    const themes = (shop.marketing_theme || '').split(',').filter((t: string) => t.trim() !== '');

    try {
      await this.logAgentAction(userId, 'CEO', 'Planning', `자동화 엔진 V5 (Postiz). 페르소나 '${persona}'`);

      const selectedTopic = themes.length > 0
        ? themes[Math.floor(Math.random() * themes.length)]
        : "감동을 전하는 오늘의 꽃 선물";

      await MarketingEngine.planShortsCampaign({
        topic: selectedTopic,
        country: 'KR',
        persona,
      });

      await triggerRevenueTask('revenue.daily-autopilot', { tenantId: userId, source: 'legacy_shop_cycle' });
      await this.logAgentAction(userId, 'Publisher', 'Dispatch', 'n8n 대신 Trigger.dev + Postiz 파이프라인으로 전환됐습니다.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'unknown';
      await this.logAgentAction(userId, 'CEO', 'Error', `작전 수행 중 오류: ${msg}`);
    }
  }

  private async logAgentAction(userId: string, name: string, type: string, thought: string) {
    await this.supabase.from('agent_logs').insert({
      user_id: userId,
      agent_name: name,
      action_type: type,
      thought_process: thought,
    });
  }
}
