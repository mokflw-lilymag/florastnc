import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { parseISO } from 'date-fns';

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
export const exportOrdersToExcel = (orders: any[], startDate?: string, endDate?: string) => {
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
      const formattedOrderDate = format(orderDate, 'yyyy-MM-dd HH:mm', { locale: ko });

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
