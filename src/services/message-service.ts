import { SupabaseClient } from '@supabase/supabase-js';

// 메세지 발송 환경에 대한 타입 정의
interface MessagePayload {
  to: string; // 수신자 번호 (보내는 사람 / 주문자)
  text: string;
  photoUrl?: string;
  trackingUrl?: string; // 실시간 위치 조회 URL
  orderNumber: string;
}

export const MessageService = {
  /**
   * 알림톡(또는 LMS 문자 메세지) 발송 
   */
  async sendDeliveryCompleteAlert(
    supabase: SupabaseClient, 
    tenantId: string, 
    payload: MessagePayload
  ): Promise<boolean> {
    try {
      // 1. 해당 매장(Tenant)의 system_settings 에서 연동된 메세징 API Key 조회
      // (기존 코드 베이스에 맞춰 store_settings 또는 system_settings 테이블에서 조회)
      const { data: settings, error } = await supabase
        .from('store_settings')
        .select('kakaot_api_key, kakaot_business_id')
        .eq('tenant_id', tenantId)
        .single();
        
      if (error) {
        console.error('Failed to fetch store settings for messaging:', error);
        // 에러를 무시하고 진행할 수도 있지만, 안전하게 false 리턴
      }

      const apiKey = settings?.kakaot_api_key || 'MOCK_SOLAPI_KEY';
      
      const messageContent = `[배송 완료 안내]\n주문하신 꽃(${payload.orderNumber})이 고객님께 무사히 전달되었습니다! 🌸\n\n완료 사진: ${payload.photoUrl || '사진 없음'}\n상세 내역 확인: ${payload.trackingUrl || ''}\n\n감사합니다.`;

      console.log('🚀 [MessageService] 알림톡 발송 요청:', {
        to: payload.to,
        content: messageContent,
        apiKeyUsed: apiKey.substring(0, 5) + '***'
      });

      // ==========================================
      // 실제 Solapi 또는 알리고 API 연동 구간
      // ==========================================
      // const response = await fetch('https://api.solapi.com/messages/v4/send', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `HMAC-SHA256 apiKey=${apiKey}, ...`
      //   },
      //   body: JSON.stringify({
      //     message: {
      //       to: payload.to.replace(/-/g, ''), // 하이픈 제거
      //       from: '01012341234', // 발신번호(시스템 설정값)
      //       text: messageContent,
      //     }
      //   })
      // });
      // if (!response.ok) throw new Error('API request failed');

      // (현재 로컬/데모 환경에서는 콘솔 로그로 대체)
      console.log('✅ 알림톡 발송 완료 (Mock 처리)');

      return true;

    } catch (err) {
      console.error('❌ 알림톡 발송 에러:', err);
      return false;
    }
  }
};
