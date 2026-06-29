"use client";
import { getMessages } from "@/i18n/getMessages";

import React, { useState, useEffect } from "react";
import { 
    CreditCard, TrendingUp, DollarSign, Wallet, ArrowUpRight, 
    CheckCircle2, FileSpreadsheet, Cpu, AlertTriangle, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/hooks/use-auth";
import { AccessDenied } from "@/components/access-denied";
import { createClient } from "@/utils/supabase/client";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";
import { ExpenseManagement } from "./components/expense-management";

export default function BillingAdminPage() {
    const supabase = createClient();
    const { profile, isLoading: authLoading } = useAuth();
    const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === '본사 관리자';

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        domesticSales: 0, // Toss
        overseasSales: 0, // Stripe
        monthlyExpenses: 0, // 지출 대장 총합
        deviceSummary: { available: 0, leased: 0, damagedOrDisposed: 0 }
    });
    const [isExportingExcel, setIsExportingExcel] = useState(false);

    const locale = usePreferredLocale();
    const tf = getMessages(locale).tenantFlows;
    const baseLocale = toBaseLocale(locale);

    useEffect(() => {
        if (isSuperAdmin) {
            fetchBillingStats();
        }
    }, [isSuperAdmin]);

    const fetchBillingStats = async () => {
        setLoading(true);
        try {
            // 1. Fetch transactions for Toss/Stripe sales calculation
            const { data: txs } = await supabase
                .from('wallet_transactions')
                .select('*')
                .eq('status', 'completed');
            
            let domestic = 0;
            let overseas = 0;

            txs?.forEach(tx => {
                const provider = tx.metadata?.provider || '';
                if (provider === 'stripe') {
                    overseas += (tx.amount || 0);
                } else {
                    domestic += (tx.amount || 0); // Default to Toss/Domestic
                }
            });

            // 2. Fetch monthly expenses
            const startOfMonthDate = format(new Date(), "yyyy-MM-01");
            const { data: expData } = await supabase
                .from('expenses')
                .select('amount')
                .gte('expense_date', startOfMonthDate);
            
            const totalExp = expData?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0;

            // 3. Fetch device logistics summary
            const { data: devices } = await supabase
                .from('tenant_devices')
                .select('status, tenant_id');

            let avail = 0;
            let leasedCount = 0;
            let bad = 0;

            devices?.forEach(d => {
                if (d.status === 'available') {
                    avail++;
                } else if (d.status === 'damaged' || d.status === 'disposed') {
                    bad++;
                }
                if (d.tenant_id) {
                    leasedCount++;
                }
            });

            setStats({
                domesticSales: domestic,
                overseasSales: overseas,
                monthlyExpenses: totalExp,
                deviceSummary: { available: avail, leased: leasedCount, damagedOrDisposed: bad }
            });

        } catch (error) {
            console.error(error);
            toast.error("통계 데이터를 불러오는 중 요류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    // Export Tax Excel sheet (Toss domestic 10% vs Stripe zero VAT)
    const handleExportTaxExcel = async () => {
        setIsExportingExcel(true);
        try {
            const { data: payments } = await supabase
                .from("wallet_transactions")
                .select("*, tenant:tenants(name, subscription_status)")
                .order("created_at", { ascending: false });

            if (!payments || payments.length === 0) {
                toast.error("엑셀로 추출할 정산/결제 이력이 존재하지 않습니다.");
                setIsExportingExcel(false);
                return;
            }

            let csvContent = "\uFEFF"; // BOM for Excel Korean encoding
            csvContent += "결제시각,회원매장명,구분,총결제금액(원화),공급가액,부가세(10%),Stripe 수수료(원화),환전 차손익 보정액,정산유형,증빙구분\n";

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
                    vat = 0; // 0% VAT
                    supplyAmt = amt;
                    stripeFee = Math.round(amt * 0.034); // Stripe fee representation
                    forexAdjustment = Math.round(amt * 0.012); // Forex difference calculation
                    taxType = "국외 영세율 (Stripe)";
                    receiptType = "외화수출정산";
                } else {
                    vat = Math.round(amt / 11);
                    supplyAmt = amt - vat;
                }

                csvContent += `${dateStr},${shopName},구독료,${amt},${supplyAmt},${vat},${stripeFee},${forexAdjustment},${taxType},${receiptType}\n`;
            });

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

    if (authLoading) return null;
    if (!isSuperAdmin) return <AccessDenied requiredTier="System Admin" />;

    const walletPageTitle = pickUiText(
        baseLocale,
        "본사 지출 및 세무 관리",
        "HQ Expense & Tax Ledger",
    );
    const walletPageDesc = pickUiText(
        baseLocale,
        "본사 지출 대장 관리, 프린터 물류 재고 및 국세청 증빙용 Toss/Stripe 세무 매출 자료 엑셀 추출입니다.",
        "Management of expenses, printer inventory, and tax reportings for HQ admin.",
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
                        {isExportingExcel ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <><FileSpreadsheet className="mr-2 h-4 w-4" /> 국세청 세무 엑셀 추출</>
                        )}
                    </Button>
                </div>
            </PageHeader>

            {/* 4대 지출 및 국내/해외 세무 구분 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-0 shadow-sm bg-indigo-50/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-indigo-600 uppercase tracking-wider">국내 누적 매출 (Toss)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-indigo-900">₩{stats.domesticSales.toLocaleString()}</div>
                        <p className="text-[10px] text-indigo-500/80 mt-1">10% 부가세 과세 대상 매출액</p>
                    </CardContent>
                </Card>
                
                <Card className="border-0 shadow-sm bg-purple-50/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-purple-600 uppercase tracking-wider">해외 누적 매출 (Stripe)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-purple-900">₩{stats.overseasSales.toLocaleString()}</div>
                        <p className="text-[10px] text-purple-500/80 mt-1">0% 영세율 면세 대상 매출액</p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-rose-50/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-rose-600 uppercase tracking-wider">당월 본사 총 지출</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-rose-900">₩{stats.monthlyExpenses.toLocaleString()}</div>
                        <p className="text-[10px] text-rose-500/80 mt-1">인건비 · 4대보험 · 인프라비 당월 합계</p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-slate-50/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-slate-600 uppercase tracking-wider">임대 장비 상태</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm font-bold text-slate-900">
                            보관 {stats.deviceSummary.available}대 / 임대 {stats.deviceSummary.leased}대
                        </div>
                        <p className="text-[10px] text-slate-500/80 mt-1">고장·폐기: {stats.deviceSummary.damagedOrDisposed}대</p>
                    </CardContent>
                </Card>
            </div>

            {/* 좌/우 2분할 탭 배제 레이아웃 */}
            <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-50">
                <ExpenseManagement />
            </div>
        </div>
    );
}
