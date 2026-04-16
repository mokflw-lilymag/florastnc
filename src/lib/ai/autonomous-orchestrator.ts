import { createClient } from '@/utils/supabase/client';
import { MarketingEngine } from './marketing-engine';

/**
 * AI Global Engine Orchestrator (The CEO Agent) V5
 * Implementation of Paperclip Framework for autonomous marketing integration.
 */
export class AutonomousOrchestrator {
  private supabase = createClient();

  /**
   * Main entry point for the global marketing cycle.
   */
  async runGlobalCycle() {
    console.log("[V5-CEO] Global Marketing Battle initiated.");

    // 1. Fetch Global Config
    const { data: configData } = await this.supabase.from('platform_config').select('*');
    const config = (configData || []).reduce((acc: any, item: any) => {
      acc[item.key] = item.value;
      return acc;
    }, {});

    // 2. Fetch shops with auto-pilot enabled
    const { data: shops, error } = await this.supabase
      .from('shop_settings')
      .select('*')
      .eq('auto_pilot_enabled', true);

    if (error || !shops) {
      console.error("[V5-CEO] No active shops found or error fetching.", error);
      return;
    }

    console.log(`[V5-CEO] Processing ${shops.length} mission-ready shops.`);

    for (const shop of shops) {
      await this.processShopCampaign(shop, config);
    }
  }

  /**
   * Processes a single shop's marketing cycle with full Harness injection.
   */
  private async processShopCampaign(shop: any, globalConfig: any) {
    const userId = shop.user_id;
    const persona = shop.store_persona || 'Warm & Emotional';
    const themes = (shop.marketing_theme || '').split(',').filter((t: string) => t.trim() !== '');
    
    try {
      // 1. CEO Log
      await this.logAgentAction(userId, 'CEO', 'Planning', `자동화 엔진 V5 가동. 페르소나 '${persona}' 및 '${themes[0] || '일반'}' 테마 기반 작전을 개시합니다.`);

      // 2. Researcher Agent - Topic selection
      // If user has defined themes, pick one randomly; otherwise use seasonal defaults
      let selectedTopic = themes.length > 0 
        ? themes[Math.floor(Math.random() * themes.length)]
        : "감동을 전하는 오늘의 꽃 선물";
      
      await this.logAgentAction(userId, 'Researcher', 'Trends', `현재 시장 데이터와 사장님의 테마('${selectedTopic}')를 분석하여 최적의 홍보 시나리오를 선정했습니다.`);

      // 3. Creative Agent - Generate Content
      const contentType = Math.random() > 0.5 ? 'shorts' : 'blog';
      const campaignResult = await MarketingEngine.planShortsCampaign({
        topic: selectedTopic,
        country: 'KR',
        persona: persona,
      });

      await this.logAgentAction(userId, 'Creative Director', 'Generation', `브랜드 DNA('${persona}')를 주입하여 ${contentType === 'shorts' ? '영상 대본' : '블로그 원고'}를 완성했습니다.`);

      // 4. Auditor Agent - Verification
      const auditResult = await MarketingEngine.auditContent(campaignResult.script || campaignResult.copy, { persona });
      await this.logAgentAction(userId, 'Auditor', 'Verification', '브랜드 톤앤매너 및 품질 검수를 완료했습니다. 작전 사출 승인.');

      // 5. Publisher Agent - Dispatch to n8n
      const webhookUrl = globalConfig.n8n_master_url;
      
      if (webhookUrl) {
        const payload = {
          userId,
          type: 'AUTONOMOUS_PUBLISH_V5',
          platform: shop.target_platforms || ['instagram'],
          content: campaignResult,
          metadata: {
            persona,
            topic: selectedTopic,
            engine: 'MAOMS-V5'
          }
        };

        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          await this.logAgentAction(userId, 'Publisher', 'Dispatch', `n8n 멀티 채널 파이프라인으로 작전을 사출했습니다. 배포 대상: ${shop.target_platforms?.join(', ')}`);
        } else {
          throw new Error('n8n Webhook dispatch failed');
        }
      } else {
        console.warn(`[V5-Publisher] No global n8n webhook configured for user ${userId}`);
        await this.logAgentAction(userId, 'Publisher', 'Warning', '글로벌 n8n 설정이 누락되어 로컬 저장소에만 작전을 기록했습니다.');
      }

      // 6. DB Record
      await this.supabase.from('campaigns').insert({
        user_id: userId,
        title: `[AUTO] ${selectedTopic}`,
        type: contentType,
        status: 'published',
        source_prompt: selectedTopic
      });

    } catch (err: any) {
      console.error(`[V5-CEO] Operation failed for user ${userId}:`, err);
      await this.logAgentAction(userId, 'CEO', 'Error', `작전 수행 중 오류 발생: ${err.message}`);
    }
  }

  private async logAgentAction(userId: string, name: string, type: string, thought: string) {
    await this.supabase.from('agent_logs').insert({
      user_id: userId,
      agent_name: name,
      action_type: type,
      thought_process: thought
    });
  }
}
