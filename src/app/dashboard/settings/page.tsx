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
  Image as ImageIcon,
  Share2,
  MessageCircle,
  Cloud,
  FileImage,
  LayoutGrid
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

export default function SettingsPage() {
  const supabase = createClient();
  const { user, profile, tenantId, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Settings & Fees Hooks
  const { settings, saveSettings, loading: settingsLoading } = useSettings();
  const { fees: regionFees, addFee, deleteFee, loading: feesLoading } = useDeliveryFees();

  // Local State for Management
  const [storeName, setStoreName] = useState("");
  const [plan, setPlan] = useState("free");
  
  // Local state for Store Info to avoid IME issues with immediate save
  const [localRep, setLocalRep] = useState("");
  const [localBizNo, setLocalBizNo] = useState("");
  const [localPhone, setLocalPhone] = useState("");
  const [localAddress, setLocalAddress] = useState("");
  
  const [newRegion, setNewRegion] = useState("");
  const [newFee, setNewFee] = useState("");

  // Initialization State
  const [isInitDialogOpen, setIsInitDialogOpen] = useState(false);
  const [initConfirmStep, setInitConfirmStep] = useState(0); // 0 -> 1 -> 2
  const [initInputValue, setInitInputValue] = useState("");
  
  // Partner Network State
  const [canReceiveOrders, setCanReceiveOrders] = useState(false);
  const [isStorefrontPublic, setIsStorefrontPublic] = useState(false);
  const [partnerRegion, setPartnerRegion] = useState("");
  const [partnerCategory, setPartnerCategory] = useState("");
  const [partnerDescription, setPartnerDescription] = useState("");

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
      
      const response = await fetch("http://localhost:8080/status", { 
        signal: controller.signal,
        mode: 'no-cors' 
      });
      
      clearTimeout(timeoutId);
      setBridgeStatus(true);
      if (checkingBridge) toast.success("프린터 브릿지가 연결되었습니다.");
    } catch (err) {
      setBridgeStatus(false);
      if (checkingBridge) toast.error("프린터 브릿지 응답이 없습니다.");
    } finally {
      setCheckingBridge(false);
    }
  };

  useEffect(() => {
    checkBridgeStatus();
  }, []);

  // Sync local state when global settings load
  useEffect(() => {
    if (settings) {
      setLocalRep(settings.representative || "");
      setLocalBizNo(settings.businessNumber || "");
      setLocalPhone(settings.contactPhone || "");
      setLocalAddress(settings.address || "");
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

    if (!authLoading) {
      loadTenantData();
    }
  }, [tenantId, authLoading, supabase]);

  const handleSaveStoreInfo = async () => {
    if (!tenantId) return;
    setSaving(true);
    try {
      // 1. Update tenants table (storeName)
      const { error: tenantError } = await supabase
        .from("tenants")
        .update({ name: storeName, logo_url: logoUrl })
        .eq("id", tenantId);
      if (tenantError) throw tenantError;

      // 2. Update system_settings table (other info)
      const updatedSettings = {
          ...settings,
          representative: localRep,
          businessNumber: localBizNo,
          contactPhone: localPhone,
          address: localAddress
      };
      
      const saved = await saveSettings(updatedSettings);
      if (!saved) throw new Error("Failed to save settings");

      toast.success("상점 정보가 저장되었습니다.");
    } catch (err) {
      console.error(err);
      toast.error("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  // --- Data Management Logic ---

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

  const handleGoogleSheetsExport = async () => {
    if (!settings.googleSheetId) {
      toast.error("구글 시트 ID가 등록되어 있지 않습니다.");
      return;
    }
    toast.info("구글 시트로 데이터를 전송합니다... (API 연동 필요)");
  };

  // --- Rendering Helpers ---
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
        return <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 border-0">PRO (통합)</Badge>;
      case "erp_only":
        return <Badge className="bg-emerald-600 border-0">ERP Only</Badge>;
      case "ribbon_only":
        return <Badge className="bg-purple-600 border-0">Ribbon Only</Badge>;
      default:
        return <Badge variant="outline" className="text-slate-500">Free / Trial</Badge>;
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

      <Tabs defaultValue="store" className="w-full">
        <TabsList className="flex w-full overflow-x-auto h-auto p-1 bg-slate-100/50 rounded-xl mb-8 no-scrollbar scroll-smooth">
          <TabsTrigger value="store" className="flex items-center gap-2 px-6 py-2.5">
            <Building2 className="h-4 w-4" /> 상점 정보
          </TabsTrigger>
          <TabsTrigger value="order-payment" className="flex items-center gap-2 px-6 py-2.5">
            <Percent className="h-4 w-4" /> 주문/할인/포인트
          </TabsTrigger>
          <TabsTrigger value="delivery" className="flex items-center gap-2 px-6 py-2.5">
            <MapPin className="h-4 w-4" /> 배송비 설정
          </TabsTrigger>
          <TabsTrigger value="printer" className="flex items-center gap-2 px-6 py-2.5">
            <Printer className="h-4 w-4" /> 프린터/브릿지
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2 px-6 py-2.5">
            <LinkIcon className="h-4 w-4" /> 연동 및 자동화
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2 px-6 py-2.5 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Database className="h-4 w-4" /> 백업 및 초기화
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2 px-6 py-2.5">
            <ShieldCheck className="h-4 w-4" /> 멤버십/보안
          </TabsTrigger>
          <TabsTrigger value="partner-network" className="flex items-center gap-2 px-6 py-2.5 bg-blue-50/50 text-blue-700 data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-xl">
            <Share2 className="h-4 w-4" /> 협력사 네트워크
          </TabsTrigger>
        </TabsList>

        {/* --- Store Info --- */}
        <TabsContent value="store" className="space-y-4">
          <Card className="border-0 shadow-sm ring-1 ring-slate-200">
            <CardHeader>
              <CardTitle className="text-lg font-bold">상점 기본 정보</CardTitle>
              <CardDescription>고객 영수증 및 주문서에 표시될 정보입니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="store-name">화원 이름 (Store Name)</Label>
                  <Input 
                    id="store-name" 
                    value={storeName} 
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="예: 플로라플라워" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rep">대표자 (Representative)</Label>
                  <Input 
                    id="rep" 
                    value={localRep} 
                    onChange={e => setLocalRep(e.target.value)} 
                    placeholder="예: 홍길동"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bizNo">사업자 등록번호</Label>
                  <Input 
                    id="bizNo" 
                    value={localBizNo} 
                    onChange={e => setLocalBizNo(e.target.value)} 
                    placeholder="000-00-00000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">연락처</Label>
                  <Input 
                    id="phone" 
                    value={localPhone} 
                    onChange={e => setLocalPhone(e.target.value)} 
                    placeholder="010-0000-0000"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">주소</Label>
                <Input 
                  id="address" 
                  value={localAddress} 
                  onChange={e => setLocalAddress(e.target.value)} 
                  placeholder="예: 서울특별시 서초구 ..."
                />
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-4">
                  <div className="h-24 w-24 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Store Logo" className="h-full w-full object-contain" />
                    ) : (
                      <div className="flex flex-col items-center text-slate-400 gap-1">
                        <ImageIcon className="h-6 w-6" />
                        <span className="text-[10px]">Logo</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label className="text-sm font-bold">꽃집 로고 (Logo)</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        placeholder="로고 이미지 URL" 
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const url = prompt("이미지 주소를 입력하거나, 아래 갤러리 연동 후 업로드한 주소를 입력하세요.");
                          if (url) setLogoUrl(url);
                        }}
                      >
                        주소 입력
                      </Button>
                    </div>
                    <p className="text-[10px] text-slate-400">발주사로서 주문서 인쇄물에 표시될 로고입니다.</p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50/50 px-6 py-4 rounded-b-lg">
              <Button onClick={handleSaveStoreInfo} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                변경사항 저장
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* --- Order / Payment --- */}
        <TabsContent value="order-payment" className="space-y-4">
          <Card className="border-0 shadow-sm ring-1 ring-slate-200">
            <CardHeader>
              <div className="flex items-center gap-2 text-violet-600 mb-1">
                <Coins className="h-5 w-5" />
                <span className="text-xs font-bold uppercase tracking-wider">Loyalty Policy</span>
              </div>
              <CardTitle>포인트 적립 및 사용 설정</CardTitle>
              <CardDescription>단골 고객 관리를 위한 포인트 정책을 설정합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3 p-4 rounded-xl bg-violet-50/50 border border-violet-100">
                  <Label className="text-violet-900">기본 포인트 적립률 (%)</Label>
                  <div className="flex items-center gap-3">
                    <Input 
                      type="number" 
                      className="text-lg font-bold" 
                      value={settings.pointRate} 
                      onChange={e => saveSettings({...settings, pointRate: parseFloat(e.target.value) || 0})}
                    />
                    <span className="font-medium text-slate-500">%</span>
                  </div>
                  <p className="text-xs text-violet-600">결제 금액의 {settings.pointRate}%가 자동 적립됩니다.</p>
                </div>
                <div className="space-y-3 p-4 rounded-xl bg-slate-50/50 border border-slate-200">
                  <Label>최소 사용 가능 포인트</Label>
                  <div className="flex items-center gap-3">
                    <Input 
                      type="number" 
                      className="text-lg font-bold" 
                      value={settings.minPointUsage} 
                      onChange={e => saveSettings({...settings, minPointUsage: parseInt(e.target.value) || 0})}
                    />
                    <span className="font-medium text-slate-500">P</span>
                  </div>
                  <p className="text-xs text-slate-500">{settings.minPointUsage.toLocaleString()} P 이상부터 사용 가능합니다.</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="text-sm font-bold flex items-center gap-2">
                  <Percent className="h-4 w-4 text-emerald-600" /> 자주 사용하는 할인율
                </Label>
                <div className="flex flex-wrap gap-2">
                  {settings.discountRates.map((rate, idx) => (
                    <Badge 
                      key={idx} 
                      variant="secondary" 
                      className="px-4 py-1.5 text-sm gap-2 hover:bg-rose-50 hover:text-rose-600 cursor-default group transition-colors"
                    >
                      {rate}%
                      <Trash2 className="h-3 w-3 hidden group-hover:block cursor-pointer" onClick={() => {
                        const newRates = settings.discountRates.filter((_, i) => i !== idx);
                        saveSettings({...settings, discountRates: newRates});
                      }} />
                    </Badge>
                  ))}
                  <div className="flex items-center gap-2 ml-2">
                     <Input 
                        placeholder="추가 %" 
                        className="w-20 h-8 text-xs" 
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = parseInt((e.target as HTMLInputElement).value);
                            if (!isNaN(val)) {
                              saveSettings({...settings, discountRates: [...settings.discountRates, val].sort((a,b) => a-b)});
                              (e.target as HTMLInputElement).value = "";
                            }
                          }
                        }}
                     />
                  </div>
                </div>
                <p className="text-xs text-slate-500">주문 화면에서 위 항목들이 퀵 버튼으로 노출됩니다.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- Delivery Settings --- */}
        <TabsContent value="delivery" className="space-y-4">
          <Card className="border-0 shadow-sm ring-1 ring-slate-200">
            <CardHeader>
              <CardTitle>배송 정책</CardTitle>
              <CardDescription>화원 위치와 거리에 따른 배송비 규칙을 정합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="default-fee">기본 배송비 (Default Fee)</Label>
                  <div className="flex items-center gap-3">
                    <Input 
                      id="default-fee" 
                      type="number"
                      value={settings.defaultDeliveryFee} 
                      onChange={(e) => saveSettings({ ...settings, defaultDeliveryFee: parseInt(e.target.value) || 0 })}
                    />
                    <span className="font-medium text-slate-400">₩</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="free-thresh">무료 배송 임계값</Label>
                  <div className="flex items-center gap-3">
                    <Input 
                      id="free-thresh" 
                      type="number"
                      value={settings.freeDeliveryThreshold}
                      onChange={(e) => saveSettings({...settings, freeDeliveryThreshold: parseInt(e.target.value) || 0})}
                    />
                    <span className="font-medium text-slate-400">₩</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                   <Label className="text-sm font-bold">지역별 추가 배송비</Label>
                   <span className="text-xs text-slate-400">구역별로 다른 비용이 발생할 시 설정하세요.</span>
                </div>
                <div className="flex items-end gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="grid gap-1.5 flex-1">
                    <Label className="text-xs">지역명 (예: 강남구, 서초동)</Label>
                    <Input 
                      placeholder="강남구" 
                      value={newRegion} 
                      onChange={e => setNewRegion(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1.5 w-32">
                    <Label className="text-xs">배송비 (₩)</Label>
                    <Input 
                      type="number" 
                      placeholder="10000" 
                      value={newFee}
                      onChange={e => setNewFee(e.target.value)}
                    />
                  </div>
                  <Button onClick={() => {
                    if (!newRegion || !newFee) return;
                    addFee(newRegion, parseInt(newFee));
                    setNewRegion("");
                    setNewFee("");
                  }} className="bg-slate-900 text-slate-50">
                    <Plus className="h-4 w-4 mr-1" /> 추가
                  </Button>
                </div>
                <div className="border rounded-xl overflow-hidden text-sm bg-white">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="px-4 py-2.5 font-medium">지역/구역</th>
                        <th className="px-4 py-2.5 font-medium text-right">배송비</th>
                        <th className="px-4 py-2.5 text-center w-20">관리</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {regionFees.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-10 text-center text-slate-400">등록된 지역별 배송비가 없습니다.</td>
                        </tr>
                      ) : regionFees.map(fee => (
                        <tr key={fee.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-4 font-medium">{fee.region_name}</td>
                          <td className="px-4 py-4 text-right tabular-nums">₩{fee.fee.toLocaleString()}</td>
                          <td className="px-4 py-4 text-center">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-rose-500 hover:bg-rose-50" onClick={() => deleteFee(fee.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- Integrations & Automation --- */}
        <TabsContent value="integrations" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-sm ring-1 ring-blue-200 bg-blue-50/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-700">
                  <Cloud className="h-5 w-5 text-blue-600" /> 사진 저장소 및 자동화
                </CardTitle>
                <CardDescription>앨범 사진 저장 방식을 선택하고 연동합니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                   <Label className="text-sm font-bold">저장소 방식 선택</Label>
                   <div className="grid grid-cols-3 gap-3">
                      <Button 
                        variant={settings.photoStorageType === 'supabase' ? 'default' : 'outline'}
                        className="h-20 flex-col gap-2 rounded-2xl"
                        onClick={() => saveSettings({...settings, photoStorageType: 'supabase'})}
                      >
                        <ShieldCheck className="h-5 w-5" />
                        <span className="text-xs">기본 저장소</span>
                      </Button>
                      <Button 
                        variant={settings.photoStorageType === 'google_drive' ? 'default' : 'outline'}
                        className="h-20 flex-col gap-2 rounded-2xl border-emerald-200 hover:bg-emerald-50"
                        onClick={() => saveSettings({...settings, photoStorageType: 'google_drive'})}
                      >
                        <FileImage className="h-5 w-5 text-emerald-600" />
                        <span className="text-xs">구글 드라이브</span>
                      </Button>
                      <Button 
                        variant={settings.photoStorageType === 'cloudinary' ? 'default' : 'outline'}
                        className="h-20 flex-col gap-2 rounded-2xl border-indigo-200 hover:bg-indigo-50"
                        onClick={() => saveSettings({...settings, photoStorageType: 'cloudinary'})}
                      >
                        <ExternalLink className="h-5 w-5 text-indigo-600" />
                        <span className="text-xs">외부 클라우드</span>
                      </Button>
                   </div>
                </div>

                {settings.photoStorageType === 'google_drive' && (
                  <div className="p-4 bg-white rounded-xl border border-emerald-100 space-y-4">
                    <div className="space-y-2">
                       <Label className="text-xs font-bold text-slate-500 uppercase">Google Drive Folder ID</Label>
                       <Input 
                         placeholder="예: 1XYZ... (전용 폴더 ID)" 
                         value={settings.googleDriveFolderId}
                         onChange={e => saveSettings({...settings, googleDriveFolderId: e.target.value})}
                       />
                       <p className="text-[10px] text-slate-400 italic">연결 버튼을 클릭하여 본인의 구글 드라이브에 전용 폴더를 자동 생성할 수 있습니다.</p>
                       <Button size="sm" variant="outline" className="w-full text-xs gap-2">
                          <RefreshCw className="h-3 w-3" /> 드라이브 권한 연동하기
                       </Button>
                    </div>
                  </div>
                )}

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                       <Label className="text-sm font-bold flex items-center gap-2">
                         <LayoutGrid className="h-4 w-4 text-violet-600" /> 공개 샘플 앨범 (쇼핑몰 형태)
                       </Label>
                       <p className="text-xs text-slate-500">업로드한 사진을 외부 고객이나 다른 꽃집에 공유합니다.</p>
                    </div>
                    <Switch 
                      checked={settings.isGalleryPublic}
                      onCheckedChange={(checked) => saveSettings({...settings, isGalleryPublic: checked})}
                    />
                  </div>
                  {settings.isGalleryPublic && (
                    <div className="p-3 bg-violet-50 rounded-lg border border-violet-100 space-y-3">
                       <div className="flex items-center gap-3">
                         <Share2 className="h-4 w-4 text-violet-600" />
                         <div className="flex-1 truncate text-xs font-medium text-violet-800">
                           {typeof window !== 'undefined' ? `${window.location.origin}/gallery/${tenantId}` : '/gallery/...'}
                         </div>
                         <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => {
                           const url = `${window.location.origin}/gallery/${tenantId}`;
                           navigator.clipboard.writeText(url);
                           toast.success("갤러리 주소가 복사되었습니다.");
                         }}>복사</Button>
                       </div>
                       <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-bold text-violet-400">갤러리 테마</Label>
                          <div className="grid grid-cols-3 gap-2">
                             {(['grid', 'masonry', 'carousel'] as const).map(t => (
                               <Button 
                                 key={t}
                                 size="sm" 
                                 variant={settings.galleryTheme === t ? 'default' : 'outline'}
                                 className="h-8 text-[10px] capitalize"
                                 onClick={() => saveSettings({...settings, galleryTheme: t})}
                               >
                                 {t}
                               </Button>
                             ))}
                          </div>
                       </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm ring-1 ring-amber-200 bg-amber-50/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700">
                  <MessageCircle className="h-5 w-5 text-amber-600" /> 카카오톡 자동 전송 설정
                </CardTitle>
                <CardDescription>배송 사진 및 주문 알림을 카카오톡으로 자동 발송합니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                 <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-amber-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                      <MessageCircle className="h-4 w-4" />
                    </div>
                    <Label className="font-bold cursor-pointer" htmlFor="kakao-use">카카오톡 서비스 활성화</Label>
                  </div>
                  <Switch 
                    id="kakao-use" 
                    checked={settings.useKakaoTalk}
                    onCheckedChange={(checked) => saveSettings({...settings, useKakaoTalk: checked})}
                  />
                </div>

                {settings.useKakaoTalk && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase">API Key (Solapi/BizMsg)</Label>
                        <Input 
                          type="password"
                          value={settings.kakaoApiKey}
                          onChange={e => saveSettings({...settings, kakaoApiKey: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase">발신 번호/ID</Label>
                        <Input 
                          placeholder="010-0000-0000"
                          value={settings.kakaoSenderId}
                          onChange={e => saveSettings({...settings, kakaoSenderId: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase">기본 전송 메시지 템플릿</Label>
                      <textarea 
                        className="w-full min-h-[120px] rounded-xl border-slate-200 text-sm p-3 focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
                        value={settings.kakaoDefaultMessage}
                        onChange={e => saveSettings({...settings, kakaoDefaultMessage: e.target.value})}
                        placeholder="{고객명}님, {업체명}에서 배송하였습니다."
                      />
                      <p className="text-[10px] text-slate-400">`{`{고객명}, {상태}, {주문번호}`}` 등의 변수를 사용할 수 있습니다.</p>
                    </div>
                  </div>
                )}

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-bold flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> 구글 시트 연동 (Google Sheets)
                    </Label>
                    <Switch 
                      checked={settings.useGoogleSheets}
                      onCheckedChange={(checked) => saveSettings({...settings, useGoogleSheets: checked})}
                    />
                  </div>
                  {settings.useGoogleSheets && (
                    <div className="space-y-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-emerald-700">Spreadsheet ID</Label>
                        <Input 
                          value={settings.googleSheetId}
                          onChange={e => saveSettings({...settings, googleSheetId: e.target.value})}
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-emerald-700">시트 이름 (Tab Name)</Label>
                        <Input 
                          value={settings.googleSheetName}
                          onChange={e => saveSettings({...settings, googleSheetName: e.target.value})}
                          className="bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* --- Data Management & Initialization --- */}
        <TabsContent value="data" className="space-y-4">
          <div className="grid grid-cols-1 gap-6">
            <Card className="border-0 shadow-sm ring-1 ring-slate-200 md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-blue-600" /> PC 로컬 백업 및 복구
                </CardTitle>
                <CardDescription>데이터를 JSON 파일로 PC에 저장하거나 다시 불러옵니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline" className="h-20 justify-start px-6 gap-4 border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all group" onClick={handleBackup}>
                    <div className="p-3 bg-blue-100 rounded-xl text-blue-600 group-hover:scale-110 transition-transform">
                      <Download className="h-6 w-6" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold">PC(윈도우)로 전체 정보 백업 추출</div>
                      <div className="text-xs text-slate-500">주문, 고객, 상품 리스트가 포함됩니다.</div>
                    </div>
                  </Button>
                  <Button variant="outline" className="h-20 justify-start px-6 gap-4 border-2 border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all group" onClick={() => fileInputRef.current?.click()}>
                    <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600 group-hover:scale-110 transition-transform">
                      <Upload className="h-6 w-6" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold">PC 백업 파일에서 복구하기</div>
                      <div className="text-xs text-slate-500">기존 백업 파일을 선택하여 데이터를 덮어씁니다.</div>
                    </div>
                  </Button>
                  <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleRestore} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm ring-1 ring-rose-100 bg-rose-50/20 md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-rose-700">
                  <RefreshCw className="h-5 w-5 text-rose-600" /> 데이터 초기화 센터
                </CardTitle>
                <CardDescription>상점 정보와 계정을 제외한 모든 영업 데이터를 영구 삭제합니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
                  초기화 진행 시 주문 내역, 고객 목록, 등록 상품, 지역별 배송비가 즉시 영구 삭제되며 복구가 불가능합니다. 신중히 결정해 주세요.
                </p>
                <Dialog open={isInitDialogOpen} onOpenChange={(open) => {
                  setIsInitDialogOpen(open);
                  if (!open) {
                    setInitConfirmStep(0);
                    setInitInputValue("");
                  }
                }}>
                  <DialogTrigger className={cn(
                    buttonVariants({ variant: "destructive" }), 
                    "w-[280px] h-11 shadow-md"
                  )}>
                    매장 데이터 전체 초기화
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-rose-600">
                        <AlertCircle className="h-5 w-5" /> {initConfirmStep === 0 ? "경고: 정말 초기화하시겠습니까?" : initConfirmStep === 1 ? "마지막 경고입니다." : "최종 확인"}
                      </DialogTitle>
                      <DialogDescription className="py-2 text-slate-500">
                        {initConfirmStep === 0 && "초기화 시 주문/고객/상품 모든 자료가 삭제됩니다."}
                        {initConfirmStep === 1 && "이 작업은 취소할 수 없습니다. 계속하시려면 아래 확인을 진행하세요."}
                        {initConfirmStep === 2 && `초기화를 원하시면 입력창에 [ ${storeName} 초기화 ] 를 정확히 입력하세요.`}
                      </DialogDescription>
                    </DialogHeader>
                    {initConfirmStep === 2 && (
                      <div className="py-4">
                        <Input 
                          placeholder={`${storeName} 초기화`} 
                          value={initInputValue} 
                          onChange={e => setInitInputValue(e.target.value)}
                        />
                      </div>
                    )}
                    <DialogFooter className="flex-col gap-2 mt-4">
                      {initConfirmStep < 2 ? (
                        <Button variant="outline" className="w-full" onClick={() => setInitConfirmStep(prev => prev + 1)}>
                          예, 내용을 확인했습니다. (다음 단계)
                        </Button>
                      ) : (
                        <Button 
                          variant="destructive" 
                          className="w-full" 
                          disabled={initInputValue !== `${storeName} 초기화`}
                          onClick={handleReset}
                        >
                          최종 초기화 진행
                        </Button>
                      )}
                      <Button variant="ghost" className="w-full" onClick={() => setIsInitDialogOpen(false)}>취소</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="printer" className="space-y-4">
          <Card className="border-0 shadow-sm ring-1 ring-slate-200">
            <CardHeader>
              <CardTitle>프린터 브릿지 (Bridge) 연결</CardTitle>
              <CardDescription>로컬 PC의 프린터를 웹 서비스와 연결해주는 브릿지 상태를 확인합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6 p-6 rounded-2xl bg-white border border-slate-200">
                <div className={`p-4 rounded-full ${bridgeStatus ? 'bg-green-100 text-green-600' : 'bg-red-50 text-red-500'}`}>
                  <Printer className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold">{bridgeStatus ? "연결됨" : "연결 대기 중"}</span>
                    {bridgeStatus ? (
                      <Badge className="bg-green-500 border-0">ONLINE</Badge>
                    ) : (
                      <Badge variant="outline" className="text-red-500 border-red-200">OFFLINE</Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    {bridgeStatus 
                      ? "화원 내 프린터와 정상적으로 통신 중입니다." 
                      : "프린터 브릿지 프로그램이 실행되고 있는지 확인해주세요."}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={checkBridgeStatus}
                  disabled={checkingBridge}
                  className="rounded-xl"
                >
                  {checkingBridge ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  새로고침
                </Button>
              </div>

              {!bridgeStatus && (
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-start gap-4">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 text-sm">프린터 브릿지가 설치되어 있지 않나요?</h4>
                    <p className="text-xs text-blue-800/70 mt-1 leading-relaxed">
                      리본 및 영수증 출력을 위해서는 전용 브릿지 프로그램 설치가 필수입니다. 
                      아래 설치 가이드를 따라 설치를 진행해주세요.
                    </p>
                    <Button variant="link" className="p-0 h-auto text-xs font-bold text-blue-700 mt-3 group">
                      브릿지 다운로드 및 설치 가이드 <Plus className="h-3 w-3 inline ml-1 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="space-y-4">
           <Card className="border-0 shadow-sm ring-1 ring-blue-100">
             <CardHeader>
               <CardTitle>구독 및 서비스 등급</CardTitle>
               <CardDescription>현재 화원에서 이용 중인 서비스 등급을 확인합니다.</CardDescription>
             </CardHeader>
             <CardContent className="py-10 text-center">
               <div className="max-w-md mx-auto space-y-4">
                 <div className="text-4xl font-black text-slate-900">{plan.toUpperCase()}</div>
                 <p className="text-slate-500">현재 모든 기능을 제약 없이 이용 가능합니다.</p>
                 <Link href="/dashboard/subscription" className="block w-full">
                    <Button className="w-full h-12 text-lg font-bold">구독 관리 및 청구 정보 확인</Button>
                 </Link>
               </div>
             </CardContent>
           </Card>
        </TabsContent>
        {/* --- Partner Network Settings --- */}
        <TabsContent value="partner-network" className="space-y-6">
          <Card className="border-0 shadow-lg ring-1 ring-blue-100 bg-blue-50/5 overflow-hidden">
            <CardHeader className="bg-blue-600 text-white pb-8">
               <div className="flex items-center justify-between">
                 <div className="space-y-1">
                   <CardTitle className="text-2xl flex items-center gap-2">
                     <Share2 className="h-6 w-6" /> 플로라싱크 협력사 네트워크
                   </CardTitle>
                   <CardDescription className="text-blue-100">
                     전국의 다른 회원사들로부터 주문을 위탁받고 수익을 창출하세요.
                   </CardDescription>
                 </div>
                 <Switch 
                   className="data-[state=checked]:bg-white data-[state=checked]:text-blue-600"
                   checked={canReceiveOrders}
                   onCheckedChange={async (checked) => {
                     setCanReceiveOrders(checked);
                     try {
                        const { error } = await supabase
                          .from('tenants')
                          .update({ can_receive_orders: checked })
                          .eq('id', tenantId);
                        if (error) throw error;
                        toast.success(checked ? "협력사 네트워크 참여가 활성화되었습니다." : "협력사 참여가 해제되었습니다.");
                     } catch (err) {
                        toast.error("설정 변경 중 오류가 발생했습니다.");
                        setCanReceiveOrders(!checked);
                     }
                   }}
                 />
               </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-8">
              <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm space-y-6">
                <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="p-3 bg-white rounded-full text-blue-600 shadow-sm">
                    <Percent className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-blue-900">수주 정산 정책 (79% 모델)</h4>
                    <p className="text-sm text-blue-700 leading-relaxed">
                      네트워크를 통해 들어온 외부 주문을 수주할 경우, **고객 결제 금액의 79%**를 정산받게 됩니다. 
                      (발주사 19%, 플랫폼 수수료 2% 별도)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-400" /> 수주 가능 지역
                    </Label>
                    <Input 
                      placeholder="예: 서울 강남구 전 지역, 경기 성남시" 
                      value={partnerRegion}
                      onChange={(e) => setPartnerRegion(e.target.value)}
                      disabled={!canReceiveOrders}
                    />
                    <p className="text-[10px] text-slate-400">발주사들이 이 정보를 바탕으로 지역을 검색합니다.</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <LayoutGrid className="h-4 w-4 text-slate-400" /> 전문 분야 (카테고리)
                    </Label>
                    <Input 
                      placeholder="예: 축하화환 전문, 동양란/서양란 전문" 
                      value={partnerCategory}
                      onChange={(e) => setPartnerCategory(e.target.value)}
                      disabled={!canReceiveOrders}
                    />
                  </div>
                </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">파트너 한줄 소개 (회원사 전용)</Label>
                    <Input 
                      placeholder="다른 회원사들에게 노출될 소개글을 입력하세요." 
                      value={partnerDescription}
                      onChange={(e) => setPartnerDescription(e.target.value)}
                      disabled={!canReceiveOrders}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-blue-100 italic">
                    <div className="space-y-1">
                      <Label className="text-sm font-bold flex items-center gap-2">
                        <LayoutGrid className="h-4 w-4 text-blue-600" /> 쇼핑몰 형태 공개 여부
                      </Label>
                      <p className="text-xs text-slate-500">다른 회원사들이 내 상품 목록을 보고 직접 발주할 수 있게 합니다.</p>
                    </div>
                    <Switch 
                      checked={isStorefrontPublic}
                      onCheckedChange={(checked) => setIsStorefrontPublic(checked)}
                      disabled={!canReceiveOrders}
                    />
                  </div>
                </div>

              {canReceiveOrders && (
                <div className="flex justify-end">
                   <Button 
                     className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8"
                     onClick={async () => {
                        try {
                          setSaving(true);
                          const { error } = await supabase
                            .from('tenants')
                            .update({ 
                              partner_region: partnerRegion,
                              partner_category: partnerCategory,
                              partner_description: partnerDescription,
                              is_storefront_public: isStorefrontPublic
                            })
                            .eq('id', tenantId);
                          if (error) throw error;
                          toast.success("파트너 프로필이 업데이트되었습니다.");
                        } catch (err) {
                          toast.error("업데이트 중 오류가 발생했습니다.");
                        } finally {
                          setSaving(false);
                        }
                     }}
                   >
                     프로필 정보 저장
                   </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
