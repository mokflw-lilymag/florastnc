import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 이 라우트는 Cafe24 등 외부 쇼핑몰 서버에서 호출하거나 프론트에서 수동 동기화를 위해 호출합니다.
export async function POST(req: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 프론트엔드에서 현재 유저의 토큰이나 세션을 넘겨주었다고 가정
    const { tenant_id } = await req.json();

    if (!tenant_id) {
      return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 });
    }

    // 1. 저장된 Cafe24 API 키 확인
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from('shop_integrations')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('platform', 'cafe24')
      .single();

    if (integrationError || !integration || !integration.client_id) {
      return NextResponse.json({ error: 'Cafe24 연동 정보가 없습니다.' }, { status: 400 });
    }

    // 2. 실제 Cafe24 API를 호출하여 토큰 발급 및 주문 수집 (구조만 구현, 현재는 시뮬레이션)
    /*
      const tokenResponse = await fetch(`https://${mall_id}.cafe24api.com/api/v2/oauth/token`, { ... });
      const ordersResponse = await fetch(`https://${mall_id}.cafe24api.com/api/v2/admin/orders`, { ... });
      const cafe24Orders = await ordersResponse.json();
    */

    // [시뮬레이션] 통신에 성공했다고 가정하고 프록싱크 DB에 삽입할 가상 주문 데이터 생성
    // (실제로는 cafe24Orders 데이터를 파싱해서 매핑해야 합니다)
    const mockCafe24Order = {
      tenant_id: tenant_id,
      order_number: `C24-${Math.floor(Math.random() * 1000000)}`,
      orderer: { name: "카페24고객", contact: "010-1234-5678" },
      items: [
        { name: "[자동수집] 카페24 테스트 상품", quantity: 1, price: 55000 }
      ],
      summary: { subtotal: 55000, shipping: 0, discount: 0, total: 55000 },
      payment: { method: "카드결제", status: "paid" },
      delivery_info: { 
        recipientName: "홍길동", 
        contact: "010-9876-5432", 
        address: "서울시 강남구 테헤란로 123",
        memo: "문 앞에 놔주세요"
      },
      status: "processing", // 준비중 상태로 삽입
      order_date: new Date().toISOString(),
      receipt_type: "delivery_reservation",
      source: "cafe24", // 카페24 출처 명시
    };

    // 3. Supabase DB에 주문 데이터 삽입
    const { error: insertError } = await supabaseAdmin
      .from('orders')
      .insert([mockCafe24Order]);

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Cafe24 주문 1건이 성공적으로 동기화되었습니다.',
      synced_count: 1
    });

  } catch (error: any) {
    console.error('Cafe24 Sync Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
