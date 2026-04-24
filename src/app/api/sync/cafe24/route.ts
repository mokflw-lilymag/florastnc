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
      return NextResponse.json({ 
        success: false, 
        message: 'Cafe24 연동 설정이 필요합니다.',
        synced_count: 0 
      }, { status: 200 }); // 400 대신 200으로 반환하여 콘솔 에러 방지
    }

    // 활성화 상태 체크
    if (!integration.is_active) {
      return NextResponse.json({ 
        success: true, 
        message: '카페24 동기화가 비활성화 상태입니다.',
        synced_count: 0 
      });
    }

    const { mall_id, access_token } = integration;

    if (!mall_id || !access_token) {
      return NextResponse.json({ 
        success: false, 
        message: '카페24 인증(로그인)이 완료되지 않았습니다.',
        synced_count: 0
      }, { status: 200 });
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
      // 1. 상품 정보 추출 (embed=items 대응)
      const rawItems = o.items || [];
      const items = rawItems.map((item: any) => ({
        name: item.product_name || item.product_name_default || "기타 상품",
        quantity: Number(item.quantity || 1),
        price: Number(item.product_price || 0)
      }));

      // 2. 수령인 정보 (embed=receivers 대응)
      const receiver = (o.receivers && o.receivers.length > 0) ? o.receivers[0] : {};
      
      // 3. 결제 금액 정보 (다양한 필드 시도)
      // payment_amount: 결제된 금액 (가장 정확), actual_order_amount: 실제 결제액
      const actualAmount = Number(o.payment_amount || o.actual_order_amount || o.total_order_amount || 0) || 0;
      const initialAmount = Number(o.total_order_price || o.initial_order_amount || actualAmount || 0) || 0;
      const shippingFee = Number(o.shipping_fee || 0) || 0;
      const discountAmount = Number(o.total_discount_amount || 0) || 0;

      // 5. 희망배송일 (없으면 주문일) 분리 처리
      const rawDeliveryDate = o.hope_shipment_date || o.order_date || new Date().toISOString();
      const d = new Date(rawDeliveryDate);
      const deliveryDateOnly = d.toISOString().split('T')[0];
      const deliveryTimeOnly = d.toTimeString().split(' ')[0].substring(0, 5); // HH:mm

      // 4. 주문자 정보 추출
      const customerName = o.buyer_name || "비회원";
      const customerContact = o.buyer_cellphone || o.buyer_phone || "";

      const shippingMemo = o.buyer_message || receiver.shipping_message || "";

      return {
        tenant_id: tenant_id,
        order_number: `C24-${o.order_id}`,
        orderer: { 
          name: customerName, 
          contact: customerContact 
        },
        items: items.length > 0 ? items : [{ name: "기타 상품", quantity: 1, price: actualAmount }],
        summary: { 
          subtotal: initialAmount, 
          discountAmount: discountAmount, 
          discountRate: 0, 
          deliveryFee: shippingFee, 
          total: actualAmount 
        },
        payment: { 
          method: o.payment_method?.[0] || "shopping_mall", 
          status: (o.payment_status === "T" || o.order_status === "N10") ? "paid" : "pending" 
        },
        delivery_info: { 
          date: deliveryDateOnly,
          time: deliveryTimeOnly,
          recipientName: receiver.name || customerName, 
          recipientContact: receiver.cellphone || receiver.phone || customerContact, 
          address: `${receiver.address_full || ''} ${receiver.address_detail || ''}`.trim(),
          district: "" 
        },
        status: "processing",
        order_date: rawDeliveryDate,
        created_at: o.order_date || new Date().toISOString(),
        receipt_type: "delivery_reservation",
        source: "online", 
        memo: shippingMemo,
        message: {
          type: shippingMemo ? 'card' : 'none',
          content: shippingMemo
        },
        extra_data: { raw_cafe24: o } // 디버깅용 원본 데이터 저장
      };
    });

    // 4. Supabase DB에 주문 데이터 업서트 (중복 시 업데이트하여 빈 데이터 채움)
    for (const order of mappedOrders) {
      const { error: upsertError } = await supabaseAdmin
        .from('orders')
        .upsert(order, { onConflict: 'tenant_id, order_number' });
        
      if (upsertError) {
        console.error("Order Upsert Error", upsertError);
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
