"use client";

import React, { useState } from "react";
import { PlusCircle, Search, Trash2, Boxes, Receipt, Calendar as CalendarIcon, Wallet } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useExpenses, Expense } from "@/hooks/use-expenses";
import { Skeleton } from "@/components/ui/skeleton";

export default function ExpensesPage() {
  const { expenses, loading, addExpense, deleteExpense } = useExpenses();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // New Expense State
  const [newExpense, setNewExpense] = useState({
    category: "materials",
    amount: 0,
    description: "",
    expense_date: format(new Date(), "yyyy-MM-dd"),
    payment_method: "card"
  });

  const filteredExpenses = expenses.filter(e => 
    e.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const handleCreate = async () => {
    if (newExpense.amount <= 0 || !newExpense.description) return;
    
    await addExpense({
      ...newExpense,
      expense_date: new Date(newExpense.expense_date).toISOString()
    });
    setIsDialogOpen(false);
    setNewExpense({
      category: "materials",
      amount: 0,
      description: "",
      expense_date: format(new Date(), "yyyy-MM-dd"),
      payment_method: "card"
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

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader 
        title="지출 및 재고 관리" 
        description="매장 운영에 들어가는 지출 내역을 관리합니다." 
        icon={Boxes}
      >
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <PlusCircle className="h-4 w-4 mr-2" /> 지출 등록
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 지출 내역 등록</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="date">날짜</Label>
                <Input 
                  id="date" 
                  type="date" 
                  value={newExpense.expense_date}
                  onChange={e => setNewExpense(prev => ({ ...prev, expense_date: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">카테고리</Label>
                <Select 
                  value={newExpense.category} 
                  onValueChange={v => setNewExpense(prev => ({ ...prev, category: v }))}
                >
                  <SelectTrigger>
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
              <div className="grid gap-2">
                <Label htmlFor="desc">내용</Label>
                <Input 
                  id="desc" 
                  placeholder="예: 생화 사입, 월세 등" 
                  value={newExpense.description}
                  onChange={e => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amount">금액 (원)</Label>
                <Input 
                  id="amount" 
                  type="number" 
                  value={newExpense.amount}
                  onChange={e => setNewExpense(prev => ({ ...prev, amount: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="method">결제 수단</Label>
                <Select 
                  value={newExpense.payment_method} 
                  onValueChange={v => setNewExpense(prev => ({ ...prev, payment_method: v }))}
                >
                  <SelectTrigger>
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
              <Button onClick={handleCreate}>등록하기</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-white/50 border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">조회 기간 합계</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">₩{totalAmount.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 justify-between items-end">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="지출 내용 검색"
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>날짜</TableHead>
                    <TableHead>카테고리</TableHead>
                    <TableHead>내용</TableHead>
                    <TableHead>결제수단</TableHead>
                    <TableHead className="text-right">금액</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        지출 내역이 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredExpenses.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="text-sm">
                          {format(new Date(e.expense_date), "yyyy-MM-dd")}
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-1 rounded-full text-[10px] bg-slate-100 font-bold">
                            {getCategoryLabel(e.category)}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">{e.description}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{e.payment_method}</TableCell>
                        <TableCell className="text-right font-bold text-red-600">
                          ₩{e.amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => deleteExpense(e.id)}>
                            <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500" />
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
