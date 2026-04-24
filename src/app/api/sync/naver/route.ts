import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// 네이버 커머스 API HMAC 서명 생성 (API 호출용)
function generateNaverSignature(clientId: string, clientSecret: string, timestamp: number, path: string): string {
  const message = `${path}\n${timestamp}`;
  return crypto.createHmac('SHA256', clientSecret).update(message).digest('base64');
}

// 네이버 커머스 API 토큰 발급용 서명 생성
function generateTokenSignature(clientId: string, clientSecret: string, timestamp: number): string {
  const message = `${clientId}_${timestamp}`;
  return crypto.createHmac('SHA256', clientSecret).update(message).digest('base64');
}

export async function POST(req: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { tenant_id } = await req.json();

    if (!tenant_id) {
      return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 });
    }

    // 1. 저장된 네이버 커머스 API 키 확인
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from('shop_integrations')
      .select('*')
      .eq('shop_id', tenant_id)
      .eq('platform', 'naver_commerce')
      .single();

    if (integrationError || !integration || !integration.client_id) {
      return NextResponse.json({ 
        success: false, 
        message: '네이버 커머스 연동 설정이 필요합니다.',
        synced_count: 0
      }, { status: 200 }); // 400 -> 200
    }

    // 활성화 상태 체크
    if (!integration.is_active) {
      return NextResponse.json({ 
        success: true, 
        message: '네이버 동기화가 비활성화 상태입니다.',
        synced_count: 0 
      });
    }

    const { client_id, client_secret } = integration;

    if (!client_id || !client_secret) {
      return NextResponse.json({
        success: false,
        message: '네이버 커머스 API 키 설정이 완료되지 않았습니다.',
        synced_count: 0
      }, { status: 200 });
    }

    // 2. 네이버 커머스 Access Token 발급
    const tokenTimestamp = Date.now();
    const tokenSignature = generateTokenSignature(client_id, client_secret, tokenTimestamp);
    
    const tokenParams = new URLSearchParams();
    tokenParams.append('client_id', client_id);
    tokenParams.append('timestamp', tokenTimestamp.toString());
    tokenParams.append('grant_type', 'client_credentials');
    tokenParams.append('client_secret_sign', tokenSignature);
    tokenParams.append('type', 'SELF');

    const tokenRes = await fetch('https://api.commerce.naver.com/external/v1/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error('Naver Token API Error:', tokenData);
      return NextResponse.json({ 
        success: false, 
        message: `네이버 인증 실패: API 키를 확인해주세요.` 
      }, { status: 200 });
    }

    const accessToken = tokenData.access_token;

    // 3. 네이버 커머스 API 호출 - 최근 주문 조회
    const timestamp = Date.now();
    const path = '/v1/pay-order/seller/product-orders/last-changed-statuses';

    // 최근 24시간 주문 상태 변경 조회
    const since = new Date();
    since.setHours(since.getHours() - 24);
    const lastChangedFrom = since.toISOString();

    const apiUrl = `https://api.commerce.naver.com/external${path}?lastChangedFrom=${encodeURIComponent(lastChangedFrom)}`;

    const ordersResponse = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const naverData = await ordersResponse.json();

    if (!ordersResponse.ok) {
      console.error('Naver Commerce API Error:', naverData);
      return NextResponse.json({
        success: false,
        message: `네이버 통신 오류: ${naverData.message || naverData.error?.message || '인증이 만료되었을 수 있습니다.'}`,
        synced_count: 0
      }, { status: 200 });
    }

    const productOrders = naverData.data?.lastChangeStatuses || [];
    if (productOrders.length === 0) {
      return NextResponse.json({
        success: true,
        message: '동기화 완료 (최근 24시간 내 새 주문이 없습니다.)',
        synced_count: 0
      });
    }

    // 3. 각 상품주문의 상세 정보를 가져와서 DB에 저장
    let syncedCount = 0;

    for (const po of productOrders) {
      const productOrderId = po.productOrderId;
      const detailPath = `/v1/pay-order/seller/product-orders/${productOrderId}`;

      const detailRes = await fetch(`https://api.commerce.naver.com/external${detailPath}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!detailRes.ok) continue;

      const detailData = await detailRes.json();
      const order = detailData.data;
      if (!order) continue;

      const rawOrderDate = order.orderDate || new Date().toISOString();
      const d = new Date(rawOrderDate);
      const deliveryDateOnly = d.toISOString().split('T')[0];
      const deliveryTimeOnly = d.toTimeString().split(' ')[0].substring(0, 5);

      const mappedOrder = {
        tenant_id: tenant_id,
        order_number: `NV-${order.orderId || productOrderId}`,
        orderer: {
          name: order.order?.ordererName || '고객',
          contact: order.order?.ordererTel || ''
        },
        items: [{
          name: order.product?.productName || '상품',
          quantity: order.quantity || 1,
          price: Number(order.totalPaymentAmount || 0)
        }],
        summary: {
          subtotal: Number(order.totalPaymentAmount || 0),
          discountAmount: Number(order.knowledgeShoppingSellingDiscountAmount || 0),
          discountRate: 0,
          deliveryFee: Number(order.deliveryFeeAmount || 0),
          total: Number(order.totalPaymentAmount || 0)
        },
        payment: {
          method: 'card',
          status: order.paymentDate ? 'paid' : 'pending'
        },
        delivery_info: {
          date: deliveryDateOnly,
          time: deliveryTimeOnly,
          recipientName: order.shippingAddress?.name || order.order?.ordererName || '',
          recipientContact: order.shippingAddress?.tel1 || '',
          address: `${order.shippingAddress?.baseAddress || ''} ${order.shippingAddress?.detailedAddress || ''}`.trim(),
          district: ''
        },
        status: 'processing',
        order_date: rawOrderDate,
        created_at: rawOrderDate,
        receipt_type: 'delivery_reservation',
        source: 'online',
        memo: order.shippingMemo || '',
        message: {
          type: 'none',
          content: ''
        }
      };

      const { error: upsertError } = await supabaseAdmin
        .from('orders')
        .upsert(mappedOrder, { onConflict: 'tenant_id, order_number' });

      if (upsertError) {
        console.error('Naver Order Upsert Error:', upsertError);
      } else {
        syncedCount++;
      }
    }

    // 4. 마지막 동기화 시간 업데이트
    await supabaseAdmin
      .from('shop_integrations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('shop_id', tenant_id)
      .eq('platform', 'naver_commerce');

    return NextResponse.json({
      success: true,
      message: `네이버 주문 ${syncedCount}건이 동기화되었습니다.`,
      synced_count: syncedCount
    });
  } catch (error: any) {
    console.error('Naver Sync Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
