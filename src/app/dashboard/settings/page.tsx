"use client";
import { getMessages } from "@/i18n/getMessages";

import { useState, useEffect, useMemo, useRef } from "react";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { 
  Building2, 
  CreditCard, 
  Printer, 
  Settings as SettingsIcon,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MapPin,
  Plus,
  Trash2,
  Database,
  Download,
  Upload,
  RefreshCw,
  Percent,
  Coins,
  ShieldCheck,
  FileSpreadsheet,
  Link as LinkIcon,
  ExternalLink,
  Info,
  Layers,
  Package,
  Image as ImageIcon,
  Share2,
  MessageCircle,
  Cloud,
  FileImage,
  LayoutGrid,
  Globe,
  MonitorPlay,
  Mail
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { useDeliveryFees } from "@/hooks/use-delivery-fees";
import { defaultSettings, useSettings } from "@/hooks/use-settings";
import { useRouter } from "next/navigation";
import { DeliverySettings } from "./components/DeliverySettings";
import { PosIntegrationCard } from "./components/PosIntegrationCard";
import { OrderPolicySettings } from "./components/OrderPolicySettings";
import { AutomationSettings } from "./components/AutomationSettings";
import { EmailSettingsCard } from "./components/EmailSettingsCard";
import { DesktopElectronSettingsCard } from "@/components/desktop/desktop-electron-settings-card";
import { SettingsSubNav } from "./components/settings-sub-nav";
import { KakaoPcSettingsCard } from "./components/KakaoPcSettingsCard";
import { MallIntegrationCard } from "./components/MallIntegrationCard";
import { RegionalIntegrationPanel } from "./components/RegionalIntegrationPanel";
import { applyCountryPreset, getCountryPreset, getCountryPresetDiff } from "@/lib/country-preset";
import { AppLocale, resolveLocale, toBaseLocale } from "@/i18n/config";
import { readUiLocaleCookie } from "@/i18n/apply-ui-locale";
import { getDashboardSettingsMessages } from "@/i18n/dashboard-settings-messages";
import { pickUiText } from "@/i18n/pick-ui-text";
import {
  OPERATING_COUNTRIES,
  operatingCountryDisplayName,
  type OperatingCountryRow,
} from "@/lib/operating-countries";
import {
  RECEIPT_LOCALE_SELECT_OPTIONS,
  normalizeReceiptLocaleSetting,
  receiptLocaleOptionLabel,
} from "@/lib/receipt-locale-options";
import { DASHBOARD_LOCALE_SELECT_OPTIONS, resolveDashboardSelectLocale } from "@/i18n/ui-locale-options";
import { BridgeOnboardingDialog } from "@/components/printer/BridgeOnboardingDialog";
import { usePersistUiLocale } from "@/hooks/use-persist-ui-locale";
import { Checkbox } from "@/components/ui/checkbox";

const MAJOR_CURRENCIES = [
  { code: 'KRW', symbol: '₩', flag: '🇰🇷', nameKo: '대한민국 원', nameEn: 'Korean Won' },
  { code: 'USD', symbol: '$', flag: '🇺🇸', nameKo: '미국 달러', nameEn: 'US Dollar' },
  { code: 'EUR', symbol: '€', flag: '🇪🇺', nameKo: '유로', nameEn: 'Euro' },
  { code: 'JPY', symbol: '¥', flag: '🇯🇵', nameKo: '일본 엔', nameEn: 'Japanese Yen' },
  { code: 'CNY', symbol: '￥', flag: '🇨🇳', nameKo: '중국 위안', nameEn: 'Chinese Yuan' },
  { code: 'GBP', symbol: '£', flag: '🇬🇧', nameKo: '영국 파운드', nameEn: 'British Pound' },
  { code: 'AUD', symbol: 'A$', flag: '🇦🇺', nameKo: '호주 달러', nameEn: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', flag: '🇨🇦', nameKo: '캐나다 달러', nameEn: 'Canadian Dollar' },
  { code: 'SGD', symbol: 'S$', flag: '🇸🇬', nameKo: '싱가포르 달러', nameEn: 'Singapore Dollar' },
  { code: 'VND', symbol: '₫', flag: '🇻🇳', nameKo: '베트남 동', nameEn: 'Vietnamese Dong' },
  { code: 'BRL', symbol: 'R$', flag: '🇧🇷', nameKo: '브라질 레알', nameEn: 'Brazilian Real' },
  { code: 'MXN', symbol: 'MX$', flag: '🇲🇽', nameKo: '멕시코 페소', nameEn: 'Mexican Peso' },
  { code: 'CHF', symbol: 'CHF', flag: '🇨🇭', nameKo: '스위스 프랑', nameEn: 'Swiss Franc' },
  { code: 'ARS', symbol: 'AR$', flag: '🇦🇷', nameKo: '아르헨티나 페소', nameEn: 'Argentine Peso' },
  { code: 'NZD', symbol: 'NZ$', flag: '🇳🇿', nameKo: '뉴질랜드 달러', nameEn: 'New Zealand Dollar' },
  { code: 'CLP', symbol: 'CLP$', flag: '🇨🇱', nameKo: '칠레 페소', nameEn: 'Chilean Peso' },
  { code: 'MZN', symbol: 'MT', flag: '🇲🇿', nameKo: '모잠비크 메티칼', nameEn: 'Mozambican Metical' },
  { code: 'EGP', symbol: 'E£', flag: '🇪🇬', nameKo: '이집트 파운드', nameEn: 'Egyptian Pound' },
  { code: 'ZAR', symbol: 'R', flag: '🇿🇦', nameKo: '남아프리카 랜드', nameEn: 'South African Rand' },
  { code: 'RUB', symbol: '₽', flag: '🇷🇺', nameKo: '러시아 루블', nameEn: 'Russian Ruble' },
  // 동남아 3개국
  { code: 'IDR', symbol: 'Rp', flag: '🇮🇩', nameKo: '인도네시아 루피아', nameEn: 'Indonesian Rupiah' },
  { code: 'MYR', symbol: 'RM', flag: '🇲🇾', nameKo: '말레이시아 링깃', nameEn: 'Malaysian Ringgit' },
  { code: 'THB', symbol: '฿', flag: '🇹🇭', nameKo: '태국 바트', nameEn: 'Thai Baht' },
  { code: 'INR', symbol: '₹', flag: '🇮🇳', nameKo: '인도 루피', nameEn: 'Indian Rupee' },
  { code: 'AED', symbol: 'د.إ', flag: '🇦🇪', nameKo: 'UAE 디르함', nameEn: 'UAE Dirham' },
  { code: 'SAR', symbol: '﷼', flag: '🇸🇦', nameKo: '사우디 리얄', nameEn: 'Saudi Riyal' },
  { code: 'TWD', symbol: 'NT$', flag: '🇹🇼', nameKo: '신타이완 달러', nameEn: 'New Taiwan Dollar' },
  { code: 'HKD', symbol: 'HK$', flag: '🇭🇰', nameKo: '홍콩 달러', nameEn: 'Hong Kong Dollar' },
  { code: 'PHP', symbol: '₱', flag: '🇵🇭', nameKo: '필리핀 페소', nameEn: 'Philippine Peso' },
  { code: 'TRY', symbol: '₺', flag: '🇹🇷', nameKo: '터키 리라', nameEn: 'Turkish Lira' },
  { code: 'PLN', symbol: 'zł', flag: '🇵🇱', nameKo: '폴란드 즐로티', nameEn: 'Polish Złoty' },
] as const;

type MajorCurrencyRow = (typeof MAJOR_CURRENCIES)[number];

/** vi·ja·zh·es·pt·fr·de·ru (ko·en은 MAJOR_CURRENCIES 행 사용) */
const MAJOR_CURRENCY_NAME_PACKS: Record<
  MajorCurrencyRow["code"],
  { vi: string; ja: string; zh: string; es: string; pt: string; fr: string; de: string; ru: string }
> = {
  KRW: {
    vi: "Won Hàn Quốc",
    ja: "韓国ウォン",
    zh: "韩元",
    es: "Won surcoreano",
    pt: "Won sul-coreano",
    fr: "Won sud-coréen",
    de: "Südkoreanischer Won",
    ru: "Южнокорейская вона",
  },
  USD: {
    vi: "Đô la Mỹ",
    ja: "米ドル",
    zh: "美元",
    es: "Dólar estadounidense",
    pt: "Dólar americano",
    fr: "Dollar américain",
    de: "US-Dollar",
    ru: "Доллар США",
  },
  EUR: {
    vi: "Euro",
    ja: "ユーロ",
    zh: "欧元",
    es: "Euro",
    pt: "Euro",
    fr: "Euro",
    de: "Euro",
    ru: "Евро",
  },
  JPY: {
    vi: "Yên Nhật",
    ja: "日本円",
    zh: "日元",
    es: "Yen japonés",
    pt: "Iene japonês",
    fr: "Yen japonais",
    de: "Japanischer Yen",
    ru: "Японская иена",
  },
  CNY: {
    vi: "Nhân dân tệ",
    ja: "人民元",
    zh: "人民币",
    es: "Yuan chino",
    pt: "Yuan chinês",
    fr: "Yuan chinois",
    de: "Renminbi-Yuan",
    ru: "Китайский юань",
  },
  GBP: {
    vi: "Bảng Anh",
    ja: "英ポンド",
    zh: "英镑",
    es: "Libra esterlina",
    pt: "Libra esterlina",
    fr: "Livre sterling",
    de: "Britisches Pfund",
    ru: "Фунт стерлингов",
  },
  AUD: {
    vi: "Đô la Úc",
    ja: "オーストラリアドル",
    zh: "澳元",
    es: "Dólar australiano",
    pt: "Dólar australiano",
    fr: "Dollar australien",
    de: "Australischer Dollar",
    ru: "Австралийский доллар",
  },
  CAD: {
    vi: "Đô la Canada",
    ja: "カナダドル",
    zh: "加元",
    es: "Dólar canadiense",
    pt: "Dólar canadense",
    fr: "Dollar canadien",
    de: "Kanadischer Dollar",
    ru: "Канадский доллар",
  },
  SGD: {
    vi: "Đô la Singapore",
    ja: "シンガポールドル",
    zh: "新加坡元",
    es: "Dólar de Singapur",
    pt: "Dólar de Singapura",
    fr: "Dollar de Singapour",
    de: "Singapur-Dollar",
    ru: "Сингапурский доллар",
  },
  VND: {
    vi: "Đồng Việt Nam",
    ja: "ベトナムドン",
    zh: "越南盾",
    es: "Dong vietnamita",
    pt: "Dong vietnamita",
    fr: "Dong vietnamien",
    de: "Vietnamesischer Dong",
    ru: "Вьетнамский донг",
  },
  BRL: {
    vi: "Real Brazil",
    ja: "ブラジルレアル",
    zh: "巴西雷亚尔",
    es: "Real brasileño",
    pt: "Real brasileiro",
    fr: "Real brésilien",
    de: "Brasilianischer Real",
    ru: "Бразильский реал",
  },
  MXN: {
    vi: "Peso Mexico",
    ja: "メキシコペソ",
    zh: "墨西哥比索",
    es: "Peso mexicano",
    pt: "Peso mexicano",
    fr: "Peso mexicain",
    de: "Mexikanischer Peso",
    ru: "Мексиканское песо",
  },
  CHF: {
    vi: "Franc Thụy Sĩ",
    ja: "スイスフラン",
    zh: "瑞士法郎",
    es: "Franco suizo",
    pt: "Franco suíço",
    fr: "Franc suisse",
    de: "Schweizer Franken",
    ru: "Швейцарский франк",
  },
  ARS: {
    vi: "Peso Argentina",
    ja: "アルゼンチンペソ",
    zh: "阿根廷比索",
    es: "Peso argentino",
    pt: "Peso argentino",
    fr: "Peso argentin",
    de: "Argentinischer Peso",
    ru: "Аргентинское песо",
  },
  NZD: {
    vi: "Đô la New Zealand",
    ja: "ニュージーランドドル",
    zh: "新西兰元",
    es: "Dólar neozelandés",
    pt: "Dólar neozelandês",
    fr: "Dollar néo-zélandais",
    de: "Neuseeland-Dollar",
    ru: "Новозеландский доллар",
  },
  CLP: {
    vi: "Peso Chile",
    ja: "チリペソ",
    zh: "智利比索",
    es: "Peso chileno",
    pt: "Peso chileno",
    fr: "Peso chilien",
    de: "Chilenischer Peso",
    ru: "Чилийское песо",
  },
  MZN: {
    vi: "Metical Mozambique",
    ja: "モザンビーク・メティカル",
    zh: "莫桑比克梅蒂卡尔",
    es: "Metical mozambiqueño",
    pt: "Metical moçambicano",
    fr: "Metical mozambicain",
    de: "Mosambikanischer Metical",
    ru: "Мозамбикский метикал",
  },
  EGP: {
    vi: "Bảng Ai Cập",
    ja: "エジプトポンド",
    zh: "埃及镑",
    es: "Libra egipcia",
    pt: "Libra egípcia",
    fr: "Livre égyptienne",
    de: "Ägyptisches Pfund",
    ru: "Египетский фунт",
  },
  ZAR: {
    vi: "Rand Nam Phi",
    ja: "南アフリカランド",
    zh: "南非兰特",
    es: "Rand sudafricano",
    pt: "Rand sul-africano",
    fr: "Rand sud-africain",
    de: "Südafrikanischer Rand",
    ru: "Южноафриканский рэнд",
  },
  RUB: {
    vi: "Rúp Nga",
    ja: "ロシアルーブル",
    zh: "俄罗斯卢布",
    es: "Rublo ruso",
    pt: "Rublo russo",
    fr: "Rouble russe",
    de: "Russischer Rubel",
    ru: "Российский рубль",
  },
  IDR: {
    vi: "Rupiah Indonesia",
    ja: "インドネシアルピア",
    zh: "印尼盾",
    es: "Rupia indonesia",
    pt: "Rupia indonésia",
    fr: "Roupie indonésienne",
    de: "Indonesische Rupiah",
    ru: "Индонезийская рупия",
  },
  MYR: {
    vi: "Ringgit Malaysia",
    ja: "マレーシアリンギット",
    zh: "马来西亚林吉特",
    es: "Ringgit malayo",
    pt: "Ringgit malaio",
    fr: "Ringgit malaisien",
    de: "Malaysischer Ringgit",
    ru: "Малайзийский ринггит",
  },
  THB: {
    vi: "Baht Thái",
    ja: "タイバーツ",
    zh: "泰铢",
    es: "Baht tailandés",
    pt: "Baht tailandês",
    fr: "Baht thaïlandais",
    de: "Thailändischer Baht",
    ru: "Тайский бат",
  },
  INR: {
    vi: "Rupee Ấn Độ",
    ja: "インドルピー",
    zh: "印度卢比",
    es: "Rupia india",
    pt: "Rupia indiana",
    fr: "Roupie indienne",
    de: "Indische Rupie",
    ru: "Индийская рупия",
  },
  AED: {
    vi: "Dirham UAE",
    ja: "UAEディルハム",
    zh: "阿联酋迪拉姆",
    es: "Dírham de EAU",
    pt: "Dirham dos EAU",
    fr: "Dirham des Émirats arabes unis",
    de: "VAE-Dirham",
    ru: "Дирхам ОАЭ",
  },
  SAR: {
    vi: "Riyal Ả Rập Xê Út",
    ja: "サウジリヤル",
    zh: "沙特里亚尔",
    es: "Riyal saudí",
    pt: "Riyal saudita",
    fr: "Riyal saoudien",
    de: "Saudi-Riyal",
    ru: "Саудовский риял",
  },
  TWD: {
    vi: "Đô la Đài Loan",
    ja: "台湾ドル",
    zh: "新台币",
    es: "Nuevo dólar taiwanés",
    pt: "Novo dólar taiwanês",
    fr: "Nouveau dollar taïwanais",
    de: "Neuer Taiwan-Dollar",
    ru: "Новый тайваньский доллар",
  },
  HKD: {
    vi: "Đô la Hồng Kông",
    ja: "香港ドル",
    zh: "港元",
    es: "Dólar de Hong Kong",
    pt: "Dólar de Hong Kong",
    fr: "Dollar de Hong Kong",
    de: "Hongkong-Dollar",
    ru: "Гонконгский доллар",
  },
  PHP: {
    vi: "Peso Philippines",
    ja: "フィリピンペソ",
    zh: "菲律宾比索",
    es: "Peso filipino",
    pt: "Peso filipino",
    fr: "Peso philippin",
    de: "Philippinischer Peso",
    ru: "Филиппинское песо",
  },
  TRY: {
    vi: "Lira Thổ Nhĩ Kỳ",
    ja: "トルコリラ",
    zh: "土耳其里拉",
    es: "Lira turca",
    pt: "Lira turca",
    fr: "Livre turque",
    de: "Türkische Lira",
    ru: "Турецкая лира",
  },
  PLN: {
    vi: "Zloty Ba Lan",
    ja: "ポーランドズウォティ",
    zh: "波兰兹罗提",
    es: "Esloti polaco",
    pt: "Zloty polaco",
    fr: "Zloty polonais",
    de: "Polnischer Złoty",
    ru: "Польский злотый",
  },
};

function majorCurrencyDisplayName(baseLocale: string, currency: MajorCurrencyRow): string {
  // pack 누락 시(데이터 추가 누락 등) 런타임 크래시 대신 ko/en 폴백을 사용한다.
  const p = MAJOR_CURRENCY_NAME_PACKS[currency.code];
  if (!p) {
    return pickUiText(baseLocale, currency.nameKo, currency.nameEn);
  }
  return pickUiText(
    baseLocale,
    currency.nameKo,
    currency.nameEn,
    p.vi,
    p.ja,
    p.zh,
    p.es,
    p.pt,
    p.fr,
    p.de,
    p.ru,
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { user, profile, tenantId, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uiLocale, setUiLocale] = useState<AppLocale>("ko");
  
  // Settings & Fees Hooks
  const { settings, saveSettings, loading: settingsLoading } = useSettings();
  const { persistUiLocale } = usePersistUiLocale();
  const { fees: regionFees, addFee, deleteFee, updateFee, importFees, loading: feesLoading } = useDeliveryFees();

  // Subscription Cancellation Local States
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancelPrinterSn, setCancelPrinterSn] = useState("");
  const [cancelCourier, setCancelCourier] = useState("");
  const [cancelTracking, setCancelTracking] = useState("");
  const [agreeCancelTerms, setAgreeCancelTerms] = useState(false);
  const [isCancelingSubscription, setIsCancelingSubscription] = useState(false);
  const [assignedPrinterSn, setAssignedPrinterSn] = useState<string | null>(null);

  // Local State for Management
  const [storeName, setStoreName] = useState("");
  const [plan, setPlan] = useState("free");
  
  // Local state for Store Info
  const [localRep, setLocalRep] = useState("");
  const [localBizNo, setLocalBizNo] = useState("");
  const [localPhone, setLocalPhone] = useState("");
  const [localAddress, setLocalAddress] = useState("");
  const [localEmail, setLocalEmail] = useState("");
  const [localWebsite, setLocalWebsite] = useState("");
  const [localCountry, setLocalCountry] = useState("KR");

  // Password Change State
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  
  // Initialization State
  const [isInitDialogOpen, setIsInitDialogOpen] = useState(false);
  const [initConfirmStep, setInitConfirmStep] = useState(0); 
  const [initInputValue, setInitInputValue] = useState("");
  
  // Partner Network State
  const [canReceiveOrders, setCanReceiveOrders] = useState(false);

  // Device-specific State
  const [deviceAutoPrintDisabled, setDeviceAutoPrintDisabled] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDeviceAutoPrintDisabled(localStorage.getItem('device_autoprint_disabled') === 'true');
    }
  }, []);

  const handleDeviceAutoPrintToggle = (disabled: boolean) => {
    setDeviceAutoPrintDisabled(disabled);
    if (disabled) {
      localStorage.setItem('device_autoprint_disabled', 'true');
    } else {
      localStorage.removeItem('device_autoprint_disabled');
    }
  };

  // Load Assigned Printer S/N for validation matching
  useEffect(() => {
    async function loadAssignedPrinter() {
      if (!tenantId) return;
      const { data, error } = await supabase
        .from("tenant_devices")
        .select("serial_number")
        .eq("tenant_id", tenantId)
        .eq("status", "leased")
        .maybeSingle();
      if (data) {
        setAssignedPrinterSn(data.serial_number);
      }
    }
    if (tenantId) loadAssignedPrinter();
  }, [tenantId, supabase]);

  const handleCancelSubscription = async () => {
    if (!tenantId || !user) {
      toast.error("인증 정보가 부족합니다.");
      return;
    }

    const isAnnual = plan === "annual" || plan === "pro"; // Determine plan type

    // Serial validation for annual packages (Only when printer has been lease-assigned to the tenant)
    if (isAnnual && assignedPrinterSn) {
      if (!cancelPrinterSn) {
        toast.error("반납 기기의 시리얼 번호를 입력해주세요.");
        return;
      }
      if (cancelPrinterSn !== assignedPrinterSn) {
        toast.error("입력하신 시리얼 번호가 대여 장비의 고유 번호와 일치하지 않습니다. 다시 확인해주세요.");
        return;
      }
      if (!cancelCourier || !cancelTracking) {
        toast.error("반납 물류 택배 송장 정보를 정확하게 입력해주세요.");
        return;
      }
    }

    if (!agreeCancelTerms) {
      toast.error("해약 신청 약정 및 위약 조항에 필수 동의해주셔야 신청이 접수됩니다.");
      return;
    }

    setIsCancelingSubscription(true);

    try {
      // 1. Resolve user IP address
      let ipAddr = "127.0.0.1";
      try {
        const ipRes = await fetch("https://api.ipify.org?format=json");
        const ipJson = await ipRes.json();
        if (ipJson.ip) ipAddr = ipJson.ip;
      } catch (ipErr) {
        console.error("IP lookup failed, fallback to default", ipErr);
      }

      // Calculate annual penalty
      const penalty = isAnnual ? 30.00 : 0.00; // 30% penalty rate representation

      // 2. Write cancellation document
      const { error: cancelError } = await supabase
        .from("subscription_cancellations")
        .insert({
          tenant_id: tenantId,
          request_user_email: user.email,
          request_ip: ipAddr,
          plan_type: isAnnual ? "annual" : "monthly",
          penalty_amount: penalty,
          printer_serial_number: isAnnual ? cancelPrinterSn : null,
          courier_name: isAnnual ? cancelCourier : null,
          tracking_number: isAnnual ? cancelTracking : null,
          status: "pending"
        });

      if (cancelError) throw cancelError;

      // 3. Set tenant subscription state to pending_cancel
      const { error: tenantError } = await supabase
        .from("tenants")
        .update({
          subscription_status: "pending_cancel",
          subscription_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days grace period
        })
        .eq("id", tenantId);

      if (tenantError) throw tenantError;

      // 4. Send email notice to headquarters
      try {
        await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: "admin@floxync.com",
            subject: `[구독해지신청] ${storeName} 지점 해지 신청 접수`,
            text: `가맹점: ${storeName}\n요청자 계정: ${user.email}\n요청 IP: ${ipAddr}\n플랜 유형: ${isAnnual ? "연간 패키지" : "월 구독"}\n프린터 S/N: ${cancelPrinterSn || "해당없음"}\n반납 송장: ${cancelCourier} ${cancelTracking}\n\n본사 관리자 페이지에서 반납 택배 실물을 검수하고 최종 해지 승인을 처리하십시오.`
          })
        });
      } catch (mailErr) {
        console.error("Failed to notify HQ via email", mailErr);
      }

      toast.success("해지 신청서가 무사히 접수되었습니다.", {
        description: isAnnual 
          ? "영업일 기준 7일의 유예 후 지점 권한이 정지됩니다. 프린터 미반납 시 위약금이 부과되오니 즉시 장비를 반송해 주십시오."
          : "이번 결제 주기가 끝나는 결제일에 구독이 종료됩니다."
      });

      setIsCancelDialogOpen(false);
      // Reload current configuration state
      window.location.reload();
    } catch (err: any) {
      console.error("Cancellation process crashed", err);
      toast.error("해지 신청 중 에러가 발생했습니다.", { description: err.message });
    } finally {
      setIsCancelingSubscription(false);
    }
  };

  const [isStorefrontPublic, setIsStorefrontPublic] = useState(false);
  const [partnerRegion, setPartnerRegion] = useState("");
  const [partnerCategory, setPartnerCategory] = useState("");
  const [partnerDescription, setPartnerDescription] = useState("");

  // 협력사 네트워크 고도화 상태 및 핸들러
  const [isPartnerSaving, setIsPartnerSaving] = useState(false);
  const [partnerTenants, setPartnerTenants] = useState<any[]>([]);
  const [loadingPartners, setLoadingPartners] = useState(false);
  
  // 파트너 상세 모달용 상태 추가
  const [selectedPartner, setSelectedPartner] = useState<any | null>(null);
  const [isPartnerDetailOpen, setIsPartnerDetailOpen] = useState(false);

  useEffect(() => {
    async function loadPartnerTenants() {
      setLoadingPartners(true);
      try {
        console.log("[PartnerDebug] tenants 쿼리 시작...");
        const { data, error } = await supabase
          .from("tenants")
          .select("id, name, partner_region, partner_category, partner_description, contact_phone, address, created_at")
          .eq("can_receive_orders", true);
        
        if (error) {
          console.error("[PartnerDebug] 쿼리 에러:", error);
          toast.error("파트너 목록 로드 실패: " + error.message, { description: error.details || "RLS 차단 가능성 있음" });
        } else {
          console.log("[PartnerDebug] 수신 성공 데이터 수:", data?.length, data);
          setPartnerTenants(data || []);
        }
      } catch (err) {
        console.error("Failed to load partner tenants:", err);
      } finally {
        setLoadingPartners(false);
      }
    }
    if (tenantId) {
      loadPartnerTenants();
    }
  }, [tenantId, supabase]);

  const handleSavePartnerNetworkSettings = async () => {
    if (!tenantId) return;
    setIsPartnerSaving(true);
    try {
      const { error } = await supabase
        .from("tenants")
        .update({
          can_receive_orders: canReceiveOrders,
          partner_region: partnerRegion,
          partner_category: partnerCategory,
          partner_description: partnerDescription
        })
        .eq("id", tenantId);

      if (error) throw error;
      toast.success(pickUiText(baseLocale, "협력사 네트워크 설정이 저장되었습니다.", "Partner network settings saved."));
    } catch (err: any) {
      toast.error(pickUiText(baseLocale, "설정 저장 실패", "Failed to save settings") + `: ${err.message}`);
    } finally {
      setIsPartnerSaving(false);
    }
  };

  // POS Integration State
  const [posIntegration, setPosIntegration] = useState<any>(null);
  const [isPosLoading, setIsPosLoading] = useState(false);

  // Printer Settings State
  const [bridgeStatus, setBridgeStatus] = useState<boolean>(false);
  const [checkingBridge, setCheckingBridge] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isBridgeOnboardingOpen, setIsBridgeOnboardingOpen] = useState(false);
  const [localPrinters, setLocalPrinters] = useState<string[]>([]);
  const t = useMemo(() => getDashboardSettingsMessages(uiLocale), [uiLocale]);
  const baseLocale = useMemo(() => toBaseLocale(uiLocale), [uiLocale]);
  const tf = useMemo(() => getMessages(uiLocale).tenantFlows, [uiLocale]);
  const selectedCountryPreset = useMemo(() => getCountryPreset(localCountry), [localCountry]);
  const presetDiffItems = useMemo(() => {
    if (!selectedCountryPreset) return [];
    return getCountryPresetDiff(
      { ...settings, country: localCountry },
      localCountry,
      {
        mode: "smart-merge",
        defaults: defaultSettings,
        forceKeys: ["country", "currency"],
      }
    );
  }, [localCountry, selectedCountryPreset, settings]);

  const checkBridgeStatus = async () => {
    setCheckingBridge(true);
    try {
      // 1. Electron 내부 API(IPC)가 존재하는 경우 (우선 사용)
      if (typeof window !== "undefined" && (window as any).electronAPI?.getPrinters) {
        setBridgeStatus(true);
        try {
          const printers = await (window as any).electronAPI.getPrinters();
          if (printers && Array.isArray(printers) && printers.length > 0) {
            setLocalPrinters(printers);
          }
        } catch (e) {
          console.warn("Electron getPrinters failed:", e);
        }
        return; // Electron 통신 성공 시 바로 종료
      }

      // 2. Electron 외부 웹 브라우저 환경이거나 예외 발생 시 기존 8004 포트 통신 시도
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const endpoint = tenantId 
        ? `http://127.0.0.1:8004/set_tenant?id=${tenantId}` 
        : "http://127.0.0.1:8004/api/version";
        
      const response = await fetch(endpoint, { 
        signal: controller.signal,
        mode: 'cors'
      });
      
      clearTimeout(timeoutId);
      if (response.ok) {
        setBridgeStatus(true);
        // 브릿지에서 최신 프린터 목록 바로 가져오기 (Supabase 동기화 대기 없이 즉시 반영)
        try {
          const pr = await fetch("http://127.0.0.1:8004/printers", { mode: 'cors' });
          if (pr.ok) {
            const data = await pr.json();
            if (data.printers && Array.isArray(data.printers) && data.printers.length > 0) {
              setLocalPrinters(data.printers);
            }
          }
        } catch (e) {}
      } else {
        throw new Error(
          pickUiText(
            baseLocale,
            "브릿지 응답이 올바르지 않습니다.",
            "Bridge response not OK",
            "Phản hồi bridge không hợp lệ",
            "ブリッジの応答が正しくありません。",
            "桥接响应异常。",
            "La respuesta del bridge no es correcta.",
            "A resposta da bridge não está correta.",
            "Réponse bridge incorrecte.",
            "Bridge-Antwort ungültig.",
            "Некорректный ответ моста.",
          )
        );
      }
    } catch (err) {
      setBridgeStatus(false);
    } finally {
      setCheckingBridge(false);
    }
  };

  useEffect(() => {
    checkBridgeStatus();
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const readLocale = () => {
      if (settings.uiLocale) {
        setUiLocale(resolveLocale(settings.uiLocale));
        return;
      }
      const cookieValue = readUiLocaleCookie();
      if (cookieValue) setUiLocale(cookieValue);
    };
    readLocale();
    window.addEventListener("preferred-locale-changed", readLocale);
    return () => window.removeEventListener("preferred-locale-changed", readLocale);
  }, [settings.uiLocale]);

  const handleLocaleChange = async (nextLocale: AppLocale) => {
    setUiLocale(nextLocale);
    const saved = await persistUiLocale(nextLocale);
    if (!saved) {
      toast.error(
        pickUiText(
          baseLocale,
          "언어 설정 저장에 실패했습니다.",
          "Failed to save language setting.",
          "Không thể lưu cài đặt ngôn ngữ.",
        ),
      );
      return;
    }
    toast.success(
      pickUiText(
        baseLocale,
        "언어가 변경되었습니다.",
        "Language has been changed.",
        "Ngôn ngữ đã được thay đổi.",
      ),
    );
  };

  const handlePrintTest = async () => {
    console.log('[PrintTest] 클릭됨 | tenantId:', tenantId);
    if (!tenantId) {
      toast.error('테넌트 정보가 없습니다. 로그아웃 후 다시 로그인해주세요.');
      console.warn('[PrintTest] tenantId 없음 → 중단');
      return;
    }
    toast.info(pickUiText(baseLocale, '테스트 인쇄를 요청중입니다...', 'Requesting test print...', 'Đang yêu cầu in thử...'));
    try {
      const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI?.printJob;
      console.log('[PrintTest] isElectron:', isElectron);
      const payload = {
        orderId: 'TEST-1234',
        branchName: settings.siteName || tenantId,
      };

      if (isElectron) {
        await (window as any).electronAPI.printJob({
          job: { job_type: 'print_test', type: 'print_test', payload, data: payload },
          settings: settings,
          branchName: tenantId
        });
      } else {
        console.log('[PrintTest] Supabase insert 시도...');
        const { error } = await supabase.from('print_jobs').insert({
          tenant_id: tenantId, user_id: tenantId, image_base64: '', width_mm: 80, length_mm: 0,
          type: 'print_test',
          status: 'pending',
          data: payload
        });
        if (error) {
          console.error('[PrintTest] insert 실패:', error);
          throw error;
        }
        console.log('[PrintTest] insert 성공 → 브릿지 폴링 대기 중');
      }
      toast.success(pickUiText(baseLocale, '테스트 인쇄가 요청되었습니다. 프린터를 확인해주세요.', 'Test print requested. Please check the printer.', 'Đã yêu cầu in thử. Vui lòng kiểm tra máy in.'));
    } catch (error) {
      console.error('[PrintTest] 오류:', error);
      toast.error(pickUiText(baseLocale, '테스트 인쇄 요청에 실패했습니다.', 'Failed to request test print.', 'Yêu cầu in thử thất bại.'));
    }
  };

  useEffect(() => {
    if (settings) {
      setLocalRep(settings.representative || "");
      setLocalBizNo(settings.businessNumber || "");
      setLocalPhone(settings.contactPhone || "");
      setLocalAddress(settings.address || "");
      setLocalEmail(settings.storeEmail || "");
      setLocalWebsite(settings.siteWebsite || "");
      setLocalCountry(settings.country || "KR");
    }
  }, [settings]);

  useEffect(() => {
    async function loadTenantData() {
      if (!tenantId) {
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("tenants")
          .select("*")
          .eq("id", tenantId)
          .maybeSingle();
        if (data) {
          setStoreName(data.name || "");
          setPlan(data.plan || "free");
          setLogoUrl(data.logo_url || "");
          setCanReceiveOrders(data.can_receive_orders || false);
          setIsStorefrontPublic(data.is_storefront_public || false);
          setPartnerRegion(data.partner_region || "");
          setPartnerCategory(data.partner_category || "");
          setPartnerDescription(data.partner_description || "");
        }
      } catch (err) {
        console.error("Failed to load tenant data:", err);
      } finally {
        setLoading(false);
      }
    }

    async function loadPosData() {
      if (!tenantId) return;
      setIsPosLoading(true);
      try {
        const { data, error } = await supabase
          .from("pos_integrations")
          .select("*")
          .eq("tenant_id", tenantId)
          .maybeSingle();
        if (data) {
          setPosIntegration(data);
        } else {
          setPosIntegration(null);
        }
      } catch (err) {
        console.error("Failed to load POS data:", err);
      } finally {
        setIsPosLoading(false);
      }
    }

    if (!authLoading) {
      loadTenantData();
      loadPosData();
    }
  }, [tenantId, authLoading, supabase]);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !tenantId) return;
    if (!file.type.startsWith("image/")) {
      toast.error(tf.f01686);
      return;
    }

    setSaving(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${tenantId}_logo_${Date.now()}.${fileExt}`;
      const filePath = `${tenantId}/${fileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from("logos")
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("logos")
        .getPublicUrl(filePath);

      setLogoUrl(publicUrl);
      const { error: dbError } = await supabase
        .from("tenants")
        .update({ logo_url: publicUrl })
        .eq("id", tenantId);

      if (dbError) throw dbError;
      toast.success(tf.f01386);
      window.location.reload(); 
    } catch (err: any) {
      toast.error(tf.f02301.replace("{message}", String(err.message)));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStoreInfo = async () => {
    if (!tenantId) return;
    setSaving(true);
    try {
      const { error: tenantError } = await supabase
        .from("tenants")
        .update({ name: storeName, logo_url: logoUrl })
        .eq("id", tenantId);
      if (tenantError) throw tenantError;

      const updatedSettings = {
          ...settings,
          siteName: storeName,
          representative: localRep,
          businessNumber: localBizNo,
          contactPhone: localPhone,
          address: localAddress,
          country: localCountry,
          storeEmail: localEmail,
          siteWebsite: localWebsite,
          contactEmail: localEmail
      };

      const presetAppliedSettings = applyCountryPreset(updatedSettings, localCountry, {
        mode: "smart-merge",
        defaults: defaultSettings,
        forceKeys: ["country", "currency"],
      });
      
      const saved = await saveSettings(presetAppliedSettings);
      if (!saved)
        throw new Error(
          pickUiText(
            baseLocale,
            "설정 저장에 실패했습니다.",
            "Failed to save settings",
            "Lưu cài đặt thất bại",
            "設定の保存に失敗しました。",
            "保存设置失败。",
            "No se pudieron guardar los ajustes.",
            "Falha ao salvar as configurações.",
            "Échec de l’enregistrement des paramètres.",
            "Speichern der Einstellungen fehlgeschlagen.",
            "Не удалось сохранить настройки.",
          )
        );

      document.cookie = `preferred_country=${localCountry}; path=/; max-age=${60 * 60 * 24 * 365}`;

      toast.success(
        tf.f02302.replace("{currency}", String(presetAppliedSettings.currency))
      );
      router.refresh();
    } catch (err) {
      toast.error(tf.f00540);
    } finally {
      setSaving(false);
    }
  };

  const handleBackup = async () => {
    try {
      toast.loading(tf.f01094);
      const electronAPI = typeof window !== "undefined"
        ? (window as Window & { electronAPI?: { triggerBackup?: () => Promise<{ ok?: boolean; data?: Record<string, unknown> }> } }).electronAPI
        : undefined;

      if (electronAPI?.triggerBackup) {
        const result = await electronAPI.triggerBackup();
        const localData = result?.data ?? {};
        const backupData = {
          ...localData,
          timestamp: new Date().toISOString(),
          tenant_id: tenantId,
          tenantId,
          settings,
          shop_name: storeName,
        };
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Floxync_Local_Backup_${storeName}_${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.dismiss();
        toast.success("로컬 DB 백업이 다운로드되었습니다.");
        return;
      }

      const [ordersRes, customersRes, productsRes, feesRes] = await Promise.all([
        supabase.from('orders').select('*').eq('tenant_id', tenantId),
        supabase.from('customers').select('*').eq('tenant_id', tenantId),
        supabase.from('products').select('*').eq('tenant_id', tenantId),
        supabase.from('delivery_fees_by_region').select('*').eq('tenant_id', tenantId)
      ]);

      const backupData = {
        timestamp: new Date().toISOString(),
        tenant_id: tenantId, user_id: tenantId, image_base64: '', width_mm: 0, length_mm: 0,
        shop_name: storeName,
        settings,
        orders: ordersRes.data || [],
        customers: customersRes.data || [],
        products: productsRes.data || [],
        region_fees: feesRes.data || []
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Floxync_Backup_${storeName}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.dismiss();
      toast.success(tf.f01247);
    } catch (err) {
      toast.dismiss();
      toast.error(tf.f01246);
    }
  };

  const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = JSON.parse(e.target?.result as string);
          const fileTenant = content.tenant_id ?? content.tenantId;
          if (fileTenant !== tenantId) {
            toast.error(tf.f01669);
            return;
          }

          const electronAPI = typeof window !== "undefined"
            ? (window as Window & { electronAPI?: { triggerRestore?: (data: unknown) => Promise<{ ok?: boolean; error?: string }> } }).electronAPI
            : undefined;

          if (electronAPI?.triggerRestore && (content.orders || content.customers)) {
            toast.loading("로컬 DB 복구 중...");
            const result = await electronAPI.triggerRestore(content);
            toast.dismiss();
            if (!result?.ok) {
              toast.error(result?.error || tf.f01755);
              return;
            }
            if (content.settings) await saveSettings(content.settings);
            toast.success("로컬 DB 복구가 완료되었습니다.");
            window.location.reload();
            return;
          }

          toast.loading(tf.f01095);
          if (content.settings) await saveSettings(content.settings);
          toast.dismiss();
          toast.success(tf.f01091);
          window.location.reload();
        } catch (err) {
          toast.error(tf.f01755);
        }
      };
      reader.readAsText(file);
    } catch (err) {
      toast.error(tf.f02091);
    }
  };

  const handleReset = async () => {
    try {
      toast.loading(tf.f01990);
      await Promise.all([
        supabase.from('orders').delete().eq('tenant_id', tenantId),
        supabase.from('customers').delete().eq('tenant_id', tenantId),
        supabase.from('products').delete().eq('tenant_id', tenantId)
      ]);
      toast.dismiss();
      toast.success(tf.f01099);
      setIsInitDialogOpen(false);
      window.location.reload();
    } catch (err) {
      toast.dismiss();
      toast.error(tf.f01988);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !newPasswordConfirm) {
      toast.error(pickUiText(baseLocale, "비밀번호를 입력해주세요.", "Please enter a password.", "Vui lòng nhập mật khẩu."));
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      toast.error(pickUiText(baseLocale, "비밀번호가 일치하지 않습니다.", "Passwords do not match.", "Mật khẩu không khớp."));
      return;
    }
    if (newPassword.length < 6) {
      toast.error(pickUiText(baseLocale, "비밀번호는 6자 이상이어야 합니다.", "Password must be at least 6 characters.", "Mật khẩu phải có ít nhất 6 ký tự."));
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success(pickUiText(baseLocale, "비밀번호가 성공적으로 변경되었습니다.", "Password successfully changed.", "Đổi mật khẩu thành công."));
      setIsChangePasswordOpen(false);
      setNewPassword("");
      setNewPasswordConfirm("");
    } catch (err: any) {
      toast.error(err.message || pickUiText(baseLocale, "비밀번호 변경에 실패했습니다.", "Failed to change password.", "Đổi mật khẩu thất bại."));
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const getPlanBadge = (planCode: string) => {
    switch (planCode) {
      case "pro":
        return <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 border-0">{tf.f02284}</Badge>;
      case "pro_plus":
        return <Badge className="bg-gradient-to-r from-emerald-600 to-teal-600 border-0">PRO PLUS</Badge>;
      case "light":
        return (
          <Badge className="bg-emerald-600 border-0">
            {pickUiText(
              baseLocale,
              "라이트",
              "Light",
              "Light",
              "ライト",
              "轻量版",
              "Light",
              "Light",
              "Light",
              "Light",
              "Лайт",
            )}
          </Badge>
        );
      case "ribbon_only":
        return (
          <Badge className="bg-purple-600 border-0">
            {pickUiText(
              baseLocale,
              "리본 전용",
              "Ribbon only",
              "Chỉ ruy băng",
              "リボンのみ",
              "仅丝带",
              "Solo cinta",
              "Somente fita",
              "Ruban uniquement",
              "Nur Band",
              "Только лента",
            )}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-slate-500">
            {pickUiText(
              baseLocale,
              "무료 / 체험",
              "Free / trial",
              "Miễn phí / dùng thử",
              "無料／トライアル",
              "免费 / 试用",
              "Gratis / prueba",
              "Grátis / teste",
              "Gratuit / essai",
              "Kostenlos / Test",
              "Бесплатно / пробный",
            )}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <SettingsIcon className="text-slate-500 h-8 w-8" /> {t.pageTitle}
          </h1>
          <p className="text-slate-500 mt-2">{t.pageSubtitle}</p>
        </div>
        <div className="flex items-center gap-3">
           {getPlanBadge(plan)}
        </div>
      </div>

      <SettingsSubNav />

      <Tabs defaultValue="store" orientation="vertical" className="w-full">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 lg:gap-10 w-full items-start">
          <TabsList className="flex flex-row md:flex-col overflow-x-auto whitespace-nowrap md:overflow-visible w-full md:w-56 lg:w-64 h-auto p-2 bg-slate-50/80 border border-slate-100/60 rounded-2xl gap-2 md:gap-1 items-center md:items-stretch shrink-0 md:sticky md:top-24 shadow-sm shadow-slate-100">
            <TabsTrigger value="store" className="justify-start shrink-0 text-sm py-2.5 px-4 md:py-3 data-[state=active]:bg-white rounded-xl transition-all">
              <Building2 className="h-4 w-4 mr-3 text-slate-500" /> {t.tabs.store}
            </TabsTrigger>
            <TabsTrigger value="order-payment" className="justify-start shrink-0 text-sm py-2.5 px-4 md:py-3 data-[state=active]:bg-white rounded-xl transition-all">
              <Percent className="h-4 w-4 mr-3 text-slate-500" /> {t.tabs.orderPayment}
            </TabsTrigger>
            <TabsTrigger value="delivery" className="justify-start shrink-0 text-sm py-2.5 px-4 md:py-3 data-[state=active]:bg-white rounded-xl transition-all">
              <MapPin className="h-4 w-4 mr-3 text-slate-500" /> {t.tabs.delivery}
            </TabsTrigger>
            <TabsTrigger value="categories" className="justify-start shrink-0 text-sm py-2.5 px-4 md:py-3 rounded-xl text-orange-700 bg-orange-50/30 data-[state=active]:bg-orange-600 data-[state=active]:text-white transition-all">
              <Layers className="h-4 w-4 mr-3" /> {t.tabs.categories}
            </TabsTrigger>
            <TabsTrigger value="printer" className="justify-start shrink-0 text-sm py-2.5 px-4 md:py-3 data-[state=active]:bg-white rounded-xl transition-all">
              <Printer className="h-4 w-4 mr-3 text-slate-500" /> {t.tabs.printer}
            </TabsTrigger>

            <TabsTrigger value="integrations" disabled className="justify-start shrink-0 text-sm py-2.5 px-4 md:py-3 data-[state=active]:bg-white rounded-xl transition-all opacity-60 cursor-not-allowed">
              <LinkIcon className="h-4 w-4 mr-3 text-slate-400" /> 
              <span>{t.tabs.integrations}</span>
              <Badge variant="secondary" className="ml-auto bg-slate-100 text-slate-500 font-bold text-[9px] border-none shadow-none">준비중</Badge>
            </TabsTrigger>
            <TabsTrigger value="email" className="justify-start shrink-0 text-sm py-2.5 px-4 md:py-3 data-[state=active]:bg-white rounded-xl transition-all">
              <Mail className="h-4 w-4 mr-3 text-blue-500" /> {pickUiText(baseLocale, "이메일", "Email")}
            </TabsTrigger>
            <TabsTrigger value="partner-network" className="justify-start shrink-0 text-sm py-2.5 px-4 md:py-3 rounded-xl text-blue-700 bg-blue-50/30 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">
              <Share2 className="h-4 w-4 mr-3" /> {t.tabs.partner}
            </TabsTrigger>
            
            <div className="w-px h-6 md:w-auto md:h-px shrink-0 bg-slate-200 mx-2 md:my-2"></div>
            <TabsTrigger value="data" className="justify-start shrink-0 text-sm py-2.5 px-4 md:py-3 rounded-xl text-rose-700 bg-rose-50/30 data-[state=active]:bg-rose-600 data-[state=active]:text-white transition-all">
              <Database className="h-4 w-4 mr-3" /> {t.tabs.data}
            </TabsTrigger>
          </TabsList>
          
          <div className="flex-1 w-full min-w-0 pb-16">
            <TabsContent value="store" className="space-y-4">
              <Card className="border-0 shadow-sm ring-1 ring-slate-200">
                <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
                  <CardTitle className="text-lg font-bold">{t.store.title}</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setIsChangePasswordOpen(true)} className="h-8 text-xs rounded-xl shadow-sm">
                    {pickUiText(baseLocale, '비밀번호 변경', 'Change Password', 'Đổi mật khẩu')}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="store-name">{t.store.storeName}</Label>
                      <Input id="store-name" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rep">{t.store.representative}</Label>
                      <Input id="rep" value={localRep} onChange={e => setLocalRep(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bizNo">{t.store.bizNo}</Label>
                      <Input id="bizNo" value={localBizNo} onChange={e => setLocalBizNo(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">{t.store.phone}</Label>
                      <Input id="phone" value={localPhone} onChange={e => setLocalPhone(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">{t.store.address}</Label>
                    <Input id="address" value={localAddress} onChange={e => setLocalAddress(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">{t.store.country}</Label>
                    <select
                      id="country"
                      value={localCountry}
                      onChange={(e) => setLocalCountry(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {OPERATING_COUNTRIES.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.flag}{" "}
                          {operatingCountryDisplayName(baseLocale, country)}{" "}
                          ({country.code}) · {tf.f01003}{" "}
                          {country.defaultCurrency}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500">{t.store.countryHint}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="uiLocale">{pickUiText(baseLocale, 'UI 언어 / Language', 'UI Language', 'Ngôn ngữ UI')}</Label>
                    <select
                      id="uiLocale"
                      value={resolveDashboardSelectLocale(uiLocale)}
                      onChange={(e) => handleLocaleChange(e.target.value as AppLocale)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {DASHBOARD_LOCALE_SELECT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500">
                      {pickUiText(baseLocale, '로그인 시 선택한 언어가 기본으로 설정되며, 화면의 메뉴 언어만 변경합니다. 매장 지역(국가) 설정에 따라 화폐 단위, 부가세 용어 등 비즈니스 환경이 자동 최적화됩니다.', 'The language selected at login is set by default, changing only the menu language. Business environment details such as currency and tax terms are automatically optimized based on the store region setting.', 'Ngôn ngữ được chọn khi đăng nhập sẽ là mặc định, chỉ thay đổi ngôn ngữ menu. Các chi tiết môi trường kinh doanh như tiền tệ và thuật ngữ thuế được tối ưu hóa tự động dựa trên cài đặt khu vực cửa hàng.')}
                    </p>
                  </div>
                  {selectedCountryPreset ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 space-y-2">
                        <p className="text-[11px] font-bold text-emerald-800">
                          {t.store.presetTitle} ({selectedCountryPreset.countryCode}) · {t.store.presetLocale} {selectedCountryPreset.localeRecommendation}
                        </p>
                        <p className="text-[11px] text-emerald-900/80">{t.store.presetChat}: {selectedCountryPreset.recommendedStack.chat}</p>
                        <p className="text-[11px] text-emerald-900/80">{t.store.presetDelivery}: {selectedCountryPreset.recommendedStack.delivery}</p>
                        <p className="text-[11px] text-emerald-900/80">{t.store.presetPayment}: {selectedCountryPreset.recommendedStack.payment}</p>
                        <p className="text-[11px] text-emerald-900/80">{t.store.presetTax}: {selectedCountryPreset.recommendedStack.tax}</p>
                        {selectedCountryPreset.settings.currency ? (
                          <p className="text-[11px] text-emerald-900/80">
                            {pickUiText(baseLocale, "기본 통화", "Default currency", "Tiền tệ mặc định")}:{" "}
                            <span className="font-semibold">{selectedCountryPreset.settings.currency}</span>
                          </p>
                        ) : null}
                        {selectedCountryPreset.settings.preferredMessenger ? (
                          <p className="text-[11px] text-emerald-900/80">
                            {pickUiText(baseLocale, "기본 알림 메신저", "Default messenger", "Messenger mặc định")}:{" "}
                            <span className="font-semibold">
                              {{
                                kakaotalk: "카카오톡",
                                zalo: "Zalo",
                                line: "LINE",
                                whatsapp: "WhatsApp",
                                sms: "SMS",
                              }[selectedCountryPreset.settings.preferredMessenger] ??
                                selectedCountryPreset.settings.preferredMessenger}
                            </span>
                          </p>
                        ) : null}
                      {presetDiffItems.length > 0 ? (
                        <div className="mt-2 rounded-lg border border-emerald-300/50 bg-white/70 p-2.5 space-y-1">
                          <p className="text-[10px] font-bold text-emerald-900">{t.store.presetDiffTitle}</p>
                          {presetDiffItems.slice(0, 6).map((item) => (
                            <p key={String(item.key)} className="text-[10px] text-emerald-900/80">
                              {(
                                t.store.presetFieldLabels[item.key as keyof typeof t.store.presetFieldLabels] ??
                                String(item.key)
                              )}
                              :{" "}
                              <span className="line-through opacity-70">{String(item.before)}</span> → {String(item.after)}
                            </p>
                          ))}
                          {presetDiffItems.length > 6 ? (
                            <p className="text-[10px] text-emerald-800/80">
                              {tf.f02303.replace("{n}", String(presetDiffItems.length - 6))}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <p className="text-[10px] text-emerald-900/70">{t.store.presetNoDiff}</p>
                      )}
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between gap-4 p-4 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900">
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <Label className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <MonitorPlay className="h-4 w-4 text-indigo-600 shrink-0" />
                        {tf.f01079}
                      </Label>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                        {tf.f01196}
                      </p>
                    </div>
                    <Switch
                      checked={settings.hideDashboardTicker !== true}
                      onCheckedChange={(show) =>
                        saveSettings({
                          ...settings,
                          hideDashboardTicker: !show,
                          dashboardTickerEnabled: show,
                        })
                      }
                    />
                  </div>

                  <Separator className="my-4 bg-slate-100" />

                  {/* Integrated Tax Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50/80 rounded-2xl border border-slate-100">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-bold text-slate-900">{tf.f01287}</Label>
                        <p className="text-[10px] text-slate-500 font-medium">{tf.f01394}</p>
                      </div>
                      <Switch 
                        checked={settings.isTaxExempt} 
                        onCheckedChange={async (checked) => {
                          const isTaxExempt = checked === true;
                          const saved = await saveSettings({
                            ...settings,
                            isTaxExempt,
                          });
                          if (saved) {
                            toast.success(
                              isTaxExempt
                                ? pickUiText(
                                    baseLocale,
                                    "부가세 면세 사업장으로 저장되었습니다.",
                                    "Saved as VAT-exempt business.",
                                    "Đã lưu doanh nghiệp miễn thuế.",
                                    "免税事業として保存しました。",
                                    "已保存为免税业务。",
                                    "Guardado como negocio exento de IVA.",
                                    "Salvo como negócio isento de IVA.",
                                    "Enregistré comme entreprise exonérée de TVA.",
                                    "Als umsatzsteuerbefreites Unternehmen gespeichert.",
                                    "Сохранено как освобождённое от НДС предприятие."
                                  )
                                : pickUiText(
                                    baseLocale,
                                    "과세 사업장 설정으로 저장되었습니다.",
                                    "Saved as taxable business.",
                                    "Đã lưu doanh nghiệp chịu thuế.",
                                    "課税事業として保存しました。",
                                    "已保存为应税业务。",
                                    "Guardado como negocio sujeto a impuestos.",
                                    "Salvo como negócio tributável.",
                                    "Enregistré comme entreprise imposable.",
                                    "Als steuerpflichtiges Unternehmen gespeichert.",
                                    "Сохранено как облагаемое налогом предприятие."
                                  )
                            );
                          } else {
                            toast.error(tf.f00540);
                          }
                        }}
                      />
                    </div>

                    {!settings.isTaxExempt && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-blue-50/30 rounded-2xl border border-blue-100/50 animate-in fade-in slide-in-from-top-2">
                        <div className="space-y-1">
                          <Label className="text-sm font-bold flex items-center gap-2">{tf.f01288} <Percent size={14} className="text-blue-500" /></Label>
                          <p className="text-[10px] text-slate-400">{tf.f01712}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number" 
                            className="w-24 font-black text-blue-600 bg-white" 
                            value={settings.defaultTaxRate} 
                            onChange={(e) => saveSettings({...settings, defaultTaxRate: Number(e.target.value)})}
                          />
                          <span className="text-xs font-bold text-slate-500">%</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-6 p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                    <div className="h-24 w-24 rounded-2xl border-2 border-dashed border-slate-200 bg-white flex items-center justify-center overflow-hidden">
                      {logoUrl ? <img src={logoUrl} className="h-full w-full object-contain p-2" /> : <ImageIcon className="h-8 w-8 opacity-20" />}
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-bold">{tf.f02208}</p>
                      <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={saving}>{tf.f01128}</Button>
                      <input type="file" className="hidden" ref={fileInputRef} onChange={handleLogoUpload} />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-slate-50/50 px-6 py-4">
                  <Button onClick={handleSaveStoreInfo} disabled={saving}>{saving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}{t.store.save}</Button>
                </CardFooter>
              </Card>

              <Card className="border-0 shadow-sm ring-1 ring-slate-200">
                <CardHeader><CardTitle>{t.store.currencyTitle}</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {MAJOR_CURRENCIES.map((currency) => {
                      const curLabel = majorCurrencyDisplayName(baseLocale, currency);
                      const selected = settings.currency === currency.code;
                      return (
                      <Button
                        key={currency.code}
                        variant={selected ? "default" : "outline"}
                        className="h-auto py-3 flex-col gap-1"
                        title={`${currency.code} — ${curLabel}`}
                        aria-label={`${currency.code}, ${curLabel}`}
                        onClick={() => saveSettings({ ...settings, currency: currency.code })}
                      >
                        <span className="text-xl">{currency.flag}</span>
                        <span className="font-bold text-xs">{currency.code}</span>
                        <span
                          className={cn(
                            "text-[9px] leading-snug text-center line-clamp-2 max-w-[6.5rem] mx-auto font-medium",
                            selected ? "text-white/85" : "text-slate-500",
                          )}
                        >
                          {curLabel}
                        </span>
                      </Button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="order-payment" className="space-y-4">
              <OrderPolicySettings 
                settings={settings}
                saveSettings={saveSettings}
              />
            </TabsContent>

            <TabsContent value="delivery">
              <DeliverySettings 
                settings={settings}
                saveSettings={saveSettings}
                regionFees={regionFees}
                addFee={addFee}
                deleteFee={deleteFee}
                updateFee={updateFee}
                importFees={importFees}
              />
            </TabsContent>

            <TabsContent value="categories" className="space-y-4">
              <Card className="border-0 shadow-sm ring-1 ring-orange-200 bg-orange-50/5">
                <CardHeader><CardTitle>{tf.f02061}</CardTitle></CardHeader>
                <CardContent className="py-12 flex flex-col items-center">
                  <Link href="/dashboard/settings/categories">
                    <Button className="bg-orange-600 hover:bg-orange-700">{tf.f00964}</Button>
                  </Link>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="email" className="space-y-6">
              <EmailSettingsCard settings={settings} saveSettings={saveSettings} />
              <KakaoPcSettingsCard settings={settings} saveSettings={saveSettings} />
            </TabsContent>

            <TabsContent value="integrations" className="space-y-6">
              {/* 국가별 연동 앱 패널 (국가 설정에 따라 자동 교체) */}
              <RegionalIntegrationPanel
                countryCode={localCountry}
                tenantId={tenantId || ''}
              />
              <MallIntegrationCard tenantId={tenantId || ''} />
              
              <AutomationSettings 
                settings={settings}
                saveSettings={saveSettings}
                tenantId={tenantId || ''}
                posIntegration={posIntegration}
                isPosLoading={isPosLoading}
              />

              <Card className="border-0 shadow-sm ring-1 ring-amber-500 bg-amber-50/5 overflow-hidden">
                <CardHeader className="bg-amber-600 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <MessageCircle className="h-5 w-5" />
                       <CardTitle>{tf.f02058}</CardTitle>
                    </div>
                    <Switch 
                      className="data-[state=checked]:bg-white data-[state=checked]:text-amber-600"
                      checked={settings.autoDeliveryBooking}
                      onCheckedChange={(checked) => saveSettings({...settings, autoDeliveryBooking: checked})}
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 space-y-3">
                    <p className="text-xs text-amber-900 leading-relaxed font-medium">
                      {tf.f01234}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase">Kakao T Business ID</Label>
                      <Input 
                        placeholder={tf.f02059}
                        value={settings.kakaoTDeliveryBizId}
                        onChange={e => saveSettings({...settings, kakaoTDeliveryBizId: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase">Kakao T API Key</Label>
                      <Input 
                        type="password"
                        placeholder={tf.f02057}
                        value={settings.kakaoTDeliveryApiKey}
                        onChange={e => saveSettings({...settings, kakaoTDeliveryApiKey: e.target.value})}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="printer" className="space-y-6">
              <Card className="border-0 shadow-sm ring-1 ring-slate-200">
                <CardHeader>
                  <CardTitle>{tf.f02141}</CardTitle>
                  <CardDescription>
                    {pickUiText(baseLocale, '프린터 브릿지와 프린터 기기를 설정합니다.', 'Configure printer bridge and devices.', 'Cấu hình bridge và máy in.')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Bridge Status */}
                  <div className="p-4 border rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-50/50">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-bold">
                          {pickUiText(baseLocale, '프린터 브릿지 연결 상태', 'Printer Bridge Status', 'Trạng thái kết nối Bridge')}
                        </p>
                        <Badge variant={bridgeStatus ? 'default' : 'secondary'} className={bridgeStatus ? 'bg-green-500 hover:bg-green-600' : ''}>
                          {bridgeStatus ? tf.f01565 : tf.f01559}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500">{tf.f01131}</p>
                    </div>
                    <Button variant="outline" onClick={checkBridgeStatus} size="sm">
                      {checkingBridge ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                      {tf.f00348}
                    </Button>
                  </div>

                  <Separator />

                  {/* Bridge Toggles */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">{pickUiText(baseLocale, '영수증/라벨 브릿지 사용', 'Enable POS/Label Bridge', 'Sử dụng Bridge cho POS/Nhãn')}</Label>
                        <p className="text-sm text-slate-500">
                          {pickUiText(
                            baseLocale,
                            '모바일·외부 접수 주문도 이 PC에서 자동 인쇄됩니다. 웹 탭을 닫아도 브릿지 데몬만 실행 중이면 됩니다.',
                            'Mobile and remote orders print here automatically. You can close the web tab if the bridge daemon is running.',
                            'Đơn mobile/xa tự in trên PC này. Có thể đóng tab web nếu bridge đang chạy.',
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Button variant="outline" size="sm" onClick={handlePrintTest}>
                          <Printer className="mr-2 h-4 w-4" />
                          {pickUiText(baseLocale, '프린트 테스트', 'Print Test', 'In thử')}
                        </Button>
                        <a 
                          href="/api/downloads/bridge"
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          {pickUiText(baseLocale, '브릿지 다운로드', 'Download Bridge', 'Tải Bridge')}
                        </a>
                        <Switch 
                          checked={settings.ppBridgeEnabled} 
                          onCheckedChange={(v) => saveSettings({ ...settings, ppBridgeEnabled: v })} 
                        />
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed w-full basis-full">
                        {pickUiText(
                          baseLocale,
                          '설치: ZIP 압축 해제 → install.bat 관리자 실행 → 웹앱 한 번 로그인(매장 페어링). 이후 모바일·외부 접수도 자동 인쇄됩니다.',
                          'Install: extract ZIP → run install.bat as admin → log in to the web app once (store pairing). Then mobile/remote orders print automatically.',
                          'Cài: giải nén ZIP → chạy install.bat quyền admin → đăng nhập web một lần (ghép cửa hàng). Sau đó đơn mobile/xa tự in.',
                        )}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">{pickUiText(baseLocale, '리본 프린터 브릿지 사용', 'Enable Ribbon Bridge', 'Sử dụng Bridge cho Ruy băng')}</Label>
                        <p className="text-sm text-slate-500">
                          {pickUiText(baseLocale, '리본(화환) 프린터를 사용하려면 활성화하세요.', 'Enable to use ribbon printers.', 'Bật để sử dụng máy in ruy băng.')}
                        </p>
                      </div>
                      <Switch 
                        checked={settings.ribbonBridgeEnabled} 
                        onCheckedChange={(v) => saveSettings({ ...settings, ribbonBridgeEnabled: v })} 
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Printer Devices */}
                  <div className="space-y-6">
                    <h3 className="text-sm font-semibold">{pickUiText(baseLocale, '프린터 기기 선택', 'Select Printer Devices', 'Chọn thiết bị máy in')}</h3>
                    
                    {!bridgeStatus ? (
                      <div className="p-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        {pickUiText(baseLocale, '브릿지가 연결되지 않아 프린터 목록을 표시할 수 없습니다. 상단의 상태 체크를 누르거나 브릿지를 실행해주세요.', 'Printer list cannot be displayed because the bridge is not connected. Please check status or run the bridge.', 'Không thể hiển thị danh sách máy in do Bridge không được kết nối.')}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label>{pickUiText(baseLocale, '영수증(POS) 프린터', 'POS Printer', 'Máy in hóa đơn (POS)')}</Label>
                          <Select 
                            value={settings.printerName || ""} 
                            onValueChange={(v) => saveSettings({ ...settings, printerName: v || "" })}
                            disabled={settings.receiptPrinterType !== 'pos'}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={pickUiText(baseLocale, '프린터를 선택하세요', 'Select a printer', 'Chọn một máy in')} />
                            </SelectTrigger>
                            <SelectContent>
                              {(localPrinters.length > 0 ? localPrinters : settings.installedPrinters)?.map(p => (
                                <SelectItem key={p} value={p}>{p}</SelectItem>
                              ))}
                              {(!(localPrinters.length > 0 ? localPrinters : settings.installedPrinters) || (localPrinters.length > 0 ? localPrinters : settings.installedPrinters)!.length === 0) && (
                                <SelectItem value="none" disabled>{pickUiText(baseLocale, '설치된 프린터 없음', 'No printers installed', 'Không có máy in được cài đặt')}</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>{pickUiText(baseLocale, '라벨 프린터', 'Label Printer', 'Máy in nhãn')}</Label>
                          <Select 
                            value={settings.labelPrinterName || ""} 
                            onValueChange={(v) => saveSettings({ ...settings, labelPrinterName: v || "" })}
                            disabled={settings.receiptPrinterType !== 'label'}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={pickUiText(baseLocale, '프린터를 선택하세요', 'Select a printer', 'Chọn một máy in')} />
                            </SelectTrigger>
                            <SelectContent>
                              {(localPrinters.length > 0 ? localPrinters : settings.installedPrinters)?.map(p => (
                                <SelectItem key={p} value={p}>{p}</SelectItem>
                              ))}
                              {(!(localPrinters.length > 0 ? localPrinters : settings.installedPrinters) || (localPrinters.length > 0 ? localPrinters : settings.installedPrinters)!.length === 0) && (
                                <SelectItem value="none" disabled>{pickUiText(baseLocale, '설치된 프린터 없음', 'No printers installed', 'Không có máy in được cài đặt')}</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Receipt output language */}
                  <div className="space-y-2">
                    <Label htmlFor="receiptLocale">
                      {pickUiText(
                        baseLocale,
                        "영수증·주문서 출력 언어",
                        "Receipt / order print language",
                        "Ngôn ngữ in hóa đơn / đơn hàng",
                      )}
                    </Label>
                    <Select
                      value={normalizeReceiptLocaleSetting(settings.receiptLocale)}
                      onValueChange={(v) => {
                        if (!v) return;
                        saveSettings({
                          ...settings,
                          receiptLocale: v,
                        });
                      }}
                    >
                      <SelectTrigger id="receiptLocale">
                        <SelectValue
                          placeholder={pickUiText(
                            baseLocale,
                            "출력 언어 선택",
                            "Select print language",
                            "Chọn ngôn ngữ in",
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {RECEIPT_LOCALE_SELECT_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {receiptLocaleOptionLabel(
                              opt,
                              baseLocale === "vi" ? "vi" : baseLocale === "en" ? "en" : "ko",
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-slate-500">
                      {pickUiText(
                        baseLocale,
                        "「매장 기본」은 UI 언어·운영 국가를 따릅니다. 예: 해외 매장에서도 영수증만 English로 고정하려면 English를 선택하세요. 상품명·카드 메시지 등 직접 입력한 내용은 번역되지 않습니다.",
                        "Store default follows UI language and operating country. Choose English to force English labels on receipts even abroad. Product names and card messages are not translated.",
                        "Mặc định cửa hàng theo ngôn ngữ UI và quốc gia. Chọn English để cố định nhãn hóa đơn bằng tiếng Anh. Tên sản phẩm và lời nhắn thẻ không được dịch.",
                      )}
                    </p>
                  </div>

                  <Separator />

                  {/* Print Options */}
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-semibold mb-1">{pickUiText(baseLocale, '기본 주문서/영수증 출력 방식', 'Default Receipt Print Type', 'Loại in hóa đơn mặc định')}</h3>
                        <p className="text-sm text-slate-500 mb-3">
                          {pickUiText(baseLocale, '주문 접수 시 출력될 프린터 종류를 선택하세요.', 'Select the printer type to output when an order is received.', 'Chọn loại máy in để xuất khi nhận được đơn hàng.')}
                        </p>
                      </div>
                      <RadioGroup 
                        value={settings.receiptPrinterType || 'pos'} 
                        onValueChange={(v) => saveSettings({ ...settings, receiptPrinterType: v as 'pos' | 'label' })}
                        className="flex flex-col space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="pos" id="r-pos" />
                          <Label htmlFor="r-pos">{pickUiText(baseLocale, '영수증(POS) 프린터로 출력', 'Print to POS Printer', 'In ra máy in POS')}</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="label" id="r-label" />
                          <Label htmlFor="r-label">{pickUiText(baseLocale, '라벨 프린터로 출력', 'Print to Label Printer', 'In ra máy in nhãn')}</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="space-y-4 pt-4">
                      <h3 className="text-sm font-semibold mb-3">{pickUiText(baseLocale, '자동 출력 옵션', 'Auto-print Options', 'Tùy chọn tự động in')}</h3>
                      
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-normal">{pickUiText(baseLocale, '픽업 시 메모 자동 출력', 'Auto-print memo for pickup', 'Tự động in ghi chú khi nhận hàng')}</Label>
                        <Switch 
                          checked={settings.printPickupMemo} 
                          onCheckedChange={(v) => saveSettings({ ...settings, printPickupMemo: v })} 
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-normal">{pickUiText(baseLocale, '배송 시 매장용 주문서 출력', 'Print shop receipt for delivery', 'In hóa đơn cửa hàng khi giao hàng')}</Label>
                        <Switch 
                          checked={settings.printDeliveryShop} 
                          onCheckedChange={(v) => saveSettings({ ...settings, printDeliveryShop: v })} 
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-normal">{pickUiText(baseLocale, '배송 시 기사용 영수증 출력', 'Print driver receipt for delivery', 'In biên lai cho tài xế khi giao hàng')}</Label>
                        <Switch 
                          checked={settings.printDeliveryDriver} 
                          onCheckedChange={(v) => saveSettings({ ...settings, printDeliveryDriver: v })} 
                        />
                      </div>

                      {/* 기기별 자동 인쇄 제어 (로컬 스토리지) */}
                      <div className="mt-6 pt-4 border-t border-slate-100 flex items-start justify-between">
                        <div className="space-y-1">
                          <Label className="text-sm font-bold text-red-500">
                            {pickUiText(baseLocale, '🚫 이 컴퓨터(기기)에서 자동 인쇄 끄기', '🚫 Disable Auto-print on this device', '🚫 Tắt tự động in trên thiết bị này')}
                          </Label>
                          <p className="text-[11px] text-slate-500 max-w-[280px]">
                            {pickUiText(baseLocale, '여러 컴퓨터를 동시에 사용할 때, 서브 컴퓨터에서 실수로 자동 인쇄가 되지 않도록 이 옵션을 켜세요. (현재 브라우저에만 저장됨)', 'When using multiple computers, enable this on secondary devices to prevent duplicate auto-printing. (Saved only in this browser)', 'Khi sử dụng nhiều máy tính, bật tính năng này trên các thiết bị phụ để tránh in tự động trùng lặp. (Chỉ lưu trong trình duyệt này)')}
                          </p>
                        </div>
                        <Switch 
                          className="data-[state=checked]:bg-red-500"
                          checked={deviceAutoPrintDisabled} 
                          onCheckedChange={handleDeviceAutoPrintToggle} 
                        />
                      </div>
                    </div>
                  </div>

                </CardContent>
              </Card>
            </TabsContent>



            <TabsContent value="partner-network" className="space-y-6 animate-in fade-in duration-300">
              {/* 1. 정책 수락 및 수주점 활성화 카드 */}
              <Card className="border-0 shadow-lg ring-1 ring-blue-100 bg-white overflow-hidden rounded-2xl">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <Share2 className="h-5 w-5" /> {tf.f02197 || "우리 지점 수주점 등록"}
                      </CardTitle>
                      <CardDescription className="text-blue-100 text-xs">
                        다른 회원사들로부터 이관 주문을 위탁받아 제작 및 배송합니다.
                      </CardDescription>
                    </div>
                    <Switch 
                      checked={canReceiveOrders} 
                      onCheckedChange={setCanReceiveOrders} 
                      className="data-[state=checked]:bg-white data-[state=checked]:text-blue-600"
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  {/* 정산 수수료 동의 안내 박스 */}
                  <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 flex gap-3 text-xs text-blue-800">
                    <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-bold">회원사 수발주 기본 정산 협약 (20% / 80%)</span>
                      <p className="text-[11px] leading-relaxed text-blue-600 font-medium">
                        본 협력사 네트워크에 참여하여 수주점으로 등록할 경우, 회원사 간 이관 주문 정산 시 
                        <strong className="text-blue-900 mx-1">"발주사 몫 20%, 수주사 몫 80%"</strong> 
                        수수료율을 준수하고 정산할 것에 자동 동의하는 것으로 처리됩니다.
                      </p>
                      <div className="mt-1 text-[10px] text-red-500 font-semibold leading-normal border-t border-blue-100/50 pt-1">
                        ⚠️ 면책 고지: 본 회원사 간 직거래 수발주 및 대금 정산 과정에서 발생하는 어떠한 사고나 분쟁에 대해서도 플로싱크는 일체의 중개/법적 책임을 지지 않습니다.
                      </div>
                    </div>
                  </div>

                  {canReceiveOrders && (
                    <div className="space-y-4 animate-in slide-in-from-top-4 duration-300">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-700">수주 가능 주요 지역</Label>
                        <Input 
                          placeholder="한국: 구·군·시 단위(예: 서울 강남구) / 해외: 도시+suburb(예: Hanoi Tay Ho)" 
                          value={partnerRegion} 
                          onChange={e => setPartnerRegion(e.target.value)} 
                          className="h-10 rounded-xl"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-700">매장 전문 품목</Label>
                        <Input 
                          placeholder="예: 경조화환, 동양란/서양란, 프리미엄 꽃다발" 
                          value={partnerCategory} 
                          onChange={e => setPartnerCategory(e.target.value)} 
                          className="h-10 rounded-xl"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-700">매장 소개 설명</Label>
                        <Input 
                          placeholder="지점 네트워크 사장님들에게 어필할 매장 소개를 적어주세요." 
                          value={partnerDescription} 
                          onChange={e => setPartnerDescription(e.target.value)} 
                          className="h-10 rounded-xl"
                        />
                      </div>
                    </div>
                  )}

                  <Button 
                    onClick={handleSavePartnerNetworkSettings}
                    disabled={isPartnerSaving}
                    className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    {isPartnerSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {tf.f01048 || "설정 저장"}
                  </Button>
                </CardContent>
              </Card>

              {/* 2. 글로벌 수주 대기 회원사 리스트 */}
              <Card className="border-0 shadow-lg ring-1 ring-slate-100 bg-white rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-slate-50 p-6">
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Globe className="h-4 w-4 text-indigo-500 animate-pulse" /> 
                    글로벌 파트너스 네트워크 수주 대기 지점 현황
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    전 세계 꽃집 사장님들이 수주를 대기 중인 활성 파트너 목록입니다.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[350px] overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100">
                          <th className="p-4 w-[16%]">국가</th>
                          <th className="p-4 w-[34%]">지점명</th>
                          <th className="p-4 w-[25%]">수주 가능 지역</th>
                          <th className="p-4 w-[25%]">주요 품목</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* 실시간 DB 데이터 렌더링 */}
                        {partnerTenants.filter(t => t.id !== tenantId).length > 0 ? (
                          partnerTenants.filter(t => t.id !== tenantId).map((t) => {
                            const flagMap: Record<string, string> = {
                              KR: "🇰🇷", VN: "🇻🇳", JP: "🇯🇵", US: "🇺🇸", CN: "🇨🇳", ES: "🇪🇸", FR: "🇫🇷", DE: "🇩🇪", GB: "🇬🇧", AU: "🇦🇺", CA: "🇨🇦", SG: "🇸🇬"
                            };
                            // country 컬럼이 없으므로, blossomTV 등 데모 외 지점은 기본적으로 한국(KR) 국기로 렌더링
                            const shopCountry = t.country || "KR";
                            const flag = flagMap[shopCountry] || "🇰🇷";
                            return (
                              <tr key={t.id} onClick={() => { setSelectedPartner(t); setIsPartnerDetailOpen(true); }} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors font-medium cursor-pointer">
                                <td className="p-4 font-semibold text-slate-700 flex items-center gap-1.5 text-sm">
                                  <span className="text-base select-none">{flag}</span>
                                  <span>{shopCountry}</span>
                                </td>
                                <td className="p-4 text-slate-900 font-bold">{t.name}</td>
                                <td className="p-4 text-slate-500">{t.partner_region || "전 지역 가능"}</td>
                                <td className="p-4 text-indigo-600 font-semibold">{t.partner_category || "전문 화훼 제작"}</td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-slate-400 font-medium">
                              현재 수주 가능한 실제 협력 회원사가 존재하지 않습니다.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="data" className="space-y-4">
              <DesktopElectronSettingsCard />
              <Card className="border-0 shadow-sm ring-1 ring-rose-100">
                <CardHeader><CardTitle>{tf.f01088}</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <Button variant="outline" className="h-20" onClick={handleBackup}>{tf.f01797}</Button>
                  <label htmlFor="restore-backup-input" className="block">
                    <input id="restore-backup-input" type="file" accept=".json" className="hidden" onChange={handleRestore} />
                    <div className="inline-flex h-20 w-full items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                      백업 파일 복구
                    </div>
                  </label>
                  <Button variant="destructive" className="h-20 col-span-2" onClick={() => setIsInitDialogOpen(true)}>{tf.f01097}</Button>
                </CardContent>
                {/* Subtle Subscription Cancellation Option */}
                {plan !== 'free' && (
                  <CardFooter className="pt-2 pb-4 px-6 flex justify-end">
                    <button 
                      onClick={() => {
                        // Reset form fields upon opening
                        setCancelPrinterSn("");
                        setCancelCourier("");
                        setCancelTracking("");
                        setAgreeCancelTerms(false);
                        setIsCancelDialogOpen(true);
                      }}
                      className="text-[11px] font-medium text-slate-400 hover:text-red-500 hover:underline transition-colors cursor-pointer"
                    >
                      {pickUiText(baseLocale, '구독 해지 신청', 'Apply for cancellation', 'Hủy đăng ký dịch vụ')}
                    </button>
                  </CardFooter>
                )}
              </Card>
            </TabsContent>
          </div>
        </div>
      </Tabs>

      <Dialog open={isInitDialogOpen} onOpenChange={setIsInitDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{tf.f01817}</DialogTitle></DialogHeader>
          <DialogFooter>
            <Button variant="destructive" onClick={handleReset}>{tf.f01989}</Button>
            <Button variant="ghost" onClick={() => setIsInitDialogOpen(false)}>{tf.f00702}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-8 border-none shadow-2xl bg-white border-0">
          <DialogHeader className="border-0">
            <DialogTitle className="font-semibold text-xl text-slate-900">
              {pickUiText(baseLocale, '비밀번호 변경', 'Change Password', 'Đổi mật khẩu')}
            </DialogTitle>
            <DialogDescription className="font-normal pb-4 text-slate-500 border-0">
              {pickUiText(baseLocale, '새로운 비밀번호를 입력해주세요. 비밀번호는 6자 이상이어야 합니다.', 'Please enter a new password. It must be at least 6 characters.', 'Vui lòng nhập mật khẩu mới. Mật khẩu phải có ít nhất 6 ký tự.')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-2">
            <div className="grid gap-2">
              <Label htmlFor="change-new-password" className="font-normal text-slate-600 text-xs ml-1 border-0">
                {pickUiText(baseLocale, '새 비밀번호', 'New Password', 'Mật khẩu mới')}
              </Label>
              <Input
                id="change-new-password"
                type="password"
                className="rounded-2xl h-12 font-normal bg-slate-50/50 border-slate-100 text-slate-900 focus:bg-white border"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="change-confirm-password" className="font-normal text-slate-600 text-xs ml-1 border-0">
                {pickUiText(baseLocale, '새 비밀번호 확인', 'Confirm New Password', 'Xác nhận mật khẩu mới')}
              </Label>
              <Input
                id="change-confirm-password"
                type="password"
                className="rounded-2xl h-12 font-normal bg-slate-50/50 border-slate-100 text-slate-900 focus:bg-white border"
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-3 sm:justify-end mt-4 border-0">
            <Button variant="ghost" className="rounded-2xl px-6 text-slate-500 border-0" onClick={() => setIsChangePasswordOpen(false)}>
              {pickUiText(baseLocale, '취소', 'Cancel', 'Hủy')}
            </Button>
            <Button 
              className="bg-slate-900 rounded-2xl px-8 font-normal shadow-lg shadow-slate-200 text-white border-0" 
              onClick={handleChangePassword}
              disabled={isChangingPassword || !newPassword || !newPasswordConfirm}
            >
              {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin border-0" />}
              {pickUiText(baseLocale, '변경하기', 'Change', 'Thay đổi')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subscription Cancellation Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="sm:max-w-xl rounded-3xl p-8 border-none shadow-2xl bg-white border-0 text-slate-900">
          <DialogHeader className="border-0">
            <DialogTitle className="font-extrabold text-2xl text-slate-900 tracking-tight">
              {pickUiText(baseLocale, '구독 해지 신청', 'Cancel Subscription', 'Hủy đăng ký dịch vụ')}
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium pb-2 border-0">
              {pickUiText(
                baseLocale, 
                '이용 중인 요금제 및 환불 약정 조항을 확인하신 후 해약을 신청해 주세요.', 
                'Please review the terms and complete the cancellation request.',
                'Vui lòng đọc kỹ các điều khoản trước khi xác nhận hủy.'
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 max-h-[380px] overflow-y-auto pr-2">
            {/* 1. Monthly Subscription Notices */}
            {(plan !== 'annual' && plan !== 'pro') ? (
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                <h4 className="font-bold text-sm text-slate-800">🚫 월간 정기구독 해지 안내</h4>
                <ul className="text-xs text-slate-600 space-y-2 list-disc pl-4 leading-relaxed">
                  <li>구독 신청 즉시 정지되지 않으며, 이미 결제 완료된 이번 달 구독 만료일까지 정상 이용 가능합니다.</li>
                  <li>매장 내의 모든 주문 접수, 고객 정보 및 회계 매출 기록 등은 데이터 보존 의무에 따라 **해지 시점으로부터 3개월 보관 후 영구 삭제**됩니다.</li>
                </ul>
              </div>
            ) : (
              // 2. Annual Subscription Penalty Notices
              <div className="space-y-4">
                <div className="bg-red-50 p-5 rounded-2xl border border-red-100 space-y-3">
                  <h4 className="font-black text-sm text-red-700">⚠️ 연간 계약 중도 해약 정산 조항 (필수 인지)</h4>
                  <ul className="text-xs text-red-900 space-y-2 list-disc pl-4 leading-relaxed">
                    <li><b>위약금 30% 발생:</b> 초기 인프라 세팅비, 서버 계정 개설 수수료, 패킹/택배 실비 보전을 위해 <b>연간 총 결제액의 30%</b>가 위약금으로 일괄 공제됩니다.</li>
                    <li><b>무상 혜택 개월 무효화:</b> 연간 가입으로 부여받은 무상 혜택 개월은 소급 취소되며, 이용 기간은 월 정상가 기준으로 정산 공제됩니다.</li>
                    <li><b>장비 임대료 공제:</b> 렌탈 프린터 무상 제공 혜택이 만료되어 실제 임대 기간만큼 <b>월 10,000원(부가세 별도)</b>의 대여료가 소급 적용되어 공제됩니다.</li>
                    <li><b>프린터 장비 반납 의무:</b> 해지 신청 후 7일 이내에 임대 장비를 본사로 반송해야 하며, 미반납 또는 훼손 시 <b>100,000원의 장비 분실 위약금</b>이 청구됩니다. (과다 공제 시 정산액은 0원 처리)</li>
                  </ul>
                </div>

                {/* Assigned device SN matched fields (Only render when print hardware is actually assigned) */}
                {assignedPrinterSn ? (
                  <div className="space-y-4 pt-2">
                    <div className="grid gap-2">
                      <Label htmlFor="cancel-sn" className="font-bold text-xs text-slate-700 ml-1">
                        반납 프린터 기기 일련번호 (S/N)
                      </Label>
                      <Input 
                        id="cancel-sn"
                        placeholder="기기 바닥 스티커의 S/N 기입 (예: FP2026...)"
                        value={cancelPrinterSn}
                        onChange={(e) => setCancelPrinterSn(e.target.value)}
                        className="rounded-2xl h-11 bg-slate-50 border-slate-100 text-slate-900 focus:bg-white"
                      />
                      <p className="text-[10px] text-slate-400 font-medium ml-1">
                        * 대여 기기 번호: <span className="text-indigo-600 font-bold">{assignedPrinterSn}</span> (불일치 시 신청 접수 불가)
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="cancel-courier" className="font-bold text-xs text-slate-700 ml-1">택배사명</Label>
                        <Input 
                          id="cancel-courier"
                          placeholder="우체국, CJ대한통운 등"
                          value={cancelCourier}
                          onChange={(e) => setCancelCourier(e.target.value)}
                          className="rounded-2xl h-11 bg-slate-50 border-slate-100"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="cancel-tracking" className="font-bold text-xs text-slate-700 ml-1">반송 택배 송장번호</Label>
                        <Input 
                          id="cancel-tracking"
                          placeholder="송장 번호만 기입 ('-' 제외)"
                          value={cancelTracking}
                          onChange={(e) => setCancelTracking(e.target.value)}
                          className="rounded-2xl h-11 bg-slate-50 border-slate-100"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600 mt-2">
                    💡 고객님은 소프트웨어 단독 상품 이용자(또는 프린터 미임대 회원)이므로, 별도의 하드웨어 반납 절차 없이 위약금 규정 동의 후 즉시 해약이 완료됩니다.
                  </div>
                )}
              </div>
            )}

            {/* Electronic Agreement Guard */}
            <div className="flex items-start space-x-2.5 pt-3 border-t border-slate-100">
              <Checkbox 
                id="agree-cancel-terms" 
                checked={agreeCancelTerms}
                onCheckedChange={(v) => setAgreeCancelTerms(!!v)}
                className="mt-1"
              />
              <label 
                htmlFor="agree-cancel-terms" 
                className="text-xs font-semibold text-slate-600 cursor-pointer select-none leading-snug"
              >
                본 지점의 해약 및 환불 정산 조항, 장비 반납 의무 사항을 명확히 확인하였으며 이에 동의하여 해지를 접수합니다. (접수 시 서명자 이메일 및 IP 주소가 영구 보관됩니다.)
              </label>
            </div>
          </div>

          <DialogFooter className="gap-3 sm:justify-end mt-6 border-0 pt-2">
            <Button variant="ghost" className="rounded-2xl px-6 text-slate-500 hover:bg-slate-50 border-0" onClick={() => setIsCancelDialogOpen(false)}>
              이용 유지하기
            </Button>
            <Button 
              className="bg-red-600 hover:bg-red-700 text-white rounded-2xl px-8 font-bold shadow-lg shadow-red-100 border-0" 
              onClick={handleCancelSubscription}
              disabled={isCancelingSubscription || !agreeCancelTerms}
            >
              {isCancelingSubscription && <Loader2 className="mr-2 h-4 w-4 animate-spin border-0" />}
              해약 신청서 제출
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 파트너 꽃집 상세 정보 모달 */}
      <Dialog open={isPartnerDetailOpen} onOpenChange={setIsPartnerDetailOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-3xl p-6 border-none shadow-2xl animate-in zoom-in-95 duration-200 bg-white">
          {selectedPartner && (
            <>
              <DialogHeader className="pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div className="space-y-0.5">
                    <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span>🇰🇷</span> {selectedPartner.name}
                    </DialogTitle>
                    <p className="text-xs text-slate-400 font-medium">플로싱크 협력 회원사</p>
                  </div>
                </div>
              </DialogHeader>

              <div className="py-5 space-y-4 text-xs">
                {/* 연락처 */}
                <div className="space-y-1 bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100/60">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    📞 연락처 (위탁 발주 문의)
                  </span>
                  <p className="text-sm font-bold text-slate-900 mt-0.5 select-all">
                    {selectedPartner.contact_phone || "등록된 연락처가 없습니다."}
                  </p>
                </div>

                {/* 매장 주소 */}
                <div className="space-y-1 bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100/60">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    🏠 매장 주소
                  </span>
                  <p className="text-xs font-semibold text-slate-800 leading-relaxed mt-0.5">
                    {selectedPartner.address || "등록된 주소가 없습니다."}
                  </p>
                </div>

                {/* 수주 가능 지역 및 전문 품목 */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100/60 space-y-1">
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
                      📍 수주 가능 지역
                    </span>
                    <p className="text-xs font-bold text-slate-950 mt-0.5">
                      {selectedPartner.partner_region || "전 지역"}
                    </p>
                  </div>
                  <div className="bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100/60 space-y-1">
                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                      🏷️ 매장 전문 품목
                    </span>
                    <p className="text-xs font-bold text-slate-950 mt-0.5">
                      {selectedPartner.partner_category || "화훼 제작"}
                    </p>
                  </div>
                </div>

                {/* 매장 소개글 */}
                {selectedPartner.partner_description && (
                  <div className="space-y-1.5 p-3.5 bg-blue-50/30 border border-blue-100/40 rounded-2xl">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                      📝 매장 소개 설명
                    </span>
                    <p className="text-xs text-blue-900 leading-relaxed font-medium">
                      {selectedPartner.partner_description}
                    </p>
                  </div>
                )}

                {/* 등록 일자 */}
                <div className="text-right text-[9px] text-slate-400 font-light">
                  네트워크 등록일: {selectedPartner.created_at ? format(parseISO(selectedPartner.created_at), 'yyyy-MM-dd') : '—'}
                </div>
              </div>

              <DialogFooter className="border-t border-slate-100 pt-4 flex gap-2">
                <Button 
                  onClick={() => setIsPartnerDetailOpen(false)}
                  className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition-all"
                >
                  닫기
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
