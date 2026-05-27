import crypto from 'crypto';
import { createClient } from '@/utils/supabase/client';
const supabase = createClient();

interface AlimtalkOptions {
  to: string;
  templateCode: string;
  variable: Record<string, string>;
  button?: Array<{
    name: string;
    type: 'WL' | 'AL' | 'BK' | 'MD' | 'DS';
    linkMobile?: string;
    linkPc?: string;
  }>;
}

interface SolapiCredentials {
  apiKey: string;
  apiSecret: string;
  pfid: string;
}

export class AlimtalkService {
  private static API_URL = 'https://api.solapi.com/messages/v4/send';

  private static getHeaders(credentials: SolapiCredentials) {
    const date = new Date().toISOString();
    const salt = crypto.randomBytes(16).toString('hex');
    const hmac = crypto.createHmac('sha256', credentials.apiSecret);
    const signature = hmac.update(date + salt).digest('hex');

    return {
      'Authorization': `HMAC-SHA256 apiKey=${credentials.apiKey}, date=${date}, salt=${salt}, signature=${signature}`,
      'Content-Type': 'application/json'
    };
  }

  static async sendAlimtalk(options: AlimtalkOptions, credentials: SolapiCredentials) {
    if (!credentials.apiKey || !credentials.apiSecret) {
      console.warn('알림톡 설정이 누락되어 가상 발송 처리합니다:', options);
      return { success: true, messageId: 'mock-id' };
    }

    try {
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: this.getHeaders(credentials),
        body: JSON.stringify({
          message: {
            to: options.to,
            from: process.env.NEXT_PUBLIC_SENDER_PHONE || '', // 등록된 발신 번호
            kakaoOptions: {
              pfId: credentials.pfid,
              templateCode: options.templateCode,
              variables: options.variable,
              buttons: options.button
            }
          }
        })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('알림톡 발송 실패:', error);
      throw error;
    }
  }

  /**
   * 배송완료 알림톡 발송 헬퍼 (지점 설정을 조회하여 발송)
   */
  static async sendDeliveryComplete(orderId: string, photoUrl: string, customClient?: any) {
    const client = customClient || supabase;
    try {
      // 1. 주문 정보 및 지점 설정 조회
      const { data: order, error: orderError } = await client
        .from('orders')
        .select('*, tenant_name')
        .eq('id', orderId)
        .single();

      if (orderError || !order) throw new Error('주문 정보를 찾을 수 없습니다.');

      const { data: settingsData, error: settingsError } = await client
        .from('system_settings')
        .select('data')
        .eq('id', 'settings')
        .single();

      const alimtalkSettings = settingsData?.data?.alimtalkSettings;

      if (!alimtalkSettings?.enabled || !alimtalkSettings?.apiKey) {
        console.warn('시스템 알림톡 설정이 비활성 상태입니다.');
        return { success: false, error: 'Settings disabled' };
      }

      // 2. 전송 시작 상태 기록
      await client
        .from('orders')
        .update({
          alimtalk_status: 'pending',
          alimtalk_sent_at: new Date().toISOString(),
          alimtalk_error: null
        })
        .eq('id', orderId);

      // 3. 알림톡 발송
      const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/delivery-status/${order.id}`;
      
      const credentials: SolapiCredentials = {
        apiKey: alimtalkSettings.apiKey,
        apiSecret: alimtalkSettings.apiSecret,
        pfid: alimtalkSettings.pfid
      };

      const result = await this.sendAlimtalk({
        to: order.orderer?.contact || order.delivery_info?.recipientContact || '',
        templateCode: alimtalkSettings.templateCodeDeliveryComplete || 'DELIVERY_COMPLETE_PHOTO',
        variable: {
          '#{주문자}': order.orderer?.name || '고객',
          '#{배송지}': order.delivery_info?.address || '배송지',
          '#{주문번호}': order.id.slice(0, 8),
          '#{지점명}': order.tenant_name || '릴리맥',
        },
        button: [
          {
            name: '배송 사진 확인하기',
            type: 'WL',
            linkMobile: publicUrl,
            linkPc: publicUrl
          }
        ]
      }, credentials);

      // 3. 결과 DB 업데이트
      const isSuccess = result.statusCode === 'SENDING' || result.messageId; // 솔라피 응답 기준
      
      await client
        .from('orders')
        .update({
          alimtalk_status: isSuccess ? 'success' : 'failed',
          alimtalk_sent_at: new Date().toISOString(),
          alimtalk_error: isSuccess ? null : (result.errorMessage || 'Unknown error')
        })
        .eq('id', orderId);

      return { success: isSuccess, result };

    } catch (error: any) {
      console.error('sendDeliveryComplete 에러:', error);
      
      // 실패 기록
      await client
        .from('orders')
        .update({
          alimtalk_status: 'failed',
          alimtalk_error: error.message
        })
        .eq('id', orderId);
        
      return { success: false, error: error.message };
    }
  }

  /**
   * 주문 접수 완료 알림톡 발송
   */
  static async sendOrderConfirmed(orderId: string, customClient?: any) {
    const client = customClient || supabase;
    try {
      const { data: order } = await client.from('orders').select('*, tenant_name').eq('id', orderId).single();
      const { data: settingsData } = await client.from('system_settings').select('data').eq('id', 'settings').single();
      
      const alimtalkSettings = settingsData?.data?.alimtalkSettings;
      if (!alimtalkSettings?.enabled || !alimtalkSettings?.apiKey) return { success: false, error: 'Settings disabled' };

      const credentials: SolapiCredentials = { apiKey: alimtalkSettings.apiKey, apiSecret: alimtalkSettings.apiSecret, pfid: alimtalkSettings.pfid };

      return await this.sendAlimtalk({
        to: order.orderer?.contact || '',
        templateCode: alimtalkSettings.templateCodeOrderConfirm || 'ORDER_CONFIRM_v1',
        variable: {
          '#{주문자}': order.orderer?.name || '고객',
          '#{주문금액}': order.total_amount?.toString() || '0',
          '#{주문번호}': order.id.slice(0, 8),
          '#{지점명}': order.tenant_name || '릴리맥',
        }
      }, credentials);
    } catch (error: any) {
      console.error('sendOrderConfirmed 에러:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 결제 완료(전자영수증) 알림톡 발송
   */
  static async sendPaymentComplete(orderId: string, customClient?: any) {
    const client = customClient || supabase;
    try {
      const { data: order } = await client.from('orders').select('*, tenant_name').eq('id', orderId).single();
      const { data: settingsData } = await client.from('system_settings').select('data').eq('id', 'settings').single();
      
      const alimtalkSettings = settingsData?.data?.alimtalkSettings;
      if (!alimtalkSettings?.enabled || !alimtalkSettings?.apiKey) return { success: false, error: 'Settings disabled' };

      const credentials: SolapiCredentials = { apiKey: alimtalkSettings.apiKey, apiSecret: alimtalkSettings.apiSecret, pfid: alimtalkSettings.pfid };
      const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/receipt/${order.id}`;

      return await this.sendAlimtalk({
        to: order.orderer?.contact || '',
        templateCode: alimtalkSettings.templateCodePaymentComplete || 'PAYMENT_COMPLETE_v1',
        variable: {
          '#{주문자}': order.orderer?.name || '고객',
          '#{결제금액}': order.total_amount?.toString() || '0',
          '#{주문번호}': order.id.slice(0, 8),
          '#{지점명}': order.tenant_name || '릴리맥',
        },
        button: [
          {
            name: '전자영수증 보기',
            type: 'WL',
            linkMobile: publicUrl,
            linkPc: publicUrl
          }
        ]
      }, credentials);
    } catch (error: any) {
      console.error('sendPaymentComplete 에러:', error);
      return { success: false, error: error.message };
    }
  }
}
