import { SupabaseClient } from '@supabase/supabase-js';

export type OrderType = "store" | "pickup" | "delivery";

export async function enqueuePrintJob(
  supabase: SupabaseClient,
  tenantId: string,
  orderId: string,
  orderType: OrderType,
  orderData: any,
  isManualReprint: boolean = false,
  reprintType?: 'order_form' | 'receipt' | 'receipt_self' | 'both'
) {
  try {

    // 현장고객(워크인) 주문은 자동 인쇄를 생략합니다. (재출력은 허용)
    if (orderType === "store" && !isManualReprint) {
      console.log("[PrintService] 현장고객(store) 주문은 자동 출력을 생략합니다.");
      return true;
    }

    // Tenant 로고 URL 조회
    const { data: tenantData } = await supabase.from('tenants').select('logo_url').eq('id', tenantId).single();
    if (tenantData?.logo_url) {
      orderData = { ...orderData, logo_url: tenantData.logo_url };
    }

    const jobs = [];

    // 어떤 프린터를 사용할지 결정 (pos 또는 label)
    // - 배송 매장용(delivery_shop)은 기본적으로 pos
    // - 기사용(delivery_driver)은 label
    // - 픽업예약증(pickup_memo)은 label

    if (orderType === "pickup") {
      // 픽업 주문: 자동출력 시 픽업메모만 출력
      if (!isManualReprint) {
        jobs.push({ tenant_id: tenantId, user_id: tenantId, image_base64: '', width_mm: 0, length_mm: 0, type: "pickup_memo", data: orderData, status: "pending" });
      } else {
        if (reprintType === 'order_form' || reprintType === 'both') {
          jobs.push({ tenant_id: tenantId, user_id: tenantId, image_base64: '', width_mm: 0, length_mm: 0, type: "pickup_shop", data: orderData, status: "pending" });
        }
        if (reprintType === 'receipt' || reprintType === 'both') {
          jobs.push({ tenant_id: tenantId, user_id: tenantId, image_base64: '', width_mm: 0, length_mm: 0, type: "pickup_memo", data: orderData, status: "pending" });
        }
      }
    } else if (orderType === "delivery") {
      // 배달 주문: 배달정보(driverPayload)와 주문정보(orderData) 분리
      const driverPayload = {
        ...orderData,
        isDriverInfoOnly: true // 기사용 정보만 출력하도록 플래그 추가
      };

      if (!isManualReprint) {
        jobs.push({ tenant_id: tenantId, user_id: tenantId, image_base64: '', width_mm: 0, length_mm: 0, type: "delivery_shop", data: orderData, status: "pending" });
        jobs.push({ tenant_id: tenantId, user_id: tenantId, image_base64: '', width_mm: 0, length_mm: 0, type: "delivery_driver", data: driverPayload, status: "pending" });
      } else {
        if (reprintType === 'order_form' || reprintType === 'both') {
          jobs.push({ tenant_id: tenantId, user_id: tenantId, image_base64: '', width_mm: 0, length_mm: 0, type: "delivery_shop", data: orderData, status: "pending" });
        }
        if (reprintType === 'receipt' || reprintType === 'both') {
          jobs.push({ tenant_id: tenantId, user_id: tenantId, image_base64: '', width_mm: 0, length_mm: 0, type: "delivery_driver", data: driverPayload, status: "pending" });
        }
        if (reprintType === 'receipt_self') {
          jobs.push({ tenant_id: tenantId, user_id: tenantId, image_base64: '', width_mm: 0, length_mm: 0, type: "delivery_driver_self", data: driverPayload, status: "pending" });
        }
      }
    } else if (orderType === "store") {
      // 현장 픽업
      if (isManualReprint) {
        if (reprintType === 'order_form' || reprintType === 'both') {
          jobs.push({ tenant_id: tenantId, user_id: tenantId, image_base64: '', width_mm: 0, length_mm: 0, type: "store_shop", data: orderData, status: "pending" });
        }
        if (reprintType === 'receipt' || reprintType === 'both') {
          jobs.push({ tenant_id: tenantId, user_id: tenantId, image_base64: '', width_mm: 0, length_mm: 0, type: "pickup_memo", data: orderData, status: "pending" });
        }
      }
    }

    if (jobs.length === 0) {
      return true;
    }

    // 3. 작업 큐(print_jobs)에 저장
    const { error: insertError } = await supabase.from("print_jobs").insert(jobs);

    if (insertError) {
      console.error("[PrintService] 인쇄 작업 큐 저장 실패:", insertError);
      return false;
    }

    console.log(`[PrintService] 인쇄 작업 큐 등록 성공: ${jobs.length}건`);
    return true;
  } catch (error) {
    console.error("[PrintService] enqueuePrintJob 예외 발생:", error);
    // 주문 결제 프로세스를 차단(Blocking)하지 않기 위해 에러를 던지지 않음
    return false;
  }
}
