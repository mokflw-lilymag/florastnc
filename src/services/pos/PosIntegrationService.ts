/**
 * POS 연동 서비스 - 핵심 비즈니스 로직
 * 고객 매칭, 주문 자동 생성, 포인트 처리를 담당
 */

import { SupabaseClient } from '@supabase/supabase-js';

// ─── 타입 정의 ───────────────────────────────────────────────────────────────

export type PosType = 'easycheck' | 'toss' | 'manual';

export interface PosIntegration {
  id: string;
  tenant_id: string;
  pos_type: PosType;
  api_key?: string;
  api_secret?: string;
  store_code?: string;
  webhook_secret?: string;
  is_active: boolean;
  auto_create_customer: boolean;
  auto_point_rate: number;
  last_synced_at?: string;
}

/** POS로부터 수신한 정규화된 결제 데이터 */
export interface NormalizedPosPayload {
  posTransactionId: string;         // POS 고유 결제번호
  posType: PosType;
  paidAt: string;                   // ISO 8601
  totalAmount: number;              // 결제 금액 (원)
  paymentMethod: 'card' | 'cash' | 'kakaopay' | 'naverpay' | 'etc';
  customerPhone?: string;           // 고객 전화번호 (있는 경우)
  customerName?: string;
  items: PosLineItem[];
  pointsUsed?: number;              // 포인트 사용액
  discountAmount?: number;          // 할인액
}

export interface PosLineItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PosMatchResult {
  success: boolean;
  orderId?: string;
  customerId?: string;
  isNewTransaction: boolean;
  errorMessage?: string;
}

// ─── POS Integration Service ────────────────────────────────────────────────

export const PosIntegrationService = {

  /**
   * HMAC-SHA256으로 Webhook 서명 검증
   */
  async verifyWebhookSignature(
    rawBody: string,
    receivedSignature: string,
    secret: string
  ): Promise<boolean> {
    try {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
      const calculatedSignature = Buffer.from(signatureBuffer).toString('hex');
      return calculatedSignature === receivedSignature;
    } catch {
      return false;
    }
  },

  /**
   * 전화번호 기반 고객 매칭 엔진 (3단계)
   */
  async matchCustomer(
    supabase: SupabaseClient,
    tenantId: string,
    phone?: string
  ): Promise<{ customerId: string | null; isNewCustomer: boolean }> {
    if (!phone) return { customerId: null, isNewCustomer: false };

    // 전화번호 정규화 (예: 010-1234-5678 → 01012345678)
    const normalizedPhone = phone.replace(/[^0-9]/g, '');

    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('tenant_id', tenantId)
      .or(`contact.eq.${normalizedPhone},contact.eq.${phone}`)
      .maybeSingle();

    if (customer) {
      return { customerId: customer.id, isNewCustomer: false };
    }

    return { customerId: null, isNewCustomer: true };
  },

  /**
   * 자동 고객 등록 (설정에서 auto_create_customer = true인 경우만)
   */
  async autoCreateCustomer(
    supabase: SupabaseClient,
    tenantId: string,
    payload: NormalizedPosPayload
  ): Promise<string | null> {
    if (!payload.customerPhone) return null;

    const normalizedPhone = payload.customerPhone.replace(/[^0-9]/g, '');

    const { data, error } = await supabase
      .from('customers')
      .insert({
        tenant_id: tenantId,
        name: payload.customerName || `워킹고객_${normalizedPhone.slice(-4)}`,
        contact: normalizedPhone,
        points: 0,
        total_spent: 0,
        order_count: 0,
        source: 'pos'
      })
      .select('id')
      .single();

    if (error) {
      console.error('[POS] Auto customer creation failed:', error);
      return null;
    }
    return data.id;
  },

  /**
   * 포인트 자동 적립
   */
  async applyPoints(
    supabase: SupabaseClient,
    customerId: string,
    totalAmount: number,
    pointsUsed: number,
    pointRate: number,
    description?: string,
    relatedOrderId?: string
  ): Promise<void> {
    const { data: customer } = await supabase
      .from('customers')
      .select('tenant_id, points, total_spent, order_count')
      .eq('id', customerId)
      .single();

    if (!customer) return;

    const pointsEarned = Math.floor(totalAmount * (pointRate / 100));
    const newPoints = Math.max(0, (customer.points || 0) + pointsEarned - pointsUsed);
    const newTotalSpent = (Number(customer.total_spent) || 0) + totalAmount;
    const newOrderCount = (customer.order_count || 0) + 1;

    // 1. 고객 포인트 요약 업데이트
    await supabase
      .from('customers')
      .update({
        points: newPoints,
        total_spent: newTotalSpent,
        order_count: newOrderCount,
        last_order_date: new Date().toISOString()
      })
      .eq('id', customerId);

    // 2. 포인트 트랜잭션 이력 기록 (적립)
    if (pointsEarned > 0) {
      await supabase.from('point_transactions').insert({
        tenant_id: customer.tenant_id,
        customer_id: customerId,
        amount: pointsEarned,
        type: 'earn',
        source: 'pos',
        description: description || 'POS 결제 적립',
        related_id: relatedOrderId
      });
    }

    // 3. 포인트 트랜잭션 이력 기록 (사용)
    if (pointsUsed > 0) {
      await supabase.from('point_transactions').insert({
        tenant_id: customer.tenant_id,
        customer_id: customerId,
        amount: -pointsUsed,
        type: 'use',
        source: 'pos',
        description: description || 'POS 결제 시 사용',
        related_id: relatedOrderId
      });
    }
  },

  /**
   * POS 결제 → FloraSync 주문 자동 생성 (핵심 메서드)
   */
  async processPosTransaction(
    supabase: SupabaseClient,
    tenantId: string,
    payload: NormalizedPosPayload,
    integration: PosIntegration
  ): Promise<PosMatchResult> {
    // 1. 중복 트랜잭션 체크
    const { data: existing } = await supabase
      .from('pos_transactions')
      .select('id, mapped_order_id, status')
      .eq('tenant_id', tenantId)
      .eq('pos_transaction_id', payload.posTransactionId)
      .maybeSingle();

    if (existing) {
      return {
        success: true,
        orderId: existing.mapped_order_id || undefined,
        isNewTransaction: false,
        errorMessage: '이미 처리된 트랜잭션입니다.'
      };
    }

    // 2. 트랜잭션 원본 저장 (pending)
    const { data: txRecord, error: txError } = await supabase
      .from('pos_transactions')
      .insert({
        tenant_id: tenantId,
        pos_type: payload.posType,
        pos_transaction_id: payload.posTransactionId,
        raw_payload: payload,
        status: 'pending'
      })
      .select('id')
      .single();

    if (txError || !txRecord) {
      return { success: false, isNewTransaction: true, errorMessage: '트랜잭션 저장 실패' };
    }

    try {
      // 3. 고객 매칭
      let { customerId } = await this.matchCustomer(supabase, tenantId, payload.customerPhone);

      if (!customerId && integration.auto_create_customer && payload.customerPhone) {
        customerId = await this.autoCreateCustomer(supabase, tenantId, payload);
      }

      // 4. 주문 자동 생성
      const orderNumber = `POS-${Date.now().toString(36).toUpperCase()}`;
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          tenant_id: tenantId,
          order_number: orderNumber,
          source: 'pos',
          pos_transaction_id: txRecord.id,
          status: 'completed',
          receipt_type: 'store_pickup',
          order_date: payload.paidAt,
          orderer: customerId
            ? { id: customerId, name: payload.customerName || '고객', contact: payload.customerPhone || '' }
            : { name: payload.customerName || '워킹 고객', contact: payload.customerPhone || '' },
          items: payload.items.map(item => ({
            id: `pos_${Date.now()}_${Math.random()}`,
            name: item.name,
            quantity: item.quantity,
            price: item.unitPrice
          })),
          summary: {
            subtotal: payload.totalAmount + (payload.discountAmount || 0),
            discount: payload.discountAmount || 0,
            total: payload.totalAmount,
            pointsUsed: payload.pointsUsed || 0,
            pointsEarned: customerId
              ? Math.floor(payload.totalAmount * (integration.auto_point_rate / 100))
              : 0
          },
          payment: {
            method: payload.paymentMethod === 'kakaopay' || payload.paymentMethod === 'naverpay'
              ? 'card'
              : payload.paymentMethod as 'card' | 'cash',
            status: 'paid'
          }
        })
        .select('id')
        .single();

      if (orderError || !order) {
        throw new Error('주문 생성 실패: ' + orderError?.message);
      }

      // 5. 포인트 적립
      if (customerId) {
        await this.applyPoints(
          supabase,
          customerId,
          payload.totalAmount,
          payload.pointsUsed || 0,
          integration.auto_point_rate,
          `POS 결제 적립 (${orderNumber})`,
          order.id
        );
      }

      // 6. 트랜잭션 상태 → mapped
      await supabase
        .from('pos_transactions')
        .update({
          mapped_order_id: order.id,
          matched_customer_id: customerId,
          status: 'mapped',
          processed_at: new Date().toISOString()
        })
        .eq('id', txRecord.id);

      // 7. 연동 마지막 동기화 시각 업데이트
      await supabase
        .from('pos_integrations')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('tenant_id', tenantId);

      return {
        success: true,
        orderId: order.id,
        customerId: customerId || undefined,
        isNewTransaction: true
      };

    } catch (err: any) {
      // 실패 시 트랜잭션 상태 → failed
      await supabase
        .from('pos_transactions')
        .update({ status: 'failed', error_message: err.message })
        .eq('id', txRecord.id);

      return { success: false, isNewTransaction: true, errorMessage: err.message };
    }
  },

  /**
   * POS 통합 설정 조회
   */
  async getIntegration(
    supabase: SupabaseClient,
    tenantId: string
  ): Promise<PosIntegration | null> {
    const { data } = await supabase
      .from('pos_integrations')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .maybeSingle();
    return data;
  }
};
