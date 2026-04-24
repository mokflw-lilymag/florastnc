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
      .eq('shop_id', tenant_id)
      .eq('platform', 'cafe24')
      .single();

    if (integrationError || !integration || !integration.client_id) {
      return NextResponse.json({ error: 'Cafe24 연동 정보가 없습니다.' }, { status: 400 });
    }

    const { mall_id, access_token } = integration;

    if (!mall_id || !access_token) {
      return NextResponse.json({ 
        success: false, 
        error: '실제 데이터를 가져오려면 먼저 [카페24 로그인 연동] 버튼을 눌러 인증을 완료해주세요.'
      }, { status: 400 });
    }

    // 2. 실제 통신: 카페24 API에서 주문 목록 가져오기
    // 최근 1주일치 주문 조회
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);
    
    // YYYY-MM-DD 형식으로 변환
    const start_date = startDate.toISOString().split('T')[0];
    const end_date = endDate.toISOString().split('T')[0];

    const ordersUrl = `https://${mall_id}.cafe24api.com/api/v2/admin/orders?start_date=${start_date}&end_date=${end_date}&embed=items,receivers`;

    const ordersResponse = await fetch(ordersUrl, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
        'X-Cafe24-Api-Version': '2026-03-01'
      }
    });

    const cafe24Data = await ordersResponse.json();

    if (!ordersResponse.ok) {
      console.error('Cafe24 Orders API Error:', cafe24Data);
      return NextResponse.json({ 
        success: false, 
        error: `카페24 통신 오류: ${cafe24Data.error?.message || '알 수 없는 오류'}`
      }, { status: 400 });
    }

    const cafe24Orders = cafe24Data.orders || [];
    if (cafe24Orders.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: '동기화 완료 (최근 7일간의 새 주문이 없습니다.)',
        synced_count: 0
      });
    }

    // 3. Cafe24 주문 데이터를 프록싱크 DB 구조로 매핑
    const mappedOrders = cafe24Orders.map((o: any) => {
      // 1. 상품 정보 추출
      const items = (o.items || []).map((item: any) => ({
        name: item.product_name || item.product_name_default || "기타 상품",
        quantity: Number(item.quantity || 1),
        price: Number(item.product_price || 0)
      }));

      // 2. 수령인 정보 (배송지 정보)
      const receiver = o.receivers?.[0] || {};
      
      // 3. 결제 금액 정보
      const actualAmount = Number(o.actual_order_amount || o.payment_amount || 0);
      const initialAmount = Number(o.initial_order_amount || actualAmount || 0);
      const shippingFee = Number(o.shipping_fee || 0);

      return {
        tenant_id: tenant_id,
        order_number: `C24-${o.order_id}`,
        orderer: { 
          name: o.buyer_name || receiver.name || "고객", 
          contact: o.buyer_cellphone || o.buyer_phone || receiver.cellphone || "" 
        },
        items: items.length > 0 ? items : [{ name: "기타 상품", quantity: 1, price: actualAmount }],
        summary: { 
          subtotal: initialAmount, 
          discountAmount: Number(o.total_discount_amount || 0), 
          discountRate: 0, 
          deliveryFee: shippingFee, 
          total: actualAmount 
        },
        payment: { 
          method: "shopping_mall", 
          status: (o.payment_status === "T" || o.order_status === "N10") ? "paid" : "pending" 
        },
        delivery_info: { 
          recipientName: receiver.name || o.buyer_name || "", 
          recipientContact: receiver.cellphone || receiver.phone || o.buyer_cellphone || "", 
          address: `${receiver.address_full || ''} ${receiver.address_detail || ''}`.trim(),
          district: "" 
        },
        status: "processing",
        order_date: o.order_date || new Date().toISOString(),
        receipt_type: "delivery_reservation",
        source: "online", 
        memo: o.buyer_message || ""
      };
    });

    // 4. Supabase DB에 주문 데이터 삽입 (order_number 중복 방지를 위한 upsert 등 추가 가능)
    // 현재는 단순 insert 처리 (에러 발생 시 catch 로 넘김)
    for (const order of mappedOrders) {
      const { error: insertError } = await supabaseAdmin
        .from('orders')
        .insert([order]);
        
      if (insertError) {
         // 고유값 중복(이미 불러온 주문) 에러는 무시
         if (insertError.code !== '23505') { 
           console.error("Order Insert Error", insertError);
         }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Cafe24 주문 ${mappedOrders.length}건이 동기화되었습니다.`,
      synced_count: mappedOrders.length
    });
  } catch (error: any) {
    console.error('Cafe24 Sync Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
