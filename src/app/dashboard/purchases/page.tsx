"use client";

import React, { useState, useMemo, useCallback, useDeferredValue, memo, Fragment } from "react";
import { 
  Package, 
  Search, 
  Plus, 
  Calendar as CalendarIcon, 
  Trash2, 
  Edit2, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  TrendingDown,
  ShoppingCart,
  LayoutGrid,
  List,
  ChevronRight,
  MoreVertical,
  PlusCircle,
  BookOpen,
  FileDown,
  Save,
  Info,
  Building2,
  Filter,
  Pencil,
  ArrowUpDown,
  Check,
  ChevronsUpDown,
  TrendingUp,
  FileSearch,
  FileText,
  Tag,
  X,
  Calendar,
  FolderOpen,
  Circle,
  Zap,
  Undo2,
  RotateCcw
} from "lucide-react";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { usePurchases, Purchase } from "@/hooks/use-purchases";
import { useSuppliers } from "@/hooks/use-suppliers";
import { useMaterials } from "@/hooks/use-materials";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettings, DEFAULT_MATERIAL_CATEGORIES } from "@/hooks/use-settings";
import { toast } from 'sonner';

// --- Types & Defaults ---
const DATE_FORMAT = "yyyy-MM-dd";
const FALLBACK_CATEGORIES = DEFAULT_MATERIAL_CATEGORIES;

type BatchGroup = {
    id: string;
    name: string;
    date: string; // planned date
    purchaseDate?: string; // actual purchase date
    items: Purchase[];
    total: number;
    status: 'planned' | 'completed';
};

interface PurchaseFormData {
  id?: string;
  supplier_id: string;
  supplier_name?: string;
  material_id: string;
  name: string;
  status: 'planned' | 'completed';
  total_price: number;
  quantity: number;
  scheduled_date: string;
  purchase_date?: string;
  payment_method: string;
  notes: string;
  main_category?: string;
  mid_category?: string;
}

const isRedundantName = (newName: string, existingList: { name: string }[]) => {
  if (!newName) return true;
  const n = newName.trim().replace(/\s+/g, '').toLowerCase();
  return existingList.some(item => {
    const e = item.name.trim().replace(/\s+/g, '').toLowerCase();
    return n.includes(e) || e.includes(n);
  });
};

const defaultFormData: PurchaseFormData = {
  supplier_id: "none",
  material_id: "none",
  name: "",
  status: "planned",
  total_price: 0,
  quantity: 1, 
  scheduled_date: format(new Date(), "yyyy-MM-dd"),
  payment_method: "card",
  notes: "",
  main_category: "기타",
  mid_category: ""
};

// --- Sub-components ---

const MemoizedBatchItemRow = memo(({ 
  index, 
  item, 
  materials, 
  suppliers, 
  latestSupplierMap,
  openMaterialRow, 
  setOpenMaterialRow, 
  openSupplierRow, 
  setOpenSupplierRow, 
  updateItemInBatch, 
  removeItemFromBatch,
  categories
}: any) => {
  const [localNotes, setLocalNotes] = useState(item.notes || "");
  const [matSearch, setMatSearch] = useState("");
  const [supSearch, setSupSearch] = useState("");

  const filteredMaterials = useMemo(() => {
    const term = matSearch.toLowerCase();
    return materials.filter((m: any) => m.name.toLowerCase().includes(term));
  }, [materials, matSearch]);

  const filteredSuppliers = useMemo(() => {
    const term = supSearch.toLowerCase();
    return suppliers.filter((s: any) => s.name.toLowerCase().includes(term));
  }, [suppliers, supSearch]);

  const currentMaterial = useMemo(() => {
     if (!item.material_id || item.material_id === "none" || item.material_id === "new") return null;
     return materials.find((m: any) => m.id === item.material_id);
  }, [materials, item.material_id]);

  const currentSupplier = useMemo(() => {
    return suppliers.find((s: any) => s.id === item.supplier_id);
  }, [suppliers, item.supplier_id]);

  return (
    <TableRow className="hover:bg-slate-50/50 transition-colors">
      <TableCell className="border-r py-3">
        <Popover open={openMaterialRow === index} onOpenChange={(open) => setOpenMaterialRow(open ? index : null)}>
          <PopoverTrigger 
            className={cn(
                "inline-flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-10 w-full pr-1 shadow-sm",
                item.material_id === "new" && "border-blue-200 bg-blue-50/30"
            )}
          >
            {item.material_id === "new" ? (
                <div className="flex flex-col gap-1.5 w-full bg-blue-50/50 p-2 rounded-lg border border-blue-100 shadow-sm animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-blue-700 font-bold truncate text-[11px] flex items-center gap-1">
                      <PlusCircle className="size-3" /> 신규 등록: {item.name}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="grid grid-cols-[50px_1fr] items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-blue-200 text-blue-600 bg-white font-bold inline-flex justify-center">대분류</Badge>
                      <select 
                          className="text-[11px] bg-white border border-blue-200 rounded-md px-2 h-7 focus:ring-2 focus:ring-blue-100 outline-none w-full font-bold text-blue-700 shadow-sm"
                          value={item.main_category || "기타"}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateItemInBatch(index, { main_category: e.target.value, mid_category: "" })}
                      >
                          {categories.main.map((cat: string) => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                    
                    {/* Always show Sub category selection to make it explicit */}
                    <div className="grid grid-cols-[50px_1fr] items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-indigo-200 text-indigo-600 bg-white font-bold inline-flex justify-center">중분류</Badge>
                      <select 
                          className="text-[11px] bg-white border border-indigo-200 rounded-md px-2 h-7 focus:ring-2 focus:ring-indigo-100 outline-none w-full font-medium text-slate-700 shadow-sm disabled:bg-slate-50 disabled:text-slate-400"
                          value={item.mid_category || ""}
                          disabled={!categories.mid[item.main_category || "기타"] || categories.mid[item.main_category || "기타"].length === 0}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateItemInBatch(index, { mid_category: e.target.value })}
                      >
                          <option value="">하위 분류 선택</option>
                          {categories.mid[item.main_category || "기타"]?.map((cat: string) => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
            ) : (
              <div className="flex flex-col items-start gap-0.5 overflow-hidden w-full group">
                <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">
                  {currentMaterial?.name || item.name || <span className="text-slate-300">품목 선택 또는 입력</span>}
                </span>
                {currentMaterial && (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      {currentMaterial.main_category} 
                      {currentMaterial.mid_category && <ChevronRight className="size-2 text-slate-300" />}
                      {currentMaterial.mid_category}
                    </span>
                  </div>
                )}
              </div>
            )}
            {item.material_id !== "new" && <ChevronsUpDown className="h-3.5 w-3.5 opacity-40 shrink-0" />}
          </PopoverTrigger>
          <PopoverContent className="w-[340px] p-0 shadow-2xl border-blue-100" align="start">
            <div className="p-2 border-b bg-slate-50/80">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                  lang="ko"
                  autoFocus
                  placeholder="품목 검색 또는 새 명칭 입력..." 
                  className="pl-9 h-9 text-sm bg-white" 
                  value={matSearch}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMatSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="max-h-[280px] overflow-y-auto p-1.5 font-sans">
              {filteredMaterials.map((m: any) => {
                return (
                  <Button
                    key={m.id}
                    variant="ghost"
                    className="w-full justify-start font-normal h-11 mb-0.5 hover:bg-blue-50 hover:text-blue-700"
                    onClick={() => {
                      const unitPrice = Number(m.price) || 0;
                      const qty = item.quantity || 1;
                      const totalPrice = Math.round(unitPrice * qty);
                      
                      const lastSupplierId = latestSupplierMap.get(m.id);
                      const newSupplierId = (item.supplier_id === "none" && lastSupplierId) ? lastSupplierId : item.supplier_id;

                      updateItemInBatch(index, { 
                        material_id: m.id, 
                        name: m.name, 
                        total_price: totalPrice,
                        quantity: qty,
                        supplier_id: newSupplierId
                      });
                      setOpenMaterialRow(null);
                    }}
                  >
                    <div className="flex flex-col items-start overflow-hidden">
                      <span className="text-sm font-medium text-slate-700 truncate w-full">{m.name}</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-slate-400">
                          단가: {Math.round(Number(m.price)).toLocaleString()}원 | {m.main_category}
                          {m.mid_category ? ` > ${m.mid_category}` : ''}
                        </span>
                      </div>
                    </div>
                  </Button>
                );
              })}
              {matSearch.length > 0 && !isRedundantName(matSearch, materials) && (
                <Button
                  variant="ghost"
                  className="w-full justify-start text-blue-600 h-12 border-t mt-1.5 hover:bg-blue-50"
                  onClick={() => {
                    updateItemInBatch(index, { material_id: "new", name: matSearch });
                    setOpenMaterialRow(null);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" /> &quot;{matSearch}&quot; (자재 자동 등록)
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </TableCell>

      <TableCell className="border-r py-3">
        <Popover open={openSupplierRow === index} onOpenChange={(open) => setOpenSupplierRow(open ? index : null)}>
          <PopoverTrigger 
            className="inline-flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-normal transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-10 w-full pr-1 shadow-sm"
          >
            <span className="truncate">
                {item.supplier_id === "new" ? 
                    <span className="text-indigo-600 font-bold">[신규] {item.supplier_name}</span> : 
                    (currentSupplier?.name || <span className="text-slate-300">거래처 선택</span>)
                }
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-40 shrink-0" />
          </PopoverTrigger>
          <PopoverContent className="w-[240px] p-0" align="start">
            <div className="p-2 border-b">
              <Input 
                lang="ko"
                placeholder="거래처 검색..." 
                className="h-9 text-sm" 
                value={supSearch}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSupSearch(e.target.value)}
              />
            </div>
            <div className="max-h-[220px] overflow-y-auto p-1.5">
              <Button
                variant="ghost"
                className="w-full justify-start text-sm h-9 mb-1"
                onClick={() => {
                  updateItemInBatch(index, { supplier_id: "none" });
                  setOpenSupplierRow(null);
                }}
              >지정 안함</Button>
              {filteredSuppliers.map((s: any) => (
                <Button
                  key={s.id}
                  variant="ghost"
                  className="w-full justify-start text-sm h-9 mb-0.5 px-3 hover:bg-slate-50"
                  onClick={() => {
                    updateItemInBatch(index, { supplier_id: s.id });
                    setOpenSupplierRow(null);
                  }}
                >
                  <span className="truncate font-medium">{s.name}</span>
                </Button>
              ))}
              {supSearch.length > 0 && !isRedundantName(supSearch, suppliers) && (
                <Button
                  variant="ghost"
                  className="w-full justify-start text-indigo-600 h-10 border-t mt-1 hover:bg-indigo-50"
                  onClick={() => {
                    updateItemInBatch(index, { supplier_id: "new", supplier_name: supSearch });
                    setOpenSupplierRow(null);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" /> &quot;{supSearch}&quot; (거래처 자동 등록)
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </TableCell>

      <TableCell className="border-r py-3 w-[100px]">
        <Input 
          type="number" 
          className="h-10 text-right font-black bg-slate-500/10 border-slate-300 focus:bg-white transition-all pr-3" 
          value={item.quantity}
          onChange={e => {
            const qty = Number(e.target.value);
            const mat = materials.find((m: any) => m.id === item.material_id);
            
            // If we have an existing material, use its price. 
            // If not, try to keep the current implied unit price.
            const impliedUnitPrice = mat ? Number(mat.price) : (item.quantity > 0 ? Math.round(item.total_price / item.quantity) : 0);
            const newTotal = Math.round(impliedUnitPrice * qty);
            
            updateItemInBatch(index, { 
              quantity: qty, 
              total_price: newTotal
            });
          }}
        />
      </TableCell>

      <TableCell className="border-r py-3 w-[120px]">
        <div className="relative">
          <Input 
            type="number" 
            className="h-10 text-right font-bold bg-white border-slate-300 focus:ring-2 focus:ring-indigo-100 transition-all pr-3" 
            placeholder="단가 입력"
            value={item.quantity > 0 ? Math.round(item.total_price / item.quantity) : 0}
            onChange={e => {
              const unit = Number(e.target.value);
              updateItemInBatch(index, { 
                total_price: Math.round(unit * item.quantity) 
              });
            }}
          />
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300">₩</span>
        </div>
      </TableCell>

      <TableCell className="border-r py-3 w-[140px] bg-indigo-50/20">
        <div className="relative">
          <Input 
            type="number" 
            className="h-10 text-right font-black bg-white border-indigo-200 focus:ring-2 focus:ring-indigo-200 transition-all pr-3 text-indigo-700" 
            value={item.total_price}
            onChange={e => updateItemInBatch(index, { total_price: Number(e.target.value) })}
          />
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-indigo-300">₩</span>
        </div>
        {(currentMaterial && Number(currentMaterial.price) > 0) && (
          <div className="text-[9px] text-slate-400 text-right pr-1 mt-1 font-medium">
             기본 단가 ₩{Math.round(Number(currentMaterial.price)).toLocaleString()}
          </div>
        )}
      </TableCell>

      <TableCell className="border-r py-3 px-2">
        <Input
          lang="ko"
          className="h-10 border-slate-200 bg-white text-sm"
          value={localNotes}
          onChange={e => setLocalNotes(e.target.value)}
          onBlur={() => updateItemInBatch(index, { notes: localNotes })}
          placeholder="메모 입력"
        />
      </TableCell>

      <TableCell className="text-center py-3">
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-slate-300 hover:text-red-500 hover:bg-red-50 h-10 w-10 transition-colors" 
          onClick={() => removeItemFromBatch(index)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
});

MemoizedBatchItemRow.displayName = "MemoizedBatchItemRow";

const PurchaseManualDialog = ({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-none shadow-2xl rounded-2xl p-0">
      <div className="bg-indigo-600 p-8 text-white relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <ShoppingCart className="w-32 h-32" />
        </div>
        <DialogHeader className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight text-white">매입 관리 사용 매뉴얼</DialogTitle>
          </div>
          <DialogDescription className="text-indigo-100/80 text-base">
            구매 계획부터 필터링, 엑셀 출력, 재고 연동까지 한눈에 이해하기
          </DialogDescription>
        </DialogHeader>
      </div>

      <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
        {/* Step 1 */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors">1</div>
            <h3 className="font-black text-slate-800 text-lg">새 매입(배치) 등록</h3>
          </div>
          <div className="pl-10 space-y-2">
            <p className="text-sm text-slate-600 leading-relaxed">• <b>[+ 새 매입 등록]</b> 버튼을 사용하여 여러 품목의 매입 계획을 '배치(Batch)' 단위로 한 번에 등록하여 효율적으로 관리하세요.</p>
            <p className="text-xs text-indigo-500 font-bold bg-indigo-50 p-2 rounded-lg inline-block italic">※ 매입 등록 시에는 '계획' 상태로 저장되며, 재고에 즉시 반영되지 않습니다.</p>
          </div>
        </section>

        {/* Step 2: NEW FILTER & EXCEL & ICON GUIDE */}
        <section className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-sm group-hover:bg-emerald-600 group-hover:text-white transition-colors">2</div>
            <h3 className="font-black text-slate-800 text-lg">전체 내역 조회 및 배치 관리</h3>
          </div>
          <div className="pl-10 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2">
                <span className="text-emerald-600 font-bold text-sm flex items-center gap-1"><Filter className="w-3.5 h-3.5" /> 스마트 필터</span>
                <p className="text-xs text-slate-500 leading-relaxed"><b>날짜, 품목, 거래처</b>를 조합하여 원하는 내역만 정밀하게 추출할 수 있습니다.</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2">
                <span className="text-emerald-600 font-bold text-sm flex items-center gap-1"><FileDown className="w-3.5 h-3.5" /> 엑셀 출력</span>
                <p className="text-xs text-slate-500 leading-relaxed">필터링된 상태 그대로 <b>[엑셀 다운로드]</b>하여 문서로 즉시 활용하세요.</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-inner">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <LayoutGrid className="w-3 h-3" /> 관리 항목 아이콘 설명 (배치 리스트 우측)
                </h4>
                <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                    <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-100 shadow-sm">
                            <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-700">최종 매입 확정</span>
                            <span className="text-[10px] text-slate-500">재고 증가 및 지출 등록</span>
                        </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0 border border-indigo-100 shadow-sm">
                            <FileDown className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-700">엑셀 출력</span>
                            <span className="text-[10px] text-slate-500">배치 내역 파일 저장</span>
                        </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded bg-slate-50 text-indigo-500 flex items-center justify-center shrink-0 border border-slate-200 shadow-sm">
                            <Edit2 className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-700">정보 수정</span>
                            <span className="text-[10px] text-slate-500">배치명 및 날짜 변경</span>
                        </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded bg-red-50 text-red-500 flex items-center justify-center shrink-0 border border-red-100 shadow-sm">
                            <Trash2 className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-700">계획 삭제</span>
                            <span className="text-[10px] text-slate-500">배치 데이터 완전 제거</span>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </section>

        {/* Step 3 */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors">3</div>
            <h3 className="font-black text-slate-800 text-lg">상태 관리와 시스템 자동화</h3>
          </div>
          <div className="pl-10 space-y-4">
            <div className="flex items-start gap-3 bg-amber-50/50 p-4 rounded-xl border border-amber-100">
              <Zap className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-slate-800 text-sm">매입 [확정] 시 일어나는 변화</span>
                <p className="text-xs text-slate-500 leading-relaxed">
                  1. 💰 <b>지출 자동 기록</b>: [지출 관리] 메뉴에 해당 지출이 자동 생성됩니다.<br/>
                  2. 📦 <b>재고 자동 반영</b>: 구매한 수량만큼 자재 재고와 단가가 즉시 업데이트됩니다.<br/>
                  3. 🤝 <b>거래처 연동</b>: 거래처 정보가 해당 자재의 기본 매입처로 자동 지정됩니다.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
              <PlusCircle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-slate-800 text-sm">신규 자재/거래처 자동 등록</span>
                <p className="text-xs text-slate-500 leading-relaxed">
                  매입 등록 시 새로운 이름을 입력하면 <b>시스템이 자동으로 신규 등록</b>을 진행합니다. <br/>
                  중복 걱정 없이 안심하고 입력하세요.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
              <LayoutGrid className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-slate-800 text-sm">2차 카테고리(중분류) 지원</span>
                <p className="text-xs text-slate-500 leading-relaxed">
                  자재 등록 시 <b>2차 카테고리(중분류)</b>까지 선택할 수 있어 더욱 체계적인 자재 관리가 가능합니다.
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed italic">• <b>확정 취소</b>: 실수로 확정한 경우 [확정 취소]를 누르면 연동된 지출과 재고 데이터가 <b>자동 원상복구</b>됩니다.</p>
          </div>
        </section>

        <div className="pt-2">
          <Button onClick={() => onOpenChange(false)} className="w-full bg-slate-900 hover:bg-slate-800 text-white h-12 rounded-xl font-bold shadow-lg shadow-slate-200 transition-all active:scale-[0.98]">
            매뉴얼 닫기
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);

export default function PurchasesPage() {
  const { purchases, loading: purchasesLoading, addPurchases, updatePurchase, deletePurchase, completePurchase, completeBatch, cancelPurchaseConfirmation, cancelBatchConfirmation } = usePurchases();
  const { suppliers, loading: suppliersLoading, addSupplier } = useSuppliers();
  const { materials, loading: materialsLoading, addMaterial, updateMaterial } = useMaterials();
  const { materialCategories: settingsCategories, loading: settingsLoading } = useSettings();
  
  const categories = useMemo(() => {
    if (settingsCategories) return settingsCategories;
    return FALLBACK_CATEGORIES;
  }, [settingsCategories]);
  
  const [isManualOpen, setIsManualOpen] = useState(false);
  const loading = purchasesLoading || suppliersLoading || materialsLoading || settingsLoading;

  const [activeTab, setActiveTab] = useState("batches");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterMaterialId, setFilterMaterialId] = useState("all");
  const [filterSupplierId, setFilterSupplierId] = useState("all");
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'confirm'>('create');
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  
  const [itemsToAdd, setItemsToAdd] = useState<PurchaseFormData[]>([]);
  const [formData, setFormData] = useState<PurchaseFormData>({ ...defaultFormData });
  
  const [openMaterialRow, setOpenMaterialRow] = useState<number | null>(null);
  const [openSupplierRow, setOpenSupplierRow] = useState<number | null>(null);

  // --- O(1) Lookups ---
  const materialMap = useMemo(() => {
    const map = new Map<string, any>();
    materials.forEach(m => map.set(m.id, m));
    return map;
  }, [materials]);

  const supplierMap = useMemo(() => {
    const map = new Map<string, any>();
    suppliers.forEach(s => map.set(s.id, s));
    return map;
  }, [suppliers]);

  // --- Stats ---
  const stats = useMemo(() => {
    const planned = purchases.filter(p => p.status === 'planned');
    return {
      plannedCount: planned.length,
      plannedAmount: planned.reduce((sum, p) => sum + p.total_price, 0),
      totalCount: purchases.length,
      totalAmount: purchases.reduce((sum, p) => sum + p.total_price, 0)
    };
  }, [purchases]);

  // --- Export Excel ---
  const handleDownloadBatchExcel = (batchId: string, batchName: string) => {
    const batchItems = purchases.filter(p => 
      p.batch_id === batchId || (!p.batch_id && `legacy-${p.scheduled_date}` === batchId)
    );

    if (batchItems.length === 0) {
      toast.error("다운로드할 데이터가 없습니다.");
      return;
    }

    const exportData = batchItems.map((item, index) => ({
      "순번": index + 1,
      "품목명": item.name,
      "매입처": supplierMap.get(item.supplier_id || "")?.name || "미지정",
      "수량": item.quantity,
      "단가": item.quantity > 0 ? Math.round(item.total_price / item.quantity) : 0,
      "합계금액": item.total_price,
      "메모": item.notes || ""
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "매입목록");
    
    const wscols = [
      {wch: 5},  // 순번
      {wch: 30}, // 품목명
      {wch: 15}, // 매입처
      {wch: 8},  // 수량
      {wch: 12}, // 단가
      {wch: 15}, // 합계금액
      {wch: 40}  // 메모
    ];
    worksheet['!cols'] = wscols;

    XLSX.writeFile(workbook, `시장_${batchName}_${format(new Date(), "MMdd")}.xlsx`);
    toast.success("엑셀 파일이 다운로드되었습니다.");
  };

  const handleDeleteBatch = async (batchId: string, batchName: string) => {
      if (!confirm(`배치 [${batchName}] 내의 모든 품목(${purchases.filter(p => p.batch_id === batchId || (!p.batch_id && "legacy-" + (p.scheduled_date || "날짜미지정") === batchId)).length}개)을 삭제하시겠습니까?`)) return;
      
      const itemsToDelete = purchases.filter(p => 
          p.batch_id === batchId || (!p.batch_id && "legacy-" + (p.scheduled_date || "날짜미지정") === batchId)
      );
      
      const deletePromises = itemsToDelete.map(p => deletePurchase(p.id));
      await Promise.all(deletePromises);
      toast.success("배치가 삭제되었습니다.");
  };

  // --- Filtering & Batching ---
  const batches = useMemo(() => {
    const groups: Record<string, BatchGroup> = {};
    const term = deferredSearchTerm.toLowerCase();

    purchases.forEach(p => {
      const matName = (materialMap.get(p.material_id || "")?.name || p.name || "").toLowerCase();
      const batchNameField = (p.batch_name || "").toLowerCase();
      const matchesSearch = !term || matName.includes(term) || batchNameField.includes(term);
      
      if (!matchesSearch) return;

      const date = p.scheduled_date || "날짜미지정";
      const key = p.batch_id || `legacy-${date}`;
      
      if (!groups[key]) {
        groups[key] = {
          id: key,
          date,
          purchaseDate: p.purchase_date,
          name: p.batch_name || `${date} 매입 내역`,
          items: [],
          total: 0,
          status: 'completed'
        };
      }
      groups[key].items.push(p);
      groups[key].total += p.total_price;
      if (p.status === 'planned') groups[key].status = 'planned';
      if (p.purchase_date && (!groups[key].purchaseDate || p.purchase_date > groups[key].purchaseDate)) {
        groups[key].purchaseDate = p.purchase_date;
      }
    });

    return Object.values(groups).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [purchases, deferredSearchTerm, materialMap]);

  const latestSupplierMap = useMemo(() => {
    const map = new Map<string, string>();
    const sorted = [...purchases].sort((a, b) => 
        new Date(b.scheduled_date || 0).getTime() - new Date(a.scheduled_date || 0).getTime()
    );
    for (const p of sorted) {
        if (p.material_id && p.supplier_id && !map.has(p.material_id)) {
            map.set(p.material_id, p.supplier_id);
        }
    }
    return map;
  }, [purchases]);

  const filteredPurchases = useMemo(() => {
    const term = deferredSearchTerm.toLowerCase();
    return purchases.filter(p => {
      // Date filter
      if (filterStartDate && p.scheduled_date && p.scheduled_date < filterStartDate) return false;
      if (filterEndDate && p.scheduled_date && p.scheduled_date > filterEndDate) return false;
      if (filterMaterialId !== "all" && p.material_id !== filterMaterialId) return false;
      if (filterSupplierId !== "all" && p.supplier_id !== filterSupplierId) return false;

      if (term) {
        const mat = p.material_id ? materialMap.get(p.material_id) : null;
        const sup = p.supplier_id ? supplierMap.get(p.supplier_id) : null;
        return (p.name || "").toLowerCase().includes(term) ||
               (mat?.name || "").toLowerCase().includes(term) ||
               (sup?.name || "").toLowerCase().includes(term);
      }
      return true;
    });
  }, [purchases, deferredSearchTerm, filterStartDate, filterEndDate, filterMaterialId, filterSupplierId, materialMap, supplierMap]);

  const handleExportFilteredExcel = () => {
    if (filteredPurchases.length === 0) {
      toast.error("다운로드할 데이터가 없습니다.");
      return;
    }

    const exportData = filteredPurchases.map((item, index) => ({
      "순번": index + 1,
      "일자": item.scheduled_date || "-",
      "확정일": item.purchase_date || "-",
      "품목명": item.name || (item.material_id ? materialMap.get(item.material_id)?.name : "미지정"),
      "매입처": item.supplier_id ? supplierMap.get(item.supplier_id)?.name : "미지정",
      "수량": item.quantity,
      "총액": item.total_price,
      "결제방식": item.payment_method === 'card' ? '카드' : item.payment_method === 'transfer' ? '이체' : item.payment_method === 'cash' ? '현금' : item.payment_method === 'deferred' ? '외상' : item.payment_method || "-",
      "상태": item.status === 'completed' ? '완료' : '예정',
      "대분류": item.main_category || (item.material_id ? materialMap.get(item.material_id)?.main_category : ""),
      "중분류": item.mid_category || (item.material_id ? materialMap.get(item.material_id)?.mid_category : ""),
      "메모": item.notes || ""
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "전체매입내역");
    XLSX.writeFile(workbook, `매입내역_${format(new Date(), "yyyyMMdd")}.xlsx`);
    toast.success("필터링된 내역이 엑셀로 저장되었습니다.");
  };

  // --- Form Handlers ---

  const handleSaveOrConfirm = async (isConfirm: boolean = false) => {
    if (editingPurchase) {
        let finalData = { ...formData };
        if (isConfirm) {
            finalData.status = 'completed';
            finalData.purchase_date = format(new Date(), "yyyy-MM-dd HH:mm");
            const unitPrice = finalData.quantity > 0 ? Math.round(finalData.total_price / finalData.quantity) : 0;
            if (finalData.material_id && finalData.material_id !== "none" && finalData.material_id !== "new") {
                const existing = materialMap.get(finalData.material_id);
                if (existing) {
                    await updateMaterial(existing.id, { 
                        price: unitPrice > 0 ? unitPrice : existing.price,
                        supplier_id: finalData.supplier_id === "none" ? existing.supplier_id : finalData.supplier_id
                    });
                }
            }
        }
        await updatePurchase(editingPurchase.id, finalData);
        setIsDialogOpen(false);
        setEditingPurchase(null);
        toast.success(isConfirm ? "내역이 확정되었습니다." : "내역이 수정되었습니다.");
        return;
    }

    if (itemsToAdd.length === 0) {
      toast.error("등록할 품목이 없습니다.");
      return;
    }

    const batchId = editingBatchId && !editingBatchId.startsWith('legacy-') ? editingBatchId : crypto.randomUUID();
    const batchName = formData.name || `${formData.scheduled_date} 매입 내역`;

    try {
      const payloads = await Promise.all(itemsToAdd.map(async (item) => {
        let finalMaterialId = item.material_id;
        let finalSupplierId = item.supplier_id;
        const unitPrice = item.quantity > 0 ? Math.round(item.total_price / item.quantity) : 0;

        // --- Auto-create/Reuse Supplier ---
        const targetSupplierName = item.supplier_name?.trim();
        if (targetSupplierName) {
            // Find existing by exact name or substring match
            const existingSup = suppliers.find(s => 
                s.name === targetSupplierName || 
                (targetSupplierName.length > 2 && s.name.startsWith(targetSupplierName)) || 
                (s.name.length > 2 && targetSupplierName.startsWith(s.name))
            );

            if (existingSup) {
                finalSupplierId = existingSup.id;
            } else if (item.supplier_id === "new" || !item.supplier_id || item.supplier_id === "none") {
                const newSup = await addSupplier({ name: targetSupplierName });
                if (newSup) finalSupplierId = newSup.id;
            }
        }

        // --- Auto-create/Reuse Material ---
        const targetMaterialName = item.name?.trim();
        if (targetMaterialName) {
            const existingMat = materials.find(m => m.name === targetMaterialName);
            
            if (existingMat) {
                finalMaterialId = existingMat.id;
                if (isConfirm) {
                    await updateMaterial(existingMat.id, { 
                        price: unitPrice > 0 ? unitPrice : existingMat.price,
                        supplier_id: finalSupplierId === "none" ? existingMat.supplier_id : finalSupplierId
                    });
                }
            } else if (item.material_id === "new" || !item.material_id || item.material_id === "none") {
                const newMat = await addMaterial({
                  name: targetMaterialName,
                  price: unitPrice,
                  main_category: item.main_category || "기타",
                  mid_category: item.mid_category || "",
                  unit: "EA",
                  supplier_id: finalSupplierId === "none" ? undefined : finalSupplierId
                });
                if (newMat) finalMaterialId = newMat.id;
            }
        }

        const { ...restOfItem } = item;

        return {
          ...restOfItem,
          material_id: finalMaterialId === "none" ? undefined : finalMaterialId,
          supplier_id: finalSupplierId === "none" ? undefined : finalSupplierId,
          batch_id: batchId,
          batch_name: batchName,
          status: isConfirm ? 'completed' : (item.status || formData.status),
          purchase_date: isConfirm ? format(new Date(), "yyyy-MM-dd HH:mm") : item.purchase_date
        };
      }));

      if (editingBatchId) {
          const oldItems = purchases.filter(p => p.batch_id === editingBatchId || (!p.batch_id && `legacy-${p.scheduled_date}` === editingBatchId));
          for (const old of oldItems) await deletePurchase(old.id);
      }

      await addPurchases(payloads);
      toast.success(isConfirm ? "전체 내역이 확정되었습니다." : "내역이 저장/수정되었습니다.");
      setIsDialogOpen(false);
      setItemsToAdd([]);
      setEditingBatchId(null);
      setFormData({ ...defaultFormData });
    } catch (err) {
      console.error("Batch submission error:", err);
      toast.error("처리에 실패했습니다. 콘솔을 확인해 주세요.");
    }
  };

  const openBatchEdit = (batchId: string, mode: 'edit' | 'confirm' = 'edit') => {
    const batch = batches.find(b => b.id === batchId);
    if (!batch) return;

    setEditingBatchId(batchId);
    setEditingPurchase(null);
    setDialogMode(mode);
    setFormData({
      ...defaultFormData,
      name: batch.name,
      scheduled_date: batch.date
    });
    setItemsToAdd(batch.items.map((p: any) => ({
      supplier_id: p.supplier_id || "none",
      supplier_name: p.supplier_id ? supplierMap.get(p.supplier_id)?.name : "",
      material_id: p.material_id || "none",
      name: p.name || "",
      status: p.status,
      total_price: p.total_price,
      quantity: p.quantity,
      scheduled_date: p.scheduled_date || batch.date,
      payment_method: p.payment_method || "card",
      notes: p.notes || "",
      main_category: p.main_category, 
      mid_category: p.mid_category
    })));
    setIsDialogOpen(true);
  };

  const updateItemInBatch = (index: number, updates: Partial<PurchaseFormData>) => {
    setItemsToAdd(prev => prev.map((item, i) => i === index ? { ...item, ...updates } : item));
  };

  const removeItemFromBatch = (index: number) => {
    setItemsToAdd(prev => {
        const filtered = prev.filter((_, i) => i !== index);
        if (filtered.length === 0) return [{ ...defaultFormData, quantity: 1 }];
        return filtered;
    });
  };

  if (loading) {
      return <div className="p-8 flex justify-center items-center font-bold text-slate-400">데이터를 불러오는 중...</div>;
  }

  return (
    <div className="p-6 max-w-[1500px] mx-auto space-y-6">
      <PurchaseManualDialog open={isManualOpen} onOpenChange={setIsManualOpen} />
      
      {/* 커스텀 헤더 영역 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
          <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-50 rounded-xl">
                      <ShoppingCart className="size-6 text-indigo-600" />
                  </div>
                  <div className="flex items-center gap-2">
                      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">매입 관리</h1>
                      <button 
                          onClick={() => setIsManualOpen(true)}
                          className="inline-flex items-center justify-center p-2 rounded-xl bg-slate-100 hover:bg-indigo-100 hover:text-indigo-600 transition-all text-xl hover:scale-110 active:scale-95 shadow-sm border border-slate-200"
                          title="사용 메뉴얼 보기"
                      >
                          💡 <span className="text-xs font-bold ml-1">도움말</span>
                      </button>
                  </div>
              </div>
              <p className="text-slate-500 text-sm mt-1 ml-1">계획 기반의 자재 매입과 지출/재고 자동 동기화 시스템</p>
          </div>
          
          <div className="flex items-center gap-2">
              <Button
                  variant="outline"
                  size="sm"
                  className="h-10 bg-white border-slate-200 hover:bg-slate-50 text-slate-600 px-4 gap-2 transition-all"
                  onClick={() => {
                      setSearchTerm("");
                      setActiveTab("all");
                      toast.info("검색 필터가 초기화되었습니다.");
                  }}
              >
                  <RotateCcw className="w-4 h-4 text-slate-400" /> 초기화
              </Button>
              <Button
                  size="sm"
                  className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100 px-4 gap-2 transition-all hover:-translate-y-0.5 active:translate-y-0"
                  onClick={() => {
                      setEditingPurchase(null);
                      setDialogMode('create');
                      setFormData({ ...defaultFormData });
                      setItemsToAdd([{ ...defaultFormData, quantity: 1 }]); 
                      setIsDialogOpen(true);
                  }}
              >
                  <PlusCircle className="w-4 h-4" /> 새 매입(배치) 등록
              </Button>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
            { label: "예정 건수", val: `${stats.plannedCount}건`, sub: "미집행 내역", icon: CalendarIcon, color: "blue" },
            { label: "예정 합계", val: `₩${stats.plannedAmount.toLocaleString()}`, sub: "지출 예정액", icon: TrendingUp, color: "indigo" },
            { label: "누적 건수", val: `${stats.totalCount}건`, sub: "전체 기록", icon: LayoutGrid, color: "slate" },
            { label: "누적 총액", val: `₩${stats.totalAmount.toLocaleString()}`, sub: "전체 지출액", icon: FileText, color: "emerald" }
        ].map((s, idx) => (
            <Card key={idx} className="border-slate-200/60 shadow-sm border-l-4" style={{ borderColor: s.color === 'blue' ? '#3b82f6' : s.color === 'indigo' ? '#6366f1' : s.color === 'emerald' ? '#10b981' : '#94a3b8' }}>
                <CardHeader className="pb-2 pt-4">
                    <CardDescription className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                        <s.icon className="w-3 h-3" /> {s.label}
                    </CardDescription>
                    <CardTitle className="text-xl font-black">{s.val}</CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                    <span className="text-[10px] text-slate-400 font-medium">{s.sub}</span>
                </CardContent>
            </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex items-center justify-between gap-4 bg-slate-100/50 p-1.5 rounded-xl border border-slate-200/60">
            <TabsList className="bg-transparent gap-1">
                <TabsTrigger value="batches" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-4">배치(폴더) 보기</TabsTrigger>
                <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-4">전체 내역 (리스트)</TabsTrigger>
            </TabsList>
            <div className="relative w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                    placeholder="품목, 거래처 검색..." 
                    className="pl-9 h-9 bg-white border-slate-200 text-sm focus-visible:ring-indigo-500"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        <TabsContent value="batches" className="mt-0">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow className="hover:bg-transparent border-b border-slate-200">
                            <TableHead className="w-10"></TableHead>
                            <TableHead>배치명</TableHead>
                            <TableHead className="w-40 text-center">일자정보</TableHead>
                            <TableHead className="w-32 text-right">총 매입액</TableHead>
                            <TableHead className="w-24 text-center">진행</TableHead>
                            <TableHead className="w-40 text-right">관리</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {batches.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-20 text-slate-400 font-medium">검색 결과가 없거나 매입 배치가 없습니다.</TableCell>
                            </TableRow>
                        ) : batches.map((batch) => (
                            <Fragment key={batch.id}>
                                <TableRow 
                                    className={`group cursor-pointer transition-colors ${selectedBatchId === batch.id ? "bg-indigo-50/30" : "hover:bg-slate-50/80"}`}
                                    onClick={() => setSelectedBatchId(selectedBatchId === batch.id ? null : batch.id)}
                                >
                                    <TableCell className="text-center">
                                        <FolderOpen className={`size-4 ${selectedBatchId === batch.id ? "text-indigo-500" : "text-slate-400"}`} />
                                    </TableCell>
                                    <TableCell className="font-bold text-slate-900 truncate max-w-[200px]">
                                        {batch.name}
                                        <div className="text-[9px] text-slate-400 font-medium">#{batch.id}</div>
                                    </TableCell>
                                    <TableCell className="text-slate-500 font-medium text-[11px] py-2">
                                        <div className="flex flex-col gap-0.5 items-center justify-center">
                                            {batch.items[0]?.status === 'completed' && (
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                                        <Check className="size-2.5" /> 
                                                        매입: {batch.items[0]?.purchase_date ? format(new Date(batch.items[0].purchase_date), "yyyy-MM-dd HH:mm") : '-'}
                                                    </span>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="h-6 px-2 text-[10px] text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (confirm('이 배치의 모든 매입 확정을 취소하시겠습니까? 지출 내역도 함께 삭제됩니다.')) {
                                                                cancelBatchConfirmation(batch.id);
                                                            }
                                                        }}
                                                    >
                                                        확정 취소
                                                    </Button>
                                                </div>
                                            )}
                                            {batch.items[0]?.status === 'planned' && (
                                                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mt-1">
                                                    <Clock className="size-2.5" /> 계획: {batch.date}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-black text-slate-900">₩{batch.total.toLocaleString()}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant={batch.status === 'completed' ? "default" : "outline"} className={cn("text-[9px] px-1.5 h-4", batch.status === 'completed' ? "bg-emerald-500" : "text-amber-600 border-amber-200")}>
                                            {batch.status === 'completed' ? "완료" : "예정"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-3">
                                            <Badge variant="secondary" className="px-1.5 py-0 text-[10px] h-5 font-bold bg-white border border-slate-200 text-indigo-600">
                                                {batch.items.length}개 품목
                                            </Badge>
                                            <div className="flex gap-1 transition-all">
                                                {batch.status !== 'completed' && (
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-500 hover:bg-emerald-50 hover:scale-110 active:scale-95 transition-all" onClick={(e) => { e.stopPropagation(); openBatchEdit(batch.id, 'confirm'); }} title="최종 확정"><CheckCircle2 className="w-4 h-4" /></Button>
                                                )}
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-indigo-500 hover:bg-indigo-50 hover:scale-110 active:scale-95 transition-all" onClick={(e) => { e.stopPropagation(); handleDownloadBatchExcel(batch.id, batch.name); }} title="엑셀 다운로드"><FileDown className="w-4 h-4" /></Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-indigo-500 hover:bg-slate-100 hover:scale-110 active:scale-95 transition-all" onClick={(e) => { e.stopPropagation(); openBatchEdit(batch.id, 'edit'); }} title="정보 수정"><Edit2 className="w-4 h-4" /></Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:bg-red-50 hover:text-red-600 hover:scale-110 active:scale-95 transition-all" onClick={(e) => { e.stopPropagation(); handleDeleteBatch(batch.id, batch.name); }} title="배치 삭제"><Trash2 className="w-4 h-4" /></Button>
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>

                                {/* 펼침 시 나타나는 상세 품목 목록 */}
                                {selectedBatchId === batch.id && (
                                    <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                                        <TableCell colSpan={6} className="p-0 border-t-0">
                                            <div className="px-8 py-5 flex flex-col gap-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1 h-3 bg-indigo-500 rounded-full" />
                                                        <span className="text-xs font-black text-slate-500 uppercase tracking-tighter">구매 상세 품목 구성</span>
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 font-bold tracking-widest">{batch.items.length} ITEMS FOUND</span>
                                                </div>
                                                <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
                                                    <Table>
                                                        <TableHeader className="bg-slate-50/80">
                                                            <TableRow className="hover:bg-transparent border-b border-slate-100">
                                                                <TableHead className="h-8 text-[10px] font-black text-slate-400 py-0">품목명</TableHead>
                                                                <TableHead className="h-8 text-[10px] font-black text-slate-400 py-0">거래처</TableHead>
                                                                <TableHead className="h-8 text-right text-[10px] font-black text-slate-400 py-0">수량</TableHead>
                                                                <TableHead className="h-8 text-right text-[10px] font-black text-slate-400 py-0">총 합계</TableHead>
                                                                <TableHead className="h-8 text-center text-[10px] font-black text-slate-400 py-0">상태</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {batch.items.map((item) => (
                                                                <TableRow key={item.id} className="hover:bg-indigo-50/20 border-b border-slate-50 last:border-none">
                                                                    <TableCell className="py-2">
                                                                        <div className="flex flex-col gap-0.5">
                                                                            <span className="text-xs font-bold text-slate-700">{materialMap.get(item.material_id || "")?.name || item.name}</span>
                                                                            <span className="text-[9px] text-slate-400">
                                                                                #{materialMap.get(item.material_id || "")?.main_category || item.main_category || "기타"} 
                                                                                {(materialMap.get(item.material_id || "")?.mid_category || item.mid_category) && ` > ${materialMap.get(item.material_id || "")?.mid_category || item.mid_category}`}
                                                                            </span>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="py-2 text-xs text-slate-500 font-medium">
                                                                        {supplierMap.get(item.supplier_id || "")?.name || "기타"}
                                                                    </TableCell>
                                                                    <TableCell className="py-2 text-right text-xs font-mono font-black text-slate-400">
                                                                        {item.quantity.toLocaleString()}
                                                                    </TableCell>
                                                                    <TableCell className="py-2 text-right text-xs font-black text-indigo-600">
                                                                        ₩{item.total_price.toLocaleString()}
                                                                    </TableCell>
                                                                    <TableCell className="py-2 text-center">
                                                                        <div className={cn("inline-flex items-center gap-1 text-[9px] font-bold", item.status === 'completed' ? "text-emerald-500" : "text-amber-500")}>
                                                                            <Circle className="size-1.5 fill-current" />
                                                                            {item.status === 'completed' ? "확정" : "예정"}
                                                                        </div>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </Fragment>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </TabsContent>

        <TabsContent value="all" className="m-0">
            <div className="flex flex-wrap items-center gap-4 mb-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase">기간</Label>
                    <div className="flex items-center gap-1">
                        <Input type="date" className="h-9 text-xs w-36" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} />
                        <span className="text-slate-300">~</span>
                        <Input type="date" className="h-9 text-xs w-36" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase">품목</Label>
                    <Select value={filterMaterialId} onValueChange={(val) => setFilterMaterialId(val || "all")}>
                        <SelectTrigger className="h-9 text-xs w-44">
                            <SelectValue placeholder="전체" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">전체 품목</SelectItem>
                            {materials.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase">거래처</Label>
                    <Select value={filterSupplierId} onValueChange={(val) => setFilterSupplierId(val || "all")}>
                        <SelectTrigger className="h-9 text-xs w-44">
                            <SelectValue placeholder="전체" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">전체 거래처</SelectItem>
                            {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-9 text-xs gap-2 border-slate-200 hover:bg-slate-50"
                        onClick={() => {
                            setFilterStartDate("");
                            setFilterEndDate("");
                            setFilterMaterialId("all");
                            setFilterSupplierId("all");
                            setSearchTerm("");
                        }}
                    >
                        필터 초기화
                    </Button>
                    <Button 
                        size="sm" 
                        className="h-9 text-xs gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={handleExportFilteredExcel}
                    >
                        <FileDown className="w-4 h-4" /> 엑셀 다운로드
                    </Button>
                </div>
            </div>

            <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow className="border-b border-slate-100 hover:bg-transparent">
                            <TableHead className="w-32 text-[11px] font-bold">일자 정보</TableHead>
                            <TableHead className="text-[11px] font-bold">품목 정보</TableHead>
                            <TableHead className="text-[11px] font-bold">거래처</TableHead>
                            <TableHead className="w-20 text-right text-[11px] font-bold">수량</TableHead>
                            <TableHead className="w-32 text-right text-[11px] font-bold">총액</TableHead>
                            <TableHead className="w-20 text-center text-[11px] font-bold">상태</TableHead>
                            <TableHead className="w-20 text-right text-[11px] font-bold pr-6">관리</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredPurchases.length === 0 ? (
                            <TableRow><TableCell colSpan={7} className="h-64 text-center text-slate-400">내역이 없습니다.</TableCell></TableRow>
                        ) : filteredPurchases.map(p => (
                            <TableRow key={p.id} className="group hover:bg-indigo-50/20 transition-colors border-b border-slate-50 last:border-0 h-16">
                                <TableCell className="text-[10px] text-slate-400 font-medium py-3">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="flex items-center gap-1 whitespace-nowrap"><Clock className="size-2.5 text-slate-300" /> 계획: {p.scheduled_date || "-"}</span>
                                        {p.purchase_date && (
                                            <span className="flex items-center gap-1 text-emerald-600 font-black whitespace-nowrap">
                                                <Check className="size-2.5" /> 매입: {p.purchase_date}
                                            </span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-sm font-bold text-slate-700">{p.name || materialMap.get(p.material_id || "")?.name || "미지정"}</span>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 border-indigo-100 text-indigo-600 hover:bg-indigo-50 font-bold text-[11px]"
                                                onClick={() => {
                                                    setEditingPurchase(p);
                                                    setDialogMode('edit');
                                                    setFormData({
                                                        id: p.id,
                                                        supplier_id: p.supplier_id || "none",
                                                        material_id: p.material_id || "none",
                                                        name: p.name || "",
                                                        status: p.status,
                                                        total_price: p.total_price,
                                                        quantity: p.quantity,
                                                        scheduled_date: p.scheduled_date || format(new Date(), "yyyy-MM-dd"),
                                                        purchase_date: p.purchase_date,
                                                        payment_method: p.payment_method || "card",
                                                        notes: p.notes || "",
                                                        main_category: p.main_category,
                                                        mid_category: p.mid_category
                                                    });
                                                    setIsDialogOpen(true);
                                                }}
                                            >
                                                <Edit2 className="w-3.5 h-3.5 mr-1" /> 상세수정
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="h-8 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[11px]"
                                                onClick={() => {
                                                    setEditingPurchase(p);
                                                    setDialogMode('confirm');
                                                    setFormData({
                                                        id: p.id,
                                                        supplier_id: p.supplier_id || "none",
                                                        material_id: p.material_id || "none",
                                                        name: p.name || "",
                                                        status: p.status,
                                                        total_price: p.total_price,
                                                        quantity: p.quantity,
                                                        scheduled_date: p.scheduled_date || format(new Date(), "yyyy-MM-dd"),
                                                        purchase_date: p.purchase_date,
                                                        payment_method: p.payment_method || "card",
                                                        notes: p.notes || "",
                                                        main_category: p.main_category,
                                                        mid_category: p.mid_category
                                                    });
                                                    setIsDialogOpen(true);
                                                }}
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> 매입확정
                                            </Button>
                                        </div>
                                        {p.material_id && (
                                            <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                                <span className="text-[10px] text-slate-400 font-medium">
                                                    #{materialMap.get(p.material_id || "")?.main_category || p.main_category || "기타"} 
                                                    {(materialMap.get(p.material_id || "")?.mid_category || p.mid_category) && ` > ${materialMap.get(p.material_id || "")?.mid_category || p.mid_category}`}
                                                </span>
                                                {p.notes && <span className="text-[10px] text-slate-300">| {p.notes}</span>}
                                            </div>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-xs font-semibold text-slate-500">
                                    {p.supplier_id ? supplierMap.get(p.supplier_id)?.name || "-" : "-"}
                                </TableCell>
                                <TableCell className="text-right text-xs font-mono font-bold text-slate-400">
                                    {p.quantity.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right font-black text-slate-900 tracking-tighter">
                                    ₩{p.total_price.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-center">
                                    <Badge variant={p.status === 'completed' ? "default" : "outline"} className={cn("text-[9px] px-1.5 h-5", p.status === 'completed' ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "text-amber-600 border-amber-200")}>
                                        {p.status === 'completed' ? "완료" : "예정"}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 bg-red-50 hover:bg-red-100" onClick={async () => {
                                            if(confirm("정말 삭제하시겠습니까?")) await deletePurchase(p.id);
                                        }}>
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </TabsContent>

      </Tabs>

      {/* --- Batch Input / Edit Dialog --- */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if(!open) {
              setEditingBatchId(null);
              setEditingPurchase(null);
          }
      }}>
          <DialogContent className="max-w-[1100px] w-[95vw] h-[90vh] flex flex-col p-0 gap-0 border-none shadow-2xl overflow-hidden rounded-2xl">
              <div className="bg-slate-900 text-white p-6 shrink-0 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <div className={cn(
                          "p-2.5 rounded-xl shadow-inner",
                          dialogMode === 'create' ? "bg-indigo-50" : dialogMode === 'edit' ? "bg-amber-50" : "bg-emerald-50"
                      )}>
                          {dialogMode === 'create' ? <PlusCircle className="size-6 text-indigo-600" /> : 
                           dialogMode === 'edit' ? <Pencil className="size-6 text-amber-600" /> : 
                           <CheckCircle2 className="size-6 text-emerald-600" />}
                      </div>
                      <div className="flex flex-col gap-0.5">
                          <DialogTitle className="text-2xl font-black text-white tracking-tighter">
                              {dialogMode === 'create' ? "신규 매입 배치 등록 (계획)" : 
                               dialogMode === 'edit' ? "매입 정보 상세 수정" : 
                               "최종 매입 정보 확정"}
                          </DialogTitle>
                          <DialogDescription className="text-sm font-medium text-slate-400">
                              {dialogMode === 'create' ? "오늘 매입할 품목들을 리스트로 구성하여 계획을 수립합니다." : 
                               dialogMode === 'edit' ? "기존 등록된 매입 정보의 수량이나 단가 등을 수정합니다." : 
                               "내용을 확인하고 확정하면 재고가 업데이트되고 지출이 기록됩니다."}
                          </DialogDescription>
                      </div>
                  </div>
                  <Button variant="ghost" className="text-white hover:bg-white/10 h-8 w-8 p-0 shrink-0 rounded-full" onClick={() => setIsDialogOpen(false)}>
                      <X className="w-4 h-4" />
                  </Button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col bg-slate-50">
                  {/* Global settings */}
                  <div className="p-6 bg-white border-b border-slate-200 shadow-sm shrink-0 grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="space-y-1.5">
                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">배치/매입 명칭</Label>
                          <Input 
                              lang="ko"
                              autoFocus
                              placeholder="예: 3월 본사 자재 구매" 
                              className="h-10 text-sm font-bold bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-100" 
                              value={formData.name}
                              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          />
                      </div>
                      <div className="space-y-1.5">
                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">예정/완료 일자</Label>
                          <div className="relative">
                            <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input 
                                type="date" 
                                className="h-10 pl-9 text-sm font-bold bg-slate-50 border-slate-200" 
                                value={formData.scheduled_date}
                                onChange={e => setFormData(prev => ({ ...prev, scheduled_date: e.target.value }))}
                            />
                          </div>
                      </div>
                      <div className="space-y-1.5">
                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">결제 방식 (공통)</Label>
                          <Select 
                              value={formData.payment_method} 
                              onValueChange={(v: string | null) => v && setFormData(prev => ({ ...prev, payment_method: v }))}
                          >
                              <SelectTrigger className="h-10 text-sm font-bold bg-slate-50 border-slate-200">
                                  <SelectValue>
                                      {formData.payment_method === 'card' ? '신용카드' : 
                                       formData.payment_method === 'transfer' ? '계좌이체' : 
                                       formData.payment_method === 'cash' ? '현금' : 
                                       formData.payment_method === 'deferred' ? '외상(미지급)' : '결제 방식'}
                                  </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="card">신용카드</SelectItem>
                                  <SelectItem value="transfer">계좌이체</SelectItem>
                                  <SelectItem value="cash">현금</SelectItem>
                                  <SelectItem value="deferred">외상(미지급)</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                      <div className="space-y-1.5">
                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">진행 상태 (공통)</Label>
                          <Select 
                              value={formData.status} 
                              onValueChange={(v: string | null) => v && setFormData(prev => ({ ...prev, status: v as "planned" | "completed" }))}
                          >
                              <SelectTrigger className="h-10 text-sm font-bold bg-slate-50 border-slate-200">
                                  <SelectValue>
                                      {formData.status === 'planned' ? '지출 예정' : '지출 완료'}
                                  </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="planned">지출 예정</SelectItem>
                                  <SelectItem value="completed">지출 완료</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                  </div>

                  {/* Grid Table */}
                  <div className="flex-1 overflow-auto p-6">
                      {!editingPurchase && (
                          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-4">
                              <Table>
                                  <TableHeader className="bg-slate-50 border-b">
                                      <TableRow className="hover:bg-transparent">
                                          <TableHead className="text-[10px] font-black uppercase text-slate-400 py-3">품목 명칭 (자재 자동매칭)</TableHead>
                                          <TableHead className="text-[10px] font-black uppercase text-slate-400 py-3 w-[220px]">구매처</TableHead>
                                          <TableHead className="text-[10px] font-black uppercase text-slate-400 py-3 w-[100px] text-right">수량</TableHead>
                                          <TableHead className="text-[10px] font-black uppercase text-slate-400 py-3 w-[120px] text-right">단가</TableHead>
                                          <TableHead className="text-[10px] font-black uppercase text-slate-400 py-3 w-[140px] text-right">총 금액</TableHead>
                                          <TableHead className="text-[10px] font-black uppercase text-slate-400 py-3">메모</TableHead>
                                          <TableHead className="text-[10px] font-black uppercase text-slate-400 py-3 w-[60px] text-center"></TableHead>
                                      </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                      {itemsToAdd.map((p, idx) => (
                                          <MemoizedBatchItemRow 
                                              key={idx}
                                              index={idx}
                                              item={p}
                                              materials={materials}
                                              suppliers={suppliers}
                                              latestSupplierMap={latestSupplierMap}
                                              openMaterialRow={openMaterialRow}
                                              setOpenMaterialRow={setOpenMaterialRow}
                                              openSupplierRow={openSupplierRow}
                                              setOpenSupplierRow={setOpenSupplierRow}
                                              updateItemInBatch={updateItemInBatch}
                                              removeItemFromBatch={removeItemFromBatch}
                                              categories={categories}
                                          />
                                      ))}
                                  </TableBody>
                              </Table>
                              <div className="p-4 bg-slate-50/50 border-t border-dotted flex justify-center">
                                  <Button 
                                      variant="ghost" 
                                      className="text-indigo-600 font-bold hover:bg-indigo-50 border border-indigo-100 rounded-lg px-8 transition-all active:scale-95" 
                                      onClick={() => setItemsToAdd(prev => [...prev, { ...defaultFormData, quantity: 1 }])}
                                  >
                                      <Plus className="w-4 h-4 mr-2" /> 품목 추가하기
                                  </Button>
                              </div>
                          </div>
                      )}

                      {/* Single edit mode fallback */}
                      {editingPurchase && (
                        <Card className="max-w-md mx-auto">
                            <CardHeader><CardTitle>개별 품목 수정</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label>수량</Label>
                                    <Input type="number" value={formData.quantity} onChange={e => setFormData(prev => ({ ...prev, quantity: Number(e.target.value) }))} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>합계 금액</Label>
                                    <Input type="number" value={formData.total_price} onChange={e => setFormData(prev => ({ ...prev, total_price: Number(e.target.value) }))} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>참고 메모</Label>
                                    <Textarea value={formData.notes} onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))} />
                                </div>
                            </CardContent>
                        </Card>
                      )}
                  </div>

                  <div className="p-6 bg-white border-t border-slate-200 shrink-0 flex items-center justify-between shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
                      <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">배치 총 합계 (자동 계산)</span>
                          <span className="text-2xl font-black text-slate-800 tracking-tighter">
                            ₩{itemsToAdd.reduce((sum, item) => sum + item.total_price, 0).toLocaleString()} <span className="text-lg font-normal text-slate-400 ml-1">원</span>
                          </span>
                      </div>
                       <div className="flex gap-2">
                         <Button variant="outline" className="h-12 px-6 font-bold border-slate-200" onClick={() => setIsDialogOpen(false)}>취소</Button>
                         <Button 
                             variant={dialogMode === 'confirm' ? "outline" : "default"}
                             className={cn(
                                 "h-12 px-6 font-bold shadow-sm",
                                 dialogMode === 'confirm' ? "border-indigo-200 text-indigo-600 hover:bg-indigo-50" : "bg-indigo-600 hover:bg-indigo-700 text-white border-none px-8"
                             )} 
                             onClick={() => handleSaveOrConfirm(false)}
                         >
                             <Save className="w-4 h-4 mr-2" /> 
                             {dialogMode === 'create' ? "매입 계획 저장" : "수정 사항 저장"}
                         </Button>
                         
                         {dialogMode === 'confirm' && (
                             <Button 
                                 className="h-12 px-8 bg-emerald-600 hover:bg-black text-white font-black shadow-xl shadow-emerald-100 transition-all active:scale-95" 
                                 onClick={() => handleSaveOrConfirm(true)}
                             >
                                 <CheckCircle2 className="w-4 h-4 mr-2" /> 매입 정보 최종 확정
                             </Button>
                         )}
                       </div>
                  </div>
              </div>
          </DialogContent>
      </Dialog>
    </div>
  );
}
