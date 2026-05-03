import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { format } from "date-fns";
import { parseISO } from "date-fns";
import { resolveLocale, toBaseLocale } from "@/i18n/config";
import { dateFnsLocaleForBase } from "@/lib/date-fns-locale";

function dateFnsLoc(appLocale?: string) {
  return dateFnsLocaleForBase(toBaseLocale(resolveLocale(appLocale)));
}

/**
 * 엑셀 내보내기 유틸리티 (SaaS 버전)
 */

const parseDate = (dateStr: any): Date => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  try {
    return parseISO(dateStr);
  } catch (e) {
    return new Date(dateStr);
  }
};

// 주문 내역 엑셀 내보내기
export const exportOrdersToExcel = (
  orders: any[],
  startDate?: string,
  endDate?: string,
  appLocale?: string
) => {
  try {
    if (!orders || !Array.isArray(orders)) {
      throw new Error('주문 데이터가 올바르지 않습니다.');
    }

    let filteredOrders = orders;
    if (startDate && endDate) {
      filteredOrders = orders.filter(order => {
        const orderDate = parseDate(order.order_date).toISOString().split('T')[0];
        return orderDate >= startDate && orderDate <= endDate;
      });
    }

    const headers = [
      '주문번호', '주문일시', '주문자명', '주문자연락처', '주문상태',
      '상품명', '수량', '단가', '상품금액', '배송비', '총금액',
      '결제방법', '결제상태', '수령방식', '수령예정일', '수령예정시간',
      '배송지주소', '수령자명', '수령자연락처', '메모'
    ];

    const rows: any[] = [];
    filteredOrders.forEach(order => {
      const orderDate = parseDate(order.order_date);
      const formattedOrderDate = format(orderDate, "Pp", { locale: dateFnsLoc(appLocale) });

      const fulfillmentInfo = order.receipt_type === 'delivery_reservation' 
        ? order.delivery_info 
        : order.pickup_info;

      if (!order.items || order.items.length === 0) {
        rows.push([
          order.order_number,
          formattedOrderDate,
          order.orderer?.name || '-',
          order.orderer?.contact || '-',
          order.status || '-',
          '-', 0, 0, 0,
          (order.summary?.deliveryFee || 0),
          (order.summary?.total || 0),
          order.payment?.method || '-',
          order.payment?.status || '-',
          order.receipt_type || '-',
          fulfillmentInfo?.date || '-',
          fulfillmentInfo?.time || '-',
          fulfillmentInfo?.address || '-',
          fulfillmentInfo?.recipientName || fulfillmentInfo?.pickerName || '-',
          fulfillmentInfo?.recipientContact || fulfillmentInfo?.pickerContact || '-',
          order.memo || '-'
        ]);
      } else {
        order.items.forEach((item: any) => {
          rows.push([
            order.order_number,
            formattedOrderDate,
            order.orderer?.name || '-',
            order.orderer?.contact || '-',
            order.status || '-',
            item.name || '-',
            item.quantity || 0,
            (item.price || 0),
            ((item.price || 0) * (item.quantity || 0)),
            (order.summary?.deliveryFee || 0),
            (order.summary?.total || 0),
            order.payment?.method || '-',
            order.payment?.status || '-',
            order.receipt_type || '-',
            fulfillmentInfo?.date || '-',
            fulfillmentInfo?.time || '-',
            fulfillmentInfo?.address || '-',
            fulfillmentInfo?.recipientName || fulfillmentInfo?.pickerName || '-',
            fulfillmentInfo?.recipientContact || fulfillmentInfo?.pickerContact || '-',
            order.memo || '-'
          ]);
        });
      }
    });

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    
    worksheet['!cols'] = [
      { width: 15 }, { width: 20 }, { width: 12 }, { width: 15 }, { width: 10 },
      { width: 30 }, { width: 8 },  { width: 12 }, { width: 12 }, { width: 10 }, { width: 12 },
      { width: 10 }, { width: 10 }, { width: 12 }, { width: 12 }, { width: 10 },
      { width: 40 }, { width: 12 }, { width: 15 }, { width: 30 }
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, '주문내역');

    const today = format(new Date(), 'yyyy-MM-dd');
    const fileName = startDate && endDate 
      ? `주문내역_${startDate}_${endDate}.xlsx` 
      : `주문내역_${today}.xlsx`;

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, fileName);
  } catch (error) {
    console.error('Excel export error:', error);
    throw error;
  }
};

// 범용 데이터 엑셀 내보내기
export const exportToExcel = (data: any[], fileName: string, sheetName: string = 'Sheet1') => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`);
};

// ============================================================
//  구글 시트 내보내기 유틸리티 (Google Sheets Export)
// ============================================================

/**
 * 주문 데이터 → 구글 시트용 2D 배열 변환
 */
export const prepareOrdersForGoogleSheet = (
  orders: any[],
  startDate: string,
  endDate: string,
  appLocale?: string
) => {
  const filteredOrders = orders.filter(order => {
    const orderDate = parseDate(order.order_date).toISOString().split('T')[0];
    return orderDate >= startDate && orderDate <= endDate;
  });

  const headers = [
    '주문번호', '주문일시', '주문자명', '연락처', '상태',
    '상품명', '수량', '단가', '상품금액', '배송비', '총금액',
    '결제방법', '수령방식', '배송일', '배송지', '수령자', '메모'
  ];

  const rows: any[][] = [];
  filteredOrders.forEach(order => {
    const orderDate = parseDate(order.order_date);
    const formattedDate = format(orderDate, "Pp", { locale: dateFnsLoc(appLocale) });
    const info = order.receipt_type === 'delivery_reservation' 
      ? order.delivery_info 
      : order.pickup_info;

    if (!order.items || order.items.length === 0) {
      rows.push([
        order.order_number, formattedDate,
        order.orderer?.name || '-', order.orderer?.contact || '-',
        order.status || '-', '-', 0, 0, 0,
        order.summary?.deliveryFee || 0, order.summary?.total || 0,
        order.payment?.method || '-', order.receipt_type || '-',
        info?.date || '-', info?.address || '-',
        info?.recipientName || info?.pickerName || '-',
        order.memo || '-'
      ]);
    } else {
      order.items.forEach((item: any) => {
        rows.push([
          order.order_number, formattedDate,
          order.orderer?.name || '-', order.orderer?.contact || '-',
          order.status || '-', item.name || '-',
          item.quantity || 0, item.price || 0,
          (item.price || 0) * (item.quantity || 0),
          order.summary?.deliveryFee || 0, order.summary?.total || 0,
          order.payment?.method || '-', order.receipt_type || '-',
          info?.date || '-', info?.address || '-',
          info?.recipientName || info?.pickerName || '-',
          order.memo || '-'
        ]);
      });
    }
  });

  return { headers, rows, count: filteredOrders.length };
};

/**
 * 지출 데이터 → 구글 시트용 2D 배열 변환
 */
export const prepareExpensesForGoogleSheet = (
  expenses: any[],
  startDate: string,
  endDate: string,
  appLocale?: string
) => {
  const filteredExpenses = expenses.filter(exp => {
    const expDate = parseDate(exp.expense_date).toISOString().split('T')[0];
    return expDate >= startDate && expDate <= endDate;
  });

  const headers = [
    '날짜', '분류', '세부분류', '금액', '내용', '결제방법', '공급처', '비고'
  ];

  const rows = filteredExpenses.map(exp => [
    format(parseDate(exp.expense_date), "P", { locale: dateFnsLoc(appLocale) }),
    exp.category || '-',
    exp.sub_category || '-',
    exp.amount || 0,
    exp.description || '-',
    exp.payment_method || '-',
    exp.supplier_id || '-',
    exp.related_order_id ? `주문: ${exp.related_order_id}` : '-'
  ]);

  return { headers, rows, count: filteredExpenses.length };
};

/**
 * 기간 기반 시트 탭 이름 생성
 */
export const generateSheetTabName = (prefix: string, startDate: string, endDate: string): string => {
  const start = startDate.replace(/-/g, '').slice(4); // MMDD
  const end = endDate.replace(/-/g, '').slice(4);     // MMDD
  const year = startDate.slice(0, 4);
  return `${prefix}_${year}_${start}-${end}`;
};

/**
 * 구글 시트로 데이터 내보내기 (XLSX 파일을 자동 다운로드 + 시트 이름 규칙 적용)
 * Google Sheets API 미연동 시 엑셀 파일로 대체 다운로드
 */
export const exportToGoogleSheet = async (
  type: 'orders' | 'expenses',
  data: { headers: string[], rows: any[][] },
  startDate: string,
  endDate: string,
  spreadsheetId?: string,
  supabaseUrl?: string,
  accessToken?: string
): Promise<{ success: boolean; message: string }> => {
  const prefix = type === 'orders' ? '주문' : '지출';
  const sheetName = generateSheetTabName(prefix, startDate, endDate);

  // Google Sheets API 연동이 설정되어 있으면 Edge Function 호출
  if (spreadsheetId && supabaseUrl && accessToken) {
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/google-sheets-export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          spreadsheetId,
          sheetName,
          headers: data.headers,
          rows: data.rows,
        }),
      });

      if (response.ok) {
        return { success: true, message: `✅ 구글 시트 "${sheetName}" 탭에 ${data.rows.length}건 내보내기 완료` };
      } else {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || '시트 내보내기 실패');
      }
    } catch (err: any) {
      console.warn('Google Sheets API 실패, 엑셀로 대체합니다:', err);
      // API 호출 실패 시 엑셀 파일로 대체
    }
  }

  // 대체: 엑셀 파일로 다운로드 (같은 시트 이름 규칙 적용)
  try {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([data.headers, ...data.rows]);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${sheetName}.xlsx`);

    const msg = spreadsheetId 
      ? `⚠️ 구글 시트 연동 실패. 엑셀 파일로 다운로드했습니다. (${data.rows.length}건)`
      : `📄 엑셀 파일로 다운로드 완료 (${data.rows.length}건)`;
    return { success: true, message: msg };
  } catch (err) {
    return { success: false, message: '내보내기에 실패했습니다.' };
  }
};
