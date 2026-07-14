import { createClient } from "@supabase/supabase-js";

// 서버사이드 Supabase 클라이언트 (Service Role 필요)
// 만약 Client 측에서 호출하려면 createClient 컴포넌트 사용.
// 현재는 유틸리티로 어디서든 쓸 수 있게 작성

export async function syncOrderToGoogleSheets(tenantId: string, orderData: any) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. tenant의 설정된 webhook url 가져오기
    const { data: tenant, error } = await supabase
      .from("tenants")
      .select("gsheet_orders_webhook_url")
      .eq("id", tenantId)
      .single();

    if (error || !tenant || !tenant.gsheet_orders_webhook_url) {
      return; // 웹훅이 설정되어 있지 않음
    }

    // 2. 주문 데이터를 Google Sheets Webhook에 맞게 포맷팅
    // '등록일', '주문번호', '주문상태', '주문금액', '결제수단', '고객연락처', '주문내역', '메모'
    
    // 주문 항목을 텍스트로 합치기
    let itemsText = "";
    let ribbonText = "";
    if (orderData.items && Array.isArray(orderData.items)) {
      itemsText = orderData.items.map((i: any) => `${i.name || i.product_name} ${i.quantity}개`).join("\n");
      
      const ribbonItems = orderData.items.filter((i: any) => i.ribbonMessage);
      if (ribbonItems.length > 0) {
        ribbonText = ribbonItems.map((i: any) => {
          const r = i.ribbonMessage;
          let text = "";
          if (r.ribbonLeft || r.ribbonRight) text += `리본: 좌(${r.ribbonLeft || ''}) 우(${r.ribbonRight || ''}) `;
          if (r.messageCard || r.cardMessage) text += `카드: ${r.messageCard || r.cardMessage}`;
          return text;
        }).join("\n");
      }
    }

    if (!ribbonText && orderData.message) {
      ribbonText = `[${orderData.message.type === 'ribbon' ? '리본' : '카드'}] ${orderData.message.content || ''}`;
    }

    // 수령인/배송 정보 파싱
    const isDelivery = orderData.receipt_type === "delivery_reservation";
    const info = isDelivery ? orderData.delivery_info : orderData.pickup_info;
    const recipientName = isDelivery ? info?.recipientName : info?.pickerName;
    const recipientContact = isDelivery ? info?.recipientContact : info?.pickerContact;
    const dateTime = info?.date ? `${info.date} ${info.time || ''}` : "";
    const address = isDelivery ? `${info?.address || ''}` : "매장픽업";

    const payload = {
      "등록일": orderData.created_at || new Date().toISOString(),
      "주문일시": orderData.order_date || "",
      "주문번호": orderData.order_number || orderData.id,
      "주문상태": orderData.status,
      "수령방법": orderData.receipt_type === "delivery_reservation" ? "배송" : orderData.receipt_type === "pickup_reservation" ? "픽업예약" : "매장픽업",
      "주문자명": orderData.orderer?.name || "",
      "주문자연락처": orderData.orderer?.contact || orderData.customer_phone || "",
      "수령인명": recipientName || "",
      "수령인연락처": recipientContact || "",
      "배송/픽업일시": dateTime,
      "배송지주소": address,
      "주문상품내역": itemsText,
      "총결제금액": orderData.summary?.total || orderData.total_amount || 0,
      "결제수단": orderData.payment?.method || orderData.payment_method || "미정",
      "결제상태": orderData.payment?.status || "미정",
      "배송비": orderData.summary?.deliveryFee || 0,
      "기사명": orderData.delivery_info?.driverName || "",
      "기사연락처": orderData.delivery_info?.driverContact || "",
      "리본/카드문구": ribbonText,
      "요청사항/메모": orderData.memo || orderData.notes || ""
    };

    // 3. Webhook 전송 (에러가 나도 앱 동작을 막지 않도록 catch 처리)
    await fetch(tenant.gsheet_orders_webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      mode: "no-cors"
    });

    // 4. 주문 발생 시 고객 관리 시트에도 업데이트를 보내도록 호출
    if (orderData.orderer?.contact || orderData.customer_phone) {
      const contact = orderData.orderer?.contact || orderData.customer_phone;
      const { data: customerData } = await supabase
        .from("customers")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("phone", contact)
        .single();
        
      if (customerData) {
        // 최근 주문 정보 패치
        customerData.recent_order_items = payload["주문상품내역"];
        customerData.recent_order_amount = payload["총결제금액"];
        customerData.recent_order_date = payload["주문일시"] || payload["등록일"];
        await syncCustomerToGoogleSheets(tenantId, customerData);
      }
    }

  } catch (err) {
    console.error("Failed to sync order to google sheets", err);
  }
}

export async function syncCustomerToGoogleSheets(tenantId: string, customerData: any) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. tenant의 설정된 webhook url 가져오기
    const { data: tenant, error } = await supabase
      .from("tenants")
      .select("gsheet_customers_webhook_url")
      .eq("id", tenantId)
      .single();

    if (error || !tenant || !tenant.gsheet_customers_webhook_url) {
      return; // 웹훅이 설정되어 있지 않음
    }

    // 연락처가 없는 고객은 연동하지 않기 원할 수 있음, 하지만 이름/고유ID 기반으로도 매칭되도록 앱스크립트 구성함.
    // 2. 고객 데이터 포맷팅
    // ['등록일', '최근업데이트', '고객명', '연락처', '이메일', '총주문수', '총누적금액', '최근주문내역', '메모']
    
    // 최근 주문 내역 텍스트 생성 (주문에서 트리거된 경우)
    let recentOrderLog = "";
    if (customerData.recent_order_date) {
      recentOrderLog = `[${customerData.recent_order_date}] ${customerData.recent_order_items} (${customerData.recent_order_amount?.toLocaleString() || 0}원)`;
    }

    const payload = {
      "등록일": customerData.created_at || new Date().toISOString(),
      "최근업데이트": new Date().toISOString(),
      "고객명": customerData.name || "",
      "연락처": customerData.phone || "",
      "이메일": customerData.email || "",
      "총주문수": customerData.total_orders || 0,
      "총누적금액": customerData.total_spent || 0,
      "최근주문내역": recentOrderLog,
      "메모": customerData.memo || ""
    };

    // 3. Webhook 전송
    await fetch(tenant.gsheet_customers_webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      mode: "no-cors"
    });

  } catch (err) {
    console.error("Failed to sync customer to google sheets", err);
  }
}

export async function syncExpenseToGoogleSheets(tenantId: string, expenseData: any) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: tenant, error } = await supabase
      .from("tenants")
      .select("gsheet_expenses_webhook_url")
      .eq("id", tenantId)
      .single();

    if (error || !tenant || !tenant.gsheet_expenses_webhook_url) {
      return;
    }

    const payload = {
      "등록일": expenseData.created_at || new Date().toISOString(),
      "지출일자": expenseData.date || "",
      "항목분류": expenseData.category || "",
      "상세분류": expenseData.sub_category || "",
      "내역": expenseData.description || "",
      "금액": expenseData.amount || 0,
      "결제수단": expenseData.payment_method || "",
      "거래처": expenseData.vendor || "",
      "증빙자료": expenseData.receipt_url ? "있음" : "없음",
      "메모": expenseData.memo || ""
    };

    await fetch(tenant.gsheet_expenses_webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      mode: "no-cors"
    });

  } catch (err) {
    console.error("Failed to sync expense to google sheets", err);
  }
}
