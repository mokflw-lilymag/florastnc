"use client";

import { useState, useEffect } from "react";
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
  Loader2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const supabase = createClient();
  const { user, profile, tenantId, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Store Info State
  const [storeName, setStoreName] = useState("");
  const [plan, setPlan] = useState("free");
  
  // Printer Settings State
  const [bridgeStatus, setBridgeStatus] = useState<boolean>(false);
  const [checkingBridge, setCheckingBridge] = useState(false);

  const checkBridgeStatus = async () => {
    setCheckingBridge(true);
    try {
      // Typically the bridge runs on localhost:8080 or similar
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const response = await fetch("http://localhost:8080/status", { 
        signal: controller.signal,
        mode: 'no-cors' // Bridge might not have CORS enabled, no-cors still confirms it's reachable
      });
      
      clearTimeout(timeoutId);
      setBridgeStatus(true);
      toast.success("프린터 브릿지가 연결되었습니다.");
    } catch (err) {
      setBridgeStatus(false);
      toast.error("프린터 브릿지 응답이 없습니다. 프로그램을 실행 중인지 확인하세요.");
    } finally {
      setCheckingBridge(false);
    }
  };

  useEffect(() => {
    checkBridgeStatus();
  }, []);

  useEffect(() => {
    async function loadTenantData() {
      if (!tenantId) return;
      
      try {
        const { data, error } = await supabase
          .from("tenants")
          .select("*")
          .eq("id", tenantId)
          .maybeSingle();
          
        if (data) {
          setStoreName(data.name || "");
          setPlan(data.plan || "free");
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
      const { error } = await supabase
        .from("tenants")
        .update({ name: storeName })
        .eq("id", tenantId);
        
      if (error) throw error;
      toast.success("상점 정보가 저장되었습니다.");
    } catch (err) {
      toast.error("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
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
          <p className="text-slate-500 mt-2">상점 정보 및 SaaS 구독 플랜을 관리합니다.</p>
        </div>
      </div>

      <Tabs defaultValue="store" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3 mb-8">
          <TabsTrigger value="store" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" /> 상점 정보
          </TabsTrigger>
          <TabsTrigger value="plan" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> 구독 플랜
          </TabsTrigger>
          <TabsTrigger value="printer" className="flex items-center gap-2">
            <Printer className="h-4 w-4" /> 프린터 연결
          </TabsTrigger>
        </TabsList>

        <TabsContent value="store" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>상점 기본 정보</CardTitle>
              <CardDescription>고객에게 표시될 상점 이름과 기본 정보를 설정합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="store-name">화원 이름 (Store Name)</Label>
                <Input 
                  id="store-name" 
                  value={storeName} 
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="예: 플로라플라워" 
                />
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button onClick={handleSaveStoreInfo} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                변경사항 저장
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="plan" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>현재 이용 중인 플랜</CardTitle>
                <CardDescription>Florasync SaaS 서비스의 구독 등급입니다.</CardDescription>
              </div>
              {getPlanBadge(plan)}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-6 rounded-xl border ${plan === 'ribbon_only' ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/20 ring-1 ring-purple-600' : 'border-slate-200 dark:border-slate-800'}`}>
                  <h3 className="font-bold text-lg mb-2">Ribbon Only</h3>
                  <p className="text-sm text-slate-500 mb-4">리본 프린팅 기능에 집중한 플랜</p>
                  <ul className="text-sm space-y-2 mb-6">
                    <li className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <CheckCircle2 className="h-4 w-4 text-purple-600" /> 리본 캔버스 무제한
                    </li>
                    <li className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <CheckCircle2 className="h-4 w-4 text-purple-600" /> 커스텀 폰트/문구 저장
                    </li>
                  </ul>
                  {plan === 'ribbon_only' ? (
                    <Button variant="outline" className="w-full" disabled>현재 이용 중</Button>
                  ) : (
                    <Button variant="outline" className="w-full">학습/결제하기</Button>
                  )}
                </div>

                <div className={`p-6 rounded-xl border ${plan === 'erp_only' ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-600' : 'border-slate-200 dark:border-slate-800'}`}>
                  <h3 className="font-bold text-lg mb-2">ERP Only</h3>
                  <p className="text-sm text-slate-500 mb-4">화원 운영 관리를 위한 전문 ERP</p>
                  <ul className="text-sm space-y-2 mb-6">
                    <li className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" /> 주문/고객/상품 관리
                    </li>
                    <li className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" /> 실시간 데이터 동기화
                    </li>
                  </ul>
                  {plan === 'erp_only' ? (
                    <Button variant="outline" className="w-full" disabled>현재 이용 중</Button>
                  ) : (
                    <Button variant="outline" className="w-full">학습/결제하기</Button>
                  )}
                </div>

                <div className={`p-6 rounded-xl border ${plan === 'pro' ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 ring-1 ring-blue-600' : 'border-slate-200 dark:border-slate-800'}`}>
                  <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                    PRO <Badge className="bg-blue-600 hover:bg-blue-600">추천</Badge>
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">화원 운영 + 리본 출력 통합 마스터</p>
                  <ul className="text-sm space-y-2 mb-6">
                    <li className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-medium">
                      <CheckCircle2 className="h-4 w-4 text-blue-600" /> 위 모든 기능 포함
                    </li>
                    <li className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-medium">
                      <CheckCircle2 className="h-4 w-4 text-blue-600" /> PRO 전용 우선 지원
                    </li>
                  </ul>
                  {plan === 'pro' ? (
                    <Button variant="outline" className="w-full" disabled>현재 이용 중</Button>
                  ) : (
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">업그레이드 하기</Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="printer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>프린터 브릿지 (Bridge) 연결</CardTitle>
              <CardDescription>로컬 PC의 프린터를 웹 서비스와 연결해주는 브릿지 상태를 확인합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className={`p-3 rounded-full ${bridgeStatus ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  <Printer className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{bridgeStatus ? "연결됨" : "연결되지 않음"}</span>
                    {bridgeStatus ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Online</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Offline</Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    {bridgeStatus 
                      ? "브릿지 프로그램이 정상적으로 실행 중입니다." 
                      : "프린터 브릿지 프로그램이 실행되고 있는지 확인해주세요."}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={checkBridgeStatus}
                  disabled={checkingBridge}
                >
                  {checkingBridge ? <Loader2 className="h-4 w-4 animate-spin" /> : "상태 새로고침"}
                </Button>
              </div>

              {!bridgeStatus && (
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 dark:text-blue-300 text-sm">프린터 브릿지가 설치되어 있지 않나요?</h4>
                    <p className="text-xs text-blue-800 dark:text-blue-400 mt-1">
                      리본 출력을 위해서는 윈도우용 브릿지 프로그램 설치가 필수입니다. 
                      아래 버튼을 눌러 설치 가이드를 확인하세요.
                    </p>
                    <Button variant="link" className="p-0 h-auto text-xs font-semibold text-blue-700 mt-2">
                      브릿지 다운로드 및 설치 가이드 →
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
