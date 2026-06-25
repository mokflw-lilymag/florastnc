import { SupabaseClient } from '@supabase/supabase-js';

export type OrderType = "store" | "pickup" | "delivery";

function buildJob(tenantId: string, type: string, data: any) {
  return {
    tenant_id: tenantId,
    user_id: tenantId,
    image_base64: '',
    width_mm: 0,
    length_mm: 0,
    type,
    data,
    status: "pending" as const,
  };
}

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

    const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI?.printJob;

    let localSettings: any = {};
    try {
      const { data: settingsData } = await supabase
        .from('system_settings')
        .select('data')
        .eq('id', `settings_${tenantId}`)
        .single();
      if (settingsData?.data) {
        localSettings = settingsData.data;
      }
    } catch (e) {
      console.warn('Failed to fetch printer settings from supabase:', e);
    }

    const shopBranding = {
      shop_name: localSettings.siteName || '',
      shop_phone: localSettings.contactPhone || '',
    };
    orderData = { ...orderData, ...shopBranding };

    const orderFormPayload = { ...orderData, hideBranding: true };
    const driverPayload = {
      ...orderData,
      isDriverInfoOnly: true
    };

    const jobs = [];

    if (orderType === "pickup") {
      if (!isManualReprint) {
        // 픽업 예약: 예약증(pickup_shop)만 자동 출력
        jobs.push(buildJob(tenantId, "pickup_shop", orderData));
      } else {
        if (reprintType === 'order_form' || reprintType === 'both') {
          jobs.push(buildJob(tenantId, "order_form", orderFormPayload));
        }
        if (reprintType === 'receipt' || reprintType === 'both') {
          jobs.push(buildJob(tenantId, "pickup_shop", orderData));
        }
      }
    } else if (orderType === "delivery") {
      if (!isManualReprint) {
        // 배달 예약: 주문서(order_form) + 매장 영수증(delivery_shop) 자동 출력 (기사용 인수증 제외)
        jobs.push(buildJob(tenantId, "order_form", orderFormPayload));
        jobs.push(buildJob(tenantId, "delivery_shop", orderData));
      } else {
        if (reprintType === 'order_form' || reprintType === 'both') {
          jobs.push(buildJob(tenantId, "order_form", orderFormPayload));
        }
        // 인수증(재출력): delivery_driver — 영수증(delivery_shop)은 고객관리 전용
        if (reprintType === 'receipt' || reprintType === 'both') {
          jobs.push(buildJob(tenantId, "delivery_driver", driverPayload));
        }
        if (reprintType === 'receipt_self') {
          jobs.push(buildJob(tenantId, "delivery_driver_self", driverPayload));
        }
      }
    } else if (orderType === "store") {
      if (isManualReprint) {
        if (reprintType === 'order_form' || reprintType === 'both') {
          jobs.push(buildJob(tenantId, "order_form", orderFormPayload));
        }
        // 현장구매 예약증: pickup_shop 템플릿 (로고/푸터 없음)
        if (reprintType === 'receipt' || reprintType === 'both') {
          jobs.push(buildJob(tenantId, "pickup_shop", orderData));
        }
      }
    }

    if (jobs.length === 0) {
      return true;
    }

    if (isElectron) {
      console.log(`[PrintService] Electron 앱 환경 감지됨. 로컬 네이티브 인쇄를 실행합니다. 대기열 개수: ${jobs.length}`);
      for (const job of jobs) {
        try {
          const result = await (window as any).electronAPI.printJob({
            job: {
              ...job,
              job_type: job.type,
              payload: job.data,
              order_id: orderId
            },
            settings: localSettings,
            branchName: localSettings.siteName || tenantId
          });
          console.log(`[PrintService] 네이티브 인쇄 성공:`, result);
        } catch (printErr) {
          console.error(`[PrintService] 네이티브 인쇄 실패:`, printErr);
        }
      }
      return true;
    }

    const { error: insertError } = await supabase.from("print_jobs").insert(jobs);

    if (insertError) {
      console.error("[PrintService] 인쇄 작업 큐 저장 실패:", insertError);
      return false;
    }

    console.log(`[PrintService] 인쇄 작업 큐 등록 성공: ${jobs.length}건`);
    return true;
  } catch (error) {
    console.error("[PrintService] enqueuePrintJob 예외 발생:", error);
    return false;
  }
}

export async function enqueueMarketListPrintJob(
  supabase: SupabaseClient,
  tenantId: string,
  batchId: string,
  batchName: string,
  items: any[]
) {
  try {
    const payload = {
      batchId,
      batchName,
      items: items.map(item => ({
        name: item.name,
        quantity: item.quantity || 0,
        price: item.price || (item.total_price && item.quantity ? Math.round(item.total_price / item.quantity) : 0) || 0,
        supplier: item.supplier || ''
      })),
      date: new Date().toISOString()
    };

    const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI?.printJob;

    let localSettings: any = {};
    if (isElectron) {
      try {
        const { data: settingsData } = await supabase
          .from('system_settings')
          .select('data')
          .eq('id', `settings_${tenantId}`)
          .single();
        if (settingsData?.data) {
          localSettings = settingsData.data;
        }
      } catch (e) {
        console.warn('Failed to fetch printer settings from supabase:', e);
      }
    }

    const job = {
      tenant_id: tenantId,
      user_id: tenantId,
      type: "market_list",
      data: payload,
      status: "pending",
      image_base64: "",
      width_mm: 80,
      length_mm: 0
    };

    if (isElectron) {
      console.log(`[PrintService] Electron 앱 환경에서 장보기 리스트 로컬 네이티브 인쇄를 실행합니다.`);
      await (window as any).electronAPI.printJob({
        job: { ...job, job_type: job.type, payload: job.data, order_id: batchId },
        settings: localSettings,
        branchName: tenantId
      });
      return true;
    }

    const { error: insertError } = await supabase.from("print_jobs").insert([job]);

    if (insertError) {
      console.error("[PrintService] 장보기 리스트 큐 저장 실패:", insertError);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[PrintService] enqueueMarketListPrintJob 예외 발생:", error);
    return false;
  }
}
