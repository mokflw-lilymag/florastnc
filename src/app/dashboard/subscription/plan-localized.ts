export type PlanId = "ribbon_only" | "light" | "pro" | "pro_plus";

/** [ko, en, vi, ja, zh, es, pt, fr, de, ru] — `pickUiText`와 동일 순서 */
export type LocalizedString = readonly [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
];

const L = (
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
): LocalizedString => [ko, en, vi, ja, zh, es, pt, fr, de, ru];

const E = L("", "", "", "", "", "", "", "", "", "");

export type Period = "1m" | "12m";

export const PERIOD_LABELS: Record<Period, LocalizedString> = {
  "1m": L("월간", "Monthly", "Theo tháng", "月額", "月付", "Mensual", "Mensal", "Mensuel", "Monatlich", "В месяц"),
  "12m": L("연간", "Annual", "Theo năm", "年額", "年付", "Anual", "Anual", "Annuel", "Jährlich", "В год"),
};

export const PLAN_DISCOUNTS: Record<PlanId, Record<Period, LocalizedString>> = {
  ribbon_only: {
    "1m": E,
    "12m": L("즉시 할인", "discounted", "giảm giá", "割引", "折扣", "dto.", "off", "remise", "Rabatt", "скидка"),
  },
  light: {
    "1m": E,
    "12m": L(
      "1달 보너스 연장",
      "1m bonus extension",
      "tặng 1t gia hạn",
      "1ヶ月延長特典",
      "延 1 月",
      "1 mes gratis",
      "1m grátis",
      "1m offert",
      "1M Verlängerung",
      "1 мес. продления",
    ),
  },
  pro: {
    "1m": E,
    "12m": L(
      "1달 할인+1달 연장",
      "1m free + 1m ext",
      "tặng 1t + gia hạn 1t",
      "1ヶ月無料+1ヶ月延長",
      "免 1 月 + 延 1 月",
      "1 mes gratis",
      "1m grátis",
      "1m offert",
      "1M Rabatt + 1M Verl.",
      "1 мес. в подарок",
    ),
  },
  pro_plus: {
    "1m": E,
    "12m": L(
      "1달 할인+2달 연장",
      "1m free + 2m ext",
      "tặng 1t + gia hạn 2t",
      "1ヶ月無料+2ヶ月延長",
      "免 1 月 + 延 2 月",
      "1 mes gratis",
      "1m grátis",
      "1m offert",
      "1M Rabatt + 2M Verl.",
      "1 мес. в подарок",
    ),
  },
};

export const PLAN_TEXTS: Record<
  PlanId,
  { subName: LocalizedString; description: LocalizedString; features: LocalizedString[] }
> = {
  ribbon_only: {
    subName: L("리본 라이센스", "Ribbon License", "Bản quyền ruy băng", "리본 라이센스", "丝带授权", "Licencia de cinta", "Licença de fita", "Licence ruban", "Band-Lizenz", "Лицензия на ленты"),
    description: L("오직 리본 출력 기능만 이용할 매장", "For ribbon printing only", "Chỉ in ruy băng", "리본 출력 전용", "仅丝带打印", "Solo impresión de cintas", "Apenas impressão de fitas", "Impression de ruban uniquement", "Nur Banddruck", "Только печать лент"),
    features: [
      L("무제한 리본 출력", "Unlimited ribbon printing", "In ruy băng không giới hạn", "무제한 리본 출력", "无限丝带打印", "Impresión de cintas ilimitada", "Impressão de fitas ilimitada", "Impression de ruban illimitée", "Unbegrenzter Banddruck", "Безли미тная печать лент"),
            L("주문 저장 테스트 월 10건", "Up to 10 orders/mo (save test)", "Lưu thử 10 đơn/tháng", "月10件まで保存テスト", "每月10单保存测试", "Hasta 10 pedidos/mes (prueba)", "Até 10 pedidos/mês (teste)", "10 commandes/mois (test)", "10 Aufträge/Monat (Test)", "До 10 заказов/мес. (тест)"),
      L("Xprint 등 다양한 감열 프린터 지원", "Supports various printers", "Hỗ trợ nhiều máy in", "다양한 프린터 지원", "支持多种打印机", "Soporta varias impresoras", "Suporta várias impresoras", "Supporte diverses imprimantes", "Unterstützt diverse Drucker", "Поддержка разных принтеров"),
      L("매장 관리 및 고객 장부 제외", "No shop ERP features", "Không có tính năng quản lý", "매장 관리 기능 제외", "无店铺管理功能", "Sin funciones ERP de tienda", "Sem funções ERP de loja", "Pas de fonctions ERP", "Ohne Laden-ERP", "Без функций учёта"),
    ],
  },
  light: {
    subName: L("플로비서 라이트", "FloSync Light", "FloSync Light", "플로비서 라이트", "FloSync Light", "FloSync Light", "FloSync Light", "FloSync Light", "FloSync Light", "FloSync Light"),
    description: L("월 주문 100건 제한 입문형 플랜", "Up to 100 orders per month", "Giới hạn 100 đơn/tháng", "월 100건 제한", "月限 100 单", "Hasta 100 pedidos/mes", "Até 100 pedidos/mês", "Jusqu'à 100 commandes/mois", "Bis zu 100 aufräge/Monat", "До 100 заказов/мес."),
    features: [
      L("월 주문 등록 100건 제한", "100 orders limit per month", "Giới hạn 100 đơn/tháng", "월 주문 등록 100건 한도", "月订单 100 单限制", "Límite de 100 pedidos/mes", "Limite de 100 pedidos/mês", "Limite de 100 commandes/mois", "Limit 100 Aufträge/Monat", "Лимит 100 заказов/мес."),
      L("매장 관리/리본 출력 모든 기능 제공", "All features provided", "Cung cấp đầy đủ tính năng", "모든 매장 관리 기능 제공", "提供所有 management 功能", "Todas las funciones disponibles", "Todas as funções disponíveis", "Toutes fonctions incluses", "Alle Funktionen enthalten", "Все функции доступны"),
      L("모바일 앱 사진 전송", "Mobile app photo delivery", "Gửi ảnh qua ứng dụng di động", "모바일 앱 사진 전송", "移动端图片发送", "Envío de fotos desde app", "Envio de fotos por app", "Envoi de photos via l'app", "Foto-Versand per App", "Отправка фото через приложение"),
    ],
  },
  pro: {
    subName: L("플로비서 프로", "FloSync Pro", "FloSync Pro", "플로비서 프로", "FloSync Pro", "FloSync Pro", "FloSync Pro", "FloSync Pro", "FloSync Pro", "FloSync Pro"),
    description: L("월 주문 200건 제한 실속형 플랜", "Up to 200 orders per month", "Giới hạn 200 đơn/tháng", "월 200건 제한", "月限 200 单", "Hasta 200 pedidos/mes", "Até 200 pedidos/mês", "Jusqu'à 200 commandes/mois", "Bis zu 200 aufräge/Monat", "До 200 заказов/мес."),
    features: [
      L("월 주문 등록 200건 제한", "200 orders limit per month", "Giới hạn 200 đơn/tháng", "월 주문 등록 200건 한도", "月订单 200 单限制", "Límite de 200 pedidos/mes", "Limite de 200 pedidos/mês", "Limite de 200 commandes/mois", "Limit 200 Aufträge/Monat", "Лимит 200 заказов/мес."),
      L("매장 관리/리본 출력 모든 기능 제공", "All features provided", "Cung cấp đầy đủ tính năng", "모든 매장 관리 기능 제공", "提供所有 management 기능", "Todas las funciones disponibles", "Todas as funções disponíveis", "Toutes fonctions incluses", "Alle Funktionen enthalten", "Все функции доступны"),
      L("포스 프린터 무상 임대 제공 (연 결제 시, 요구 시)", "Hardware lease included (annual & demand)", "Hỗ trợ máy in (khi trả năm & yêu cầu)", "포스 프린터 임대 (연 결제 시, 요구 시)", "提供小票打印机租赁 (年结/需申请)", "Impresora incluida (anual/bajo demanda)", "Impresora incluida (anual/sob demanda)", "Imprimante incluse (annuel/sur demande)", "Drucker-Leasing (jährlich & Bedarf)", "Принтер в аренду (при годовой оплате и запросе)"),
    ],
  },
  pro_plus: {
    subName: L("프로 플러스", "Pro Plus", "Pro Plus", "프로 플러스", "Pro Plus", "Pro Plus", "Pro Plus", "Pro Plus", "Pro Plus", "Pro Plus"),
    description: L("등록 주문량 완전 무제한 프리미엄 플랜", "Unlimited orders premium plan", "Không giới hạn đơn hàng", "주문량 완전 무제한", "订单完全无限制", "Pedidos ilimitados premium", "Pedidos ilimitados premium", "Commandes illimitées premium", "Unbegrenzte aufräge Premium", "Безлимитный премиум-план"),
    features: [
      L("등록 주문량 완전 무제한", "Unlimited order registration", "Không giới hạn số lượng đơn", "주문량 완전 무제한", "订单完全无限制", "Registro de pedidos ilimitado", "Registro de pedidos ilimitado", "Enregistrement de commandes illimité", "Unbegrenzte Auftragserfassung", "Безлимитный учёт заказов"),
      L("매장 관리/리본 출력 모든 기능 제공", "All features provided", "Cung cấp đầy đủ tính năng", "모든 매장 관리 기능 제공", "提供所有 management 기능", "Todas las funciones disponibles", "Todas as funções disponíveis", "Toutes fonctions incluses", "Alle Funktionen enthalten", "Все функции доступны"),
      L("포스 프린터 무상 임대 제공 (연 결제 시, 요구 시)", "Hardware lease included (annual & demand)", "Hỗ trợ máy in (khi trả năm & yêu cầu)", "포스 프린터 임대 (연 결제 시, 요구 시)", "提供小票打印机租赁 (年结/需申请)", "Impresora incluida (anual/bajo demanda)", "Impresora incluida (anual/sob demanda)", "Imprimante incluse (annuel/sur demande)", "Drucker-Leasing (jährlich & Bedarf)", "Принтер в аренду (при годовой оплате и запросе)"),
    ],
  },
};
