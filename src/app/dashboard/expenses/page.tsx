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
  Filter,
  Pencil,
  ArrowUpDown,
  X,
  SlidersHorizontal,
  ArrowUp,
  ArrowDown,
  FileImage,
  FileCheck,
  Link2,
  Check,
  ChevronsUpDown,
  Plus,
  ArrowRight
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useExpenses, Expense } from "@/hooks/use-expenses";
import { useSuppliers } from "@/hooks/use-suppliers";
import { useMaterials } from "@/hooks/use-materials";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';

interface ReceiptItem {
  id: string;
  material_id: string;
  material_name: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  amount: number;
  sub_category: string;
  main_category: string;
  mid_category: string;
}

interface ExpenseFormData {
  category: string;
  sub_category: string;
  amount: number;
  description: string;
  expense_date: string;
  payment_method: string;
  supplier_id: string;
  material_id?: string;
  quantity?: number;
  unit: string;
  receipt_url: string;
  receipt_file_id: string;
  storage_provider: string;
  items: ReceiptItem[];
}

const defaultFormData: ExpenseFormData = {
  category: "materials",
  sub_category: "",
  amount: 0,
  description: "",
  expense_date: format(new Date(), "yyyy-MM-dd"),
  payment_method: "card",
  supplier_id: "none",
  material_id: "none",
  quantity: 0,
  unit: "ea",
  receipt_url: "",
  receipt_file_id: "",
  storage_provider: "google_drive",
  items: []
};

export default function ExpensesPage() {
  const { expenses, loading: expensesLoading, addExpense, addExpenses, updateExpense, deleteExpense } = useExpenses();
  const { suppliers, loading: suppliersLoading } = useSuppliers();
  const { materials, loading: materialsLoading } = useMaterials();
  const loading = expensesLoading || suppliersLoading || materialsLoading;

  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [sortKey, setSortKey] = useState<string>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Filters
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterSupplier, setFilterSupplier] = useState<string>("all");
  const [filterMethod, setFilterMethod] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [isMaterialOpen, setIsMaterialOpen] = useState(false);
  const [activeItemPopover, setActiveItemPopover] = useState<string | null>(null);

  const [itemSearchText, setItemSearchText] = useState("");
  const itemSearchList = useMemo(() => {
    if (!materials) return [];
    if (!itemSearchText) return materials.slice(0, 50);
    const search = itemSearchText.toLowerCase();
    return materials.filter(m => 
      m.name?.toLowerCase().includes(search) || 
      m.main_category?.toLowerCase().includes(search) ||
      m.mid_category?.toLowerCase().includes(search)
    ).slice(0, 50);
  }, [materials, itemSearchText]);

  const categoryLabels: Record<string, string> = {
    all: "전체 분류",
    materials: "자재/꽃 사입",
    transportation: "운송비",
    rent: "임대료",
    utility: "공과금",
    labor: "인건비",
    marketing: "마케팅",
    etc: "기타"
  };

  const methodLabels: Record<string, string> = {
    all: "전체 수단",
    card: "카드",
    cash: "현금",
    transfer: "이체"
  };

  const supplierLabels: Record<string, string> = {
    all: "전체 거래처",
    none: "거래처 없음"
  };

  const [formData, setFormData] = useState<ExpenseFormData>({ ...defaultFormData });

  // Add Item to Receipt
  const addReceiptItem = () => {
    const newItem: ReceiptItem = {
      id: crypto.randomUUID(),
      material_id: "none",
      material_name: "",
      description: "",
      quantity: 1,
      unit: "ea",
      unit_price: 0,
      amount: 0,
      sub_category: "",
      main_category: "",
      mid_category: ""
    };
    setFormData(prev => ({
      ...prev,
      items: [newItem, ...prev.items]
    }));
  };

  const removeReceiptItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const updateReceiptItem = (id: string, updates: Partial<ReceiptItem>) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === id) {
          const updated = { ...item, ...updates };
          // Auto calculate amount if qty or price changed
          if ('quantity' in updates || 'unit_price' in updates) {
            updated.amount = updated.quantity * updated.unit_price;
          }
          return updated;
        }
        return item;
      })
    }));
  };

  // Sync total amount from items
  const totalItemsAmount = useMemo(() => {
    return formData.items.length > 0
      ? formData.items.reduce((sum, item) => sum + item.amount, 0)
      : formData.amount;
  }, [formData.items, formData.amount]);

  const activeFilterCount = [filterCategory !== "all", filterSupplier !== "all", filterMethod !== "all", !!filterDateFrom, !!filterDateTo].filter(Boolean).length;

  const resetFilters = () => {
    setFilterCategory("all");
    setFilterSupplier("all");
    setFilterMethod("all");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSearchTerm("");
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "date" ? "desc" : "asc");
    }
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortKey !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3 w-3 ml-1 text-indigo-500" />
      : <ArrowDown className="h-3 w-3 ml-1 text-indigo-500" />;
  };

  // Unique suppliers that appear in expenses for the filter dropdown
  const expenseSupplierIds = useMemo(() => {
    const ids = new Set<string>();
    expenses.forEach(e => { if (e.supplier_id) ids.add(e.supplier_id); });
    return Array.from(ids);
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      // Text search
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchText = e.description.toLowerCase().includes(term) ||
          e.category.toLowerCase().includes(term) ||
          (e.supplier_id && suppliers.find(s => s.id === e.supplier_id)?.name.toLowerCase().includes(term));
        if (!matchText) return false;
      }
      // Category filter
      if (filterCategory !== "all" && e.category !== filterCategory) return false;
      // Supplier filter
      if (filterSupplier !== "all") {
        if (filterSupplier === "none" && e.supplier_id) return false;
        if (filterSupplier !== "none" && e.supplier_id !== filterSupplier) return false;
      }
      // Payment method filter
      if (filterMethod !== "all" && e.payment_method !== filterMethod) return false;
      // Date range filter
      if (filterDateFrom) {
        const expDate = format(new Date(e.expense_date), "yyyy-MM-dd");
        if (expDate < filterDateFrom) return false;
      }
      if (filterDateTo) {
        const expDate = format(new Date(e.expense_date), "yyyy-MM-dd");
        if (expDate > filterDateTo) return false;
      }
      return true;
    });
  }, [expenses, searchTerm, filterCategory, filterSupplier, filterMethod, filterDateFrom, filterDateTo, suppliers]);

  const sortedExpenses = useMemo(() => {
    const arr = [...filteredExpenses];
    const dir = sortDir === "asc" ? 1 : -1;

    arr.sort((a, b) => {
      switch (sortKey) {
        case "date":
          return dir * (new Date(a.expense_date).getTime() - new Date(b.expense_date).getTime());
        case "category":
          return dir * (a.category || "").localeCompare(b.category || "");
        case "supplier": {
          const sA = suppliers.find(s => s.id === a.supplier_id)?.name || "zzz";
          const sB = suppliers.find(s => s.id === b.supplier_id)?.name || "zzz";
          return dir * sA.localeCompare(sB);
        }
        case "method":
          return dir * (a.payment_method || "").localeCompare(b.payment_method || "");
        case "amount":
          return dir * (a.amount - b.amount);
        default:
          return 0;
      }
    });
    return arr;
  }, [filteredExpenses, sortKey, sortDir, suppliers]);

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

  const openCreateDialog = () => {
    setEditingExpense(null);
    const initialItem: ReceiptItem = {
      id: crypto.randomUUID(),
      material_id: "none",
      material_name: "",
      description: "",
      quantity: 1,
      unit: "ea",
      unit_price: 0,
      amount: 0,
      sub_category: "",
      main_category: "",
      mid_category: ""
    };
    setFormData({ 
      ...defaultFormData, 
      expense_date: format(new Date(), "yyyy-MM-dd"),
      items: [initialItem] 
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      category: expense.category || "materials",
      sub_category: expense.sub_category || "",
      amount: expense.amount,
      description: expense.description,
      expense_date: format(new Date(expense.expense_date), "yyyy-MM-dd"),
      payment_method: expense.payment_method || "card",
      supplier_id: expense.supplier_id || "none",
      material_id: expense.material_id || "none",
      quantity: expense.quantity || 0,
      unit: expense.unit || "ea",
      receipt_url: expense.receipt_url || "",
      receipt_file_id: expense.receipt_file_id || "",
      storage_provider: expense.storage_provider || "google_drive",
      items: []
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (formData.items.length === 0 && (formData.amount <= 0 || !formData.description)) {
      toast.error("지출 내역과 금액을 정확히 입력해 주세요.");
      return;
    }

    if (editingExpense) {
      const payload = {
        category: formData.category,
        sub_category: formData.sub_category,
        amount: formData.amount,
        description: formData.description,
        expense_date: new Date(formData.expense_date).toISOString(),
        payment_method: formData.payment_method,
        supplier_id: formData.supplier_id === "none" ? undefined : formData.supplier_id,
        material_id: formData.material_id === "none" ? undefined : formData.material_id,
        quantity: formData.quantity,
        unit: formData.unit,
        receipt_url: formData.receipt_url,
        receipt_file_id: formData.receipt_file_id,
        storage_provider: formData.storage_provider
      };
      await updateExpense(editingExpense.id, payload);
    } else {
      if (formData.items.length > 0) {
        const payloads = formData.items.map(item => ({
          category: formData.category,
          sub_category: item.sub_category || formData.sub_category,
          amount: item.amount,
          description: item.description || (item.material_id !== "none" ? `${item.material_name} 사입` : formData.description),
          expense_date: new Date(formData.expense_date).toISOString(),
          payment_method: formData.payment_method,
          supplier_id: formData.supplier_id === "none" ? undefined : formData.supplier_id,
          material_id: item.material_id === "none" ? undefined : item.material_id,
          quantity: item.quantity,
          unit: item.unit,
          receipt_url: formData.receipt_url,
          receipt_file_id: formData.receipt_file_id,
          storage_provider: formData.storage_provider
        }));
        await addExpenses(payloads);
      } else {
        const singlePayload = {
          category: formData.category,
          sub_category: formData.sub_category,
          amount: formData.amount,
          description: formData.description,
          expense_date: new Date(formData.expense_date).toISOString(),
          payment_method: formData.payment_method,
          supplier_id: formData.supplier_id === "none" ? undefined : formData.supplier_id,
          material_id: formData.material_id === "none" ? undefined : formData.material_id,
          quantity: formData.quantity,
          unit: formData.unit,
          receipt_url: formData.receipt_url,
          receipt_file_id: formData.receipt_file_id,
          storage_provider: formData.storage_provider
        };
        await addExpense(singlePayload);
      }
    }

    setIsDialogOpen(false);
    setEditingExpense(null);
    setFormData({ ...defaultFormData });
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "materials": return "자재/꽃 사입";
      case "transportation": return "운송비";
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
          <Button
            className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
            onClick={openCreateDialog}
          >
            <PlusCircle className="h-4 w-4 mr-2" /> 지출 내역 등록
          </Button>
        </div>
      </PageHeader>

      {/* Expense Form Dialog (Create / Edit) */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingExpense(null); }}>
        <DialogContent className={cn("transition-all duration-300 gap-0 p-0 overflow-hidden", formData.items.length > 0 ? "sm:max-w-[850px]" : "sm:max-w-[480px]")}>
          <div className="p-6 bg-slate-50/50 border-b">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                {editingExpense ? <Pencil className="w-5 h-5 text-indigo-500" /> : <PlusCircle className="w-5 h-5 text-primary" />}
                {editingExpense ? "지출 내역 수정" : "새 지출 등록"}
              </DialogTitle>
              <DialogDescription className="text-slate-500">
                {editingExpense ? "수정할 내용을 변경한 뒤 저장하세요." : "상세 지출 내역과 해당 거래처를 선택해 주세요."}
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-6 overflow-y-auto max-h-[75vh]">
            <div className="grid gap-6">
              {/* Basic Info Section */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-sm font-bold text-slate-700">날짜</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.expense_date}
                    onChange={e => setFormData(prev => ({ ...prev, expense_date: e.target.value }))}
                    className="bg-white border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier" className="text-sm font-bold text-slate-700">거래처</Label>
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between bg-white border-slate-200 font-normal"
                        />
                      }
                    >
                      {formData.supplier_id && formData.supplier_id !== "none"
                        ? suppliers.find(s => s.id === formData.supplier_id)?.name
                        : "거래처 선택 (선택사항)"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="거래처 검색..." />
                        <CommandList>
                          <CommandEmpty>결과 없음.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              onSelect={() => setFormData(prev => ({ ...prev, supplier_id: "none" }))}
                            >
                              <Check className={cn("mr-2 h-4 w-4", formData.supplier_id === "none" ? "opacity-100" : "opacity-0")} />
                              선택 안함
                            </CommandItem>
                            {suppliers.map(s => (
                              <CommandItem
                                key={s.id}
                                onSelect={() => setFormData(prev => ({ ...prev, supplier_id: s.id }))}
                              >
                                <Check className={cn("mr-2 h-4 w-4", formData.supplier_id === s.id ? "opacity-100" : "opacity-0")} />
                                {s.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-sm font-bold text-slate-700">분류</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v: string | null) => setFormData(prev => ({ ...prev, category: v || "materials" }))}
                  >
                    <SelectTrigger className="bg-white border-slate-200">
                      <SelectValue>{categoryLabels[formData.category] || formData.category}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="materials">자재/꽃 사입</SelectItem>
                      <SelectItem value="transportation">운송비</SelectItem>
                      <SelectItem value="rent">임대료</SelectItem>
                      <SelectItem value="utility">공과금</SelectItem>
                      <SelectItem value="labor">인건비</SelectItem>
                      <SelectItem value="marketing">마케팅</SelectItem>
                      <SelectItem value="etc">기타</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="method" className="text-sm font-bold text-slate-700">결제 수단</Label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(v: string | null) => setFormData(prev => ({ ...prev, payment_method: v || "card" }))}
                  >
                    <SelectTrigger className="bg-white border-slate-200">
                      <SelectValue>{methodLabels[formData.payment_method] || formData.payment_method}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="card">카드</SelectItem>
                      <SelectItem value="cash">현금</SelectItem>
                      <SelectItem value="transfer">이체</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Items List Section (Bulk Mode) */}
              {!editingExpense && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                      <div className="w-1 h-4 bg-primary rounded-full" />
                      영수증 품목 리스트
                      <span className="text-[10px] font-normal text-slate-400 ml-2">여러 품목을 한 번에 입력하려면 항목을 추가하세요.</span>
                    </h3>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={addReceiptItem}
                      className="h-8 gap-1 font-bold border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                    >
                      <Plus className="w-3.5 h-3.5" /> 항목 추가
                    </Button>
                  </div>

                  {(!editingExpense || formData.items.length > 0) && (
                    <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
                      <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-50 border-b text-[10px] font-bold text-slate-500 uppercase">
                        <div className="col-span-5">품목명 / 상세내용</div>
                        <div className="col-span-2 text-center">수량</div>
                        <div className="col-span-2 text-right">단가</div>
                        <div className="col-span-2 text-right">금액</div>
                        <div className="col-span-1"></div>
                      </div>
                      <div className="divide-y max-h-[400px] overflow-y-auto">
                        {formData.items.map((item) => (
                          <div key={item.id} className="grid grid-cols-12 gap-2 items-center p-3 animate-in fade-in slide-in-from-left-2 duration-300">
                            <div className="col-span-5">
                              <Popover 
                                open={activeItemPopover === item.id} 
                                onOpenChange={(open) => setActiveItemPopover(open ? item.id : null)}
                              >
                                <PopoverTrigger
                                  render={
                                    <Button
                                      variant="ghost"
                                      className="w-full justify-between h-auto py-1 text-xs font-normal border border-transparent hover:border-slate-200 px-2"
                                    />
                                  }
                                >
                                  <div className="flex flex-col text-left overflow-hidden">
                                    <span className="truncate text-slate-700 font-medium leading-none mb-1">
                                      {item.material_id && item.material_id !== "none" 
                                        ? item.material_name 
                                        : item.description || "품목 선택 또는 직접 입력"}
                                    </span>
                                    {item.main_category && (
                                      <span className="text-[10px] text-slate-400 truncate leading-none">
                                        {item.main_category} &gt; {item.mid_category}
                                      </span>
                                    )}
                                  </div>
                                  <Search className="ml-1 h-3 w-3 shrink-0 opacity-30" />
                                </PopoverTrigger>
                                <PopoverContent className="w-[350px] p-0" align="start">
                                  {activeItemPopover === item.id && (
                                    <Command shouldFilter={false}>
                                      <CommandInput 
                                        placeholder="품목 검색..." 
                                        value={itemSearchText}
                                        onValueChange={(v) => {
                                          setItemSearchText(v);
                                          updateReceiptItem(item.id, { description: v });
                                        }} 
                                      />
                                      <CommandList className="max-h-[300px]">
                                        <CommandEmpty>
                                          <div className="p-4 text-center">
                                            <p className="text-xs text-slate-500">검색 결과가 없습니다.</p>
                                            <Button 
                                              variant="link" 
                                              size="sm" 
                                              className="text-[10px]"
                                              onClick={() => {
                                                setActiveItemPopover(null);
                                                setItemSearchText("");
                                              }}
                                            >
                                              현재 입력값으로 적용
                                            </Button>
                                          </div>
                                        </CommandEmpty>
                                        <CommandGroup heading="검색 결과 (최대 50개)">
                                          {itemSearchList.map(m => (
                                            <CommandItem
                                              key={m.id}
                                              value={`${m.name} ${m.main_category}`}
                                              onSelect={() => {
                                                updateReceiptItem(item.id, { 
                                                  material_id: m.id, 
                                                  material_name: m.name,
                                                  unit: m.unit || "ea",
                                                  unit_price: m.price || 0,
                                                  description: `${m.name} 사입`,
                                                  main_category: m.main_category || "",
                                                  mid_category: m.mid_category || ""
                                                });
                                                setActiveItemPopover(null);
                                                setItemSearchText("");
                                              }}
                                            >
                                              <Check className={cn("mr-2 h-4 w-4 text-primary", item.material_id === m.id ? "opacity-100" : "opacity-0")} />
                                              <div className="flex flex-col">
                                                <span className="font-medium">{m.name}</span>
                                                <span className="text-[10px] text-slate-400">{m.main_category} &gt; {m.mid_category}</span>
                                              </div>
                                              <div className="ml-auto text-[10px] font-bold text-slate-400">₩{(m.price || 0).toLocaleString()}</div>
                                            </CommandItem>
                                          ))}
                                        </CommandGroup>
                                      </CommandList>
                                    </Command>
                                  )}
                                </PopoverContent>
                              </Popover>
                            </div>
                            <div className="col-span-2">
                              <Input 
                                type="number" 
                                className="h-8 px-2 text-center text-xs border-slate-100 focus:border-indigo-200" 
                                value={item.quantity}
                                onChange={e => updateReceiptItem(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                              />
                            </div>
                            <div className="col-span-2">
                              <Input 
                                type="number" 
                                className="h-8 px-2 text-right text-xs border-slate-100 focus:border-indigo-200" 
                                value={item.unit_price}
                                onChange={e => updateReceiptItem(item.id, { unit_price: parseInt(e.target.value) || 0 })}
                              />
                            </div>
                            <div className="col-span-2 text-right font-bold text-slate-700 text-xs truncate px-1">
                              ₩{(item.amount || 0).toLocaleString()}
                            </div>
                            <div className="col-span-1 flex justify-end">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-slate-300 hover:text-red-500 hover:bg-red-50"
                                onClick={() => removeReceiptItem(item.id)}
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="p-4 bg-slate-50 flex justify-between items-center border-t">
                         <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Receipt Summary</div>
                         <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-500 font-medium">총 {formData.items.length}개 품목 합계:</span>
                            <span className="text-xl font-black text-indigo-700 tracking-tight">₩{totalItemsAmount.toLocaleString()}</span>
                         </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Single / Description Section */}
              {editingExpense && (
                <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="space-y-2">
                    <Label htmlFor="desc" className="text-sm font-bold text-slate-700">지출 내용</Label>
                    <Input
                      id="desc"
                      placeholder="예: 생화 사입(장미 10단), 월세 등"
                      value={formData.description}
                      onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="bg-white border-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-sm font-bold text-slate-700">금액</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₩</span>
                      <Input
                        id="amount"
                        type="number"
                        className="pl-10 h-12 text-lg font-black text-indigo-700 bg-white border-slate-200"
                        value={formData.amount}
                        onChange={e => setFormData(prev => ({ ...prev, amount: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Receipt File Section */}
              <div className="pt-4 border-t border-slate-100">
                <Label className="text-sm font-bold text-slate-700 block mb-3">증빙 자료 (영수증)</Label>
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-12 sm:col-span-9 relative">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="구글 드라이브 영수증 링크"
                      className="pl-9 bg-slate-50 border-slate-200"
                      value={formData.receipt_url}
                      onChange={e => setFormData(prev => ({ ...prev, receipt_url: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-3">
                    <Button variant="outline" className="w-full gap-2 font-bold px-4 border-emerald-200 text-emerald-600 hover:bg-emerald-50 h-full">
                      <FileImage className="h-4 w-4" /> 업로드
                    </Button>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 ml-1 font-medium italic">
                  * 한 번에 업로드된 모든 품목은 동일한 영수증 링크를 공유합니다.
                </p>
              </div>
            </div>
          </div>
          <div className="p-6 bg-slate-50 border-t flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="font-bold text-slate-500">취소</Button>
            <Button 
              onClick={handleSubmit} 
              className={cn(
                "px-10 font-bold gap-2 text-white shadow-lg transition-all active:scale-95",
                formData.items.length > 0 ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100" : "bg-primary hover:bg-primary/90 shadow-primary/20"
              )}
            >
              {editingExpense ? <FileCheck className="w-4 h-4" /> : (formData.items.length > 0 ? <TrendingDown className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />)}
              {editingExpense ? "수정 완료" : (formData.items.length > 0 ? `품목 ${formData.items.length}개 일괄 등록` : "지출 등록하기")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
        <CardHeader className="pb-3">
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

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 mt-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mr-1">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              필터
              {activeFilterCount > 0 && (
                <Badge className="h-4 min-w-4 px-1 text-[9px] bg-indigo-500 text-white border-none">{activeFilterCount}</Badge>
              )}
            </div>

            <Input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="h-8 w-[130px] text-xs border-slate-200 rounded-lg"
              placeholder="시작일"
            />
            <span className="text-slate-300 text-xs">~</span>
            <Input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="h-8 w-[130px] text-xs border-slate-200 rounded-lg"
              placeholder="종료일"
            />

            <Select value={filterCategory} onValueChange={(v: string | null) => setFilterCategory(v || "all")}>
              <SelectTrigger className="h-8 w-[120px] text-xs border-slate-200 rounded-lg">
                <SelectValue placeholder="분류">{categoryLabels[filterCategory]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 분류</SelectItem>
                <SelectItem value="materials">자재/꽃 사입</SelectItem>
                <SelectItem value="transportation">운송비</SelectItem>
                <SelectItem value="rent">임대료</SelectItem>
                <SelectItem value="utility">공과금</SelectItem>
                <SelectItem value="labor">인건비</SelectItem>
                <SelectItem value="marketing">마케팅</SelectItem>
                <SelectItem value="etc">기타</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterSupplier} onValueChange={(v: string | null) => setFilterSupplier(v || "all")}>
              <SelectTrigger className="h-8 w-[130px] text-xs border-slate-200 rounded-lg">
                <SelectValue placeholder="거래처">
                  {supplierLabels[filterSupplier] || suppliers.find(s => s.id === filterSupplier)?.name || filterSupplier}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 거래처</SelectItem>
                <SelectItem value="none">거래처 없음</SelectItem>
                {expenseSupplierIds.map(id => {
                  const s = suppliers.find(sup => sup.id === id);
                  return s ? <SelectItem key={id} value={id}>{s.name}</SelectItem> : null;
                })}
              </SelectContent>
            </Select>

            <Select value={filterMethod} onValueChange={(v: string | null) => setFilterMethod(v || "all")}>
              <SelectTrigger className="h-8 w-[110px] text-xs border-slate-200 rounded-lg">
                <SelectValue placeholder="결제수단">{methodLabels[filterMethod]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 수단</SelectItem>
                <SelectItem value="card">카드</SelectItem>
                <SelectItem value="cash">현금</SelectItem>
                <SelectItem value="transfer">이체</SelectItem>
              </SelectContent>
            </Select>

            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-500 hover:text-red-500 gap-1 px-2" onClick={resetFilters}>
                <X className="h-3 w-3" /> 초기화
              </Button>
            )}

            <span className="ml-auto text-[11px] text-slate-400 font-medium">
              {sortedExpenses.length}건 / 총 {expenses.length}건
            </span>
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
                    <TableHead className="font-bold text-gray-600 cursor-pointer select-none hover:text-indigo-600 transition-colors" onClick={() => handleSort("date")}>
                      <span className="inline-flex items-center">날짜 <SortIcon column="date" /></span>
                    </TableHead>
                    <TableHead className="font-bold text-gray-600 cursor-pointer select-none hover:text-indigo-600 transition-colors" onClick={() => handleSort("category")}>
                      <span className="inline-flex items-center">분류 <SortIcon column="category" /></span>
                    </TableHead>
                    <TableHead className="font-bold text-gray-600">지출 내용</TableHead>
                    <TableHead className="font-bold text-gray-600 text-center">영수증</TableHead>
                    <TableHead className="font-bold text-gray-600 text-center cursor-pointer select-none hover:text-indigo-600 transition-colors" onClick={() => handleSort("supplier")}>
                      <span className="inline-flex items-center justify-center w-full">거래처 <SortIcon column="supplier" /></span>
                    </TableHead>
                    <TableHead className="font-bold text-gray-600 text-center cursor-pointer select-none hover:text-indigo-600 transition-colors" onClick={() => handleSort("method")}>
                      <span className="inline-flex items-center justify-center w-full">결제수단 <SortIcon column="method" /></span>
                    </TableHead>
                    <TableHead className="font-bold text-gray-600 text-right cursor-pointer select-none hover:text-indigo-600 transition-colors" onClick={() => handleSort("amount")}>
                      <span className="inline-flex items-center justify-end w-full">지출 금액 <SortIcon column="amount" /></span>
                    </TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-48 text-center text-muted-foreground font-medium">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <Receipt className="w-10 h-10 text-slate-200" />
                          <p>검색 결과가 없거나 등록된 지출 내역이 없습니다.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedExpenses.map((e) => (
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
                          {e.receipt_url ? (
                            <a href={e.receipt_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center">
                              <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100 gap-1.5 transition-all">
                                <FileCheck className="h-3 w-3" /> 확인
                              </Badge>
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-300 font-light italic">미첨부</span>
                          )}
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
                          <div className="flex items-center justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600"
                              onClick={() => openEditDialog(e)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-red-50 hover:text-red-500"
                              onClick={() => { if (window.confirm("지출 내역을 삭제하시겠습니까?")) deleteExpense(e.id); }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
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
