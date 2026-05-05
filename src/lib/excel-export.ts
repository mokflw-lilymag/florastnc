import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { format } from "date-fns";
import { parseISO } from "date-fns";
import { resolveLocale, toBaseLocale } from "@/i18n/config";
import { dateFnsLocaleForBase } from "@/lib/date-fns-locale";
import { pickUiText } from "@/i18n/pick-ui-text";

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
/** Single Excel/Sheets column title (10 base locales, same order as pickUiText). */
function col(
  bl: string,
  ko: string,
  en: string,
  vi: string,
  ja: string,
  zh: string,
  es: string,
  pt: string,
  fr: string,
  de: string,
  ru: string,
) {
  return pickUiText(bl, ko, en, vi, ja, zh, es, pt, fr, de, ru);
}

function orderHistoryExportLabel(bl: string) {
  return col(bl, "주문내역", "Orders", "Đơn hàng", "注文一覧", "订单明细", "Pedidos", "Pedidos", "Commandes", "Bestellungen", "Заказы");
}

function expenseHistoryExportLabel(bl: string) {
  return col(bl, "지출내역", "Expenses", "Chi phí", "支出明細", "支出明细", "Gastos", "Despesas", "Dépenses", "Ausgaben", "Расходы");
}

function sheetTabPrefixOrders(bl: string) {
  return col(bl, "주문", "Orders", "Đơn hàng", "注文", "订单", "Pedidos", "Pedidos", "Commandes", "Bestellungen", "Заказы");
}

function sheetTabPrefixExpenses(bl: string) {
  return col(bl, "지출", "Expenses", "Chi phí", "支出", "支出", "Gastos", "Despesas", "Dépenses", "Ausgaben", "Расходы");
}

function buildOrderExcelHeaders(bl: string): string[] {
  return [
    col(bl, "주문번호", "Order #", "Mã đơn", "注文番号", "订单号", "N.º pedido", "Nº pedido", "Nº commande", "Bestellnr.", "№ заказа"),
    col(bl, "주문일시", "Order time", "Thời gian đặt", "注文日時", "下单时间", "Fecha pedido", "Data do pedido", "Date commande", "Bestellzeit", "Время заказа"),
    col(bl, "주문자명", "Customer name", "Tên khách", "注文者名", "下单人姓名", "Cliente", "Cliente", "Client", "Kundenname", "Имя клиента"),
    col(bl, "주문자연락처", "Customer contact", "Liên hệ khách", "注文者連絡先", "下单人电话", "Contacto", "Contato", "Contact client", "Kundenkontakt", "Контакт клиента"),
    col(bl, "주문상태", "Order status", "Trạng thái", "注文状態", "订单状态", "Estado", "Status", "Statut", "Status", "Статус заказа"),
    col(bl, "상품명", "Product", "Sản phẩm", "商品名", "商品名称", "Producto", "Produto", "Produit", "Produkt", "Товар"),
    col(bl, "수량", "Qty", "SL", "数量", "数量", "Cant.", "Qtd.", "Qté", "Menge", "Кол-во"),
    col(bl, "단가", "Unit price", "Đơn giá", "単価", "单价", "Precio u.", "Preço unit.", "Prix unit.", "Einzelpreis", "Цена за ед."),
    col(bl, "상품금액", "Line amount", "Thành tiền SP", "商品金額", "商品金额", "Importe línea", "Valor linha", "Montant ligne", "Positionsbetrag", "Сумма позиции"),
    col(bl, "배송비", "Delivery fee", "Phí giao", "送料", "运费", "Envío", "Frete", "Livraison", "Versand", "Доставка"),
    col(bl, "총금액", "Total", "Tổng cộng", "合計", "合计", "Total", "Total", "Total", "Gesamt", "Итого"),
    col(bl, "결제방법", "Payment method", "PTTT", "支払方法", "支付方式", "Pago", "Pagamento", "Paiement", "Zahlung", "Оплата"),
    col(bl, "결제상태", "Payment status", "TT thanh toán", "決済状態", "支付状态", "Estado pago", "Status pagamento", "Statut paiement", "Zahlungsstatus", "Статус оплаты"),
    col(bl, "수령방식", "Fulfillment", "Nhận hàng", "受取方法", "收货方式", "Entrega", "Retirada", "Retrait", "Abholung/Lieferung", "Получение"),
    col(bl, "수령예정일", "Scheduled date", "Ngày nhận", "受取予定日", "预计收货日", "Fecha prevista", "Data prevista", "Date prévue", "Geplanter Tag", "Дата получения"),
    col(bl, "수령예정시간", "Scheduled time", "Giờ nhận", "受取予定時間", "预计时间", "Hora prevista", "Hora prevista", "Heure prévue", "Geplante Zeit", "Время получения"),
    col(bl, "배송지주소", "Address", "Địa chỉ giao", "配送先住所", "配送地址", "Dirección", "Endereço", "Adresse", "Adresse", "Адрес"),
    col(bl, "수령자명", "Recipient name", "Tên người nhận", "受取人名", "收货人", "Destinatario", "Destinatário", "Destinataire", "Empfänger", "Получатель"),
    col(bl, "수령자연락처", "Recipient contact", "LH người nhận", "受取人連絡先", "收货人电话", "Contacto dest.", "Contato dest.", "Contact destinataire", "Empfängerkontakt", "Контакт получателя"),
    col(bl, "메모", "Notes", "Ghi chú", "メモ", "备注", "Notas", "Observações", "Notes", "Notizen", "Примечания"),
  ];
}

function buildOrderSheetHeaders(bl: string): string[] {
  return [
    col(bl, "주문번호", "Order #", "Mã đơn", "注文番号", "订单号", "N.º pedido", "Nº pedido", "Nº commande", "Bestellnr.", "№ заказа"),
    col(bl, "주문일시", "Order time", "Thời gian đặt", "注文日時", "下单时间", "Fecha pedido", "Data do pedido", "Date commande", "Bestellzeit", "Время заказа"),
    col(bl, "주문자명", "Customer name", "Tên khách", "注文者名", "下单人姓名", "Cliente", "Cliente", "Client", "Kundenname", "Имя клиента"),
    col(bl, "연락처", "Contact", "Liên hệ", "連絡先", "联系电话", "Contacto", "Contato", "Contact", "Kontakt", "Контакт"),
    col(bl, "상태", "Status", "Trạng thái", "状態", "状态", "Estado", "Status", "Statut", "Status", "Статус"),
    col(bl, "상품명", "Product", "Sản phẩm", "商品名", "商品名称", "Producto", "Produto", "Produit", "Produkt", "Товар"),
    col(bl, "수량", "Qty", "SL", "数量", "数量", "Cant.", "Qtd.", "Qté", "Menge", "Кол-во"),
    col(bl, "단가", "Unit price", "Đơn giá", "単価", "单价", "Precio u.", "Preço unit.", "Prix unit.", "Einzelpreis", "Цена за ед."),
    col(bl, "상품금액", "Line amount", "Thành tiền SP", "商品金額", "商品金额", "Importe línea", "Valor linha", "Montant ligne", "Positionsbetrag", "Сумма позиции"),
    col(bl, "배송비", "Delivery fee", "Phí giao", "送料", "运费", "Envío", "Frete", "Livraison", "Versand", "Доставка"),
    col(bl, "총금액", "Total", "Tổng cộng", "合計", "合计", "Total", "Total", "Total", "Gesamt", "Итого"),
    col(bl, "결제방법", "Payment method", "PTTT", "支払方法", "支付方式", "Pago", "Pagamento", "Paiement", "Zahlung", "Оплата"),
    col(bl, "수령방식", "Fulfillment", "Nhận hàng", "受取方法", "收货方式", "Entrega", "Retirada", "Retrait", "Abholung/Lieferung", "Получение"),
    col(bl, "배송일", "Delivery date", "Ngày giao", "配送日", "配送日", "Fecha entrega", "Data entrega", "Date livraison", "Lieferdatum", "Дата доставки"),
    col(bl, "배송지", "Address", "Địa chỉ", "配送先", "地址", "Dirección", "Endereço", "Adresse", "Adresse", "Адрес"),
    col(bl, "수령자", "Recipient", "Người nhận", "受取人", "收货人", "Destinatario", "Destinatário", "Destinataire", "Empfänger", "Получатель"),
    col(bl, "메모", "Notes", "Ghi chú", "メモ", "备注", "Notas", "Observações", "Notes", "Notizen", "Примечания"),
  ];
}

function buildExpenseSheetHeaders(bl: string): string[] {
  return [
    col(bl, "날짜", "Date", "Ngày", "日付", "日期", "Fecha", "Data", "Date", "Datum", "Дата"),
    col(bl, "분류", "Category", "Danh mục", "分類", "分类", "Categoría", "Categoria", "Catégorie", "Kategorie", "Категория"),
    col(bl, "세부분류", "Subcategory", "Chi tiết", "詳細分類", "子分类", "Subcategoría", "Subcategoria", "Sous-catégorie", "Unterkategorie", "Подкатегория"),
    col(bl, "금액", "Amount", "Số tiền", "金額", "金额", "Importe", "Valor", "Montant", "Betrag", "Сумма"),
    col(bl, "내용", "Description", "Nội dung", "内容", "说明", "Descripción", "Descrição", "Description", "Beschreibung", "Описание"),
    col(bl, "결제방법", "Payment method", "PTTT", "支払方法", "支付方式", "Pago", "Pagamento", "Paiement", "Zahlung", "Оплата"),
    col(bl, "공급처", "Supplier", "Nhà cung cấp", "仕入先", "供应商", "Proveedor", "Fornecedor", "Fournisseur", "Lieferant", "Поставщик"),
    col(bl, "비고", "Notes", "Ghi chú", "備考", "备注", "Notas", "Observações", "Notes", "Notizen", "Примечания"),
  ];
}

function expenseRelatedOrderLabel(bl: string, orderId: string) {
  const p = col(bl, "주문", "Order", "Đơn hàng", "注文", "订单", "Pedido", "Pedido", "Commande", "Bestellung", "Заказ");
  return `${p}: ${orderId}`;
}


// 주문 내역 엑셀 내보내기
export const exportOrdersToExcel = (
  orders: any[],
  startDate?: string,
  endDate?: string,
  appLocale?: string
) => {
  const bl = toBaseLocale(resolveLocale(appLocale));
  try {
    if (!orders || !Array.isArray(orders)) {
      throw new Error(
        pickUiText(
          bl,
          "주문 데이터가 올바르지 않습니다.",
          "Order data is invalid.",
          "Dữ liệu đơn hàng không hợp lệ.",
          "注文データが正しくありません。",
          "订单数据无效。",
          "Los datos del pedido no son válidos.",
          "Os dados do pedido são inválidos.",
          "Les données de commande sont invalides.",
          "Bestelldaten sind ungültig.",
          "Некорректные данные заказа.",
        ),
      );
    }

    let filteredOrders = orders;
    if (startDate && endDate) {
      filteredOrders = orders.filter(order => {
        const orderDate = parseDate(order.order_date).toISOString().split('T')[0];
        return orderDate >= startDate && orderDate <= endDate;
      });
    }

    const headers = buildOrderExcelHeaders(bl);

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

    const sheetLabel = orderHistoryExportLabel(bl);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetLabel);

    const today = format(new Date(), 'yyyy-MM-dd');
    const fileName = startDate && endDate 
      ? `${sheetLabel}_${startDate}_${endDate}.xlsx` 
      : `${sheetLabel}_${today}.xlsx`;

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
  const bl = toBaseLocale(resolveLocale(appLocale));
  const filteredOrders = orders.filter(order => {
    const orderDate = parseDate(order.order_date).toISOString().split('T')[0];
    return orderDate >= startDate && orderDate <= endDate;
  });

  const headers = buildOrderSheetHeaders(bl);

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
  const bl = toBaseLocale(resolveLocale(appLocale));
  const filteredExpenses = expenses.filter(exp => {
    const expDate = parseDate(exp.expense_date).toISOString().split('T')[0];
    return expDate >= startDate && expDate <= endDate;
  });

  const headers = buildExpenseSheetHeaders(bl);

  const rows = filteredExpenses.map(exp => [
    format(parseDate(exp.expense_date), "P", { locale: dateFnsLoc(appLocale) }),
    exp.category || '-',
    exp.sub_category || '-',
    exp.amount || 0,
    exp.description || '-',
    exp.payment_method || '-',
    exp.supplier_id || '-',
    exp.related_order_id ? expenseRelatedOrderLabel(bl, String(exp.related_order_id)) : '-'
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
  accessToken?: string,
  appLocale?: string,
): Promise<{ success: boolean; message: string }> => {
  const bl = toBaseLocale(resolveLocale(appLocale));
  const prefix = type === 'orders' ? sheetTabPrefixOrders(bl) : sheetTabPrefixExpenses(bl);
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
        const n = data.rows.length;
        return {
          success: true,
          message: pickUiText(
            bl,
            `✅ 구글 시트 "${sheetName}" 탭에 ${n}건 내보내기 완료`,
            `✅ Exported ${n} rows to Google Sheet tab "${sheetName}".`,
            `✅ Đã xuất ${n} dòng sang tab Google Sheet "${sheetName}".`,
            `✅ Googleシート「${sheetName}」に${n}件を書き出しました。`,
            `✅ 已将 ${n} 行导出到 Google 表格工作表「${sheetName}」。`,
            `✅ Se exportaron ${n} filas a la pestaña "${sheetName}".`,
            `✅ ${n} linhas exportadas para a aba "${sheetName}".`,
            `✅ ${n} lignes exportées vers l'onglet « ${sheetName} ».`,
            `✅ ${n} Zeilen in den Tab „${sheetName}“ exportiert.`,
            `✅ Экспортировано строк: ${n} на вкладку «${sheetName}».`,
          ),
        };
      } else {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          errData.error ||
            pickUiText(
              bl,
              "시트보내기 실패",
              "Sheet export failed.",
              "Xuất sheet thất bại.",
              "シートの書き出しに失敗しました。",
              "表格导出失败。",
              "Error al exportar la hoja.",
              "Falha ao exportar a planilha.",
              "Échec de l'export de la feuille.",
              "Tabellenexport fehlgeschlagen.",
              "Не удалось экспортировать лист.",
            ),
        );
      }
    } catch (err: any) {
      console.warn("[excel-export] Google Sheets API failed, falling back to Excel download:", err);
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

    const n = data.rows.length;
    const msg = spreadsheetId
      ? pickUiText(
          bl,
          `⚠️ 구글 시트 연동 실패. 엑셀 파일로 다운로드했습니다. (${n}건)`,
          `⚠️ Google Sheets export failed. Downloaded Excel instead (${n} rows).`,
          `⚠️ Xuất Google Sheet thất bại. Đã tải Excel (${n} dòng).`,
          `⚠️ Googleシート連携に失敗しました。Excelでダウンロードしました（${n}件）。`,
          `⚠️ Google 表格导出失败，已改为 Excel 下载（${n} 行）。`,
          `⚠️ Falló la exportación a Google Sheets. Se descargó Excel (${n} filas).`,
          `⚠️ Falha ao exportar para Google Sheets. Baixado Excel (${n} linhas).`,
          `⚠️ Échec Google Sheets. Téléchargement Excel (${n} lignes).`,
          `⚠️ Google Sheets fehlgeschlagen. Excel heruntergeladen (${n} Zeilen).`,
          `⚠️ Ошибка Google Sheets. Скачан Excel (${n} строк).`,
        )
      : pickUiText(
          bl,
          `📄 엑셀 파일로 다운로드 완료 (${n}건)`,
          `📄 Downloaded as Excel (${n} rows).`,
          `📄 Đã tải Excel (${n} dòng).`,
          `📄 Excelでダウンロード完了（${n}件）。`,
          `📄 已下载 Excel（${n} 行）。`,
          `📄 Descargado como Excel (${n} filas).`,
          `📄 Baixado como Excel (${n} linhas).`,
          `📄 Téléchargé en Excel (${n} lignes).`,
          `📄 Als Excel heruntergeladen (${n} Zeilen).`,
          `📄 Скачан Excel (${n} строк).`,
        );
    return { success: true, message: msg };
  } catch (err) {
    return {
      success: false,
      message: pickUiText(
        bl,
        "내보내기에 실패했습니다.",
        "Export failed.",
        "Xuất dữ liệu thất bại.",
        "書き出しに失敗しました。",
        "导出失败。",
        "Error al exportar.",
        "Falha na exportação.",
        "Échec de l'export.",
        "Export fehlgeschlagen.",
        "Не удалось выполнить экспорт.",
      ),
    };
  }
};
