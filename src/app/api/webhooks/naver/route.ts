import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { errAdminOperationFailed, errApiDbSaveFailed, msgApiWebhookProcessed } from '@/lib/admin/admin-api-errors';
import { hqApiUiBase } from '@/lib/hq/hq-api-locale';

// 이 엔드포인트는 네이버 스마트스토어 API에서 주문 변경(결제완료 등) 알림이 발생했을 때 호출됩니다.
// 네이버 커머스 알림 수신(Webhook) URL 설정에 이 주소를 입력하게 됩니다.
export async function POST(request: Request) {
  try {
    const bl = await hqApiUiBase(request);
    const payload = await request.json();
    console.log('--- [Naver Commerce] 새 알림 수신:', JSON.stringify(payload));

    // Supabase Service Role Key를 사용하여 서버 권한으로 데이터 기록 (Webhook은 사용자 세션이 없으므로)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. 네이버 주문 데이터 파싱 (실제 네이버 커머스 Schema에 맞게 변환)
    // 예: 네이버는 ProductOrderId가 고유값이 됩니다.
    const externalOrderId = payload.ProductOrderId || `NAVER_MOCK_${Date.now()}`;
    const status = payload.Status || 'PAYED'; // 결제완료
    const shopId = payload.SellerId || 'default-shop-id'; // 실제 환경에선 seller 식별자 매핑

    if (status === 'PAYED') {
      // 2. Floxync 통합 스키마에 맞게 정제(Normalization)
      const newOrder = {
        id: crypto.randomUUID(), 
        source_mall: 'naver_commerce',
        external_order_id: externalOrderId,
        orderer_name: payload.OrdererName || '네이버 구매자',
        recipient_name: payload.ReceiverName || '수령인',
        recipient_phone: payload.ReceiverTelNo1 || '010-0000-0000',
        delivery_address: `${payload.BaseAddress || ''} ${payload.DetailedAddress || ''}`,
        total_amount: payload.TotalPaymentAmount || 0,
        memo: payload.ShippingMemo || '',
        status: 'pending', // Floxync 기본 상태 '접수대기'
        created_at: new Date().toISOString()
      };

      // 3. pos_orders 또는 deliveries(Floxync 메인 주문 테이블)에 삽입
      // 임시로 pos_orders 테이블이라고 가정
      const { error } = await supabase
        .from('pos_orders')
        .insert([
          {
             // 매핑 로직 (스키마에 맞춰 실제 적용해야 함)
             id: newOrder.id,
             sync_id: newOrder.external_order_id,
             customer_name: newOrder.orderer_name,
             total_price: newOrder.total_amount,
             status: 'completed', // POS 승인완료처럼 처리
             type: '네이버스토어'
             // delivery_address 등은 연결된 테이블 속성에 맞게 배정
          }
        ]);

      if (error) {
        console.error('DB Insert Error:', error);
        return NextResponse.json({ error: errApiDbSaveFailed(bl) }, { status: 500 });
      }

      // Realtime을 통해 클라이언트로 새 주문 알람 트리거 가능
      console.log('✅ 네이버 스마트스토어 주문 수집 완료:', externalOrderId);
    }

    return NextResponse.json({ success: true, message: msgApiWebhookProcessed(bl, "Naver") });

  } catch (error: unknown) {
    console.error('Naver Webhook Error:', error);
    const bl = await hqApiUiBase(request);
    return NextResponse.json({ success: false, error: errAdminOperationFailed(bl) }, { status: 500 });
  }
}
