"use client";

import React, { useState, useMemo } from "react";
import { 
  PlusCircle, 
  Search, 
  Trash2, 
  Receipt, 
  Building2,
  TrendingDown,
  PieChart,
  Filter
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useExpenses } from "@/hooks/use-expenses";
import { useSuppliers } from "@/hooks/use-suppliers";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';

interface NewExpenseData {
  category: string;
  amount: number;
  description: string;
  expense_date: string;
  payment_method: string;
  supplier_id: string;
}

export default function ExpensesPage() {
  const { expenses, loading: expensesLoading, addExpense, deleteExpense } = useExpenses();
  const { suppliers, loading: suppliersLoading } = useSuppliers();
  const loading = expensesLoading || suppliersLoading;

  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // New Expense State with explicit typing
  const [newExpense, setNewExpense] = useState<NewExpenseData>({
    category: "materials",
    amount: 0,
    description: "",
    expense_date: format(new Date(), "yyyy-MM-dd"),
    payment_method: "card",
    supplier_id: "none"
  });

  const filteredExpenses = expenses.filter(e => 
    e.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.supplier_id && suppliers.find(s => s.id === e.supplier_id)?.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const stats = useMemo(() => {
    const supplierMap = new Map<string, number>();
    filteredExpenses.forEach(e => {
        if (e.supplier_id) {
            const current = supplierMap.get(e.supplier_id) || 0;
            supplierMap.set(e.supplier_id, current + e.amount);
        }
    });

    const supplierStats = Array.from(supplierMap.entries())
        .map(([id, amount]) => ({
            name: suppliers.find(s => s.id === id)?.name || "알 수 없음",
            amount
        }))
        .sort((a, b) => b.amount - a.amount);

    return {
        topSupplier: supplierStats[0] || null,
        supplierCount: supplierMap.size,
        avgExpense: filteredExpenses.length > 0 ? totalAmount / filteredExpenses.length : 0
    };
  }, [filteredExpenses, suppliers, totalAmount]);

  const handleCreate = async () => {
    if (newExpense.amount <= 0 || !newExpense.description) {
        toast.error("지출 내역과 금액을 정확히 입력해 주세요.");
        return;
    }
    
    await addExpense({
      category: newExpense.category,
      amount: newExpense.amount,
      description: newExpense.description,
      expense_date: new Date(newExpense.expense_date).toISOString(),
      payment_method: newExpense.payment_method,
      supplier_id: newExpense.supplier_id === "none" ? undefined : newExpense.supplier_id
    });

    setIsDialogOpen(false);
    setNewExpense({
      category: "materials",
      amount: 0,
      description: "",
      expense_date: format(new Date(), "yyyy-MM-dd"),
      payment_method: "card",
      supplier_id: "none"
    });
  };

  const getCategoryLabel = (cat: string) => {
    switch(cat) {
      case "materials": return "자재/꽃 사입";
      case "rent": return "임대료";
      case "utility": return "공과금";
      case "labor": return "인건비";
      case "marketing": return "마케팅";
      default: return "기타";
    }
  };

  const getSupplierName = (id?: string) => {
      if (!id) return "-";
      return suppliers.find(s => s.id === id)?.name || "정보 없음";
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-500">
      <PageHeader 
        title="지출 및 매입 관리" 
        description="운영 지출과 거래처별 매입 내역을 관리하고 분석합니다." 
        icon={Receipt}
      >
        <div className="flex items-center gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger>
                <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
                <PlusCircle className="h-4 w-4 mr-2" /> 지출 내역 등록
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                <DialogTitle className="text-xl font-bold text-slate-900">새 지출 등록</DialogTitle>
                <DialogDescription className="text-slate-500">상세 지출 내역과 해당 거래처를 선택해 주세요.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="date" className="text-right font-semibold text-slate-700">날짜</Label>
                    <Input 
                        id="date" 
                        type="date" 
                        className="col-span-3"
                        value={newExpense.expense_date}
                        onChange={e => setNewExpense(prev => ({ ...prev, expense_date: e.target.value }))}
                    />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="supplier" className="text-right font-semibold text-slate-700">거래처</Label>
                    <Select 
                        value={newExpense.supplier_id} 
                        onValueChange={(v: string | null) => setNewExpense(prev => ({ ...prev, supplier_id: v || "none" }))}
                    >
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="거래처 선택 (선택사항)" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">선택 안함</SelectItem>
                            {suppliers.map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="category" className="text-right font-semibold text-slate-700">분류</Label>
                    <Select 
                        value={newExpense.category} 
                        onValueChange={(v: string | null) => setNewExpense(prev => ({ ...prev, category: v || "materials" }))}
                    >
                    <SelectTrigger className="col-span-3">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="materials">자재/꽃 사입</SelectItem>
                        <SelectItem value="rent">임대료</SelectItem>
                        <SelectItem value="utility">공과금</SelectItem>
                        <SelectItem value="labor">인건비</SelectItem>
                        <SelectItem value="marketing">마케팅</SelectItem>
                        <SelectItem value="etc">기타</SelectItem>
                    </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="desc" className="text-right font-semibold text-slate-700">내용</Label>
                    <Input 
                        id="desc" 
                        placeholder="예: 생화 사입(장미 10단), 월세 등" 
                        className="col-span-3"
                        value={newExpense.description}
                        onChange={e => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
                    />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="amount" className="text-right font-semibold text-slate-700">금액</Label>
                    <div className="col-span-3 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₩</span>
                        <Input 
                            id="amount" 
                            type="number" 
                            className="pl-8 font-bold text-red-600"
                            value={newExpense.amount}
                            onChange={e => setNewExpense(prev => ({ ...prev, amount: parseInt(e.target.value) || 0 }))}
                        />
                    </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="method" className="text-right font-semibold text-slate-700">수단</Label>
                    <Select 
                        value={newExpense.payment_method} 
                        onValueChange={(v: string | null) => setNewExpense(prev => ({ ...prev, payment_method: v || "card" }))}
                    >
                    <SelectTrigger className="col-span-3">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="card">카드</SelectItem>
                        <SelectItem value="cash">현금</SelectItem>
                        <SelectItem value="transfer">이체</SelectItem>
                    </SelectContent>
                    </Select>
                </div>
                </div>
                <DialogFooter>
                <Button onClick={handleCreate} className="px-8 font-bold">지출 등록하기</Button>
                </DialogFooter>
            </DialogContent>
            </Dialog>
        </div>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-md bg-gradient-to-br from-red-50 to-white overflow-hidden border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" /> 총 지출 합계
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">₩{totalAmount.toLocaleString()}</div>
            <p className="text-[10px] text-slate-400 mt-1">조회된 필터 기준 합계</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-white overflow-hidden border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600 flex items-center gap-2">
              <Building2 className="w-4 h-4" /> 주요 거래처
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-blue-700 truncate">
                {stats.topSupplier ? stats.topSupplier.name : "없음"}
            </div>
            {stats.topSupplier && (
                <p className="text-[10px] text-slate-500 mt-1">
                    누적 매입액: ₩{stats.topSupplier.amount.toLocaleString()}
                </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-purple-50 to-white overflow-hidden border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-600 flex items-center gap-2">
              <PieChart className="w-4 h-4" /> 평균 건당 지출
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">
                ₩{Math.round(stats.avgExpense).toLocaleString()}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">총 {filteredExpenses.length}건 기준</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-slate-50 to-white overflow-hidden border-l-4 border-l-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Filter className="w-4 h-4" /> 활성 거래처 수
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-700">{stats.supplierCount} <span className="text-sm font-normal">개소</span></div>
            <p className="text-[10px] text-slate-400 mt-1">지출 내역이 있는 업체</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-xl bg-white/80 backdrop-blur-md">
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div>
                <CardTitle className="text-xl font-bold text-gray-800">지출 일지</CardTitle>
                <CardDescription>모든 지출 및 거래처별 매입 내역을 확인할 수 있습니다.</CardDescription>
            </div>
            <div className="relative w-full md:w-80 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                type="search"
                placeholder="지출 내용, 거래처, 카테고리 검색"
                className="pl-9 bg-gray-50 border-gray-200 focus:bg-white transition-all shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
            </div>
          ) : (
            <div className="rounded-xl border border-gray-100 overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow className="hover:bg-transparent border-b">
                    <TableHead className="font-bold text-gray-600">날짜</TableHead>
                    <TableHead className="font-bold text-gray-600">분류</TableHead>
                    <TableHead className="font-bold text-gray-600">지출 내용</TableHead>
                    <TableHead className="font-bold text-gray-600 text-center">거래처</TableHead>
                    <TableHead className="font-bold text-gray-600 text-center">결제수단</TableHead>
                    <TableHead className="font-bold text-gray-600 text-right">지출 금액</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-48 text-center text-muted-foreground font-medium">
                        <div className="flex flex-col items-center justify-center space-y-3">
                            <Receipt className="w-10 h-10 text-slate-200" />
                            <p>검색 결과가 없거나 등록된 지출 내역이 없습니다.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredExpenses.map((e) => (
                      <TableRow key={e.id} className="group hover:bg-slate-50/50 transition-colors">
                        <TableCell className="text-sm font-mono text-slate-500 py-4">
                          {format(new Date(e.expense_date), "yyyy-MM-dd")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-white border-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5">
                            {getCategoryLabel(e.category)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold text-slate-800 tracking-tight">
                            {e.description}
                        </TableCell>
                        <TableCell className="text-center">
                            <span className={`text-xs font-medium ${e.supplier_id ? "text-blue-600 bg-blue-50 px-2 py-1 rounded-md" : "text-slate-400"}`}>
                                {getSupplierName(e.supplier_id)}
                            </span>
                        </TableCell>
                        <TableCell className="text-center">
                             <span className="text-xs text-slate-500 border border-slate-200 px-2 py-0.5 rounded uppercase">
                                {e.payment_method}
                             </span>
                        </TableCell>
                        <TableCell className="text-right font-black text-red-600 tracking-tighter text-lg">
                          ₩{e.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-500"
                            onClick={() => { if(window.confirm("지출 내역을 삭제하시겠습니까?")) deleteExpense(e.id); }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
