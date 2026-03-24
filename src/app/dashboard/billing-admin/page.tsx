"use client";

import React, { useState, useEffect } from "react";
import { 
    CreditCard, TrendingUp, Users, DollarSign, Download, Calendar, 
    Wallet, ArrowUpRight, ArrowDownLeft, CheckCircle2, AlertCircle, Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

export default function BillingAdminPage() {
    const supabase = createClient();
    const { profile, isLoading: authLoading } = useAuth();
    const isSuperAdmin = profile?.role === 'super_admin';

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalRevenue: 0,
        networkCommission: 0,
        totalFloat: 0,
        activeShops: 0
    });
    const [tenants, setTenants] = useState<any[]>([]);
    const [withdrawals, setWithdrawals] = useState<any[]>([]);
    const [search, setSearch] = useState("");

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
                .select('*, tenant:tenants(id, name, logo_url)');
            
            setTenants(walletData || []);

            // 2. Fetch withdrawal requests
            const { data: reqs } = await supabase
                .from('withdrawal_requests')
                .select('*, tenant:tenants(name)')
                .order('created_at', { ascending: false });
            
            setWithdrawals(reqs || []);

            // 3. Calculate Stats
            const { data: networkOrders } = await supabase.from('external_orders').select('platform_fee');
            const commission = networkOrders?.reduce((acc, curr) => acc + (curr.platform_fee || 0), 0) || 0;
            const float = walletData?.reduce((acc, curr) => acc + (curr.balance || 0), 0) || 0;

            setStats({
                totalRevenue: 14250000, // Placeholder for subscription revenue
                networkCommission: commission,
                totalFloat: float,
                activeShops: walletData?.length || 0
            });

        } catch (error) {
            console.error(error);
            toast.error("관리자 데이터를 불러오는데 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleRecharge = async (tenantId: string, currentBalance: number) => {
        const amountStr = prompt("충전할 금액을 입력하세요 (예: 100000)");
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
                metadata: { admin_id: profile?.id, note: '관리자 수동 충전' }
            }]);

            toast.success("예치금이 충전되었습니다.");
            fetchAdminData();
        } catch (error) {
            console.error(error);
            toast.error("충전 실패");
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
                // Already deducted from balance when requested? 
                // Wait, I should implement the deduction logic on request.
                toast.success("지급 완료 처리되었습니다.");
            } else if (status === 'rejected') {
                // Refund back to wallet
                const { data: wallet } = await supabase.from('wallets').select('balance').eq('tenant_id', tenantId).single();
                await supabase.from('wallets').update({ balance: (wallet?.balance || 0) + amount }).eq('tenant_id', tenantId);
                toast.info("반려 및 환불 처리되었습니다.");
            }

            fetchAdminData();
        } catch (error) {
            console.error(error);
        }
    };

    if (authLoading) return null;
    if (!isSuperAdmin) return <AccessDenied requiredTier="System Admin" />;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
            <PageHeader 
                title="💳 정산 관제 및 예치금 관리" 
                description="협력사 네트워크의 전체 자금 흐름과 수수료 수익을 관리합니다." 
                icon={TrendingUp}
            >
               <Button variant="outline" className="border-slate-200 rounded-xl">
                  <Download className="h-4 w-4 mr-2" /> 정산 내역 다운로드
               </Button>
            </PageHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-0 shadow-sm bg-indigo-50/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-indigo-600 uppercase tracking-wider">네트워크 누적 수수료</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-indigo-900">₩{stats.networkCommission.toLocaleString()}</div>
                        <p className="text-[10px] text-indigo-500/80 mt-1">2% 중개 수수료 수익 요약</p>
                    </CardContent>
                </Card>
                
                <Card className="border-0 shadow-sm bg-emerald-50/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-emerald-600 uppercase tracking-wider">전체 예치금 총액 (Float)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-emerald-900">₩{stats.totalFloat.toLocaleString()}</div>
                        <p className="text-[10px] text-emerald-500/80 mt-1">현재 사장님 계좌에 머물고 있는 자금</p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-rose-50/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-rose-600 uppercase tracking-wider">미지급 정산 대기</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-rose-900">₩{withdrawals.filter(w=>w.status==='pending').reduce((a,b)=>a+b.amount,0).toLocaleString()}</div>
                        <p className="text-[10px] text-rose-500/80 mt-1">{withdrawals.filter(w=>w.status==='pending').length}건의 출금 요청 대기 중</p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-slate-50/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-slate-600 uppercase tracking-wider">네트워크 가맹점</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-slate-900">{stats.activeShops} Places</div>
                        <p className="text-[10px] text-slate-500/80 mt-1">지갑이 활성화된 회원사</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="wallets" className="space-y-4">
                <TabsList className="bg-white p-1 h-12 rounded-2xl border border-slate-100 shadow-sm w-fit">
                    <TabsTrigger value="wallets" className="rounded-xl px-6 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                        <Wallet className="w-4 h-4 mr-2" /> 회원사 예치금 관리
                    </TabsTrigger>
                    <TabsTrigger value="requests" className="rounded-xl px-6 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                        <AlertCircle className="w-4 h-4 mr-2" /> 출금 승인 대기
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="wallets">
                    <Card className="border-0 shadow-xl rounded-3xl overflow-hidden bg-white">
                        <div className="p-4 border-b border-slate-50 flex items-center gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input 
                                    placeholder="회원사 이름 검색..." 
                                    className="pl-10 rounded-xl border-slate-100 w-full"
                                    value={search}
                                    onChange={(e)=>setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow>
                                    <TableHead>회원사명</TableHead>
                                    <TableHead className="text-right">현재 잔액</TableHead>
                                    <TableHead>마지막 업데이트</TableHead>
                                    <TableHead className="text-right pr-6">동작</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tenants.filter(t => t.tenant?.name?.includes(search)).map(t => (
                                    <TableRow key={t.tenant_id} className="hover:bg-slate-50/50 h-16">
                                        <TableCell className="font-semibold text-slate-800">
                                            {t.tenant?.name}
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-indigo-600 underline decoration-indigo-200 decoration-2 underline-offset-4">
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
                                                예치금 충전
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                <TabsContent value="requests">
                    <Card className="border-0 shadow-xl rounded-3xl overflow-hidden bg-white">
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow>
                                    <TableHead>신청일시</TableHead>
                                    <TableHead>회원사</TableHead>
                                    <TableHead className="text-right">신청금액</TableHead>
                                    <TableHead>입금정보</TableHead>
                                    <TableHead className="text-center">상태</TableHead>
                                    <TableHead className="text-right pr-6">승인</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {withdrawals.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-40 text-center text-slate-400 font-light italic">
                                            현재 처리할 출금 요청이 없습니다.
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
                                                            지급 완료
                                                        </Button>
                                                        <Button 
                                                            variant="outline"
                                                            size="sm" 
                                                            className="text-rose-600 border-rose-100 hover:bg-rose-50 rounded-xl"
                                                            onClick={() => handleWithdrawalStatus(req.id, req.tenant_id, req.amount, 'rejected')}
                                                        >
                                                            거절
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
            </Tabs>
        </div>
    );
}
