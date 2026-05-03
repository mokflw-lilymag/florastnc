"use client";
import { getMessages } from "@/i18n/getMessages";

import React, { useState, useMemo, useEffect } from "react";
import {
  TrendingDown, TrendingUp, Building2, CreditCard,
  Calendar, ChevronLeft, ChevronRight, BarChart3,
  PieChart as PieChartIcon, Trophy, Wallet, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { format, subMonths, addMonths, startOfMonth, endOfMonth, subDays, startOfDay, endOfDay, eachMonthOfInterval, eachDayOfInterval, isSameMonth } from "date-fns";
import { dateFnsLocaleForBase } from "@/lib/date-fns-locale";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useExpenses } from "@/hooks/use-expenses";
import { useOrders } from "@/hooks/use-orders";
import { useSuppliers } from "@/hooks/use-suppliers";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, AreaChart, Area, LineChart, Line
} from "recharts";

const CATEGORY_COLORS: Record<string, string> = {
  materials: "#3b82f6",
  transportation: "#8b5cf6",
  rent: "#f59e0b",
  utility: "#10b981",
  labor: "#ef4444",
  marketing: "#f97316",
  etc: "#6b7280",
};

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  materials: "materials_flowers",
  transportation: "transportation",
  rent: "rent",
  utility: "utility",
  labor: "labor",
  marketing: "marketing",
  etc: "etc",
};

const METHOD_LABEL_KEYS: Record<string, string> = {
  card: "card",
  cash: "cash",
  transfer: "transfer",
};

const METHOD_COLORS = ["#6366f1", "#10b981", "#f59e0b"];

export default function AnalyticsPage() {
  const { expenses, loading: expensesLoading } = useExpenses();
  const { orders, fetchOrders, loading: ordersLoading } = useOrders(false);
  const { suppliers, loading: suppliersLoading } = useSuppliers();
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const baseLocale = toBaseLocale(locale);
  const dfLoc = dateFnsLocaleForBase(baseLocale);
  const axisMoneyTick = (v: number) =>
    baseLocale === "ko"
      ? `${(v / 10000).toFixed(0)}${tf.f02653}`
      : `${Math.round(v / 1000)}k`;
  const [viewMonth, setViewMonth] = useState(new Date());
  const [rangeMode, setRangeMode] = useState<string>("month");

  const loading = expensesLoading || ordersLoading || suppliersLoading;
  const categoryLabelMap: Record<string, string> = {
    materials_flowers: tf.f01744,
    transportation: tf.f01632,
    rent: tf.f01721,
    utility: tf.f00949,
    labor: tf.f01695,
    marketing: tf.f01139,
    etc: tf.f00115,
  };
  const methodLabelMap: Record<string, string> = {
    card: tf.f00704,
    cash: tf.f00769,
    transfer: tf.f01693,
  };

  // Fetch orders for a full year to support all range modes
  useEffect(() => {
    fetchOrders(365);
  }, [fetchOrders]);

  // Determine date range based on mode
  const dateRange = useMemo(() => {
    const end = endOfMonth(viewMonth);
    let start: Date;
    switch (rangeMode) {
      case "3months": start = startOfMonth(subMonths(viewMonth, 2)); break;
      case "6months": start = startOfMonth(subMonths(viewMonth, 5)); break;
      case "year": start = startOfMonth(subMonths(viewMonth, 11)); break;
      default: start = startOfMonth(viewMonth);
    }
    return { start, end };
  }, [viewMonth, rangeMode]);

  // Filtered expenses for the range
  const rangeExpenses = useMemo(() => {
    return expenses.filter(e => {
      const d = new Date(e.expense_date);
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [expenses, dateRange]);

  // Filtered orders for the range
  const rangeOrders = useMemo(() => {
    return orders.filter(o => {
      const d = new Date(o.order_date);
      return d >= dateRange.start && d <= dateRange.end && o.status !== 'canceled';
    });
  }, [orders, dateRange]);

  // ====== STATS ======

  const totalExpense = rangeExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalSales = rangeOrders.reduce((s, o) => s + (o.summary?.total || 0), 0);
  const profit = totalSales - totalExpense;
  const profitRate = totalSales > 0 ? ((profit / totalSales) * 100) : 0;

  // Category breakdown (Pie chart)
  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    rangeExpenses.forEach(e => {
      const cat = e.category || "etc";
      map.set(cat, (map.get(cat) || 0) + e.amount);
    });
    return Array.from(map.entries())
      .map(([key, value]) => ({
        name: categoryLabelMap[CATEGORY_LABEL_KEYS[key] || key] || key,
        value,
        key,
        color: CATEGORY_COLORS[key] || "#94a3b8",
      }))
      .sort((a, b) => b.value - a.value);
  }, [rangeExpenses, categoryLabelMap]);

  // Payment method breakdown
  const methodData = useMemo(() => {
    const map = new Map<string, number>();
    rangeExpenses.forEach(e => {
      const m = e.payment_method || "cash";
      map.set(m, (map.get(m) || 0) + e.amount);
    });
    return Array.from(map.entries()).map(([key, value]) => ({
      name: methodLabelMap[METHOD_LABEL_KEYS[key] || key] || key,
      value,
    }));
  }, [rangeExpenses, methodLabelMap]);

  // Supplier ranking
  const supplierRanking = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();
    rangeExpenses.forEach(e => {
      if (!e.supplier_id) return;
      const current = map.get(e.supplier_id) || { amount: 0, count: 0 };
      map.set(e.supplier_id, { amount: current.amount + e.amount, count: current.count + 1 });
    });
    return Array.from(map.entries())
      .map(([id, data]) => ({
        id,
        name: suppliers.find(s => s.id === id)?.name || tf.f01526,
        ...data,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [rangeExpenses, suppliers]);

  // Monthly trend (for multi-month views)
  const monthlyTrend = useMemo(() => {
    const months = eachMonthOfInterval({ start: dateRange.start, end: dateRange.end });
    return months.map(monthStart => {
      const monthEnd = endOfMonth(monthStart);
      const label = format(monthStart, "MMM", { locale: dfLoc });

      const expenseTotal = expenses
        .filter(e => { const d = new Date(e.expense_date); return d >= monthStart && d <= monthEnd; })
        .reduce((s, e) => s + (e.amount || 0), 0);

      const salesTotal = orders
        .filter(o => { const d = new Date(o.order_date); return d >= monthStart && d <= monthEnd && o.status !== 'canceled'; })
        .reduce((s, o) => s + (o.summary?.total || 0), 0);

      return { name: label, sales: salesTotal, expense: expenseTotal, profit: salesTotal - expenseTotal };
    });
  }, [expenses, orders, dateRange, dfLoc]);

  // Daily trend (for single month view)
  const dailyTrend = useMemo(() => {
    if (rangeMode !== "month") return [];
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    return days.map(day => {
      const dayEnd = endOfDay(day);
      const dayStart = startOfDay(day);
      const label = format(day, "d");

      const expenseTotal = expenses
        .filter(e => { const d = new Date(e.expense_date); return d >= dayStart && d <= dayEnd; })
        .reduce((s, e) => s + (e.amount || 0), 0);

      const salesTotal = orders
        .filter(o => { const d = new Date(o.order_date); return d >= dayStart && d <= dayEnd && o.status !== 'canceled'; })
        .reduce((s, o) => s + (o.summary?.total || 0), 0);

      return { name: label, sales: salesTotal, expense: expenseTotal };
    });
  }, [expenses, orders, dateRange, rangeMode]);

  const trendData = rangeMode === "month" ? dailyTrend : monthlyTrend;

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-white/95 backdrop-blur-md shadow-xl rounded-xl p-3 border border-slate-100">
        <p className="text-xs font-bold text-slate-700 mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-xs" style={{ color: entry.color }}>
            {entry.name}: ₩{(entry.value || 0).toLocaleString()}
          </p>
        ))}
      </div>
    );
  };

  const PieTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    const d = payload[0];
    const pct = totalExpense > 0 ? ((d.value / totalExpense) * 100).toFixed(1) : "0";
    return (
      <div className="bg-white/95 backdrop-blur-md shadow-xl rounded-xl p-3 border border-slate-100">
        <p className="text-xs font-bold text-slate-700">{d.name}</p>
        <p className="text-xs text-slate-500">₩{d.value.toLocaleString()} ({pct}%)</p>
      </div>
    );
  };

  const prevMonth = () => setViewMonth(prev => subMonths(prev, 1));
  const nextMonth = () => setViewMonth(prev => addMonths(prev, 1));

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500">
      <PageHeader title={tf.f01160} description={tf.f01942} icon={BarChart3}>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-slate-700 min-w-[100px] text-center">
            {format(viewMonth, "MMMM yyyy", { locale: dfLoc })}
          </span>
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Select value={rangeMode} onValueChange={(v) => setRangeMode(v || "month")}>
            <SelectTrigger className="h-9 w-[100px] text-xs rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">{tf.f00824}</SelectItem>
              <SelectItem value="3months">{tf.f00839}</SelectItem>
              <SelectItem value="6months">{tf.f00841}</SelectItem>
              <SelectItem value="year">{tf.f00823}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PageHeader>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-none shadow-md bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-2xl overflow-hidden relative">
              <div className="absolute right-0 top-0 opacity-10 scale-150 rotate-12 p-3"><TrendingUp size={64} /></div>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium opacity-80 uppercase tracking-widest flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" /> {tf.f01995}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-light">₩{totalSales.toLocaleString()}</div>
                <p className="text-[11px] text-indigo-200 mt-1 font-light">{rangeOrders.length}{tf.f00890}</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md bg-gradient-to-br from-rose-600 to-rose-800 text-white rounded-2xl overflow-hidden relative">
              <div className="absolute right-0 top-0 opacity-10 scale-150 rotate-12 p-3"><TrendingDown size={64} /></div>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium opacity-80 uppercase tracking-widest flex items-center gap-1.5">
                  <TrendingDown className="h-3.5 w-3.5" /> {tf.f01998}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-light">₩{totalExpense.toLocaleString()}</div>
                <p className="text-[11px] text-rose-200 mt-1 font-light">{rangeExpenses.length}{tf.f00891}</p>
              </CardContent>
            </Card>

            <Card className={`border-none shadow-md rounded-2xl overflow-hidden relative ${profit >= 0 ? 'bg-gradient-to-br from-emerald-600 to-emerald-800 text-white' : 'bg-gradient-to-br from-red-700 to-red-900 text-white'}`}>
              <div className="absolute right-0 top-0 opacity-10 scale-150 rotate-12 p-3"><Wallet size={64} /></div>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium opacity-80 uppercase tracking-widest flex items-center gap-1.5">
                  {profit >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />} {tf.f01180}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-light">₩{profit.toLocaleString()}</div>
                <p className="text-[11px] opacity-70 mt-1 font-light">{tf.f01181} {profitRate.toFixed(1)}%</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md bg-gradient-to-br from-slate-700 to-slate-900 text-white rounded-2xl overflow-hidden relative">
              <div className="absolute right-0 top-0 opacity-10 scale-150 rotate-12 p-3"><CreditCard size={64} /></div>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium opacity-80 uppercase tracking-widest flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5" /> {tf.f00895}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-light">₩{rangeExpenses.length > 0 ? Math.round(totalExpense / rangeExpenses.length).toLocaleString() : 0}</div>
                <p className="text-[11px] text-slate-300 mt-1 font-light">{tf.f00894}: ₩{rangeOrders.length > 0 ? Math.round(totalSales / rangeOrders.length).toLocaleString() : 0}</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 1: Trend + Category Pie */}
          <div className="grid gap-4 lg:grid-cols-7">
            {/* Trend Chart */}
            <Card className="lg:col-span-5 border-none shadow-md bg-white rounded-2xl overflow-hidden">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-800 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-indigo-500" />
                  {rangeMode === "month" ? tf.f01713 : tf.f01648} {tf.f01178}
                </CardTitle>
                <CardDescription className="text-xs font-light">
                  {format(dateRange.start, "P", { locale: dfLoc })} ~{" "}
                  {format(dateRange.end, "P", { locale: dfLoc })}
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  {rangeMode === "month" ? (
                    <AreaChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} interval={rangeMode === "month" ? 1 : 0} />
                      <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={axisMoneyTick} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Area type="monotone" dataKey="sales" name={tf.f01173} stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} strokeWidth={2} />
                      <Area type="monotone" dataKey="expense" name={tf.f01929} stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} strokeWidth={2} />
                    </AreaChart>
                  ) : (
                    <BarChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={axisMoneyTick} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="sales" name={tf.f01173} fill="#6366f1" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="expense" name={tf.f01929} fill="#ef4444" radius={[6, 6, 0, 0]} />
                      <Line type="monotone" dataKey="profit" name={tf.f01180} stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Category Pie */}
            <Card className="lg:col-span-2 border-none shadow-md bg-white rounded-2xl overflow-hidden">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-800 flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4 text-violet-500" /> {tf.f01291}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 mt-2">
                  {categoryData.map((cat, i) => {
                    const pct = totalExpense > 0 ? ((cat.value / totalExpense) * 100).toFixed(1) : "0";
                    return (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                          <span className="text-slate-600 font-medium">{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-800 font-bold">₩{cat.value.toLocaleString()}</span>
                          <span className="text-slate-400 text-[10px]">{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2: Supplier Ranking + Payment Method */}
          <div className="grid gap-4 lg:grid-cols-7">
            {/* Supplier Ranking Bar Chart */}
            <Card className="lg:col-span-4 border-none shadow-md bg-white rounded-2xl overflow-hidden">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-800 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-500" /> {tf.f00885}
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[360px]">
                {supplierRanking.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-slate-400 font-light">
                    {tf.f00875}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={supplierRanking} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={axisMoneyTick} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#475569" }} width={80} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.[0]) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="bg-white/95 backdrop-blur-md shadow-xl rounded-xl p-3 border border-slate-100">
                              <p className="text-xs font-bold text-slate-700">{d.name}</p>
                              <p className="text-xs text-blue-600">₩{d.amount.toLocaleString()}</p>
                              <p className="text-xs text-slate-400">{d.count}{tf.f00887}</p>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="amount" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Payment Method + Supplier Cards */}
            <Card className="lg:col-span-3 border-none shadow-md bg-white rounded-2xl overflow-hidden">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-800 flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-emerald-500" /> {tf.f00927}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <PieChart>
                      <Pie
                        data={methodData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {methodData.map((_, index) => (
                          <Cell key={`m-${index}`} fill={METHOD_COLORS[index % METHOD_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-2">
                  {methodData.map((m, i) => {
                    const pct = totalExpense > 0 ? ((m.value / totalExpense) * 100).toFixed(1) : "0";
                    return (
                      <div key={i} className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: METHOD_COLORS[i % METHOD_COLORS.length] }} />
                          <span className="text-sm font-medium text-slate-700">{m.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-slate-800">₩{m.value.toLocaleString()}</span>
                          <span className="text-xs text-slate-400 ml-2">{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Supplier Detail Cards */}
          {supplierRanking.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-500" /> {tf.f01880}
              </h3>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {supplierRanking.slice(0, 10).map((s, i) => {
                  const pct = totalExpense > 0 ? ((s.amount / totalExpense) * 100).toFixed(1) : "0";
                  const medals = ["🥇", "🥈", "🥉"];
                  return (
                    <Card key={s.id} className="border-none shadow-sm bg-white rounded-2xl overflow-hidden hover:shadow-md transition-shadow group">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {i < 3 ? (
                              <span className="text-lg">{medals[i]}</span>
                            ) : (
                              <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 bg-slate-50 border-slate-200 text-slate-500">
                                #{i + 1}
                              </Badge>
                            )}
                            <span className="text-sm font-bold text-slate-800 truncate max-w-[120px]">{s.name}</span>
                          </div>
                        </div>
                        <div className="text-xl font-light text-slate-900 mb-1">
                          ₩{s.amount.toLocaleString()}
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>{s.count}{tf.f00887}</span>
                          <span className="font-medium text-blue-500">{pct}%</span>
                        </div>
                        {/* Progress bar */}
                        <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(parseFloat(pct), 100)}%` }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
