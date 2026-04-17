import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 이 엔드포인트는 카페24 앱에서 주문 생성(Order Create) 알림이 발생했을 때 호출됩니다.
// 카페24 앱 등록 시 'Notification URL'로 설정합니다.
export async function POST(request: Request) {
  try {
    const payload = await request.json();
    console.log('--- [Cafe24] 새 알림 수신:', JSON.stringify(payload));

    // Supabase Service Role Key를 사용하여 서버 권한으로 데이터 기록
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. 카페24 주문 데이터 파싱 (Cafe24 Webhook Payload 구조 반영)
    // payload 안의 resource가 orders 인 경우
    if (payload.event_type !== 'orders.create') {
        return NextResponse.json({ success: true, message: 'Not an order create event. Ignored.' });
    }

    const orderData = payload.resource || {};
    const externalOrderId = orderData.order_id || `CAFE24_MOCK_${Date.now()}`;
    const shopNo = payload.mall_id || 'default-mall-id';

    // 2. FloraSync 통합 스키마에 맞게 정제(Normalization)
    const newOrder = {
      id: crypto.randomUUID(), 
      source_mall: 'cafe24',
      external_order_id: externalOrderId,
      orderer_name: orderData.buyer_name || '카페24 구매자',
      recipient_name: orderData.receiver_name || '수령인',
      recipient_phone: orderData.receiver_cellphone || '010-0000-0000',
      delivery_address: `${orderData.receiver_address1 || ''} ${orderData.receiver_address2 || ''}`,
      total_amount: orderData.actual_order_amount || 0,
      memo: orderData.order_message || '',
      status: 'pending', // 서버에 등록 시점에는 '접수대기'
      created_at: new Date().toISOString()
    };

    // 3. pos_orders 또는 deliveries에 통합 삽입
    const { error } = await supabase
      .from('pos_orders')
      .insert([
        {
            id: newOrder.id,
            sync_id: newOrder.external_order_id,
            customer_name: newOrder.orderer_name,
            total_price: newOrder.total_amount,
            status: 'completed', 
            type: '자사몰(카페24)'
        }
      ]);

    if (error) {
      console.error('DB Insert Error [Cafe24]:', error);
      return NextResponse.json({ error: 'DB Save Failed' }, { status: 500 });
    }

    console.log('✅ 카페24 주문 수집 완료:', externalOrderId);
    return NextResponse.json({ success: true, message: 'Cafe24 Webhook processed normally' });

  } catch (error: any) {
    console.error('Cafe24 Webhook Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
