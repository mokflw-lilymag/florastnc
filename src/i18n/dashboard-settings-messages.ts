import type { AppLocale } from "@/i18n/config";
import { toBaseLocale } from "@/i18n/config";

type SettingsMessages = {
  pageTitle: string;
  pageSubtitle: string;
  tabs: {
    store: string;
    orderPayment: string;
    delivery: string;
    categories: string;
    printer: string;
    integrations: string;
    partner: string;
    account: string;
    data: string;
  };
  store: {
    title: string;
    storeName: string;
    representative: string;
    bizNo: string;
    phone: string;
    address: string;
    country: string;
    countryHint: string;
    save: string;
    currencyTitle: string;
    presetTitle: string;
    presetLocale: string;
    presetChat: string;
    presetDelivery: string;
    presetPayment: string;
    presetTax: string;
    presetDiffTitle: string;
    presetNoDiff: string;
    /** Labels for country-preset diff rows (system_settings keys). */
    presetFieldLabels: {
      country: string;
      currency: string;
      isTaxExempt: string;
      defaultTaxRate: string;
      useKakaoTalk: string;
      autoDeliveryBooking: string;
      deliveryCarriers: string;
    };
  };
};

const KO: SettingsMessages = {
  pageTitle: "환경 설정",
  pageSubtitle: "상점 운영 정책 및 데이터 보안을 관리하세요.",
  tabs: {
    store: "상점 정보",
    orderPayment: "주문/할인/포인트",
    delivery: "배송비 설정",
    categories: "분류 관리",
    printer: "프린터/브릿지",
    integrations: "연동 및 자동화",
    partner: "협력사 네트워크",
    account: "멤버십/보안",
    data: "백업 및 초기화",
  },
  store: {
    title: "상점 기본 정보",
    storeName: "화원 이름",
    representative: "대표자",
    bizNo: "사업자 등록번호",
    phone: "연락처",
    address: "주소",
    country: "꽃집 위치(운영 국가)",
    countryHint: "운영 국가 저장 시 통화 기본값이 자동으로 변경됩니다.",
    save: "저장하기",
    currencyTitle: "국가 및 화폐",
    presetTitle: "국가 추천 프리셋",
    presetLocale: "권장 언어",
    presetChat: "메신저",
    presetDelivery: "배송",
    presetPayment: "결제",
    presetTax: "세금",
    presetDiffTitle: "저장 시 적용될 변경 미리보기",
    presetNoDiff: "현재 설정이 이미 프리셋과 유사하여 큰 변경이 없습니다.",
    presetFieldLabels: {
      country: "운영 국가",
      currency: "통화",
      isTaxExempt: "면세 여부",
      defaultTaxRate: "기본 세율",
      useKakaoTalk: "카카오톡 연동",
      autoDeliveryBooking: "자동 배송 접수",
      deliveryCarriers: "배송사 기본값",
    },
  },
};

const VI: SettingsMessages = {
  pageTitle: "Cài đặt",
  pageSubtitle: "Quản lý chính sách cửa hàng và bảo mật dữ liệu.",
  tabs: {
    store: "Thông tin cửa hàng",
    orderPayment: "Đơn hàng/Giảm giá/Điểm",
    delivery: "Phí giao hàng",
    categories: "Danh mục",
    printer: "Máy in/Cầu nối",
    integrations: "Tích hợp & Tự động",
    partner: "Mạng lưới đối tác",
    account: "Thành viên/Bảo mật",
    data: "Sao lưu & Đặt lại",
  },
  store: {
    title: "Thông tin cơ bản cửa hàng",
    storeName: "Tên cửa hàng",
    representative: "Người đại diện",
    bizNo: "Mã số kinh doanh",
    phone: "Liên hệ",
    address: "Địa chỉ",
    country: "Quốc gia vận hành",
    countryHint: "Lưu quốc gia sẽ tự động cập nhật đơn vị tiền tệ mặc định.",
    save: "Lưu",
    currencyTitle: "Quốc gia & Tiền tệ",
    presetTitle: "Preset theo quốc gia",
    presetLocale: "Ngôn ngữ đề xuất",
    presetChat: "Chat",
    presetDelivery: "Giao hàng",
    presetPayment: "Thanh toán",
    presetTax: "Thuế",
    presetDiffTitle: "Thay đổi sẽ áp dụng khi lưu",
    presetNoDiff: "Cài đặt hiện tại đã gần khớp với preset này.",
    presetFieldLabels: {
      country: "Quốc gia vận hành",
      currency: "Tiền tệ",
      isTaxExempt: "Miễn thuế",
      defaultTaxRate: "Thuế suất mặc định",
      useKakaoTalk: "Tích hợp KakaoTalk",
      autoDeliveryBooking: "Tự động nhận giao hàng",
      deliveryCarriers: "Đơn vị vận chuyển mặc định",
    },
  },
};

const EN: SettingsMessages = {
  pageTitle: "Settings",
  pageSubtitle: "Manage store policies and data security.",
  tabs: {
    store: "Store Info",
    orderPayment: "Order/Discount/Points",
    delivery: "Delivery Fees",
    categories: "Categories",
    printer: "Printer/Bridge",
    integrations: "Integrations & Automation",
    partner: "Partner Network",
    account: "Membership/Security",
    data: "Backup & Reset",
  },
  store: {
    title: "Store Basic Information",
    storeName: "Store Name",
    representative: "Representative",
    bizNo: "Business Number",
    phone: "Contact",
    address: "Address",
    country: "Operating Country",
    countryHint: "Saving country will automatically update the default currency.",
    save: "Save",
    currencyTitle: "Country & Currency",
    presetTitle: "Country Preset",
    presetLocale: "Recommended Language",
    presetChat: "Chat",
    presetDelivery: "Delivery",
    presetPayment: "Payment",
    presetTax: "Tax",
    presetDiffTitle: "Changes that will be applied",
    presetNoDiff: "Current settings already match this preset closely.",
    presetFieldLabels: {
      country: "Operating country",
      currency: "Currency",
      isTaxExempt: "Tax exempt",
      defaultTaxRate: "Default tax rate",
      useKakaoTalk: "KakaoTalk integration",
      autoDeliveryBooking: "Auto delivery booking",
      deliveryCarriers: "Default delivery carriers",
    },
  },
};

const JA: SettingsMessages = {
  pageTitle: "設定",
  pageSubtitle: "店舗の運用ポリシーとデータのセキュリティを管理します。",
  tabs: {
    store: "店舗情報",
    orderPayment: "注文／割引／ポイント",
    delivery: "送料設定",
    categories: "カテゴリ管理",
    printer: "プリンター／ブリッジ",
    integrations: "連携と自動化",
    partner: "パートナーネットワーク",
    account: "会員／セキュリティ",
    data: "バックアップと初期化",
  },
  store: {
    title: "店舗の基本情報",
    storeName: "店舗名",
    representative: "代表者",
    bizNo: "事業者登録番号",
    phone: "連絡先",
    address: "住所",
    country: "運営国（店舗の所在地）",
    countryHint: "運営国を保存すると、既定の通貨が自動で更新されます。",
    save: "保存",
    currencyTitle: "国と通貨",
    presetTitle: "国別おすすめプリセット",
    presetLocale: "推奨言語",
    presetChat: "チャット",
    presetDelivery: "配送",
    presetPayment: "決済",
    presetTax: "税金",
    presetDiffTitle: "保存時に反映される変更のプレビュー",
    presetNoDiff: "現在の設定はこのプリセットにほぼ一致しており、大きな変更はありません。",
    presetFieldLabels: {
      country: "運営国",
      currency: "通貨",
      isTaxExempt: "免税の有無",
      defaultTaxRate: "既定税率",
      useKakaoTalk: "KakaoTalk 連携",
      autoDeliveryBooking: "配送の自動受付",
      deliveryCarriers: "配送業者の既定値",
    },
  },
};

const ZH: SettingsMessages = {
  pageTitle: "设置",
  pageSubtitle: "管理店铺运营政策与数据安全。",
  tabs: {
    store: "店铺信息",
    orderPayment: "订单／折扣／积分",
    delivery: "运费设置",
    categories: "分类管理",
    printer: "打印机／桥接",
    integrations: "集成与自动化",
    partner: "合作方网络",
    account: "会员／安全",
    data: "备份与重置",
  },
  store: {
    title: "店铺基本信息",
    storeName: "店铺名称",
    representative: "负责人",
    bizNo: "营业执照号",
    phone: "联系方式",
    address: "地址",
    country: "花店位置（运营国家）",
    countryHint: "保存运营国家后，默认货币会自动更新。",
    save: "保存",
    currencyTitle: "国家与货币",
    presetTitle: "国家推荐预设",
    presetLocale: "推荐语言",
    presetChat: "即时通讯",
    presetDelivery: "配送",
    presetPayment: "支付",
    presetTax: "税费",
    presetDiffTitle: "保存时将应用的变更预览",
    presetNoDiff: "当前设置已与该预设非常接近，几乎没有变更。",
    presetFieldLabels: {
      country: "运营国家",
      currency: "货币",
      isTaxExempt: "是否免税",
      defaultTaxRate: "默认税率",
      useKakaoTalk: "KakaoTalk 集成",
      autoDeliveryBooking: "自动接单配送",
      deliveryCarriers: "默认承运商",
    },
  },
};

const ES: SettingsMessages = {
  pageTitle: "Ajustes",
  pageSubtitle: "Administra las políticas de la tienda y la seguridad de los datos.",
  tabs: {
    store: "Datos de la tienda",
    orderPayment: "Pedidos/Descuentos/Puntos",
    delivery: "Gastos de envío",
    categories: "Categorías",
    printer: "Impresora/Puente",
    integrations: "Integraciones y automatización",
    partner: "Red de socios",
    account: "Suscripción/Seguridad",
    data: "Copia de seguridad y restablecimiento",
  },
  store: {
    title: "Información básica de la tienda",
    storeName: "Nombre de la tienda",
    representative: "Representante",
    bizNo: "Número de registro mercantil",
    phone: "Contacto",
    address: "Dirección",
    country: "País de operación",
    countryHint: "Al guardar el país, la moneda predeterminada se actualizará automáticamente.",
    save: "Guardar",
    currencyTitle: "País y moneda",
    presetTitle: "Perfil recomendado por país",
    presetLocale: "Idioma recomendado",
    presetChat: "Chat",
    presetDelivery: "Envío",
    presetPayment: "Pago",
    presetTax: "Impuestos",
    presetDiffTitle: "Vista previa de los cambios al guardar",
    presetNoDiff: "La configuración actual ya coincide en gran medida con este perfil.",
    presetFieldLabels: {
      country: "País de operación",
      currency: "Moneda",
      isTaxExempt: "Exento de impuestos",
      defaultTaxRate: "Tipo impositivo predeterminado",
      useKakaoTalk: "Integración con KakaoTalk",
      autoDeliveryBooking: "Recepción automática de envíos",
      deliveryCarriers: "Transportistas predeterminados",
    },
  },
};

const PT: SettingsMessages = {
  pageTitle: "Configurações",
  pageSubtitle: "Gerencie as políticas da loja e a segurança dos dados.",
  tabs: {
    store: "Informações da loja",
    orderPayment: "Pedidos/Descontos/Pontos",
    delivery: "Taxas de entrega",
    categories: "Categorias",
    printer: "Impressora/Ponte",
    integrations: "Integrações e automação",
    partner: "Rede de parceiros",
    account: "Assinatura/Segurança",
    data: "Backup e redefinição",
  },
  store: {
    title: "Informações básicas da loja",
    storeName: "Nome da loja",
    representative: "Representante",
    bizNo: "Número de registro comercial",
    phone: "Contato",
    address: "Endereço",
    country: "País de operação",
    countryHint: "Ao salvar o país, a moeda padrão será atualizada automaticamente.",
    save: "Salvar",
    currencyTitle: "País e moeda",
    presetTitle: "Perfil recomendado por país",
    presetLocale: "Idioma recomendado",
    presetChat: "Chat",
    presetDelivery: "Entrega",
    presetPayment: "Pagamento",
    presetTax: "Impostos",
    presetDiffTitle: "Pré-visualização das alterações ao salvar",
    presetNoDiff: "As configurações atuais já estão muito próximas deste perfil.",
    presetFieldLabels: {
      country: "País de operação",
      currency: "Moeda",
      isTaxExempt: "Isento de impostos",
      defaultTaxRate: "Alíquota padrão",
      useKakaoTalk: "Integração KakaoTalk",
      autoDeliveryBooking: "Recebimento automático de entregas",
      deliveryCarriers: "Transportadoras padrão",
    },
  },
};

const FR: SettingsMessages = {
  pageTitle: "Paramètres",
  pageSubtitle: "Gérez les règles du magasin et la sécurité des données.",
  tabs: {
    store: "Infos magasin",
    orderPayment: "Commandes/Remises/Points",
    delivery: "Frais de livraison",
    categories: "Catégories",
    printer: "Imprimante/Pont",
    integrations: "Intégrations et automatisation",
    partner: "Réseau partenaires",
    account: "Abonnement/Sécurité",
    data: "Sauvegarde et réinitialisation",
  },
  store: {
    title: "Informations de base du magasin",
    storeName: "Nom du magasin",
    representative: "Représentant",
    bizNo: "Numéro d’immatriculation",
    phone: "Contact",
    address: "Adresse",
    country: "Pays d’exploitation",
    countryHint: "En enregistrant le pays, la devise par défaut est mise à jour automatiquement.",
    save: "Enregistrer",
    currencyTitle: "Pays et devise",
    presetTitle: "Préréglage recommandé par pays",
    presetLocale: "Langue recommandée",
    presetChat: "Chat",
    presetDelivery: "Livraison",
    presetPayment: "Paiement",
    presetTax: "Taxes",
    presetDiffTitle: "Aperçu des changements à l’enregistrement",
    presetNoDiff: "Les réglages actuels sont déjà très proches de ce préréglage.",
    presetFieldLabels: {
      country: "Pays d’exploitation",
      currency: "Devise",
      isTaxExempt: "Exonération fiscale",
      defaultTaxRate: "Taux de TVA par défaut",
      useKakaoTalk: "Intégration KakaoTalk",
      autoDeliveryBooking: "Prise en charge auto des livraisons",
      deliveryCarriers: "Transporteurs par défaut",
    },
  },
};

const DE: SettingsMessages = {
  pageTitle: "Einstellungen",
  pageSubtitle: "Verwalten Sie Ladenrichtlinien und Datensicherheit.",
  tabs: {
    store: "Ladeninformationen",
    orderPayment: "Bestellung/Rabatt/Punkte",
    delivery: "Versandkosten",
    categories: "Kategorien",
    printer: "Drucker/Bridge",
    integrations: "Integrationen und Automatisierung",
    partner: "Partnernetzwerk",
    account: "Mitgliedschaft/Sicherheit",
    data: "Backup und Zurücksetzen",
  },
  store: {
    title: "Grunddaten des Ladens",
    storeName: "Ladenname",
    representative: "Vertretungsberechtigte Person",
    bizNo: "Handelsregisternummer",
    phone: "Kontakt",
    address: "Adresse",
    country: "Betriebsland",
    countryHint: "Beim Speichern des Landes wird die Standardwährung automatisch aktualisiert.",
    save: "Speichern",
    currencyTitle: "Land und Währung",
    presetTitle: "Empfohlenes Länder-Profil",
    presetLocale: "Empfohlene Sprache",
    presetChat: "Chat",
    presetDelivery: "Lieferung",
    presetPayment: "Zahlung",
    presetTax: "Steuern",
    presetDiffTitle: "Vorschau der Änderungen beim Speichern",
    presetNoDiff: "Die aktuellen Einstellungen entsprechen diesem Profil bereits weitgehend.",
    presetFieldLabels: {
      country: "Betriebsland",
      currency: "Währung",
      isTaxExempt: "Steuerbefreiung",
      defaultTaxRate: "Standard-Steuersatz",
      useKakaoTalk: "KakaoTalk-Integration",
      autoDeliveryBooking: "Automatische Lieferaufträge",
      deliveryCarriers: "Standard-Versanddienste",
    },
  },
};

const RU: SettingsMessages = {
  pageTitle: "Настройки",
  pageSubtitle: "Управляйте правилами магазина и безопасностью данных.",
  tabs: {
    store: "Данные магазина",
    orderPayment: "Заказы/Скидки/Баллы",
    delivery: "Стоимость доставки",
    categories: "Категории",
    printer: "Принтер/мост",
    integrations: "Интеграции и автоматизация",
    partner: "Партнёрская сеть",
    account: "Подписка/безопасность",
    data: "Резервная копия и сброс",
  },
  store: {
    title: "Основные сведения о магазине",
    storeName: "Название магазина",
    representative: "Представитель",
    bizNo: "Регистрационный номер",
    phone: "Контакт",
    address: "Адрес",
    country: "Страна работы",
    countryHint: "При сохранении страны валюта по умолчанию обновится автоматически.",
    save: "Сохранить",
    currencyTitle: "Страна и валюта",
    presetTitle: "Рекомендуемый профиль по стране",
    presetLocale: "Рекомендуемый язык",
    presetChat: "Чат",
    presetDelivery: "Доставка",
    presetPayment: "Оплата",
    presetTax: "Налоги",
    presetDiffTitle: "Предпросмотр изменений при сохранении",
    presetNoDiff: "Текущие настройки уже близки к этому профилю.",
    presetFieldLabels: {
      country: "Страна работы",
      currency: "Валюта",
      isTaxExempt: "Освобождение от налога",
      defaultTaxRate: "Ставка налога по умолчанию",
      useKakaoTalk: "Интеграция KakaoTalk",
      autoDeliveryBooking: "Автоприём доставок",
      deliveryCarriers: "Службы доставки по умолчанию",
    },
  },
};

const BASE_MESSAGES: Record<string, SettingsMessages> = {
  ko: KO,
  en: EN,
  vi: VI,
  zh: ZH,
  ja: JA,
  es: ES,
  pt: PT,
  fr: FR,
  de: DE,
  ru: RU,
};

export function getDashboardSettingsMessages(locale: AppLocale): SettingsMessages {
  const base = toBaseLocale(locale);
  return BASE_MESSAGES[base] ?? EN;
}
