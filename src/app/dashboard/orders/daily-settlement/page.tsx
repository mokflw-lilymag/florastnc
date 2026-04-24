"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Calendar, Target, DollarSign, ArrowRightLeft, 
  RefreshCw, ChevronLeft, ChevronRight, FileText, 
  XCircle, Download, CheckCircle2, ShoppingCart, Loader2, Package, TrendingUp
} from "lucide-react";
import { format, subDays, addDays, startOfDay, endOfDay, differenceInDays } from "date-fns";
import { useOrders } from "@/hooks/use-orders";
import { useAuth } from "@/hooks/use-auth";
import { useDailySettlements, DailySettlementRecord } from "@/hooks/use-daily-settlements";
import { useExpenses } from "@/hooks/use-expenses";
import { useSettings } from "@/hooks/use-settings";
import { PageHeader } from "@/components/page-header";
import Link from 'next/link';
import { Order } from "@/types/order";
import { parseDate } from "@/lib/date-utils";
import { toast } from "sonner";

export default function DailySettlementPage() {
    const { orders, fetchOrdersByRange, loading: ordersLoading } = useOrders();
    const { expenses, fetchExpenses, loading: expensesLoading } = useExpenses();
    const { getSettlement, saveSettlement, findLastSettlementBefore, loading: settlementLoading } = useDailySettlements();
    const { settings } = useSettings();
    const { profile } = useAuth();

    const [reportDate, setReportDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [settlementRecord, setSettlementRecord] = useState<DailySettlementRecord | null>(null);
    const [prevSettlementRecord, setPrevSettlementRecord] = useState<DailySettlementRecord | null>(null);
    const [vaultDeposit, setVaultDeposit] = useState<number>(0);
    const [manualPreviousBalance, setManualPreviousBalance] = useState<number | null>(null);

    // Initial load
    useEffect(() => {
        const loadData = async () => {
            const dateFromFetch = subDays(startOfDay(new Date(reportDate)), 30);
            const dateToFetch = endOfDay(new Date(reportDate));
            const prevDate = format(subDays(new Date(reportDate), 1), 'yyyy-MM-dd');

            // Load data for the selected day + 30 days back to catch previous payments
            await Promise.all([
                fetchOrdersByRange(dateFromFetch, dateToFetch),
                fetchExpenses(startOfDay(new Date(reportDate)), dateToFetch),
                (async () => {
                    const res = await getSettlement(reportDate);
                    setSettlementRecord(res);
                    if (res) {
                        setVaultDeposit(res.vault_deposit || 0);
                        setManualPreviousBalance(res.previous_vault_balance);
                    } else {
                        setVaultDeposit(0);
                        setManualPreviousBalance(null);
                    }
                })(),
                (async () => {
                    const res = await getSettlement(prevDate);
                    setPrevSettlementRecord(res);
                    if (!res) {
                        // If no previous record, find the last one available
                        const lastRecord = await findLastSettlementBefore(reportDate);
                        if (lastRecord) {
                           // Logic from ERP v4 to calculate gap balance can be added here
                           // For now, at least show it was found
                        }
                    }
                })()
            ]);
        };

        loadData();
    }, [reportDate]);

    // Settlement calculation logic based on Order types and partial payments
    const stats = useMemo(() => {
        if (!orders.length) return {
            totalSales: 0, cashSales: 0, cardSales: 0, transferSales: 0, otherSales: 0,
            deliveryCostCash: 0, orderCount: 0, paidOrdersToday: [], pendingOrdersToday: [],
            pendingAmountToday: 0, prevOrderPaymentTotal: 0, previousOrderPayments: [],
            paymentStats: { 
                card: { amount: 0, count: 0 }, 
                cash: { amount: 0, count: 0 }, 
                transfer: { amount: 0, count: 0 }, 
                others: { amount: 0, count: 0 } 
            }
        };

        const todayFrom = startOfDay(new Date(reportDate));
        const todayTo = endOfDay(new Date(reportDate));

        let cashSales = 0;
        let cardSales = 0;
        let transferSales = 0;
        let otherSales = 0;
        let totalSales = 0;
        
        const paidOrdersToday: Order[] = [];
        const pendingOrdersToday: Order[] = [];
        const previousOrderPayments: Order[] = [];
        let pendingAmountToday = 0;
        let prevOrderPaymentTotal = 0;

        let deliveryCostCashToday = 0;
        const paymentStats = {
            card: { count: 0, amount: 0 },
            cash: { count: 0, amount: 0 },
            transfer: { count: 0, amount: 0 },
            others: { count: 0, amount: 0 }
        };

        orders.forEach(order => {
            if (order.status === 'canceled') return;

            const dateToParse = order.order_date || order.created_at || new Date().toISOString();
            const orderDateStr = format(new Date(dateToParse), 'yyyy-MM-dd');

            // Delivery cost calculation (Order-based)
            if (order.delivery_info?.date === reportDate || order.pickup_info?.date === reportDate || orderDateStr === reportDate) {
                if (order.actual_delivery_cost_cash) {
                    deliveryCostCashToday += Number(order.actual_delivery_cost_cash);
                }
            }

            const p = order.payment;
            let settleAmountToday = 0;
            const isTodayOrder = orderDateStr === reportDate;

            // Handle payments occurring today
            const firstDate = p?.firstPaymentDate ? new Date(p.firstPaymentDate) : null;
            const secondDate = p?.secondPaymentDate ? new Date(p.secondPaymentDate) : null;
            const completedAt = p?.completedAt ? new Date(p.completedAt) : null;

            if (p?.isSplitPayment) {
                // First Payment Today
                if (firstDate && firstDate >= todayFrom && firstDate <= todayTo) {
                    const amt = p.firstPaymentAmount || 0;
                    settleAmountToday += amt;
                    const method = (p.firstPaymentMethod || 'cash').toLowerCase() as keyof typeof paymentStats;
                    if (paymentStats[method]) {
                        paymentStats[method].amount += amt;
                        paymentStats[method].count++;
                    } else {
                        paymentStats.others.amount += amt;
                        paymentStats.others.count++;
                    }
                }
                // Second Payment Today
                if (p.status === 'paid' || p.status === 'completed' || order.status === 'completed') {
                    let isSecondToday = false;
                    if (secondDate && secondDate >= todayFrom && secondDate <= todayTo) isSecondToday = true;
                    else if (!secondDate && completedAt && completedAt >= todayFrom && completedAt <= todayTo) isSecondToday = true;
                    // Fallback: If it's a today's order and it's paid, and we don't have second date yet, assume it was paid today
                    else if (isTodayOrder && !secondDate && !completedAt && (p.status === 'paid' || p.status === 'completed')) isSecondToday = true;

                    if (isSecondToday) {
                        const amt = p.secondPaymentAmount || ( (order.summary?.total || 0) - (p.firstPaymentAmount || 0) );
                        settleAmountToday += amt;
                        const method = (p.secondPaymentMethod || p.method || 'cash').toLowerCase() as keyof typeof paymentStats;
                        if (paymentStats[method]) {
                            paymentStats[method].amount += amt;
                            paymentStats[method].count++;
                        } else {
                            paymentStats.others.amount += amt;
                            paymentStats.others.count++;
                        }
                    }
                }
                
                // Track Pending for Today's Order
                if (isTodayOrder && p.status !== 'completed' && p.status !== 'paid') {
                    const fullTotal = order.summary?.total || 0;
                    let alreadyPaid = 0;
                    if (firstDate && firstDate <= todayTo) alreadyPaid += (p.firstPaymentAmount || 0);
                    if (secondDate && secondDate <= todayTo) alreadyPaid += (p.secondPaymentAmount || 0);
                    
                    const pending = fullTotal - alreadyPaid;
                    if (pending > 0) {
                        pendingOrdersToday.push(order);
                        pendingAmountToday += pending;
                    }
                }
            } else {
                // Regular Payment Today
                const wasPaidToday = (completedAt && completedAt >= todayFrom && completedAt <= todayTo) || 
                                    (isTodayOrder && (p?.status === 'paid' || p?.status === 'completed'));

                if (wasPaidToday) {
                    const amt = order.summary?.total || 0;
                    settleAmountToday += amt;
                    const method = (p?.method || 'cash').toLowerCase() as keyof typeof paymentStats;
                    if (paymentStats[method]) {
                        paymentStats[method].amount += amt;
                        paymentStats[method].count++;
                    } else {
                        paymentStats.others.amount += amt;
                        paymentStats.others.count++;
                    }
                } else if (isTodayOrder && (!p?.status || (p.status as string) === 'pending' || (p.status as string) === 'partial')) {
                    pendingOrdersToday.push(order);
                    pendingAmountToday += order.summary?.total || 0;
                }
            }

            if (settleAmountToday > 0) {
                totalSales += settleAmountToday;
                if (!isTodayOrder) {
                    prevOrderPaymentTotal += settleAmountToday;
                    previousOrderPayments.push(order);
                } else {
                    paidOrdersToday.push(order);
                }
            }
        });

        // Revenue logic based on settings for the total sales card
        let displayTotalSales = totalSales;
        if (settings.revenueRecognitionBasis === 'order_date') {
            displayTotalSales = orders
                .filter(o => o.status !== 'canceled')
                .filter(o => {
                    const dateVal = o.order_date || o.created_at || new Date().toISOString();
                    const oDateStr = format(new Date(dateVal), 'yyyy-MM-dd');
                    return oDateStr === reportDate;
                })
                .reduce((sum, o) => sum + (o.summary?.total || 0), 0);
        }

        return {
            totalSales: displayTotalSales,
            cashSales: paymentStats.cash.amount,
            cardSales: paymentStats.card.amount,
            transferSales: paymentStats.transfer.amount,
            otherSales: paymentStats.others.amount,
            deliveryCostCash: deliveryCostCashToday,
            orderCount: orders.filter(o => {
                const dateVal = o.order_date || o.created_at || new Date().toISOString();
                return format(new Date(dateVal), 'yyyy-MM-dd') === reportDate;
            }).length,
            paidOrdersToday,
            pendingOrdersToday,
            pendingAmountToday,
            prevOrderPaymentTotal,
            previousOrderPayments,
            paymentStats
        };
    }, [orders, reportDate, settings.revenueRecognitionBasis]);

    const cashExpensesFlow = useMemo(() => {
        // Filter expenses for the specific report date
        const dailyExpenses = expenses.filter(e => {
            const dateVal = e.expense_date || e.created_at;
            if (!dateVal) return false;
            return format(new Date(dateVal), 'yyyy-MM-dd') === reportDate;
        });

        const materialCash = dailyExpenses
            .filter(e => e.payment_method === 'cash' && (e.category === '자재' || e.category === 'material'))
            .reduce((sum, e) => sum + (e.amount || 0), 0);
        
        const otherCash = dailyExpenses
            .filter(e => e.payment_method === 'cash' && e.sub_category !== 'delivery' && e.sub_category !== 'delivery_fee' && e.category !== '자재' && e.category !== 'material' && e.category !== '운송' && e.category !== 'transport' && e.category !== 'transportation')
            .reduce((sum, e) => sum + (e.amount || 0), 0);
        
        // Exclude delivery from other cash expense to prevent double counting in UI
        const totalCashExpense = dailyExpenses
            .filter(e => e.payment_method === 'cash' && e.sub_category !== 'delivery' && e.sub_category !== 'delivery_fee')
            .reduce((sum, e) => sum + (e.amount || 0), 0);

        const deliveryCostCash = dailyExpenses
            .filter(e => (e.payment_method === 'cash' || e.description?.includes('현금')) && (e.sub_category === 'delivery' || e.sub_category === 'delivery_fee' || e.category === '운송' || e.category === 'transport'))
            .reduce((sum, e) => sum + (e.amount || 0), 0);

        return {
            materialCash,
            otherCash,
            totalCashExpense,
            deliveryCostCash
        };
    }, [expenses, reportDate]);

    const vaultCash = useMemo(() => {
        const cashSales = stats?.paymentStats?.cash?.amount || 0;
        // Use the maximum of order-based or expense-based delivery cost (ensures robust tracking)
        const deliveryCostCash = Math.max(stats?.deliveryCostCash || 0, cashExpensesFlow.deliveryCostCash || 0);
        const cashExpenses = cashExpensesFlow.totalCashExpense;
        
        // Previous balance logic
        let prevBalance = 0;
        if (manualPreviousBalance !== null) {
            prevBalance = manualPreviousBalance;
        } else if (prevSettlementRecord) {
            // Calculated from the previous day's record
            prevBalance = (prevSettlementRecord.previous_vault_balance || 0) + 
                          (prevSettlementRecord.cash_sales_today || 0) - 
                          (prevSettlementRecord.vault_deposit || 0) - 
                          (prevSettlementRecord.delivery_cost_cash_today || 0) - 
                          (prevSettlementRecord.cash_expense_today || 0);
        }

        const currentBalance = prevBalance + cashSales - vaultDeposit - deliveryCostCash - cashExpenses;

        return {
            prevBalance,
            cashSales,
            deliveryCostCash,
            cashExpenses,
            vaultDeposit,
            currentBalance
        };
    }, [stats, cashExpensesFlow, vaultDeposit, manualPreviousBalance, prevSettlementRecord]);

    const handleSave = async () => {
        const success = await saveSettlement({
            date: reportDate,
            previous_vault_balance: vaultCash.prevBalance,
            cash_sales_today: vaultCash.cashSales,
            delivery_cost_cash_today: vaultCash.deliveryCostCash,
            cash_expense_today: vaultCash.cashExpenses,
            vault_deposit: vaultDeposit
        });

        if (success) {
            toast.success("정산 기록이 저장되었습니다.");
            const res = await getSettlement(reportDate);
            setSettlementRecord(res);
        } else {
            toast.error("저장에 실패했습니다.");
        }
    };

    const loading = ordersLoading || expensesLoading || settlementLoading;

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 bg-slate-50/50">
            <div className="flex items-center mb-2 animate-in fade-in slide-in-from-left-4 duration-500">
                <Button 
                    variant="ghost" 
                    className="group rounded-2xl h-10 px-4 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 transition-all text-slate-500 hover:text-indigo-600 gap-2 font-bold"
                >
                    <Link href="/dashboard/orders" className="flex items-center gap-2">
                        <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                        주문 목록으로 돌아가기
                    </Link>
                </Button>
            </div>
            <PageHeader
                title="일일 마감 정산"
                description={`${reportDate} 기준 지점 정산 및 금고 관리`}
            >
                <div className="flex items-center gap-3">
                    <div className="hidden lg:flex flex-col items-end mr-2">
                        <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">오늘 정산 마감</span>
                        <span className="text-[9px] text-slate-400 font-light">금고 잔액 확정 및 이월</span>
                    </div>
                    <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
                        <Button variant="ghost" size="icon" onClick={() => setReportDate(format(subDays(new Date(reportDate), 1), 'yyyy-MM-dd'))} className="h-8 w-8 rounded-xl hover:bg-slate-50">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Input
                            type="date"
                            value={reportDate}
                            onChange={(e) => setReportDate(e.target.value)}
                            className="h-8 w-32 border-none shadow-none font-medium text-xs bg-transparent focus-visible:ring-0"
                        />
                        <Button variant="ghost" size="icon" onClick={() => setReportDate(format(addDays(new Date(reportDate), 1), 'yyyy-MM-dd'))} className="h-8 w-8 rounded-xl hover:bg-slate-50">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                    
                    <Button 
                        onClick={handleSave} 
                        disabled={loading} 
                        className="font-medium rounded-xl shadow-lg shadow-indigo-500/20 bg-indigo-600 hover:bg-indigo-700 px-6 h-10 group"
                    >
                        {loading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <CheckCircle2 className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                        )}
                        일일 정산 마감
                    </Button>
                </div>
            </PageHeader>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-none shadow-sm bg-indigo-900 text-white rounded-2xl overflow-hidden relative group">
                    <div className="absolute right-0 top-0 p-3 opacity-10 scale-150 rotate-12 transition-transform group-hover:scale-175 group-hover:rotate-6">
                        <TrendingUp size={64} />
                    </div>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-medium opacity-80 uppercase tracking-widest">금일 총 매출액</CardTitle>
                        <DollarSign className="h-4 w-4 text-indigo-300" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-light">₩{(stats?.totalSales || 0).toLocaleString()}</div>
                        <p className="text-[11px] text-indigo-200 mt-2 font-light">신규 ₩{ ((stats?.totalSales || 0) - (stats?.prevOrderPaymentTotal || 0)).toLocaleString() } + 이월 ₩{(stats?.prevOrderPaymentTotal || 0).toLocaleString()}</p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-slate-900 text-white rounded-2xl overflow-hidden relative group">
                    <div className="absolute right-0 top-0 p-3 opacity-10 scale-150 rotate-12 transition-transform group-hover:scale-175 group-hover:rotate-6">
                        <DollarSign size={64} />
                    </div>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-medium opacity-80 uppercase tracking-widest">수금 (현금 + 계좌)</CardTitle>
                        <ArrowRightLeft className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-light">₩{( (stats?.cashSales || 0) + (stats?.transferSales || 0) ).toLocaleString()}</div>
                        <p className="text-[11px] text-slate-400 mt-2 font-light">카드 결제: ₩{(stats?.cardSales || 0).toLocaleString()}</p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden group">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-widest">금고 예상 잔액</CardTitle>
                        <Target className="h-4 w-4 text-indigo-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-light text-indigo-600">₩{(vaultCash.currentBalance || 0).toLocaleString()}</div>
                        <p className="text-[11px] text-slate-400 mt-2 font-light uppercase tracking-tighter">현재 포스기 보유 추정액</p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden group">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-widest">금일 주문 접수</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-light text-slate-900">{stats?.orderCount || 0}건</div>
                        <p className="text-[11px] text-red-500 mt-2 font-medium uppercase tracking-tighter">미결제 {stats.pendingOrdersToday.length}건 / ₩{(stats.pendingAmountToday || 0).toLocaleString()}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-7">
                <Card className="md:col-span-4 border-none shadow-sm bg-white rounded-3xl overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b pb-4 px-6">
                        <CardTitle className="text-sm font-medium text-slate-900 uppercase tracking-wider flex items-center gap-2">
                            <Target className="h-4 w-4 text-indigo-600" /> 금고 현금 상세 흐름 (Cash Flow)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between py-2 border-b border-dashed border-slate-100">
                                <Label className="text-slate-600 font-light text-xs">이월된 현금 잔액 (전일 마감 시점)</Label>
                                <div className="flex items-center gap-2">
                                    <Input 
                                        type="number" 
                                        value={manualPreviousBalance !== null ? manualPreviousBalance : vaultCash.prevBalance}
                                        onChange={(e) => setManualPreviousBalance(Number(e.target.value))}
                                        className="w-32 h-8 text-right font-bold text-xs rounded-lg border-indigo-100 bg-indigo-50/30 focus-visible:ring-indigo-500"
                                    />
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={handleSave}
                                        className="h-8 px-3 rounded-lg border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-bold text-[10px]"
                                    >
                                        수정저장
                                    </Button>
                                    <span className="text-xs font-light text-slate-400">₩</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-dashed border-slate-100">
                                <Label className="text-slate-600 font-light text-xs">금일 현금 매출 (직접 수금)</Label>
                                <span className="text-xs font-medium text-blue-600">+ ₩{(vaultCash.cashSales || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-dashed border-slate-100">
                                <Label className="text-slate-600 font-light text-xs">배송비 현금 지급액 (지출)</Label>
                                <span className="text-xs font-medium text-rose-600">- ₩{(vaultCash.deliveryCostCash || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-dashed border-slate-100">
                                <Label className="text-slate-600 font-light text-xs">기타 현금 지출 (자재/잡비)</Label>
                                <span className="text-xs font-medium text-rose-600">- ₩{(vaultCash.cashExpenses || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-dashed border-slate-100">
                                <Label className="text-slate-600 font-light text-xs">관리자 시재 입금/출금 (은행 등)</Label>
                                <div className="flex items-center gap-2">
                                    <Input 
                                        type="number" 
                                        value={vaultDeposit}
                                        onChange={(e) => setVaultDeposit(Number(e.target.value))}
                                        className="w-32 h-8 text-right font-light text-xs rounded-lg border-slate-200"
                                    />
                                    <span className="text-xs font-light text-slate-400">₩</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between py-5 bg-indigo-50/50 rounded-2xl px-5 mt-6 border border-indigo-100/50 shadow-inner">
                                <Label className="text-indigo-900 font-bold text-sm uppercase tracking-wider">최종 마감 예정 잔액</Label>
                                <span className="text-2xl font-light text-indigo-700 tracking-tight">₩{(vaultCash.currentBalance || 0).toLocaleString()}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="md:col-span-3 border-none shadow-sm bg-white rounded-3xl overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b pb-4 px-6">
                        <CardTitle className="text-sm font-medium text-slate-900 uppercase tracking-wider flex items-center gap-2">
                            <Package className="h-4 w-4 text-amber-500" /> 오늘 발생한 지출 요약
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-colors">
                                    <span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-1 block">운송비 (현금)</span>
                                    <span className="text-lg font-light text-slate-900">₩{(vaultCash.deliveryCostCash || 0).toLocaleString()}</span>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-colors">
                                    <span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-1 block">기타 지출 (현금)</span>
                                    <span className="text-lg font-light text-slate-900">₩{(vaultCash.cashExpenses || 0).toLocaleString()}</span>
                                </div>
                            </div>
                            
                            <div className="p-5 bg-amber-50/50 rounded-2xl border border-amber-100">
                                <span className="text-[11px] text-amber-700 font-bold uppercase tracking-widest mb-2 block">총 지출 (카드 포함)</span>
                                <div className="flex justify-between items-baseline">
                                    <span className="text-2xl font-light text-amber-900">₩{expenses.reduce((sum, e) => sum + (e.amount || 0), 0).toLocaleString()}</span>
                                    <span className="text-xs text-amber-600">{expenses.length}건 발생</span>
                                </div>
                            </div>

                            <Button variant="outline" className="w-full rounded-xl border-slate-200 text-slate-600 font-light hover:bg-slate-50 text-xs">
                                <Link href="/dashboard/expenses">지출 관리 페이지로 이동 <ChevronRight className="ml-1 h-3 w-3" /></Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Transaction Lists */}
            <div className="grid gap-4 md:grid-cols-1">
                 <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b pb-4 px-6">
                        <CardTitle className="text-sm font-medium text-slate-900 uppercase tracking-wider flex items-center gap-2">
                            <FileText className="h-4 w-4 text-emerald-500" /> 금일 결제 처리된 주문 내역
                        </CardTitle>
                        <CardDescription className="font-light text-xs">해당 일자에 수금이 발생한 {stats.paidOrdersToday.length + stats.previousOrderPayments.length}건의 주문들입니다.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/30 hover:bg-slate-50/30 border-b border-slate-50">
                                    <TableHead className="font-medium text-[11px] text-slate-600 px-6">시간/번호</TableHead>
                                    <TableHead className="font-medium text-[11px] text-slate-600">주문자</TableHead>
                                    <TableHead className="font-medium text-[11px] text-slate-600">수단</TableHead>
                                    <TableHead className="font-medium text-[11px] text-slate-600 text-right">총 주문금액</TableHead>
                                    <TableHead className="font-medium text-[11px] text-emerald-600 text-right">금일 입금액</TableHead>
                                    <TableHead className="font-medium text-[11px] text-slate-600 text-center">상태</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {[...stats.paidOrdersToday, ...stats.previousOrderPayments].map((order, idx) => (
                                    <TableRow key={`${order.id}-${idx}`} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50/50">
                                        <TableCell className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-slate-400 font-medium">{format(new Date(order.order_date || order.created_at || new Date().toISOString()), 'HH:mm:ss')}</span>
                                                <span className="font-mono text-[10px] text-slate-700 uppercase">{order.order_number}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs font-light tracking-tight">{order.orderer?.name}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="text-[9px] font-light border-slate-200 text-slate-600 px-1.5 py-0 rounded-md">
                                                {order.payment?.method}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right text-xs text-slate-400 font-light">₩{(order.summary?.total || 0).toLocaleString()}</TableCell>
                                        <TableCell className="text-right text-xs font-medium text-emerald-600">
                                            {/* To be even more precise, we check what was paid today */}
                                            ₩{ (order.payment?.isSplitPayment && order.payment?.secondPaymentDate?.startsWith(reportDate)) ? (order.payment.secondPaymentAmount || 0).toLocaleString() : (order.summary?.total || 0).toLocaleString() }
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary" className="text-[11px] font-light bg-emerald-50 text-emerald-700 border-none px-2">수금완료</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {(stats.paidOrdersToday.length + stats.previousOrderPayments.length) === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-slate-400 font-light text-xs">오늘 처리된 결제 데이터가 없습니다.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden mt-4">
                    <CardHeader className="bg-slate-50/50 border-b pb-4 px-6">
                        <CardTitle className="text-sm font-medium text-slate-900 uppercase tracking-wider flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-rose-500" /> 금일 미결제 (미수금) 목록
                        </CardTitle>
                        <CardDescription className="font-light text-xs">오늘 주문 중 아직 결제가 되지 않은 내역입니다.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/30 hover:bg-slate-50/30 border-b border-slate-50">
                                    <TableHead className="font-medium text-xs text-slate-600 px-6">주문번호</TableHead>
                                    <TableHead className="font-medium text-xs text-slate-600">주문자</TableHead>
                                    <TableHead className="font-medium text-xs text-slate-600 text-right">미수 금액</TableHead>
                                    <TableHead className="font-medium text-xs text-slate-600 text-center">예상 수단</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats.pendingOrdersToday.map((order) => (
                                    <TableRow key={order.id} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50/50">
                                        <TableCell className="px-6 py-4">
                                            <span className="font-mono text-[10px] text-slate-700 uppercase">{order.order_number}</span>
                                        </TableCell>
                                        <TableCell className="text-xs font-light tracking-tight">{order.orderer?.name}</TableCell>
                                        <TableCell className="text-right text-xs font-medium text-rose-600">₩{(order.summary?.total || 0).toLocaleString()}</TableCell>
                                        <TableCell className="text-center">
                                            <span className="text-[10px] text-slate-400 font-light italic">{order.payment?.method}</span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {stats.pendingOrdersToday.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center text-slate-400 font-light text-xs">오늘 미수금이 발생한 주문이 없습니다.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
