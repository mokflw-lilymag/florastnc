/**
 * 이지체크 Webhook 파서
 * 이지체크 POS에서 전송하는 결제완료 이벤트를 NormalizedPosPayload로 변환
 * 
 * ※ 실제 이지체크 파트너 API 계약 후 payload 구조를 정확히 확인하여 업데이트 필요
 */

import { NormalizedPosPayload, PosLineItem } from '../PosIntegrationService';

interface EasyCheckPayload {
  approval_no: string;          // 승인번호
  approval_date: string;        // 승인일시 (YYMMDDHHmmss)
  amount: number;               // 결제금액
  tax_amount?: number;          // 부가세
  tip_amount?: number;          // 봉사료
  pay_type: string;             // 'CARD' | 'CASH' | 'KAKAO' | 'NAVER' | 'ZERO_PAY'
  customer_phone?: string;      // 고객 전화번호 (마스킹 해제 필요)
  customer_name?: string;
  point_use?: number;           // 포인트 사용액
  discount_amount?: number;     // 할인액
  items?: Array<{
    name: string;
    qty: number;
    unit_price: number;
    total_price: number;
  }>;
  store_code?: string;
}

export function parseEasyCheckPayload(raw: EasyCheckPayload): NormalizedPosPayload {
  // 승인일시 파싱: 'YYMMDDHHmmss' → ISO 8601
  const d = raw.approval_date;
  const paidAt = d
    ? `20${d.substring(0, 2)}-${d.substring(2, 4)}-${d.substring(4, 6)}T${d.substring(6, 8)}:${d.substring(8, 10)}:${d.substring(10, 12)}+09:00`
    : new Date().toISOString();

  // 결제 수단 매핑
  const paymentMethodMap: Record<string, NormalizedPosPayload['paymentMethod']> = {
    'CARD': 'card',
    'CASH': 'cash',
    'KAKAO': 'kakaopay',
    'NAVER': 'naverpay',
    'ZERO_PAY': 'etc'
  };

  // 상품 라인 아이템 파싱
  const items: PosLineItem[] = raw.items?.map(item => ({
    name: item.name,
    quantity: item.qty,
    unitPrice: item.unit_price,
    totalPrice: item.total_price
  })) ?? [
    // 상품 내역 없을 경우 단일 아이템으로 처리
    {
      name: '매장 판매',
      quantity: 1,
      unitPrice: raw.amount,
      totalPrice: raw.amount
    }
  ];

  return {
    posTransactionId: raw.approval_no,
    posType: 'easycheck',
    paidAt,
    totalAmount: raw.amount,
    paymentMethod: paymentMethodMap[raw.pay_type?.toUpperCase()] ?? 'etc',
    customerPhone: raw.customer_phone,
    customerName: raw.customer_name,
    items,
    pointsUsed: raw.point_use ?? 0,
    discountAmount: raw.discount_amount ?? 0
  };
}
