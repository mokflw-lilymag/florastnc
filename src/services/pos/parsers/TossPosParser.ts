/**
 * 토스POS Webhook 파서
 * TossPlace(토스 POS)에서 전송하는 결제완료 이벤트를 NormalizedPosPayload로 변환
 * 
 * 참고: https://docs.tosspayments.com/reference (TossPlace 파트너 API)
 * ※ 실제 토스POS 파트너 계약 후 정확한 payload 구조 확인 필요
 */

import { NormalizedPosPayload, PosLineItem } from '../PosIntegrationService';

interface TossPosPayload {
  paymentKey: string;           // 결제 고유키
  orderId: string;              // 주문 ID
  approvedAt: string;           // 결제 승인 시각 (ISO 8601)
  totalAmount: number;          // 결제 금액
  method: string;               // '카드' | '현금' | '간편결제'
  easyPay?: {
    provider: string;           // 'KAKAOPAY' | 'NAVERPAY' | 'TOSSPAY' 등
  };
  metadata?: {
    customerPhone?: string;
    customerName?: string;
  };
  discount?: {
    amount: number;
  };
  useEscrow?: boolean;
  orderLines?: Array<{
    itemName: string;
    quantity: number;
    unitAmount: number;
    totalAmount: number;
  }>;
}

export function parseTossPosPayload(raw: TossPosPayload): NormalizedPosPayload {
  // 결제 수단 매핑
  let paymentMethod: NormalizedPosPayload['paymentMethod'];
  if (raw.method === '카드') {
    paymentMethod = 'card';
  } else if (raw.method === '현금') {
    paymentMethod = 'cash';
  } else if (raw.method === '간편결제') {
    const provider = raw.easyPay?.provider?.toUpperCase();
    if (provider === 'KAKAOPAY') paymentMethod = 'kakaopay';
    else if (provider === 'NAVERPAY') paymentMethod = 'naverpay';
    else paymentMethod = 'card'; // 기타 간편결제는 카드로 처리
  } else {
    paymentMethod = 'etc';
  }

  // 상품 라인 아이템
  const items: PosLineItem[] = raw.orderLines?.map(line => ({
    name: line.itemName,
    quantity: line.quantity,
    unitPrice: line.unitAmount,
    totalPrice: line.totalAmount
  })) ?? [{
    name: '매장 판매',
    quantity: 1,
    unitPrice: raw.totalAmount,
    totalPrice: raw.totalAmount
  }];

  return {
    posTransactionId: raw.paymentKey,
    posType: 'toss',
    paidAt: raw.approvedAt ?? new Date().toISOString(),
    totalAmount: raw.totalAmount,
    paymentMethod,
    customerPhone: raw.metadata?.customerPhone,
    customerName: raw.metadata?.customerName,
    items,
    discountAmount: raw.discount?.amount ?? 0
  };
}
