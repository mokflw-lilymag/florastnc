"use client";
import { getMessages } from "@/i18n/getMessages";

import React, { useState, useEffect } from "react";
import { 
    CreditCard, TrendingUp, Users, DollarSign, Download, Calendar, 
    Wallet, ArrowUpRight, ArrowDownLeft, CheckCircle2, AlertCircle, Search,
    FileSpreadsheet, Cpu, AlertTriangle, Eye, RefreshCw, Loader2
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { AccessDenied } from "@/components/access-denied";
import { createClient } from "@/utils/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import Link from "next/link";
import { pickUiText } from "@/i18n/pick-ui-text";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExpenseManagement } from "./components/expense-management";

export default function BillingAdminPage() {
    const supabase = createClient();
    const { profile, isLoading: authLoading } = useAuth();
    const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === '본사 관리자';

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        networkCommission: 0,
        totalFloat: 0,
        activeShops: 0,
        pendingCancellationsCount: 0
    });
    const [tenants, setTenants] = useState<any[]>([]);
    const [withdrawals, setWithdrawals] = useState<any[]>([]);
    const [cancellations, setCancellations] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [isExportingExcel, setIsExportingExcel] = useState(false);

    const locale = usePreferredLocale();
    const tf = getMessages(locale).tenantFlows;
    const baseLocale = toBaseLocale(locale);

    useEffect(() => {
        if (isSuperAdmin) {
            fetchAdminData();
        }
    }, [isSuperAdmin]);

    const fetchAdminData = async () => {
        setLoading(true);
        try {
            // 1. Fetch all wallets and tenants
            const { data: walletData } = await supabase
                .from('wallets')
                .select('*, tenant:tenants(id, name, logo_url, plan, subscription_status)');
            
            setTenants(walletData || []);

            // 2. Fetch withdrawal requests
            const { data: reqs } = await supabase
                .from('withdrawal_requests')
                .select('*, tenant:tenants(name)')
                .order('created_at', { ascending: false });
            
            setWithdrawals(reqs || []);

            // 3. Fetch pending cancellations
            const { data: cancels } = await supabase
                .from('subscription_cancellations')
                .select('*, tenant:tenants(id, name, subscription_end)')
                .order('created_at', { ascending: false });
            
            setCancellations(cancels || []);

            // 4. Calculate Stats
            const { data: networkOrders } = await supabase.from('external_orders').select('platform_fee');
            const commission = networkOrders?.reduce((acc, curr) => acc + (curr.platform_fee || 0), 0) || 0;
            const float = walletData?.reduce((acc, curr) => acc + (curr.balance || 0), 0) || 0;
            
            const pendingCancels = cancels?.filter(c => c.status === 'pending').length || 0;

            setStats({
                networkCommission: commission,
                totalFloat: float,
                activeShops: walletData?.length || 0,
                pendingCancellationsCount: pendingCancels
            });

        } catch (error) {
            console.error(error);
            toast.error(tf.f00965);
        } finally {
            setLoading(false);
        }
    };

    // Cancellation Process approvals
    const handleApproveCancellation = async (cancelId: string, tenantId: string, printerSn: string | null) => {
        if (!confirm("이 가맹점의 해지 신청을 최종 승인하시겠습니까? 즉시 요금제가 무료로 강제 원복됩니다.")) return;

        try {
            // 1. Update cancellation status
            const { error: cancelError } = await supabase
                .from("subscription_cancellations")
                .update({ status: "completed" })
                .eq("id", cancelId);
            
            if (cancelError) throw cancelError;

            // 2. Reset tenant plan to free
            const { error: tenantError } = await supabase
                .from("tenants")
                .update({
                    plan: "free",
                    subscription_status: "none",
                    subscription_end: null
                })
                .eq("id", tenantId);
            
            if (tenantError) throw tenantError;

            // 3. If printer serial is associated, update printer lifecycle status back to 'available' and unbind tenant
            if (printerSn) {
                const { data: device } = await supabase
                    .from("tenant_devices")
                    .select("history_logs")
                    .eq("serial_number", printerSn)
                    .maybeSingle();

                const updatedLogs = [
                    ...(device?.history_logs || []),
                    { action: "returned", date: new Date().toISOString(), note: "구독 해지 완료에 따른 정상 반납 회수 처리" }
                ];

                await supabase
                    .from("tenant_devices")
                    .update({
                        status: "available",
                        tenant_id: null,
                        history_logs: updatedLogs
                    })
                    .eq("serial_number", printerSn);
            }

            toast.success("구독 해지 승인이 완료되었습니다. 지점의 멤버십이 무료(Free) 등급으로 즉시 환원되었습니다.");
            fetchAdminData();
        } catch (err: any) {
            toast.error("해지 승인 처리 오류", { description: err.message });
        }
    };

    // Export Tax Excel sheet (forex adjustments + toss domestic 10% vs stripe zero VAT)
    const handleExportTaxExcel = async () => {
        setIsExportingExcel(true);
        try {
            // Simulated transaction records for subscription billing (Toss + Stripe)
            // Fetch logs from Supabase
            const { data: payments } = await supabase
                .from("wallet_transactions")
                .select("*, tenant:tenants(name, subscription_status)")
                .order("created_at", { ascending: false });

            if (!payments || payments.length === 0) {
                toast.error("엑셀로 추출할 정산/결제 이력이 존재하지 않습니다.");
                setIsExportingExcel(false);
                return;
            }

            // CSV/Excel formatting structure
            let csvContent = "\uFEFF"; // BOM for Excel Korean encoding
            csvContent += "결제시각,가맹점명,구분,총결제금액(원화),공급가액,부가세(10%),Stripe 수수료(원화),환전 차손익 보정액,정산유형,증빙구분\n";

            payments.forEach((p) => {
                const dateStr = format(parseISO(p.created_at), "yyyy-MM-dd HH:mm");
                const shopName = p.tenant?.name || "알수없음";
                const amt = p.amount;
                const isStripe = p.metadata?.provider === "stripe";

                let vat = 0;
                let supplyAmt = amt;
                let stripeFee = 0;
                let forexAdjustment = 0;
                let taxType = "국내 과세 (Toss)";
                let receiptType = "신용카드영수증";

                if (isStripe) {
                    // Foreign Stripe payment logic
                    vat = 0; // 0% VAT for export software
                    supplyAmt = amt;
                    stripeFee = Math.round(amt * 0.034); // Stripe standard processing fee representation (3.4%)
                    forexAdjustment = Math.round(amt * 0.012); // Forex difference calculation (approx 1.2% buffer loss)
                    taxType = "국외 영세율 (Stripe)";
                    receiptType = "외화수출정산";
                } else {
                    // Toss payment has standard 10% VAT inclusion
                    vat = Math.round(amt / 11);
                    supplyAmt = amt - vat;
                }

                csvContent += `${dateStr},${shopName},구독료,${amt},${supplyAmt},${vat},${stripeFee},${forexAdjustment},${taxType},${receiptType}\n`;
            });

            // Trigger file download
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `Floxync_Tax_Report_${format(new Date(), "yyyyMMdd")}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success("국세청 세무 신고용 통합 정산 엑셀 파일이 성공적으로 다운로드되었습니다.");
        } catch (err: any) {
            toast.error("엑셀 다운로드 오류", { description: err.message });
        } finally {
            setIsExportingExcel(false);
        }
    };

    const handleRecharge = async (tenantId: string, currentBalance: number) => {
        const amountStr = prompt(tf.f02032);
        if (!amountStr) return;
        const amount = parseInt(amountStr);
        if (isNaN(amount) || amount <= 0) return;

        try {
            const { error: updateError } = await supabase
                .from('wallets')
                .update({ balance: currentBalance + amount })
                .eq('tenant_id', tenantId);

            if (updateError) throw updateError;

            await supabase.from('wallet_transactions').insert([{
                tenant_id: tenantId,
                amount: amount,
                type: 'recharge',
                status: 'completed',
                metadata: { admin_id: profile?.id, note: tf.f00966 }
            }]);

            toast.success(tf.f01601);
            fetchAdminData();
        } catch (error) {
            console.error(error);
            toast.error(tf.f02031);
        }
    };

    const handleWithdrawalStatus = async (id: string, tenantId: string, amount: number, status: string) => {
        try {
            const { error } = await supabase
                .from('withdrawal_requests')
                .update({ status: status })
                .eq('id', id);

            if (error) throw error;

            if (status === 'paid') {
                toast.success(tf.f01901);
            } else if (status === 'rejected') {
                const { data: wallet } = await supabase.from('wallets').select('balance').eq('tenant_id', tenantId).single();
                await supabase.from('wallets').update({ balance: (wallet?.balance || 0) + amount }).eq('tenant_id', tenantId);
                toast.info(tf.f01223);
            }

            fetchAdminData();
        } catch (error) {
            console.error(error);
        }
    };

    if (authLoading) return null;
    if (!isSuperAdmin) return <AccessDenied requiredTier="System Admin" />;

    const walletPageTitle = pickUiText(
        baseLocale,
        "본사 세무 · 지출 · 가맹 관리",
        "HQ Tax · Billing · Cancellation",
    );
    const walletPageDesc = pickUiText(
        baseLocale,
        "본사 지출 장부, 프린터 물류 재고, 해약 위약 정산 및 해외 영세율 부가세 자료 엑셀 추출입니다.",
        "Management of expenses, devices inventory, and tax reportings for HQ admin.",
    );

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500 text-slate-900">
            <PageHeader 
                title={walletPageTitle} 
                description={walletPageDesc} 
                icon={Wallet}
            >
                <div className="flex gap-3">
                    <Button 
                        onClick={handleExportTaxExcel}
                        disabled={isExportingExcel}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
                    >
                        {isExportingExcel ? <Loader2 className="h-4 w-4 animate-spin" /> : <><FileSpreadsheet className="mr-2 h-4 w-4" /> 국세청 세무 엑셀 추출</>}
                    </Button>
                    <Link
                        href="/dashboard/admin/billing"
                        className={buttonVariants({ variant: "outline", className: "border-slate-200 rounded-xl" })}
                    >
                        SaaS 요금제 락 설정 →
                    </Link>
                </div>
            </PageHeader>

            {stats.pendingCancellationsCount > 0 && (
                <Alert className="rounded-2xl border-red-100 bg-red-50/50 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                        <AlertTitle className="text-sm font-extrabold text-red-900">
                            가맹점 해지/해약 신청 접수 대기 중
                        </AlertTitle>
                        <AlertDescription className="text-xs text-red-800/90 mt-1">
                            현재 반납 장비 검수 및 해지 처리가 필요한 대기 건이 <b>{stats.pendingCancellationsCount}건</b> 있습니다. '해지 신청 현황' 탭에서 확인해 주십시오.
                        </AlertDescription>
                    </div>
                </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-0 shadow-sm bg-indigo-50/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{tf.f01045}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-indigo-900">₩{stats.networkCommission.toLocaleString()}</div>
                        <p className="text-[10px] text-indigo-500/80 mt-1">누적 충전/결제 실적</p>
                    </CardContent>
                </Card>
                
                <Card className="border-0 shadow-sm bg-emerald-50/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-emerald-600 uppercase tracking-wider">가맹점 예치 총액</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-emerald-900">₩{stats.totalFloat.toLocaleString()}</div>
                        <p className="text-[10px] text-emerald-500/80 mt-1">네트워크 유통 가용 잔액</p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-rose-50/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-rose-600 uppercase tracking-wider">출금 승인 대기</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-rose-900">₩{withdrawals.filter(w=>w.status==='pending').reduce((a,b)=>a+b.amount,0).toLocaleString()}</div>
                        <p className="text-[10px] text-rose-500/80 mt-1">{withdrawals.filter(w=>w.status==='pending').length}{tf.f00901}</p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-slate-50/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-slate-600 uppercase tracking-wider">활성 가맹점 수</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-slate-900">{stats.activeShops} Places</div>
                        <p className="text-[10px] text-slate-500/80 mt-1">시스템 활성 가맹 지점</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="wallets" className="space-y-4">
                <TabsList className="bg-white p-1 h-12 rounded-2xl border border-slate-100 shadow-sm w-fit flex flex-wrap">
                    <TabsTrigger value="wallets" className="rounded-xl px-6 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                        <Wallet className="w-4 h-4 mr-2" /> 가맹 예치 지갑
                    </TabsTrigger>
                    <TabsTrigger value="requests" className="rounded-xl px-6 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                        <AlertCircle className="w-4 h-4 mr-2" /> 가맹 출금 요청
                    </TabsTrigger>
                    <TabsTrigger value="cancellations" className="rounded-xl px-6 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                        <AlertTriangle className="w-4 h-4 mr-2" /> 해지 신청 현황
                    </TabsTrigger>
                    <TabsTrigger value="expenses" className="rounded-xl px-6 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                        <DollarSign className="w-4 h-4 mr-2" /> 본사 지출/임대 대장
                    </TabsTrigger>
                </TabsList>

                {/* 1. Wallet tab */}
                <TabsContent value="wallets">
                    <Card className="border-0 shadow-xl rounded-3xl overflow-hidden bg-white">
                        <div className="p-4 border-b border-slate-50 flex items-center gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input 
                                    placeholder={tf.f02232} 
                                    className="pl-10 rounded-xl border-slate-100 w-full"
                                    value={search}
                                    onChange={(e)=>setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow>
                                    <TableHead>{tf.f02233}</TableHead>
                                    <TableHead>현재 등급</TableHead>
                                    <TableHead className="text-right">{tf.f02189}</TableHead>
                                    <TableHead>{tf.f01138}</TableHead>
                                    <TableHead className="text-right pr-6">{tf.f01106}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tenants.filter(t => t.tenant?.name?.includes(search)).map(t => (
                                    <TableRow key={t.tenant_id} className="hover:bg-slate-50/50 h-16">
                                        <TableCell className="font-semibold text-slate-800">
                                            {t.tenant?.name}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={t.tenant?.subscription_status === 'pending_cancel' ? 'destructive' : 'secondary'}>
                                                {t.tenant?.plan} {t.tenant?.subscription_status === 'pending_cancel' && ' (해지대기)'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-indigo-600">
                                            ₩{t.balance.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-400 font-light">
                                            {format(parseISO(t.updated_at), 'yyyy/MM/dd HH:mm')}
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <Button 
                                                size="sm" 
                                                className="bg-indigo-600 hover:bg-indigo-700 rounded-xl px-4"
                                                onClick={() => handleRecharge(t.tenant_id, t.balance)}
                                            >
                                                {tf.f01600}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                {/* 2. Withdrawal request tab */}
                <TabsContent value="requests">
                    <Card className="border-0 shadow-xl rounded-3xl overflow-hidden bg-white">
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow>
                                    <TableHead>{tf.f01504}</TableHead>
                                    <TableHead>{tf.f02229}</TableHead>
                                    <TableHead className="text-right">{tf.f01503}</TableHead>
                                    <TableHead>{tf.f01723}</TableHead>
                                    <TableHead className="text-center">{tf.f00319}</TableHead>
                                    <TableHead className="text-right pr-6">{tf.f01467}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {withdrawals.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-40 text-center text-slate-400 font-light italic">
                                            {tf.f02192}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    withdrawals.map(req => (
                                        <TableRow key={req.id} className="hover:bg-slate-50/50 px-4">
                                            <TableCell className="text-xs text-slate-500 font-light italic">
                                                {format(parseISO(req.created_at), 'MM/dd HH:mm')}
                                            </TableCell>
                                            <TableCell className="font-medium">{req.tenant?.name}</TableCell>
                                            <TableCell className="text-right font-semibold text-rose-600">₩{req.amount.toLocaleString()}</TableCell>
                                            <TableCell className="text-xs">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold">{req.bank_info?.bank_name}</span>
                                                    <span className="text-slate-500">{req.bank_info?.account_number} ({req.bank_info?.account_holder})</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className="font-light">{req.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-6 space-x-2">
                                                {req.status === 'pending' && (
                                                    <>
                                                        <Button 
                                                            size="sm" 
                                                            className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                                                            onClick={() => handleWithdrawalStatus(req.id, req.tenant_id, req.amount, 'paid')}
                                                        >
                                                            {tf.f01900}
                                                        </Button>
                                                        <Button 
                                                            variant="outline"
                                                            size="sm" 
                                                            className="text-rose-600 border-rose-100 hover:bg-rose-50 rounded-xl"
                                                            onClick={() => handleWithdrawalStatus(req.id, req.tenant_id, req.amount, 'rejected')}
                                                        >
                                                            {tf.f00886}
                                                        </Button>
                                                    </>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                {/* 3. Cancellation Management Tab */}
                <TabsContent value="cancellations">
                    <Card className="border-0 shadow-xl rounded-3xl overflow-hidden bg-white">
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow>
                                    <TableHead>신청시각</TableHead>
                                    <TableHead>가맹점명</TableHead>
                                    <TableHead>요청자(IP)</TableHead>
                                    <TableHead>구분</TableHead>
                                    <TableHead>반납 프린터 S/N</TableHead>
                                    <TableHead>반송 송장 (원클릭 추적)</TableHead>
                                    <TableHead className="text-center">처리상태</TableHead>
                                    <TableHead className="text-right pr-6">가맹 해지 제어</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {cancellations.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-40 text-center text-slate-400 font-light italic">
                                            접수된 가맹점 해약 신청 건이 없습니다.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    cancellations.map(c => (
                                        <TableRow key={c.id} className="hover:bg-slate-50/50">
                                            <TableCell className="text-xs text-slate-400">
                                                {format(parseISO(c.created_at), 'yyyy/MM/dd HH:mm')}
                                            </TableCell>
                                            <TableCell className="font-bold text-slate-800">{c.tenant?.name}</TableCell>
                                            <TableCell className="text-xs text-slate-500">
                                                <div className="flex flex-col">
                                                    <span>{c.request_user_email}</span>
                                                    <span className="text-[10px] text-slate-400">IP: {c.request_ip}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={c.plan_type === 'annual' ? 'destructive' : 'secondary'}>
                                                    {c.plan_type === 'annual' ? '연간계약' : '월구독'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs font-semibold text-slate-600">
                                                {c.printer_serial_number || "해당없음"}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                {c.tracking_number ? (
                                                    <a 
                                                        href={`https://search.naver.com/search.naver?query=${c.courier_name}+${c.tracking_number}`}
                                                        target="_blank"
                                                        className="text-indigo-600 hover:text-indigo-800 underline font-bold"
                                                    >
                                                        {c.courier_name} {c.tracking_number} ↗
                                                    </a>
                                                ) : (
                                                    <span className="text-slate-400">송장없음</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={c.status === 'pending' ? 'destructive' : 'outline'}>
                                                    {c.status === 'pending' ? '승인대기' : '완료'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                {c.status === 'pending' && (
                                                    <Button 
                                                        size="sm"
                                                        className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-4"
                                                        onClick={() => handleApproveCancellation(c.id, c.tenant_id, c.printer_serial_number)}
                                                    >
                                                        해지 확정 승인
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                {/* 4. HQ Expense and Inventory Tab */}
                <TabsContent value="expenses">
                    <Card className="border-0 shadow-xl rounded-3xl p-6 bg-white">
                        <ExpenseManagement />
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
