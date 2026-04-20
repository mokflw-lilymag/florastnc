"use client";

import { useState, useEffect, useRef } from "react";
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
import { useSettings } from "@/hooks/use-settings";
import { useRouter } from "next/navigation";
import { DeliverySettings } from "./components/DeliverySettings";
import { PosIntegrationCard } from "./components/PosIntegrationCard";
import { OrderPolicySettings } from "./components/OrderPolicySettings";
import { AutomationSettings } from "./components/AutomationSettings";
import { MallIntegrationCard } from "./components/MallIntegrationCard";

const MAJOR_CURRENCIES = [
  { code: 'KRW', symbol: '₩', flag: '🇰🇷', name: '대한민국 원' },
  { code: 'USD', symbol: '$', flag: '🇺🇸', name: '미국 달러' },
  { code: 'EUR', symbol: '€', flag: '🇪🇺', name: '유로' },
  { code: 'JPY', symbol: '¥', flag: '🇯🇵', name: '일본 엔' },
  { code: 'CNY', symbol: '￥', flag: '🇨🇳', name: '중국 위안' },
  { code: 'GBP', symbol: '£', flag: '🇬🇧', name: '영국 파운드' },
  { code: 'AUD', symbol: 'A$', flag: '🇦🇺', name: '호주 달러' },
  { code: 'CAD', symbol: 'C$', flag: '🇨🇦', name: '캐나다 달러' },
  { code: 'SGD', symbol: 'S$', flag: '🇸🇬', name: '싱가포르 달러' },
  { code: 'VND', symbol: '₫', flag: '🇻🇳', name: '베트남 동' },
];

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { user, profile, tenantId, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
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
      toast.error("이미지 파일만 업로드 가능합니다.");
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
      toast.success("새로운 로고가 정상적으로 적용되었습니다!");
      window.location.reload(); 
    } catch (err: any) {
      toast.error(`이미지 업로드 중 오류: ${err.message}`);
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
      
      const saved = await saveSettings(updatedSettings);
      if (!saved) throw new Error("Failed to save settings");

      toast.success("상점 정보가 저장되었습니다.");
      router.refresh();
    } catch (err) {
      toast.error("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleBackup = async () => {
    try {
      toast.loading("데이터 백업 파일 생성 중...");
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
      link.download = `FloraSync_Backup_${storeName}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.dismiss();
      toast.success("백업 파일이 다운로드되었습니다.");
    } catch (err) {
      toast.dismiss();
      toast.error("백업 생성 중 오류가 발생했습니다.");
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
            toast.error("이 백업 파일은 다른 매장의 데이터입니다.");
            return;
          }
          toast.loading("데이터 복구 중...");
          if (content.settings) await saveSettings(content.settings);
          toast.dismiss();
          toast.success("데이터 라이브러리가 복구되었습니다.");
          window.location.reload();
        } catch (err) {
          toast.error("잘못된 백업 파일 형식입니다.");
        }
      };
      reader.readAsText(file);
    } catch (err) {
      toast.error("파일을 읽는 중 오류가 발생했습니다.");
    }
  };

  const handleReset = async () => {
    try {
      toast.loading("초기화 진행 중...");
      await Promise.all([
        supabase.from('orders').delete().eq('tenant_id', tenantId),
        supabase.from('customers').delete().eq('tenant_id', tenantId),
        supabase.from('products').delete().eq('tenant_id', tenantId)
      ]);
      toast.dismiss();
      toast.success("데이터가 초기화되었습니다.");
      setIsInitDialogOpen(false);
      window.location.reload();
    } catch (err) {
      toast.dismiss();
      toast.error("초기화 중 오류가 발생했습니다.");
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
      case "pro": return <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 border-0">PRO (통합)</Badge>;
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
            <SettingsIcon className="text-slate-500 h-8 w-8" /> 환경 설정
          </h1>
          <p className="text-slate-500 mt-2">상점 운영 정책 및 데이터 보안을 관리하세요.</p>
        </div>
        <div className="flex items-center gap-3">
           {getPlanBadge(plan)}
        </div>
      </div>

      <Tabs defaultValue="store" orientation="vertical" className="w-full">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 lg:gap-10 w-full items-start">
          <TabsList className="flex flex-row md:flex-col overflow-x-auto whitespace-nowrap md:overflow-visible w-full md:w-56 lg:w-64 h-auto p-2 bg-slate-50/80 border border-slate-100/60 rounded-2xl gap-2 md:gap-1 items-center md:items-stretch shrink-0 md:sticky md:top-24 shadow-sm shadow-slate-100">
            <TabsTrigger value="store" className="justify-start shrink-0 text-sm py-2.5 px-4 md:py-3 data-[state=active]:bg-white rounded-xl transition-all">
              <Building2 className="h-4 w-4 mr-3 text-slate-500" /> 상점 정보
            </TabsTrigger>
            <TabsTrigger value="order-payment" className="justify-start shrink-0 text-sm py-2.5 px-4 md:py-3 data-[state=active]:bg-white rounded-xl transition-all">
              <Percent className="h-4 w-4 mr-3 text-slate-500" /> 주문/할인/포인트
            </TabsTrigger>
            <TabsTrigger value="delivery" className="justify-start shrink-0 text-sm py-2.5 px-4 md:py-3 data-[state=active]:bg-white rounded-xl transition-all">
              <MapPin className="h-4 w-4 mr-3 text-slate-500" /> 배송비 설정
            </TabsTrigger>
            <TabsTrigger value="categories" className="justify-start shrink-0 text-sm py-2.5 px-4 md:py-3 rounded-xl text-orange-700 bg-orange-50/30 data-[state=active]:bg-orange-600 data-[state=active]:text-white transition-all">
              <Layers className="h-4 w-4 mr-3" /> 분류 관리
            </TabsTrigger>
            <TabsTrigger value="printer" className="justify-start shrink-0 text-sm py-2.5 px-4 md:py-3 data-[state=active]:bg-white rounded-xl transition-all">
              <Printer className="h-4 w-4 mr-3 text-slate-500" /> 프린터/브릿지
            </TabsTrigger>

            <TabsTrigger value="integrations" className="justify-start shrink-0 text-sm py-2.5 px-4 md:py-3 data-[state=active]:bg-white rounded-xl transition-all">
              <LinkIcon className="h-4 w-4 mr-3 text-slate-500" /> 연동 및 자동화
            </TabsTrigger>
            <TabsTrigger value="partner-network" className="justify-start shrink-0 text-sm py-2.5 px-4 md:py-3 rounded-xl text-blue-700 bg-blue-50/30 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">
              <Share2 className="h-4 w-4 mr-3" /> 협력사 네트워크
            </TabsTrigger>
            <TabsTrigger value="account" className="justify-start shrink-0 text-sm py-2.5 px-4 md:py-3 data-[state=active]:bg-white rounded-xl transition-all">
              <ShieldCheck className="h-4 w-4 mr-3 text-slate-500" /> 멤버십/보안
            </TabsTrigger>
            <div className="w-px h-6 md:w-auto md:h-px shrink-0 bg-slate-200 mx-2 md:my-2"></div>
            <TabsTrigger value="data" className="justify-start shrink-0 text-sm py-2.5 px-4 md:py-3 rounded-xl text-rose-700 bg-rose-50/30 data-[state=active]:bg-rose-600 data-[state=active]:text-white transition-all">
              <Database className="h-4 w-4 mr-3" /> 백업 및 초기화
            </TabsTrigger>
          </TabsList>
          
          <div className="flex-1 w-full min-w-0 pb-16">
            <TabsContent value="store" className="space-y-4">
              <Card className="border-0 shadow-sm ring-1 ring-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">상점 기본 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="store-name">화원 이름</Label>
                      <Input id="store-name" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rep">대표자</Label>
                      <Input id="rep" value={localRep} onChange={e => setLocalRep(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bizNo">사업자 등록번호</Label>
                      <Input id="bizNo" value={localBizNo} onChange={e => setLocalBizNo(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">연락처</Label>
                      <Input id="phone" value={localPhone} onChange={e => setLocalPhone(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">주소</Label>
                    <Input id="address" value={localAddress} onChange={e => setLocalAddress(e.target.value)} />
                  </div>

                  <div className="flex items-center justify-between gap-4 p-4 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900">
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <Label className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <MonitorPlay className="h-4 w-4 text-indigo-600 shrink-0" />
                        대시보드 전광판 표시
                      </Label>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                        <strong>모든 매장(tenant) 계정</strong>에 기본으로 켜져 있습니다.{" "}
                        <strong>메인 대시보드(/dashboard)</strong> 화면에서만 상단에 표시되며, 주문·설정 등 다른
                        메뉴에서는 보이지 않습니다. 이 스위치를 끄면 해당 매장 사용자만 전광판이 숨겨집니다.
                        날짜·오늘/내일 배송·픽업·본사 공지 제목이 흘러갑니다.{" "}
                        <strong>날씨</strong>는 브라우저에서 위치를 허용하면 그 좌표 기준( Open-Meteo ), 거부하거나
                        미지원이면 <strong>서울</strong> 기준으로 표시됩니다. 공지에{" "}
                        <code className="text-[10px]">https://</code> 링크를 넣으면 배너에서 클릭할 수 있습니다.
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
                        <Label className="text-sm font-bold text-slate-900">부가세 면세(비과세) 사업장</Label>
                        <p className="text-[10px] text-slate-500 font-medium">생화 상품 위주 매장은 면세 적용 체크</p>
                      </div>
                      <Switch 
                        checked={settings.isTaxExempt} 
                        onCheckedChange={(c) => saveSettings({...settings, isTaxExempt: c})} 
                      />
                    </div>

                    {!settings.isTaxExempt && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-blue-50/30 rounded-2xl border border-blue-100/50 animate-in fade-in slide-in-from-top-2">
                        <div className="space-y-1">
                          <Label className="text-sm font-bold flex items-center gap-2">부가세율 (%) <Percent size={14} className="text-blue-500" /></Label>
                          <p className="text-[10px] text-slate-400">일반 과세자 기준 기본 10%</p>
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
                      <p className="text-xs font-bold">화원 대표 로고</p>
                      <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={saving}>로고 변경</Button>
                      <input type="file" className="hidden" ref={fileInputRef} onChange={handleLogoUpload} />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-slate-50/50 px-6 py-4">
                  <Button onClick={handleSaveStoreInfo} disabled={saving}>{saving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}저장하기</Button>
                </CardFooter>
              </Card>

              <Card className="border-0 shadow-sm ring-1 ring-slate-200">
                <CardHeader><CardTitle>국가 및 화폐</CardTitle></CardHeader>
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
                <CardHeader><CardTitle>카테고리 관리</CardTitle></CardHeader>
                <CardContent className="py-12 flex flex-col items-center">
                  <Link href="/dashboard/settings/categories">
                    <Button className="bg-orange-600 hover:bg-orange-700">관리 페이지로 이동</Button>
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
                       <CardTitle>카카오T 배송 자동화 (Kakao T)</CardTitle>
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
                      배송 상품 제작이 완료되면 자동으로 **카카오T 배송**을 호출합니다. <br/>
                      아래 비즈니스 ID와 API 키가 정확해야 자동 예약이 성공합니다.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase">Kakao T Business ID</Label>
                      <Input 
                        placeholder="카카오T 비즈니스 계정 ID"
                        value={settings.kakaoTDeliveryBizId}
                        onChange={e => saveSettings({...settings, kakaoTDeliveryBizId: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase">Kakao T API Key</Label>
                      <Input 
                        type="password"
                        placeholder="카카오T 개발자 API 키"
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
                <CardHeader><CardTitle>프린터 브릿지</CardTitle></CardHeader>
                <CardContent>
                  <div className="p-6 border rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold">{bridgeStatus ? "연결됨" : "연결 안됨"}</p>
                      <p className="text-xs text-slate-500">로컬 프린터 연동 상태</p>
                    </div>
                    <Button variant="outline" onClick={checkBridgeStatus}>{checkingBridge ? <Loader2 className="animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}새로고침</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>



            <TabsContent value="partner-network" className="space-y-6">
              <Card className="border-0 shadow-sm ring-1 ring-blue-100">
                <CardHeader className="bg-blue-600 text-white rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <CardTitle>협력사 네트워크</CardTitle>
                    <Switch checked={canReceiveOrders} onCheckedChange={setCanReceiveOrders} />
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <Input placeholder="수주 가능 지역" value={partnerRegion} onChange={e => setPartnerRegion(e.target.value)} disabled={!canReceiveOrders} />
                  <Button className="w-full" disabled={!canReceiveOrders}>네트워크 프로필 저장</Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="data" className="space-y-4">
              <Card className="border-0 shadow-sm ring-1 ring-rose-100">
                <CardHeader><CardTitle>데이터 관리</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <Button variant="outline" className="h-20" onClick={handleBackup}>전체 데이터 백업</Button>
                  <Button variant="destructive" className="h-20" onClick={() => setIsInitDialogOpen(true)}>데이터 초기화</Button>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </div>
      </Tabs>

      <Dialog open={isInitDialogOpen} onOpenChange={setIsInitDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>정말 초기화하시겠습니까?</DialogTitle></DialogHeader>
          <DialogFooter>
            <Button variant="destructive" onClick={handleReset}>초기화 진행</Button>
            <Button variant="ghost" onClick={() => setIsInitDialogOpen(false)}>취소</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
