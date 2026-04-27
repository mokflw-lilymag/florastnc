"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
  MonitorPlay
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

import { useDeliveryFees } from "@/hooks/use-delivery-fees";
import { defaultSettings, useSettings } from "@/hooks/use-settings";
import { useRouter } from "next/navigation";
import { DeliverySettings } from "./components/DeliverySettings";
import { PosIntegrationCard } from "./components/PosIntegrationCard";
import { OrderPolicySettings } from "./components/OrderPolicySettings";
import { AutomationSettings } from "./components/AutomationSettings";
import { MallIntegrationCard } from "./components/MallIntegrationCard";
import { applyCountryPreset, getCountryPreset, getCountryPresetDiff } from "@/lib/country-preset";
import { AppLocale, LOCALE_COOKIE, resolveLocale, toBaseLocale } from "@/i18n/config";
import { getDashboardSettingsMessages } from "@/i18n/dashboard-settings-messages";

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
  { code: 'RUB', symbol: '₽', flag: '🇷🇺', nameKo: '러시아 루블', nameEn: 'Russian Ruble' },
];

const OPERATING_COUNTRIES = [
  { code: "KR", nameKo: "대한민국", nameEn: "Korea", flag: "🇰🇷", defaultCurrency: "KRW" },
  { code: "VN", nameKo: "베트남", nameEn: "Vietnam", flag: "🇻🇳", defaultCurrency: "VND" },
  { code: "US", nameKo: "미국", nameEn: "United States", flag: "🇺🇸", defaultCurrency: "USD" },
  { code: "JP", nameKo: "일본", nameEn: "Japan", flag: "🇯🇵", defaultCurrency: "JPY" },
  { code: "CN", nameKo: "중국", nameEn: "China", flag: "🇨🇳", defaultCurrency: "CNY" },
  { code: "ES", nameKo: "스페인", nameEn: "Spain", flag: "🇪🇸", defaultCurrency: "EUR" },
  { code: "FR", nameKo: "프랑스", nameEn: "France", flag: "🇫🇷", defaultCurrency: "EUR" },
  { code: "DE", nameKo: "독일", nameEn: "Germany", flag: "🇩🇪", defaultCurrency: "EUR" },
  { code: "GB", nameKo: "영국", nameEn: "United Kingdom", flag: "🇬🇧", defaultCurrency: "GBP" },
  { code: "AU", nameKo: "호주", nameEn: "Australia", flag: "🇦🇺", defaultCurrency: "AUD" },
  { code: "CA", nameKo: "캐나다", nameEn: "Canada", flag: "🇨🇦", defaultCurrency: "CAD" },
  { code: "SG", nameKo: "싱가포르", nameEn: "Singapore", flag: "🇸🇬", defaultCurrency: "SGD" },
  { code: "BR", nameKo: "브라질", nameEn: "Brazil", flag: "🇧🇷", defaultCurrency: "BRL" },
  { code: "MX", nameKo: "멕시코", nameEn: "Mexico", flag: "🇲🇽", defaultCurrency: "MXN" },
  { code: "PT", nameKo: "포르투갈", nameEn: "Portugal", flag: "🇵🇹", defaultCurrency: "EUR" },
  { code: "CH", nameKo: "스위스", nameEn: "Switzerland", flag: "🇨🇭", defaultCurrency: "CHF" },
  { code: "AR", nameKo: "아르헨티나", nameEn: "Argentina", flag: "🇦🇷", defaultCurrency: "ARS" },
  { code: "NZ", nameKo: "뉴질랜드", nameEn: "New Zealand", flag: "🇳🇿", defaultCurrency: "NZD" },
  { code: "CL", nameKo: "칠레", nameEn: "Chile", flag: "🇨🇱", defaultCurrency: "CLP" },
  { code: "MZ", nameKo: "모잠비크", nameEn: "Mozambique", flag: "🇲🇿", defaultCurrency: "MZN" },
  { code: "RU", nameKo: "러시아", nameEn: "Russia", flag: "🇷🇺", defaultCurrency: "RUB" },
] as const;

const PRESET_FIELD_LABELS: Partial<Record<keyof typeof defaultSettings, string>> = {
  country: "운영 국가",
  currency: "통화",
  isTaxExempt: "면세 여부",
  defaultTaxRate: "기본 세율",
  useKakaoTalk: "카카오톡 연동",
  autoDeliveryBooking: "자동 배송 접수",
  deliveryCarriers: "배송사 기본값",
};

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { user, profile, tenantId, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uiLocale, setUiLocale] = useState<AppLocale>("ko");
  
  // Settings & Fees Hooks
  const { settings, saveSettings, loading: settingsLoading } = useSettings();
  const { fees: regionFees, addFee, deleteFee, updateFee, importFees, loading: feesLoading } = useDeliveryFees();

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
  
  // Initialization State
  const [isInitDialogOpen, setIsInitDialogOpen] = useState(false);
  const [initConfirmStep, setInitConfirmStep] = useState(0); 
  const [initInputValue, setInitInputValue] = useState("");
  
  // Partner Network State
  const [canReceiveOrders, setCanReceiveOrders] = useState(false);
  const [isStorefrontPublic, setIsStorefrontPublic] = useState(false);
  const [partnerRegion, setPartnerRegion] = useState("");
  const [partnerCategory, setPartnerCategory] = useState("");
  const [partnerDescription, setPartnerDescription] = useState("");

  // POS Integration State
  const [posIntegration, setPosIntegration] = useState<any>(null);
  const [isPosLoading, setIsPosLoading] = useState(false);

  // Printer Settings State
  const [bridgeStatus, setBridgeStatus] = useState<boolean>(false);
  const [checkingBridge, setCheckingBridge] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = useMemo(() => getDashboardSettingsMessages(uiLocale), [uiLocale]);
  const isKo = useMemo(() => toBaseLocale(uiLocale) === "ko", [uiLocale]);
  const tr = (ko: string, en: string) => (isKo ? ko : en);
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const response = await fetch("http://localhost:8002/api/printers", { 
        signal: controller.signal,
        mode: 'cors'
      });
      
      clearTimeout(timeoutId);
      if (response.ok) {
        setBridgeStatus(true);
      } else {
        throw new Error("Bridge response not OK");
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
      const cookieValue = document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${LOCALE_COOKIE}=`))
        ?.split("=")[1];
      setUiLocale(resolveLocale(cookieValue));
    };
    readLocale();
    window.addEventListener("preferred-locale-changed", readLocale);
    return () => window.removeEventListener("preferred-locale-changed", readLocale);
  }, []);

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
      toast.error(tr("이미지 파일만 업로드 가능합니다.", "Only image files can be uploaded."));
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
      toast.success(tr("새로운 로고가 정상적으로 적용되었습니다!", "New logo applied successfully."));
      window.location.reload(); 
    } catch (err: any) {
      toast.error(tr(`이미지 업로드 중 오류: ${err.message}`, `Image upload failed: ${err.message}`));
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
      if (!saved) throw new Error("Failed to save settings");

      document.cookie = `preferred_country=${localCountry}; path=/; max-age=${60 * 60 * 24 * 365}`;

      toast.success(tr(`상점 정보가 저장되었습니다. 운영 통화는 ${presetAppliedSettings.currency}로 적용되었습니다.`, `Store info saved. Operating currency set to ${presetAppliedSettings.currency}.`));
      router.refresh();
    } catch (err) {
      toast.error(tr("저장 중 오류가 발생했습니다.", "An error occurred while saving."));
    } finally {
      setSaving(false);
    }
  };

  const handleBackup = async () => {
    try {
      toast.loading(tr("데이터 백업 파일 생성 중...", "Generating backup file..."));
      const [ordersRes, customersRes, productsRes, feesRes] = await Promise.all([
        supabase.from('orders').select('*').eq('tenant_id', tenantId),
        supabase.from('customers').select('*').eq('tenant_id', tenantId),
        supabase.from('products').select('*').eq('tenant_id', tenantId),
        supabase.from('delivery_fees_by_region').select('*').eq('tenant_id', tenantId)
      ]);

      const backupData = {
        timestamp: new Date().toISOString(),
        tenant_id: tenantId,
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
      toast.success(tr("백업 파일이 다운로드되었습니다.", "Backup file downloaded."));
    } catch (err) {
      toast.dismiss();
      toast.error(tr("백업 생성 중 오류가 발생했습니다.", "Failed to generate backup."));
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
          if (content.tenant_id !== tenantId) {
            toast.error(tr("이 백업 파일은 다른 매장의 데이터입니다.", "This backup file belongs to another store."));
            return;
          }
          toast.loading(tr("데이터 복구 중...", "Restoring data..."));
          if (content.settings) await saveSettings(content.settings);
          toast.dismiss();
          toast.success(tr("데이터 라이브러리가 복구되었습니다.", "Data restored successfully."));
          window.location.reload();
        } catch (err) {
          toast.error(tr("잘못된 백업 파일 형식입니다.", "Invalid backup file format."));
        }
      };
      reader.readAsText(file);
    } catch (err) {
      toast.error(tr("파일을 읽는 중 오류가 발생했습니다.", "An error occurred while reading the file."));
    }
  };

  const handleReset = async () => {
    try {
      toast.loading(tr("초기화 진행 중...", "Reset in progress..."));
      await Promise.all([
        supabase.from('orders').delete().eq('tenant_id', tenantId),
        supabase.from('customers').delete().eq('tenant_id', tenantId),
        supabase.from('products').delete().eq('tenant_id', tenantId)
      ]);
      toast.dismiss();
      toast.success(tr("데이터가 초기화되었습니다.", "Data has been reset."));
      setIsInitDialogOpen(false);
      window.location.reload();
    } catch (err) {
      toast.dismiss();
      toast.error(tr("초기화 중 오류가 발생했습니다.", "An error occurred during reset."));
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
      case "pro": return <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 border-0">{tr("PRO (통합)", "PRO (All-in-One)")}</Badge>;
      case "erp_only": return <Badge className="bg-emerald-600 border-0">ERP Only</Badge>;
      case "ribbon_only": return <Badge className="bg-purple-600 border-0">Ribbon Only</Badge>;
      default: return <Badge variant="outline" className="text-slate-500">Free / Trial</Badge>;
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

            <TabsTrigger value="integrations" className="justify-start shrink-0 text-sm py-2.5 px-4 md:py-3 data-[state=active]:bg-white rounded-xl transition-all">
              <LinkIcon className="h-4 w-4 mr-3 text-slate-500" /> {t.tabs.integrations}
            </TabsTrigger>
            <TabsTrigger value="partner-network" className="justify-start shrink-0 text-sm py-2.5 px-4 md:py-3 rounded-xl text-blue-700 bg-blue-50/30 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">
              <Share2 className="h-4 w-4 mr-3" /> {t.tabs.partner}
            </TabsTrigger>
            <TabsTrigger value="account" className="justify-start shrink-0 text-sm py-2.5 px-4 md:py-3 data-[state=active]:bg-white rounded-xl transition-all">
              <ShieldCheck className="h-4 w-4 mr-3 text-slate-500" /> {t.tabs.account}
            </TabsTrigger>
            <div className="w-px h-6 md:w-auto md:h-px shrink-0 bg-slate-200 mx-2 md:my-2"></div>
            <TabsTrigger value="data" className="justify-start shrink-0 text-sm py-2.5 px-4 md:py-3 rounded-xl text-rose-700 bg-rose-50/30 data-[state=active]:bg-rose-600 data-[state=active]:text-white transition-all">
              <Database className="h-4 w-4 mr-3" /> {t.tabs.data}
            </TabsTrigger>
          </TabsList>
          
          <div className="flex-1 w-full min-w-0 pb-16">
            <TabsContent value="store" className="space-y-4">
              <Card className="border-0 shadow-sm ring-1 ring-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">{t.store.title}</CardTitle>
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
                          {country.flag} {isKo ? country.nameKo : country.nameEn} ({country.code}) · {tr("기본", "Default")} {country.defaultCurrency}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500">{t.store.countryHint}</p>
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
                      {presetDiffItems.length > 0 ? (
                        <div className="mt-2 rounded-lg border border-emerald-300/50 bg-white/70 p-2.5 space-y-1">
                          <p className="text-[10px] font-bold text-emerald-900">{t.store.presetDiffTitle}</p>
                          {presetDiffItems.slice(0, 6).map((item) => (
                            <p key={String(item.key)} className="text-[10px] text-emerald-900/80">
                              {(PRESET_FIELD_LABELS[item.key as keyof typeof defaultSettings] ?? String(item.key))}:{" "}
                              <span className="line-through opacity-70">{String(item.before)}</span> → {String(item.after)}
                            </p>
                          ))}
                          {presetDiffItems.length > 6 ? (
                            <p className="text-[10px] text-emerald-800/80">{tr(`... 외 ${presetDiffItems.length - 6}개 항목`, `... and ${presetDiffItems.length - 6} more`)}</p>
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
                        {tr("대시보드 전광판 표시", "Dashboard Ticker")}
                      </Label>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                        {tr(
                          "모든 매장(tenant) 계정에 기본으로 켜져 있습니다. 메인 대시보드(/dashboard) 화면에서만 상단에 표시되며, 주문·설정 등 다른 메뉴에서는 보이지 않습니다. 이 스위치를 끄면 해당 매장 사용자만 전광판이 숨겨집니다. 날짜·오늘/내일 배송·픽업·본사 공지 제목이 흘러갑니다. 날씨는 브라우저에서 위치를 허용하면 그 좌표 기준(Open-Meteo), 거부하거나 미지원이면 서울 기준으로 표시됩니다. 공지에 https:// 링크를 넣으면 배너에서 클릭할 수 있습니다.",
                          "Enabled by default for all tenant accounts. It appears only at the top of the main dashboard (/dashboard), not on order/settings pages. Turning this off hides the ticker for this store only. It cycles date, today/tomorrow delivery, pickup, and HQ notices. Weather uses browser location (Open-Meteo); if denied or unsupported, Seoul is used. Notice links starting with https:// are clickable."
                        )}
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
                        <Label className="text-sm font-bold text-slate-900">{tr("부가세 면세(비과세) 사업장", "Tax-Exempt Business")}</Label>
                        <p className="text-[10px] text-slate-500 font-medium">{tr("생화 상품 위주 매장은 면세 적용 체크", "Enable for stores mainly selling tax-exempt flowers.")}</p>
                      </div>
                      <Switch 
                        checked={settings.isTaxExempt} 
                        onCheckedChange={(c) => saveSettings({...settings, isTaxExempt: c})} 
                      />
                    </div>

                    {!settings.isTaxExempt && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-blue-50/30 rounded-2xl border border-blue-100/50 animate-in fade-in slide-in-from-top-2">
                        <div className="space-y-1">
                          <Label className="text-sm font-bold flex items-center gap-2">{tr("부가세율 (%)", "VAT Rate (%)")} <Percent size={14} className="text-blue-500" /></Label>
                          <p className="text-[10px] text-slate-400">{tr("일반 과세자 기준 기본 10%", "Default 10% for standard taxation.")}</p>
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
                      <p className="text-xs font-bold">{tr("화원 대표 로고", "Store Logo")}</p>
                      <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={saving}>{tr("로고 변경", "Change Logo")}</Button>
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
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {MAJOR_CURRENCIES.map((currency) => (
                      <Button
                        key={currency.code}
                        variant={settings.currency === currency.code ? "default" : "outline"}
                        className="h-auto py-3 flex-col gap-1"
                        onClick={() => saveSettings({ ...settings, currency: currency.code })}
                      >
                        <span className="text-xl">{currency.flag}</span>
                        <span className="font-bold text-xs">{currency.code}</span>
                      </Button>
                    ))}
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
                <CardHeader><CardTitle>{tr("카테고리 관리", "Category Management")}</CardTitle></CardHeader>
                <CardContent className="py-12 flex flex-col items-center">
                  <Link href="/dashboard/settings/categories">
                    <Button className="bg-orange-600 hover:bg-orange-700">{tr("관리 페이지로 이동", "Go to Management Page")}</Button>
                  </Link>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="integrations" className="space-y-6">
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
                       <CardTitle>{tr("카카오T 배송 자동화 (Kakao T)", "Kakao T Delivery Automation")}</CardTitle>
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
                      {tr(
                        "배송 상품 제작이 완료되면 자동으로 카카오T 배송을 호출합니다. 아래 비즈니스 ID와 API 키가 정확해야 자동 예약이 성공합니다.",
                        "When production is completed, Kakao T delivery is requested automatically. Business ID and API key must be valid."
                      )}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase">Kakao T Business ID</Label>
                      <Input 
                        placeholder={tr("카카오T 비즈니스 계정 ID", "Kakao T Business Account ID")}
                        value={settings.kakaoTDeliveryBizId}
                        onChange={e => saveSettings({...settings, kakaoTDeliveryBizId: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase">Kakao T API Key</Label>
                      <Input 
                        type="password"
                        placeholder={tr("카카오T 개발자 API 키", "Kakao T Developer API Key")}
                        value={settings.kakaoTDeliveryApiKey}
                        onChange={e => saveSettings({...settings, kakaoTDeliveryApiKey: e.target.value})}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="printer" className="space-y-4">
              <Card className="border-0 shadow-sm ring-1 ring-slate-200">
                <CardHeader><CardTitle>{tr("프린터 브릿지", "Printer Bridge")}</CardTitle></CardHeader>
                <CardContent>
                  <div className="p-6 border rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold">{bridgeStatus ? tr("연결됨", "Connected") : tr("연결 안됨", "Disconnected")}</p>
                      <p className="text-xs text-slate-500">{tr("로컬 프린터 연동 상태", "Local printer bridge status")}</p>
                    </div>
                    <Button variant="outline" onClick={checkBridgeStatus}>{checkingBridge ? <Loader2 className="animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}{tr("새로고침", "Refresh")}</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>



            <TabsContent value="partner-network" className="space-y-6">
              <Card className="border-0 shadow-sm ring-1 ring-blue-100">
                <CardHeader className="bg-blue-600 text-white rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <CardTitle>{tr("협력사 네트워크", "Partner Network")}</CardTitle>
                    <Switch checked={canReceiveOrders} onCheckedChange={setCanReceiveOrders} />
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <Input placeholder={tr("수주 가능 지역", "Serviceable region")} value={partnerRegion} onChange={e => setPartnerRegion(e.target.value)} disabled={!canReceiveOrders} />
                  <Button className="w-full" disabled={!canReceiveOrders}>{tr("네트워크 프로필 저장", "Save network profile")}</Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="data" className="space-y-4">
              <Card className="border-0 shadow-sm ring-1 ring-rose-100">
                <CardHeader><CardTitle>{tr("데이터 관리", "Data Management")}</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <Button variant="outline" className="h-20" onClick={handleBackup}>{tr("전체 데이터 백업", "Backup all data")}</Button>
                  <Button variant="destructive" className="h-20" onClick={() => setIsInitDialogOpen(true)}>{tr("데이터 초기화", "Reset data")}</Button>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </div>
      </Tabs>

      <Dialog open={isInitDialogOpen} onOpenChange={setIsInitDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{tr("정말 초기화하시겠습니까?", "Are you sure you want to reset?")}</DialogTitle></DialogHeader>
          <DialogFooter>
            <Button variant="destructive" onClick={handleReset}>{tr("초기화 진행", "Run reset")}</Button>
            <Button variant="ghost" onClick={() => setIsInitDialogOpen(false)}>{tr("취소", "Cancel")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
