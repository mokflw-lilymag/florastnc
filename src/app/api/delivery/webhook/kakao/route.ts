import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MessageService } from '@/services/message-service';

// 관리자 권한의 Supabase 클라이언트 초기화 (Webhook에서는 인증된 세션이 없으므로)
// 보통 환경변수에서 가져오지만, 로컬 환경을 위해 폴백을 제공합니다.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    console.log('📦 [KakaoT Webhook] 수신된 페이로드:', payload);

    // 카카오T 웹훅 사양에 맞춘 변수 (상황에 따라 맞춰 조정 필요)
    const { 
      trackingId,      // 매핑된 배차 ID (delivery_tracking_id)
      eventType,       // 이벤트 종류 (ALLOCATED, PICKUP_DONE, DELIVERED_DONE 등)
      driverName, 
      driverPhone, 
      trackingUrl,     // 실시간 위치 추적 URL
      photoUrl         // 완료 시 사진 URL
    } = payload;

    if (!trackingId) {
      return NextResponse.json({ error: 'Missing trackingId' }, { status: 400 });
    }

    // 1. 해당 trackingId를 가진 주문 찾기
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`id, tenant_id, order_number, delivery_info, orderer, delivery_provider_status`)
      .eq('delivery_tracking_id', trackingId)
      .single();

    if (orderError || !order) {
      console.error('❌ 일치하는 주문을 찾을 수 없습니다.', trackingId);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const { id, tenant_id, delivery_info, orderer } = order;

    // 2. 새로운 delivery_info 병합 (기사 정보, 사진 URL 업데이트)
    const updatedDeliveryInfo = {
      ...delivery_info,
      driverName: driverName || delivery_info?.driverName,
      driverContact: driverPhone || delivery_info?.driverContact,
      completionPhotoUrl: photoUrl || delivery_info?.completionPhotoUrl,
    };

    // 3. 상태 맵핑 (카카오 이벤트 -> 앱 상태)
    let newStatus = order.delivery_provider_status;
    if (eventType === 'ALLOCATED') newStatus = 'assigned';
    else if (eventType === 'PICKUP_DONE') newStatus = 'picked_up';
    else if (eventType === 'DELIVERED_DONE') newStatus = 'delivered';

    // 4. DB 업데이트 실행
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        delivery_info: updatedDeliveryInfo,
        delivery_tracking_url: trackingUrl || null,
        delivery_provider_status: newStatus,
        ...(newStatus === 'delivered' ? { status: 'completed', completed_at: new Date().toISOString() } : {})
      })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    console.log(`✅ 주문 ${order.order_number} (${trackingId}) 상태 ${newStatus} 로 업데이트 완료`);

    // 5. 배송 완료 시 알림톡 자동 전송 훅 실행
    if (newStatus === 'delivered' && orderer?.contact) {
      await MessageService.sendDeliveryCompleteAlert(supabase, tenant_id, {
        to: orderer.contact,
        orderNumber: order.order_number,
        text: '배송 완료', // 상세 텍스트는 서비스 모듈에서 조립
        photoUrl: photoUrl,
        trackingUrl: trackingUrl
      });
    }

    return NextResponse.json({ success: true, newStatus });

  } catch (err: any) {
    console.error('❌ [KakaoT Webhook] 에러 발생:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
