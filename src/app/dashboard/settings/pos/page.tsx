"use client";

import { useState, useEffect } from "react";
import { 
  Monitor, 
  Smartphone, 
  CreditCard, 
  Settings as SettingsIcon,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Zap,
  Info,
  Building2,
  Key,
  Webhook,
  ArrowRight,
  TrendingUp,
  UserPlus,
  ScrollText,
  RefreshCw
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { usePosSettings } from "@/hooks/use-pos-settings";
import { PosType } from "@/services/pos/PosIntegrationService";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function PosSettingsPage() {
  const { integration, loading, logs, logsLoading, fetchLogs, saveIntegration } = usePosSettings();
  const [activeTab, setActiveTab] = useState("general");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activeTab === "logs") {
      fetchLogs();
    }
  }, [activeTab, fetchLogs]);

  // Local state for the form
  const [formData, setFormData] = useState({
    pos_type: "easycheck" as PosType,
    is_active: true,
    api_key: "",
    api_secret: "",
    store_code: "",
    webhook_secret: "",
    auto_create_customer: false,
    auto_point_rate: 1.0
  });

  useEffect(() => {
    if (integration) {
      setFormData({
        pos_type: integration.pos_type || "easycheck",
        is_active: integration.is_active ?? true,
        api_key: integration.api_key || "",
        api_secret: integration.api_secret || "",
        store_code: integration.store_code || "",
        webhook_secret: integration.webhook_secret || "",
        auto_create_customer: integration.auto_create_customer ?? false,
        auto_point_rate: Number(integration.auto_point_rate) || 1.0
      });
    }
  }, [integration]);

  const handleSave = async () => {
    setSaving(true);
    const success = await saveIntegration(formData);
    setSaving(false);
  };

  const posProviders = [
    { 
      id: "easycheck", 
      name: "이지체크 (EasyCheck)", 
      desc: "꽃집 점유율 1위. 정교한 API 연동 지원", 
      icon: Monitor,
      color: "bg-blue-500",
      badge: "가장 권장"
    },
    { 
      id: "toss", 
      name: "토스 POS (TossPlace)", 
      desc: "세련된 디자인과 스마트한 분석", 
      icon: Smartphone,
      color: "bg-blue-600",
      badge: "인기"
    },
    { 
      id: "manual", 
      name: "수동 연동 / 기타", 
      desc: "기타 카드 단말기 Webhook 연동", 
      icon: SettingsIcon,
      color: "bg-slate-500",
      badge: ""
    }
  ];

  if (loading && !integration) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-slate-500 animate-pulse">POS 연동 정보를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 p-4">
      {/* Header section with Premium feel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-[32px] text-white shadow-2xl overflow-hidden relative group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-primary/20 transition-all duration-700" />
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
             <Badge className="bg-primary/20 text-primary border-primary/30 hover:bg-primary/30">Enterprise Feature</Badge>
             {integration?.last_synced_at && (
               <Badge variant="outline" className="text-green-400 border-green-500/30">
                 <CheckCircle2 className="w-3 h-3 mr-1" /> 실시간 동기화 중
               </Badge>
             )}
          </div>
          <h1 className="text-4xl font-bold tracking-tight">POS 시스템 연동 마스터</h1>
          <p className="text-slate-300 max-w-xl text-lg font-light leading-relaxed">
            오프라인 결제가 완료되는 즉시 주문, 고객, 포인트를 자동으로 동기화합니다.
            이제 이중 입력 없이 매장 운영에만 집중하세요.
          </p>
        </div>
        <div className="relative z-10 flex flex-col gap-2 min-w-[200px]">
           <Button 
             className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20 py-6 rounded-2xl group transition-all"
             onClick={handleSave}
             disabled={saving}
           >
             {saving ? (
               <>
                 <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                 설정 저장 중...
               </>
             ) : (
               <>
                 <Save className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                 전체 설정 저장하기
               </>
             )}
           </Button>
           {integration?.last_synced_at && (
             <p className="text-[10px] text-center text-slate-400">
               최근 동기화: {new Date(integration.last_synced_at).toLocaleString()}
             </p>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Sidebar Menu */}
        <div className="space-y-4">
          <Card className="border-none shadow-md bg-white rounded-3xl overflow-hidden">
            <CardContent className="p-3">
              <div className="flex flex-col space-y-1">
                <Button 
                  variant={activeTab === "general" ? "default" : "ghost"}
                  className={cn(
                    "justify-start gap-3 h-14 px-4 rounded-2xl transition-all",
                    activeTab === "general" ? "shadow-lg shadow-primary/10" : "text-slate-500"
                  )}
                  onClick={() => setActiveTab("general")}
                >
                  <Monitor className="w-5 h-5" />
                  <span className="font-semibold text-base">연동 POS 선택</span>
                </Button>
                <Button 
                  variant={activeTab === "credentials" ? "default" : "ghost"}
                  className={cn(
                    "justify-start gap-3 h-14 px-4 rounded-2xl transition-all",
                    activeTab === "credentials" ? "shadow-lg shadow-primary/10" : "text-slate-500"
                  )}
                  onClick={() => setActiveTab("credentials")}
                >
                  <Key className="w-5 h-5" />
                  <span className="font-semibold text-base">인증 및 API 설정</span>
                </Button>
                <Button 
                  variant={activeTab === "automation" ? "default" : "ghost"}
                  className={cn(
                    "justify-start gap-3 h-14 px-4 rounded-2xl transition-all",
                    activeTab === "automation" ? "shadow-lg shadow-primary/10" : "text-slate-500"
                  )}
                  onClick={() => setActiveTab("automation")}
                >
                  <Zap className="w-5 h-5" />
                  <span className="font-semibold text-base">자동화 정책</span>
                </Button>
                <Button 
                  variant={activeTab === "logs" ? "default" : "ghost"}
                  className={cn(
                    "justify-start gap-3 h-14 px-4 rounded-2xl transition-all",
                    activeTab === "logs" ? "shadow-lg shadow-primary/10" : "text-slate-500"
                  )}
                  onClick={() => setActiveTab("logs")}
                >
                  <ScrollText className="w-5 h-5" />
                  <span className="font-semibold text-base">트랜잭션 로그</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[32px] p-6 text-white relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-200" />
                <span className="text-sm font-medium text-blue-100 uppercase tracking-widest">Setup Guide</span>
              </div>
              <h3 className="text-xl font-bold leading-tight">이지체크 파트너십<br />연동 안내</h3>
              <p className="text-sm text-blue-100/80 leading-relaxed">
                이지체크 API 사용을 위해서는 이지체크 본사와 FloraSync 플랫폼 간의 파트너 계약이 필요합니다. 연동이 어려우신 경우 고객센터로 연락주세요.
              </p>
              <Button variant="secondary" className="w-full bg-white/20 hover:bg-white/30 border-none text-white font-bold rounded-2xl py-6 gap-2 group">
                 고객센터 가이드 <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-2 space-y-8">
          <AnimatePresence mode="wait">
            {activeTab === "general" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <Card className="border-none shadow-lg rounded-[32px] overflow-hidden bg-white">
                  <CardHeader className="pb-0 pt-8 px-8">
                     <CardTitle className="text-2xl font-bold text-slate-800">연동 하실 POS를 선택하세요</CardTitle>
                     <CardDescription className="text-slate-500 text-lg">결제를 담당하는 단말기 제조사를 선택하면 해당 사의 규격에 맞게 연동됩니다.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8">
                    <RadioGroup 
                      value={formData.pos_type} 
                      onValueChange={(val: PosType) => setFormData(prev => ({ ...prev, pos_type: val }))}
                      className="grid grid-cols-1 gap-4"
                    >
                      {posProviders.map((provider) => (
                        <Label
                          key={provider.id}
                          htmlFor={provider.id}
                          className={cn(
                            "flex items-center justify-between p-6 rounded-[24px] border-2 cursor-pointer transition-all hover:shadow-md",
                            formData.pos_type === provider.id 
                              ? "border-primary bg-primary/5 shadow-inner" 
                              : "border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200"
                          )}
                        >
                          <div className="flex items-center gap-5">
                            <RadioGroupItem value={provider.id} id={provider.id} className="sr-only" />
                            <div className={cn("p-4 rounded-2xl text-white shadow-lg", provider.color)}>
                               <provider.icon className="w-6 h-6" />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-lg text-slate-800">{provider.name}</span>
                                {provider.badge && <Badge className="bg-slate-800 text-white rounded-sm text-[10px]">{provider.badge}</Badge>}
                              </div>
                              <p className="text-slate-500 text-sm">{provider.desc}</p>
                            </div>
                          </div>
                          {formData.pos_type === provider.id && (
                            <div className="bg-primary text-white p-1 rounded-full">
                               <CheckCircle2 className="w-5 h-5" />
                            </div>
                          )}
                        </Label>
                      ))}
                    </RadioGroup>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg rounded-[32px] overflow-hidden bg-white">
                   <CardHeader className="pt-8 px-8 flex flex-row items-center justify-between">
                      <div className="space-y-1">
                         <CardTitle className="text-xl font-bold text-slate-800">연동 마스터 스위치</CardTitle>
                         <CardDescription>현재 POS 연동 기능을 활성화하거나 일시 중지합니다.</CardDescription>
                      </div>
                      <Switch 
                        checked={formData.is_active} 
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))} 
                        className="scale-125"
                      />
                   </CardHeader>
                   <CardContent className="px-8 pb-8">
                      <div className={cn(
                        "flex items-center gap-4 p-4 rounded-2xl border transition-all",
                        formData.is_active ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-slate-50 border-slate-100 text-slate-500"
                      )}>
                         {formData.is_active ? <Zap className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                         <p className="text-sm font-medium">
                           {formData.is_active 
                             ? "실시간 POS 연동 서비스가 활성화되어 있습니다. 결제 완료 시 즉시 데이터가 동기화됩니다." 
                             : "연동 서비스가 중지되었습니다. POS에서 결제가 발생해도 데이터가 기록되지 않습니다."}
                         </p>
                      </div>
                   </CardContent>
                </Card>
              </motion.div>
            )}

            {activeTab === "credentials" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <Card className="border-none shadow-lg rounded-[32px] overflow-hidden bg-white">
                  <CardHeader className="pt-8 px-8">
                     <CardTitle className="text-2xl font-bold flex items-center gap-2"><Webhook className="w-6 h-6 text-primary" /> API 및 Webhook 설정</CardTitle>
                     <CardDescription>POS 업체로부터 발급받은 API 정보를 입력하세요.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-slate-700 font-semibold">매장 식별 코드 (Store Code)</Label>
                        <div className="relative group">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                          <Input 
                            className="pl-10 h-12 rounded-xl bg-slate-50 focus:bg-white transition-all border-slate-200"
                            placeholder="이지체크 가맹점 번호 등" 
                            value={formData.store_code}
                            onChange={(e) => setFormData(prev => ({ ...prev, store_code: e.target.value }))}
                          />
                        </div>
                        <p className="text-[10px] text-slate-400">POS 업체에서 발급한 고유 매장 식별 코드입니다.</p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-slate-700 font-semibold">Webhook Secret Key</Label>
                        <div className="relative group">
                          <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                          <Input 
                            type="password"
                            className="pl-10 h-12 rounded-xl bg-slate-50 focus:bg-white transition-all border-slate-200"
                            placeholder="서명 검증용 키" 
                            value={formData.webhook_secret}
                            onChange={(e) => setFormData(prev => ({ ...prev, webhook_secret: e.target.value }))}
                          />
                        </div>
                        <p className="text-[10px] text-slate-400">보안성 높은 데이터 전송을 위한 HMAC 서명 검증 키입니다.</p>
                      </div>
                    </div>

                    <Separator className="bg-slate-100" />

                    <div className="space-y-2">
                      <Label className="text-slate-700 font-semibold">API Key / Access Token</Label>
                      <div className="relative group">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <Input 
                          type="password"
                          className="pl-10 h-12 rounded-xl bg-slate-50 focus:bg-white transition-all border-slate-200"
                          placeholder="발급받은 API 키를 입력하세요" 
                          value={formData.api_key}
                          onChange={(e) => setFormData(prev => ({ ...prev, api_key: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-700 font-semibold">API Secret</Label>
                      <div className="relative group">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <Input 
                          type="password"
                          className="pl-10 h-12 rounded-xl bg-slate-50 focus:bg-white transition-all border-slate-200"
                          placeholder="API 시크릿 키 (필요한 경우)" 
                          value={formData.api_secret}
                          onChange={(e) => setFormData(prev => ({ ...prev, api_secret: e.target.value }))}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg rounded-[32px] overflow-hidden bg-slate-900 text-white">
                   <CardContent className="p-8">
                      <div className="flex items-start gap-4">
                         <div className="p-3 bg-white/10 rounded-2xl">
                            <Info className="w-6 h-6 text-primary" />
                         </div>
                         <div className="space-y-3">
                            <h4 className="text-lg font-bold">Webhook 수신 URL (복사하여 POS 설정에 입력)</h4>
                            <div className="flex items-center gap-2 bg-black/40 p-4 rounded-xl border border-white/10 group h-14">
                               <code className="text-primary font-mono text-sm flex-1">
                                 {typeof window !== 'undefined' ? `${window.location.origin}/api/pos/webhook/${formData.pos_type}` : `/api/pos/webhook/${formData.pos_type}`}
                               </code>
                               <Button size="sm" variant="ghost" className="hover:bg-white/10 text-[10px] uppercase tracking-widest text-white/60 hover:text-white" onClick={() => {
                                 const url = `${window.location.origin}/api/pos/webhook/${formData.pos_type}`;
                                 navigator.clipboard.writeText(url);
                                 toast.success('URL이 클립보드에 복사되었습니다.');
                               }}>
                                  COPY
                               </Button>
                            </div>
                            <p className="text-xs text-slate-400 italic">
                               ※ 이 URL로 POS 시스템의 '결제 완료' Webhook을 설정해주세요. store_code는 {formData.store_code || '설정 필요'}로 전송되어야 합니다.
                            </p>
                         </div>
                      </div>
                   </CardContent>
                </Card>
              </motion.div>
            )}

            {activeTab === "automation" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <Card className="border-none shadow-lg rounded-[32px] overflow-hidden bg-white">
                  <CardHeader className="pt-8 px-8">
                     <CardTitle className="text-2xl font-bold flex items-center gap-2"><Zap className="w-6 h-6 text-yellow-500" /> 지능적 자동화 정책</CardTitle>
                     <CardDescription>데이터 동기화 시 비즈니스 로직을 설정합니다.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8 space-y-8">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Auto Customer Creation */}
                        <div className="flex items-start justify-between gap-4 p-6 rounded-[24px] border-2 border-slate-50 bg-slate-50/30">
                           <div className="flex gap-4">
                              <div className="p-3 bg-white rounded-2xl shadow-sm text-indigo-600 border border-slate-100">
                                 <UserPlus className="w-6 h-6" />
                              </div>
                              <div className="space-y-1">
                                 <h4 className="font-bold text-slate-800">비회원 자동 등록</h4>
                                 <p className="text-xs text-slate-500 max-w-[200px]">등록되지 않은 연락처로 결제 시 자동으로 신규 고객으로 등록합니다.</p>
                              </div>
                           </div>
                           <Switch 
                             checked={formData.auto_create_customer}
                             onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_create_customer: checked }))}
                           />
                        </div>

                        {/* Auto Points Policy */}
                        <div className="flex flex-col gap-4 p-6 rounded-[24px] border-2 border-primary/10 bg-primary/5">
                           <div className="flex items-center gap-4">
                              <div className="p-3 bg-white rounded-2xl shadow-sm text-primary border border-primary/10">
                                 <TrendingUp className="w-6 h-6" />
                              </div>
                              <div className="space-y-1">
                                 <h4 className="font-bold text-slate-800">포인트 자동 적립 정책</h4>
                                 <p className="text-xs text-slate-500">POS 결제 금액 대비 적립률</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-2">
                              <div className="relative flex-1">
                                 <Input 
                                   type="number" 
                                   step="0.1" 
                                   className="h-12 rounded-xl pr-10 text-right font-bold text-lg" 
                                   value={formData.auto_point_rate}
                                   onChange={(e) => setFormData(prev => ({ ...prev, auto_point_rate: parseFloat(e.target.value) || 0 }))}
                                 />
                                 <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">%</span>
                              </div>
                              <div className="flex gap-1">
                                 {[1.0, 3.0, 5.0].map(rate => (
                                   <Button 
                                     key={rate}
                                     type="button" 
                                     variant="outline" 
                                     size="sm" 
                                     className={cn(
                                       "rounded-lg h-12 px-3",
                                       formData.auto_point_rate === rate ? "bg-primary text-white border-primary" : "bg-white"
                                     )}
                                     onClick={() => setFormData(prev => ({ ...prev, auto_point_rate: rate }))}
                                   >
                                     {rate}%
                                   </Button>
                                 ))}
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-100 space-y-4">
                        <div className="flex items-center gap-2 font-bold text-slate-700">
                           <CreditCard className="w-5 h-5 text-slate-500" />
                           매핑 시나리오 확인
                        </div>
                        <ul className="space-y-3">
                           <li className="flex items-start gap-3 text-sm text-slate-600">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                              <p><b>기존 회원</b>: POS 전화번호 입력 → 기존 회원 포인트 자동 적립 + 주문 내역 회원 매칭</p>
                           </li>
                           <li className="flex items-start gap-3 text-sm text-slate-600">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                              <p><b>워킹 고객(비회원)</b>: 주문은 정상 생성되며 '워킹 고객'으로 표시됩니다. 나중에 고객 관리에서 수동으로 회원과 연결 가능합니다.</p>
                           </li>
                           <li className="flex items-start gap-3 text-sm text-slate-600">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                              <p><b>지출 자동 연동</b>: 매장 결제 발생 시 해당 날짜의 '매장 매출'로 자동 집계됩니다.</p>
                           </li>
                        </ul>
                     </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
            {activeTab === "logs" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <Card className="border-none shadow-lg rounded-[32px] overflow-hidden bg-white">
                  <CardHeader className="pt-8 px-8 flex flex-row items-center justify-between">
                     <div className="space-y-1">
                        <CardTitle className="text-2xl font-bold flex items-center gap-2"><ScrollText className="w-6 h-6 text-slate-400" /> POS 트랜잭션 로그</CardTitle>
                        <CardDescription>최근 50건의 Webhook 수신 및 처리 기록입니다.</CardDescription>
                     </div>
                     <Button variant="outline" size="sm" onClick={() => fetchLogs()} disabled={logsLoading} className="rounded-xl">
                        {logsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                        새로고침
                     </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="w-[180px] font-bold">수신 일시</TableHead>
                            <TableHead className="w-[100px] font-bold">POS사</TableHead>
                            <TableHead className="font-bold">주문번호/금액</TableHead>
                            <TableHead className="w-[100px] font-bold text-center">상태</TableHead>
                            <TableHead className="font-bold">처리 결과</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {logs.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="h-64 text-center text-slate-400">
                                {logsLoading ? "로그를 불러오는 중..." : "최근 처리된 트랜잭션이 없습니다."}
                              </TableCell>
                            </TableRow>
                          ) : (
                            logs.map((log) => (
                              <TableRow key={log.id} className="hover:bg-slate-50/50">
                                <TableCell className="text-xs font-mono">
                                  {new Date(log.created_at).toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="capitalize text-[10px]">{log.provider}</Badge>
                                </TableCell>
                                <TableCell className="space-y-1">
                                  <div className="font-bold text-sm">{log.payload?.order_id || log.payload?.bill_no || "N/A"}</div>
                                  <div className="text-[10px] text-slate-500">₩{(log.payload?.amount || log.payload?.total_amount || 0).toLocaleString()}</div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge className={cn(
                                    "rounded-md text-[10px] px-2 py-0.5",
                                    log.status === 'success' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                                  )}>
                                    {log.status === 'success' ? '정상' : '실패'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs max-w-[200px] truncate">
                                  {log.status === 'success' ? (
                                    <span className="text-slate-600">주문 생성 및 포인트 적립 완료</span>
                                  ) : (
                                    <span className="text-rose-500 font-medium">{log.error_message || "알 수 없는 처리 오류"}</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                   <p className="text-xs text-slate-500">
                     ※ 트랜잭션 로그는 기술 지원 및 장애 복구 목적으로 사용됩니다. 민감한 데이터는 마스킹 처리되어 기록됩니다.
                   </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <footer className="pt-4 flex justify-end gap-3 text-slate-400 text-sm italic">
             <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                모든 통신은 256비트 SSL 암호화로 보호됩니다.
             </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
