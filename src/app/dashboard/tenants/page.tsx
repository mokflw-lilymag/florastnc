"use client";

import { useState, useEffect } from "react";
import { Store, Plus, Search, Filter, ShieldCheck, Mail, Calendar as CalendarIcon, Loader2, MoreHorizontal, RefreshCw, Clock, CheckCircle2, XCircle, ChevronRight, MessageSquare, AlertCircle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { AccessDenied } from "@/components/access-denied";
import { createClient } from "@/utils/supabase/client";
import { format, addMonths, addDays, isAfter } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface TenantWithProfile {
  id: string;
  name: string;
  plan: string;
  status: string;
  subscription_start: string | null;
  subscription_end: string | null;
  created_at: string;
  profiles: {
    email: string;
    role: string;
  }[];
}

const PRICING = {
  free: { "1m": 20000, "3m": 50000, "6m": 80000, "12m": 120000 },
  erp_only: { "1m": 30000, "3m": 80000, "6m": 150000, "12m": 250000 },
  pro: { "1m": 50000, "3m": 140000, "6m": 250000, "12m": 450000 },
};

export default function TenantsPage() {
  const supabase = createClient();
  const { profile, isSuperAdmin, isLoading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<TenantWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<TenantWithProfile | null>(null);
  
  // Form states
  const [newName, setNewName] = useState("");
  const [newPlan, setNewPlan] = useState("free");
  const [submitting, setSubmitting] = useState(false);

  // Subscription Edit States
  const [editPlan, setEditPlan] = useState("free");
  const [editStatus, setEditStatus] = useState("active");
  const [editEnd, setEditEnd] = useState<Date | undefined>(undefined);
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const tr = (koText: string, enText: string) => (baseLocale === "ko" ? koText : enText);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/tenants");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof json?.error === "string" ? json.error : res.statusText);
      }
      setTenants((json.tenants as TenantWithProfile[]) || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Error fetching tenants:", msg, err);
      if (isSuperAdmin) {
        toast.error(tr("데이터를 불러오지 못했습니다.", "Failed to load data."));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchTenants();
    }
  }, [isSuperAdmin]);

  const handleCreateTenant = async () => {
    if (!newName.trim()) {
      toast.error(tr("상호명을 입력해 주세요.", "Please enter shop name."));
      return;
    }

    try {
      setSubmitting(true);
      const { data, error } = await supabase
        .from('tenants')
        .insert([{ 
          name: newName, 
          plan: newPlan,
          status: 'active',
          subscription_start: new Date().toISOString(),
          subscription_end: addDays(new Date(), 7).toISOString() // Default 7 days test
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success(tr("신규 회원사가 등록되었습니다. (7일 테스트 기간 적용)", "New tenant registered. (7-day test period applied)"));
      setIsCreateOpen(false);
      setNewName("");
      setNewPlan("free");
      fetchTenants();
    } catch (err: any) {
      console.error("Error creating tenant:", err);
      toast.error(tr("등록 중 오류가 발생했습니다.", "An error occurred while registering."));
    } finally {
      setSubmitting(false);
    }
  };

  const setDuration = (months: number | 'test') => {
    // Current logical end date as base, but if expired, use today
    const currentEnd = selectedTenant?.subscription_end ? new Date(selectedTenant.subscription_end) : null;
    const baseDate = (currentEnd && !isAfter(new Date(), currentEnd))
      ? currentEnd
      : new Date();

    let newDate;
    if (months === 'test') {
      newDate = addDays(new Date(), 7);
    } else {
      newDate = addMonths(baseDate, months);
    }
    setEditEnd(newDate);
  };

  const handleUpdateSubscription = async () => {
    if (!selectedTenant) return;

    try {
      setSubmitting(true);
      const updateData: any = {
        plan: editPlan,
        status: editStatus,
        subscription_end: editEnd ? editEnd.toISOString() : null, // Support Indefinite (null)
      };

      const { error } = await supabase
        .from('tenants')
        .update(updateData)
        .eq('id', selectedTenant.id);

      if (error) {
        console.error("Detailed Supabase Error:", error);
        throw error;
      }

      toast.success(`${selectedTenant.name} ${tr("구독 정보가 업데이트되었습니다.", "subscription info has been updated.")}`);
      setIsSubscriptionOpen(false);
      setSelectedTenant(null);
      fetchTenants();
    } catch (err: any) {
      console.error("Error in handleUpdateSubscription:", err);
      if (err.message?.includes("status") || err.code === "PGRST204") {
        toast.error(tr("DB에 필드가 없습니다. SQL을 실행해 주세요!", "Missing DB fields. Please run SQL migration."));
      } else {
        toast.error(`${tr("업데이트 중 오류", "Update error")}: ${err.message || tr("알 수 없는 오류", "Unknown error")}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
    </div>
  );

  if (!isSuperAdmin) {
    return <AccessDenied requiredTier="System Admin" />;
  }

  const filteredTenants = tenants.filter(tenant => 
    tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.profiles?.some(p => p.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusBadge = (tenant: TenantWithProfile) => {
    const isExpired = tenant.subscription_end && isAfter(new Date(), new Date(tenant.subscription_end));
    
    if (tenant.status === 'suspended') return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-100 font-normal">{tr("정지됨", "Suspended")}</Badge>;
    if (isExpired) return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-100 font-normal">{tr("만료됨", "Expired")}</Badge>;
    if (!tenant.subscription_end) return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-100 font-normal">{tr("무제한", "Unlimited")}</Badge>;
    return <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-100 font-normal">{tr("정상", "Active")}</Badge>;
  };

  const planLabels: Record<string, string> = {
    free: tr("PRINT (프린트 전용)", "PRINT (print only)"),
    erp_only: tr("ERP ONLY (정산 관리)", "ERP ONLY (settlement)"),
    pro: tr("PRO (통합 관리)", "PRO (all-in-one)")
  };

  const statusLabels: Record<string, string> = {
    active: tr("정상 사용 중 (Active)", "Active"),
    suspended: tr("이용 정지 (Suspended)", "Suspended")
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <PageHeader 
        title={tr("전국 화원사(Tenant) 관리", "Tenant Management")} 
        description={tr("전체 가맹점의 구독 상태와 계정 정보를 한눈에 모니터링합니다.", "Monitor subscription status and account info across all tenants.")} 
        icon={Store}
      >
        <Button 
          className="bg-slate-900 rounded-xl px-6 font-normal shadow-lg shadow-slate-200 text-white border-0"
          onClick={() => setIsCreateOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" /> {tr("신규 화원사 수동 등록", "Register New Tenant")}
        </Button>
      </PageHeader>

      <Card className="border-none shadow-xl shadow-slate-100 bg-white/70 backdrop-blur-md rounded-3xl overflow-hidden">
        <CardHeader className="pb-4 pt-8 px-8 border-0">
          <div className="flex flex-col md:flex-row gap-6 justify-between items-center">
             <div className="relative w-full md:w-96">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <Input
                  type="search"
                  placeholder={tr("상호명, 이메일로 검색...", "Search by shop name or email...")}
                  className="pl-11 h-12 bg-slate-50/50 border-slate-100 rounded-2xl focus:ring-1 focus:ring-slate-200 transition-all font-normal focus:bg-white text-slate-900 border"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="h-12 px-5 rounded-2xl border-slate-100 font-normal bg-white hover:bg-slate-50 text-slate-700">
                  <Filter className="h-4 w-4 mr-2 text-slate-400" /> {tr("상세 필터", "Advanced Filter")}
                </Button>
                <Button variant="ghost" className="h-12 w-12 rounded-2xl border border-slate-100" onClick={fetchTenants} disabled={loading}>
                  <RefreshCw className={cn("h-5 w-5 text-slate-400", loading && "animate-spin")} />
                </Button>
              </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 border-0">
          <div className="border-t border-slate-50">
            <Table>
              <TableHeader className="bg-slate-50/30">
                <TableRow className="hover:bg-transparent border-slate-50 border-b-0">
                  <TableHead className="px-8 font-medium text-slate-600 py-5 uppercase tracking-wider text-[11px]">{tr("화원사 상호명", "Shop Name")}</TableHead>
                  <TableHead className="font-medium text-slate-600 py-5 uppercase tracking-wider text-[11px]">{tr("서비스 플랜", "Service Plan")}</TableHead>
                  <TableHead className="font-medium text-slate-600 py-5 uppercase tracking-wider text-[11px]">{tr("마스터 계정", "Master Account")}</TableHead>
                  <TableHead className="font-medium text-slate-600 py-5 uppercase tracking-wider text-[11px]">{tr("구독 상태/만료일", "Subscription/Expiry")}</TableHead>
                  <TableHead className="font-medium text-slate-600 py-5 uppercase tracking-wider text-[11px]">{tr("고객수/매출", "Customers/Sales")}</TableHead>
                  <TableHead className="text-right px-8 font-medium text-slate-600 py-5 uppercase tracking-wider text-[11px]">{tr("액션", "Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6} className="h-20 text-center">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-200 border-0" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredTenants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center border-0">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Store className="h-12 w-12 mb-3 opacity-10" />
                        <p className="font-normal text-slate-400">{tr("등록된 화원사가 없습니다.", "No registered tenants.")}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredTenants.map((tenant) => (
                  <TableRow key={tenant.id} className="group hover:bg-slate-50/50 transition-colors border-slate-50 border-0">
                    <TableCell className="px-8 py-5 border-0">
                       <div className="flex flex-col">
                         <span className="font-normal text-slate-900 leading-tight text-base font-semibold">{tenant.name}</span>
                         <span className="text-[10px] font-mono text-slate-400 mt-1 uppercase">{tenant.id.substring(0, 8)}</span>
                       </div>
                    </TableCell>
                    <TableCell className="border-0">
                      <Badge className={cn(
                        "rounded-lg font-normal border-0 px-2.5 py-1 text-xs",
                        tenant.plan === 'pro' ? "bg-blue-50 text-blue-600" : 
                        tenant.plan === 'erp_only' ? "bg-emerald-50 text-emerald-600" :
                        "bg-slate-100 text-slate-500"
                      )}>
                        {tenant.plan?.toUpperCase() || 'FREE'}
                      </Badge>
                    </TableCell>
                    <TableCell className="border-0">
                       <div className="flex items-center gap-2">
                         <Mail className="h-3.5 w-3.5 opacity-20" />
                         <span className="text-slate-700 font-normal">{tenant.profiles?.find(p => p.role === 'tenant_admin')?.email || tenant.profiles?.[0]?.email || 'N/A'}</span>
                       </div>
                    </TableCell>
                    <TableCell className="border-0">
                      <div className="flex flex-col gap-1 items-start">
                        {getStatusBadge(tenant)}
                        <span className="text-[10px] text-slate-500 font-normal flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {tenant.subscription_end ? format(new Date(tenant.subscription_end), 'yyyy-MM-dd') : tr('기한 없음 (Indefinite)', 'No expiry (Indefinite)')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="border-0">
                       <span className="text-xs font-normal text-slate-300">- / -</span>
                    </TableCell>
                    <TableCell className="text-right px-8 border-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger className={cn(
                          buttonVariants({ variant: "ghost", size: "icon" }),
                          "h-9 w-9 rounded-xl hover:bg-slate-100 transition-colors border-0"
                        )}>
                          <MoreHorizontal className="h-4 w-4 text-slate-400" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl border-slate-100 p-1">
                          <DropdownMenuItem className="font-normal text-sm p-2.5 cursor-pointer text-slate-700">
                            {tr("상세 보기", "View Details")}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="font-normal text-sm p-2.5 cursor-pointer text-slate-700"
                            onClick={() => {
                              setSelectedTenant(tenant);
                              setEditPlan(tenant.plan || 'free');
                              setEditStatus(tenant.status || 'active');
                              setEditEnd(tenant.subscription_end ? new Date(tenant.subscription_end) : undefined);
                              setIsSubscriptionOpen(true);
                            }}
                          >
                            {tr("구독 및 기한 관리", "Manage Subscription")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="font-normal text-sm p-2.5 cursor-pointer text-indigo-600 font-bold hover:text-indigo-700"
                            onClick={() => window.dispatchEvent(new CustomEvent('open-chat', { detail: { partnerId: tenant.id, partnerName: tenant.name } }))}
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            {tr("실시간 채팅 시작", "Start Live Chat")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 신규 등록 다이얼로그 */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-8 border-none shadow-2xl bg-white border-0">
          <DialogHeader className="border-0">
            <DialogTitle className="font-semibold text-xl text-slate-900">{tr("신규 회원사 수동 등록", "Manual Tenant Registration")}</DialogTitle>
            <DialogDescription className="font-normal pb-4 text-slate-500 border-0">
              {tr("수동으로 가맹점을 등록합니다. 등록 후 마스터 계정을 연결할 수 있습니다.", "Register tenant manually. You can link a master account after registration.")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="font-normal text-slate-600 text-xs ml-1 border-0">{tr("화원사 상호명", "Shop Name")}</Label>
              <Input
                id="name"
                placeholder={tr("예: 릴리맥 강남점", "e.g. Lilymag Gangnam")}
                className="rounded-2xl h-12 font-normal bg-slate-50/50 border-slate-100 text-slate-900 focus:bg-white border"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-3 sm:justify-end mt-4 border-0">
            <Button variant="ghost" className="rounded-2xl px-6 text-slate-500 border-0" onClick={() => setIsCreateOpen(false)}>{tr("취소", "Cancel")}</Button>
            <Button 
              className="bg-slate-900 rounded-2xl px-8 font-normal shadow-lg shadow-slate-200 text-white border-0" 
              onClick={handleCreateTenant}
              disabled={submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin border-0" />}
              {tr("7일 테스트 계정 생성", "Create 7-day trial account")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSubscriptionOpen} onOpenChange={setIsSubscriptionOpen}>
        <DialogContent className="sm:max-w-xl rounded-3xl p-8 border-none shadow-2xl bg-white max-h-[90vh] overflow-y-auto border-0">
          <DialogHeader className="border-0">
            <DialogTitle className="font-semibold text-xl text-slate-900">{tr("구독 연장 및 플랜 설정", "Subscription Extension & Plan")}</DialogTitle>
            <DialogDescription className="font-normal pb-4 text-slate-500 border-0">
              <span className="text-slate-900 font-semibold">{selectedTenant?.name}</span>{tr("님의 구독 정보를 직접 관리합니다.", " subscription will be managed directly.")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label className="font-normal text-slate-600 text-xs ml-1 border-0">{tr("서비스 플랜 선택", "Select Service Plan")}</Label>
              <Select value={editPlan} onValueChange={(val) => setEditPlan(val || 'free')}>
                <SelectTrigger className="rounded-2xl h-12 font-normal bg-slate-50/50 border-slate-100 text-slate-900 focus:bg-white border">
                  <SelectValue placeholder={tr("플랜 선택", "Select plan")}>{planLabels[editPlan]}</SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-0 shadow-xl bg-white">
                  <SelectItem value="free" className="font-normal text-slate-900">{tr("PRINT (프린트 전용)", "PRINT (print only)")}</SelectItem>
                  <SelectItem value="erp_only" className="font-normal text-slate-900">{tr("ERP ONLY (정산 관리)", "ERP ONLY (settlement)")}</SelectItem>
                  <SelectItem value="pro" className="font-normal text-slate-900">{tr("PRO (통합 관리)", "PRO (all-in-one)")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-3">
               <Label className="font-normal text-slate-600 text-xs ml-1 border-0">{tr("기간 및 가격 설정 (Preset)", "Duration & Pricing (Preset)")}</Label>
               <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="h-10 rounded-xl font-normal text-xs justify-start px-3 text-slate-700 border-slate-200 border" onClick={() => setDuration(1)}>
                    {tr("1개월", "1 month")} ({PRICING[editPlan as keyof typeof PRICING]?.["1m"]?.toLocaleString()}{tr("원", "")})
                  </Button>
                  <Button variant="outline" className="h-10 rounded-xl font-normal text-xs justify-start px-3 text-slate-700 border-slate-200 border" onClick={() => setDuration(3)}>
                    {tr("3개월", "3 months")} ({PRICING[editPlan as keyof typeof PRICING]?.["3m"]?.toLocaleString()}{tr("원", "")})
                  </Button>
                  <Button variant="outline" className="h-10 rounded-xl font-normal text-xs justify-start px-3 text-slate-700 border-slate-200 border" onClick={() => setDuration(6)}>
                    {tr("6개월", "6 months")} ({PRICING[editPlan as keyof typeof PRICING]?.["6m"]?.toLocaleString()}{tr("원", "")})
                  </Button>
                  <Button variant="outline" className="h-10 rounded-xl font-normal text-xs justify-start px-3 text-slate-700 border-slate-200 border" onClick={() => setDuration(12)}>
                    {tr("12개월", "12 months")} ({PRICING[editPlan as keyof typeof PRICING]?.["12m"]?.toLocaleString()}{tr("원", "")})
                  </Button>
               </div>
                <div className="flex flex-wrap gap-2 mt-1">
                  <Button variant="outline" className="flex-1 min-w-[140px] h-10 rounded-xl font-normal text-xs border-blue-200 text-blue-700 bg-blue-50/30 hover:bg-blue-50 border" onClick={() => setDuration('test')}>
                    {tr("7일 무료 테스트 기간", "7-day free trial")}
                  </Button>
                  {isSuperAdmin && (
                    <Button variant="outline" className="flex-1 h-10 rounded-xl font-normal text-xs border-amber-200 text-amber-700 bg-amber-50/30 hover:bg-amber-50 border" onClick={() => setEditEnd(undefined)}>
                      {tr("구독 즉시 만료 (종료됨)", "Expire immediately (ended)")}
                    </Button>
                  )}
                  {isSuperAdmin && (
                    <Button variant="outline" className="flex-1 h-10 rounded-xl font-normal text-xs border-emerald-200 text-emerald-700 bg-emerald-50/30 hover:bg-emerald-50 border" onClick={() => setEditEnd(new Date(2099, 11, 31, 23, 59, 59))}>
                      {tr("무제한 사용권 (Unlimited)", "Unlimited license")}
                    </Button>
                  )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 items-start border-0">
              <div className="grid gap-2 border-0">
                <Label className="font-normal text-slate-600 text-xs ml-1 border-0">{tr("계정 상태", "Account Status")}</Label>
                <Select value={editStatus} onValueChange={(val) => setEditStatus(val || 'active')}>
                  <SelectTrigger className="rounded-2xl h-12 font-normal bg-slate-50/50 border-slate-100 text-slate-900 focus:bg-white border">
                    <SelectValue placeholder={tr("상태 선택", "Select status")}>{statusLabels[editStatus]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-0 shadow-xl bg-white">
                    <SelectItem value="active" className="font-normal text-slate-900 border-0">{tr("정상 사용 중 (Active)", "Active")}</SelectItem>
                    <SelectItem value="suspended" className="font-normal text-rose-600 border-0">{tr("이용 정지 (Suspended)", "Suspended")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2 border-0">
                <Label className="font-normal text-slate-600 text-xs ml-1 border-0">{tr("최종 만료일 선택", "Select final expiry date")}</Label>
                <div className="relative">
                  <Popover>
                    <PopoverTrigger className={cn(
                        buttonVariants({ variant: "outline" }),
                        "w-full rounded-2xl h-12 justify-start text-left bg-slate-50/50 border-slate-100 border px-4",
                        editEnd ? "text-slate-900 font-semibold" : "text-slate-400 font-normal"
                      )}>
                        <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                        {editEnd ? (baseLocale === "ko" ? format(editEnd, "yyyy년 MM월 dd일", { locale: ko }) : format(editEnd, "yyyy-MM-dd")) : <span className="text-red-500 font-semibold">{tr("만료됨 (기한 정보 없음)", "Expired (no expiry info)")}</span>}
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-2xl border-0 shadow-2xl bg-white" align="start">
                      <Calendar
                        mode="single"
                        selected={editEnd}
                        onSelect={setEditEnd}
                        initialFocus
                        locale={ko}
                        className="rounded-2xl border-0"
                      />
                    </PopoverContent>
                  </Popover>
                  {editEnd && (
                    <button 
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                      onClick={() => setEditEnd(undefined)}
                      type="button"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {editEnd ? (
              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 mt-2 flex items-center justify-between">
                <span className="text-emerald-700 text-xs font-medium">{tr("업데이트될 만료일", "Updated expiry date")}</span>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-900 font-bold text-sm">
                    {editEnd.getFullYear() >= 2099 ? tr('무제한 사용권 (Unlimited)', 'Unlimited license') : format(editEnd, "yyyy-MM-dd", { locale: ko })}
                  </span>
                  <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100 mt-2 flex items-center justify-between">
                <span className="text-red-600 text-xs font-medium">{tr("구독 즉시 만료 적용", "Apply immediate expiry")}</span>
                <div className="flex items-center gap-2 font-bold text-sm text-red-700">
                  <span>{tr("현 시각부터 즉시 차단", "Blocked immediately from now")}</span>
                  <AlertCircle className="h-4 w-4" />
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-3 sm:justify-end mt-4 border-0">
            <Button variant="ghost" className="rounded-2xl px-6 text-slate-500 border-0" onClick={() => setIsSubscriptionOpen(false)}>{tr("취소", "Cancel")}</Button>
            <Button 
              className="bg-slate-900 rounded-2xl px-8 font-normal shadow-xl shadow-slate-300 text-white border-0" 
              onClick={handleUpdateSubscription}
              disabled={submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin border-0" />}
              {tr("구독 정보 저장", "Save subscription")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
