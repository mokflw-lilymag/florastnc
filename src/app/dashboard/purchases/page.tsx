"use client";
import { getMessages } from "@/i18n/getMessages";

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
import { usePreferredLocale } from "@/hooks/use-preferred-locale";

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
  categories,
  tf
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
                    <PlusCircle className="size-3" /> {tf.f01493}: {item.name}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="grid grid-cols-[50px_1fr] items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-blue-200 text-blue-600 bg-white font-bold inline-flex justify-center">{tf.f01074}</Badge>
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
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-indigo-200 text-indigo-600 bg-white font-bold inline-flex justify-center">{tf.f01887}</Badge>
                    <select
                      className="text-[11px] bg-white border border-indigo-200 rounded-md px-2 h-7 focus:ring-2 focus:ring-indigo-100 outline-none w-full font-medium text-slate-700 shadow-sm disabled:bg-slate-50 disabled:text-slate-400"
                      value={item.mid_category || ""}
                      disabled={!categories.mid[item.main_category || "기타"] || categories.mid[item.main_category || "기타"].length === 0}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateItemInBatch(index, { mid_category: e.target.value })}
                    >
                      <option value="">{tf.f02162}</option>
                      {categories.mid[item.main_category || "기타"]?.map((cat: string) => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-start gap-0.5 overflow-hidden w-full group">
                <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">
                  {currentMaterial?.name || item.name || <span className="text-slate-300">{tf.f02127}</span>}
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
                  placeholder={tf.f02125}
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
                          {tf.f00148}: {Math.round(Number(m.price)).toLocaleString()}{tf.f00487} | {m.main_category}
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
                  <Plus className="mr-2 h-4 w-4" /> &quot;{matSearch}&quot; ({tf.f01738})
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
                <span className="text-indigo-600 font-bold">[{tf.f00415}] {item.supplier_name}</span> :
                (currentSupplier?.name || <span className="text-slate-300">{tf.f00877}</span>)
              }
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-40 shrink-0" />
          </PopoverTrigger>
          <PopoverContent className="w-[240px] p-0" align="start">
            <div className="p-2 border-b">
              <Input
                lang="ko"
                placeholder={tf.f00873}
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
              >{tf.f01928}</Button>
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
                  <Plus className="mr-2 h-4 w-4" /> &quot;{supSearch}&quot; ({tf.f00881})
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
            placeholder={tf.f01063}
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
            {tf.f02328.replace(
              "{price}",
              Math.round(Number(currentMaterial.price)).toLocaleString()
            )}
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
          placeholder={tf.f01184}
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

const PurchaseManualDialog = ({
  open,
  onOpenChange,
  tf,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tf: Record<string, string>;
}) => (
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
            <DialogTitle className="text-2xl font-black tracking-tight text-white">{tf.f01155}</DialogTitle>
          </div>
          <DialogDescription className="text-indigo-100/80 text-base">
            {tf.f00985}
          </DialogDescription>
        </DialogHeader>
      </div>

      <div className="p-8 space-y-8">
        {/* Step 1 */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors">1</div>
            <h3 className="font-black text-slate-800 text-lg">{tf.f01373}</h3>
          </div>
          <div className="pl-10 space-y-2">
            <p className="text-sm text-slate-600 leading-relaxed">{tf.f00799}</p>
          </div>
        </section>

        {/* Step 2: NEW FILTER & EXCEL */}
        <section className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-sm group-hover:bg-emerald-600 group-hover:text-white transition-colors">2</div>
            <h3 className="font-black text-slate-800 text-lg">{tf.f01794}</h3>
          </div>
          <div className="pl-10 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2">
                <span className="text-emerald-600 font-bold text-sm flex items-center gap-1"><Filter className="w-3.5 h-3.5" /> {tf.f01465}</span>
                <p className="text-xs text-slate-500 leading-relaxed">{tf.f01026}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2">
                <span className="text-emerald-600 font-bold text-sm flex items-center gap-1"><FileDown className="w-3.5 h-3.5" /> {tf.f01551}</span>
                <p className="text-xs text-slate-500 leading-relaxed">{tf.f02160}</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 italic">{tf.f00800}</p>
          </div>
        </section>

        {/* Step 3 */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors">3</div>
            <h3 className="font-black text-slate-800 text-lg">{tf.f01344}</h3>
          </div>
          <div className="pl-10 space-y-4">
            <div className="flex items-start gap-3 bg-amber-50/50 p-4 rounded-xl border border-amber-100">
              <Zap className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-slate-800 text-sm">{tf.f01152}</span>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {tf.f00819}<br />
                  {tf.f00826}<br />
                  {tf.f00837}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
              <PlusCircle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-slate-800 text-sm">{tf.f01495}</span>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {tf.f01157}<br />
                  {tf.f01011}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
              <LayoutGrid className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-slate-800 text-sm">{tf.f00835}</span>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {tf.f01733}
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">{tf.f00803}</p>
          </div>
        </section>

        <section className="space-y-4 border-t pt-6">
          <div className="flex items-center gap-2">
            <Edit2 className="w-4 h-4 text-slate-400" />
            <h3 className="font-bold text-slate-700">{tf.f02026}</h3>
          </div>
          <div className="pl-6 text-sm text-slate-600 space-y-1">
            <p>{tf.f00801}</p>
            <p>{tf.f00802}</p>
          </div>
        </section>

        <div className="pt-2">
          <Button onClick={() => onOpenChange(false)} className="w-full bg-slate-900 hover:bg-slate-800 text-white h-12 rounded-xl font-bold shadow-lg shadow-slate-200 transition-all">
            {tf.f01148}
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
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const materialMainCategoryLabel = useMemo(() => {
    const t = getMessages(locale).tenantFlows;
    const m: Record<string, string> = {
      생화: t.f02394,
      분화: t.f02395,
      서양란: t.f02396,
      동양란: t.f02397,
      화환: t.f02398,
      자재: t.f02399,
      기타: t.f00115,
      식물: t.f02421,
      부자재: t.f02422,
      "바구니 / 화기": t.f02423,
      "소모품 및 부자재": t.f02424,
      조화: t.f02425,
      프리저브드: t.f02426,
      포장재: t.f02427,
      리본: t.f02428,
    };
    return (v: string | undefined) => (v ? m[v] || v : t.f00115);
  }, [locale]);
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
      toast.error(tf.f01061);
      return;
    }

    const exportData = batchItems.map((item, index) => ({
      [tf.f01461]: index + 1,
      [tf.f02132]: item.name,
      [tf.f01163]: supplierMap.get(item.supplier_id || "")?.name || tf.f00224,
      [tf.f00377]: item.quantity,
      [tf.f00148]: item.quantity > 0 ? Math.round(item.total_price / item.quantity) : 0,
      [tf.f02168]: item.total_price,
      [tf.f00197]: item.notes || ""
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, tf.f01162);

    const wscols = [
      { wch: 5 },  // 순번
      { wch: 30 }, // 품목명
      { wch: 15 }, // 매입처
      { wch: 8 },  // 수량
      { wch: 12 }, // 단가
      { wch: 15 }, // 합계금액
      { wch: 40 }  // 메모
    ];
    worksheet['!cols'] = wscols;

    XLSX.writeFile(
      workbook,
      `${tf.f02330}_${batchName}_${format(new Date(), "MMdd")}.xlsx`
    );
    toast.success(tf.f01554);
  };

  const handleDeleteBatch = async (batchId: string, batchName: string) => {
    const batchDeleteCount = purchases.filter(
      (p) =>
        p.batch_id === batchId ||
        (!p.batch_id && "legacy-" + (p.scheduled_date || tf.f01028) === batchId)
    ).length;
    if (
      !confirm(
        tf.f02304.replace("{batch}", batchName).replace("{count}", String(batchDeleteCount))
      )
    )
      return;

    const itemsToDelete = purchases.filter(p =>
      p.batch_id === batchId || (!p.batch_id && "legacy-" + (p.scheduled_date || tf.f01028) === batchId)
    );

    const deletePromises = itemsToDelete.map(p => deletePurchase(p.id));
    await Promise.all(deletePromises);
    toast.success(tf.f01244);
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

      const date = p.scheduled_date || tf.f01028;
      const key = p.batch_id || `legacy-${date}`;

      if (!groups[key]) {
        groups[key] = {
          id: key,
          date,
          purchaseDate: p.purchase_date,
          name: p.batch_name || `${date} ${tf.f01156}`,
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
      toast.error(tf.f01061);
      return;
    }

    const exportData = filteredPurchases.map((item, index) => ({
      [tf.f01461]: index + 1,
      [tf.f01717]: item.scheduled_date || "-",
      [tf.f02220]: item.purchase_date || "-",
      [tf.f02132]: item.name || (item.material_id ? materialMap.get(item.material_id)?.name : tf.f00224),
      [tf.f01163]: item.supplier_id ? supplierMap.get(item.supplier_id)?.name : tf.f00224,
      [tf.f00377]: item.quantity,
      [tf.f02003]: item.total_price,
      [tf.f00925]: item.payment_method === 'card' ? tf.f00704 : item.payment_method === 'transfer' ? tf.f01693 : item.payment_method === 'cash' ? tf.f00769 : item.payment_method === 'deferred' ? tf.f01620 : item.payment_method || "-",
      [tf.f00319]: item.status === 'completed' ? tf.f00471 : tf.f01596,
      [tf.f01074]: item.main_category || (item.material_id ? materialMap.get(item.material_id)?.main_category : ""),
      [tf.f01887]: item.mid_category || (item.material_id ? materialMap.get(item.material_id)?.mid_category : ""),
      [tf.f00197]: item.notes || ""
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, tf.f01810);
    XLSX.writeFile(workbook, `${tf.f02331}_${format(new Date(), "yyyyMMdd")}.xlsx`);
    toast.success(tf.f02159);
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
      toast.success(isConfirm ? tf.f01032 : tf.f01030);
      return;
    }

    if (itemsToAdd.length === 0) {
      toast.error(tf.f01124);
      return;
    }

    const batchId = editingBatchId && !editingBatchId.startsWith('legacy-') ? editingBatchId : crypto.randomUUID();
    const batchName = formData.name || tf.f02329.replace("{date}", formData.scheduled_date);

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
      toast.success(isConfirm ? tf.f01795 : tf.f01031);
      setIsDialogOpen(false);
      setItemsToAdd([]);
      setEditingBatchId(null);
      setFormData({ ...defaultFormData });
    } catch (err) {
      console.error("Batch submission error:", err);
      toast.error(tf.f01979);
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
    return <div className="p-8 flex justify-center items-center font-bold text-slate-400">{tf.f00157}</div>;
  }

  return (
    <div className="p-6 max-w-[1500px] mx-auto space-y-6">
      <PurchaseManualDialog open={isManualOpen} onOpenChange={setIsManualOpen} tf={tf} />

      {/* 커스텀 헤더 영역 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 rounded-xl">
              <ShoppingCart className="size-6 text-indigo-600" />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{tf.f01154}</h1>
              <button
                onClick={() => setIsManualOpen(true)}
                className="inline-flex items-center justify-center p-2 rounded-xl bg-slate-100 hover:bg-indigo-100 hover:text-indigo-600 transition-all text-xl hover:scale-110 active:scale-95 shadow-sm border border-slate-200"
                title={tf.f01320}
              >
                💡 <span className="text-xs font-bold ml-1">{tf.f01101}</span>
              </button>
            </div>
          </div>
          <p className="text-slate-500 text-sm mt-1 ml-1">{tf.f00936}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-10 bg-white border-slate-200 hover:bg-slate-50 text-slate-600 px-4 gap-2 transition-all"
            onClick={() => {
              setSearchTerm("");
              setActiveTab("all");
              toast.info(tf.f00904);
            }}
          >
            <RotateCcw className="w-4 h-4 text-slate-400" /> {tf.f01987}
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
            <PlusCircle className="w-4 h-4" /> {tf.f01373}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
          { label: tf.f01597, val: `${stats.plannedCount}${tf.f00033}`, sub: tf.f01222, icon: CalendarIcon, color: "blue" },
          { label: tf.f01598, val: `₩${stats.plannedAmount.toLocaleString()}`, sub: tf.f01944, icon: TrendingUp, color: "indigo" },
          { label: tf.f01050, val: `${stats.totalCount}${tf.f00033}`, sub: tf.f01792, icon: LayoutGrid, color: "slate" },
          { label: tf.f01052, val: `₩${stats.totalAmount.toLocaleString()}`, sub: tf.f01805, icon: FileText, color: "emerald" }
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
            <TabsTrigger value="batches" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-4">{tf.f01242}</TabsTrigger>
            <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-4">{tf.f01793}</TabsTrigger>
          </TabsList>
          <div className="relative w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder={tf.f02131}
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
                  <TableHead>{tf.f01245}</TableHead>
                  <TableHead className="w-40 text-center">{tf.f01719}</TableHead>
                  <TableHead className="w-32 text-right">{tf.f01994}</TableHead>
                  <TableHead className="w-24 text-center">{tf.f01965}</TableHead>
                  <TableHead className="w-40 text-right">{tf.f00087}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-20 text-slate-400 font-medium">{tf.f00903}</TableCell>
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
                                {tf.f01151}: {batch.items[0]?.purchase_date ? format(new Date(batch.items[0].purchase_date), "yyyy-MM-dd HH:mm") : '-'}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-[10px] text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(tf.f02321)) {
                                    cancelBatchConfirmation(batch.id);
                                  }
                                }}
                              >
                                {tf.f02219}
                              </Button>
                            </div>
                          )}
                          {batch.items[0]?.status === 'planned' && (
                            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mt-1">
                              <Clock className="size-2.5" /> {tf.f00935}: {batch.date}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-black text-slate-900">₩{batch.total.toLocaleString()}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={batch.status === 'completed' ? "default" : "outline"} className={cn("text-[9px] px-1.5 h-4", batch.status === 'completed' ? "bg-emerald-500" : "text-amber-600 border-amber-200")}>
                          {batch.status === 'completed' ? tf.f00471 : tf.f01596}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Badge variant="secondary" className="px-1.5 py-0 text-[10px] h-5 font-bold bg-white border border-slate-200 text-indigo-600">
                            {batch.items.length}{tf.f00862}
                          </Badge>
                          <div className="flex gap-1 transition-all">
                            {batch.status !== 'completed' && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-500 hover:bg-emerald-50 hover:scale-110 active:scale-95 transition-all" onClick={(e) => { e.stopPropagation(); openBatchEdit(batch.id, 'confirm'); }} title={tf.f02024}><CheckCircle2 className="w-4 h-4" /></Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-indigo-500 hover:bg-indigo-50 hover:scale-110 active:scale-95 transition-all" onClick={(e) => { e.stopPropagation(); handleDownloadBatchExcel(batch.id, batch.name); }} title={tf.f01551}><FileDown className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-indigo-500 hover:bg-slate-100 hover:scale-110 active:scale-95 transition-all" onClick={(e) => { e.stopPropagation(); openBatchEdit(batch.id, 'edit'); }} title={tf.f00566}><Edit2 className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:bg-red-50 hover:text-red-600 hover:scale-110 active:scale-95 transition-all" onClick={(e) => { e.stopPropagation(); handleDeleteBatch(batch.id, batch.name); }} title={tf.f01240}><Trash2 className="w-4 h-4" /></Button>
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
                                <span className="text-xs font-black text-slate-500 uppercase tracking-tighter">{tf.f00986}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-bold tracking-widest">
                                {tf.f02429.replace("{count}", String(batch.items.length))}
                              </span>
                            </div>
                            <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
                              <Table>
                                <TableHeader className="bg-slate-50/80">
                                  <TableRow className="hover:bg-transparent border-b border-slate-100">
                                    <TableHead className="h-8 text-[10px] font-black text-slate-400 py-0">{tf.f02132}</TableHead>
                                    <TableHead className="h-8 text-[10px] font-black text-slate-400 py-0">{tf.f00872}</TableHead>
                                    <TableHead className="h-8 text-right text-[10px] font-black text-slate-400 py-0">{tf.f00377}</TableHead>
                                    <TableHead className="h-8 text-right text-[10px] font-black text-slate-400 py-0">{tf.f02002}</TableHead>
                                    <TableHead className="h-8 text-center text-[10px] font-black text-slate-400 py-0">{tf.f00319}</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {batch.items.map((item) => (
                                    <TableRow key={item.id} className="hover:bg-indigo-50/20 border-b border-slate-50 last:border-none">
                                      <TableCell className="py-2">
                                        <div className="flex flex-col gap-0.5">
                                          <span className="text-xs font-bold text-slate-700">{materialMap.get(item.material_id || "")?.name || item.name}</span>
                                          <span className="text-[9px] text-slate-400">
                                            #
                                            {materialMainCategoryLabel(
                                              materialMap.get(item.material_id || "")?.main_category ||
                                                item.main_category ||
                                                "기타"
                                            )}
                                            {(materialMap.get(item.material_id || "")?.mid_category || item.mid_category) &&
                                              ` > ${materialMap.get(item.material_id || "")?.mid_category || item.mid_category}`}
                                          </span>
                                        </div>
                                      </TableCell>
                                      <TableCell className="py-2 text-xs text-slate-500 font-medium">
                                        {supplierMap.get(item.supplier_id || "")?.name || tf.f00115}
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
                                          {item.status === 'completed' ? tf.f02217 : tf.f01596}
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
              <Label className="text-[10px] font-black text-slate-400 uppercase">{tf.f02323}</Label>
              <div className="flex items-center gap-1">
                <Input type="date" className="h-9 text-xs w-36" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} />
                <span className="text-slate-300">~</span>
                <Input type="date" className="h-9 text-xs w-36" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-[10px] font-black text-slate-400 uppercase">{tf.f02124}</Label>
              <Select value={filterMaterialId} onValueChange={(val) => setFilterMaterialId(val || "all")}>
                <SelectTrigger className="h-9 text-xs w-44">
                  <SelectValue placeholder={tf.f00553} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tf.f01806}</SelectItem>
                  {materials.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-[10px] font-black text-slate-400 uppercase">{tf.f00872}</Label>
              <Select value={filterSupplierId} onValueChange={(val) => setFilterSupplierId(val || "all")}>
                <SelectTrigger className="h-9 text-xs w-44">
                  <SelectValue placeholder={tf.f00553} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tf.f01790}</SelectItem>
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
                {tf.f02324}
              </Button>
              <Button
                size="sm"
                className="h-9 text-xs gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleExportFilteredExcel}
              >
                <FileDown className="w-4 h-4" /> {tf.f01551}
              </Button>
            </div>
          </div>

          <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="border-b border-slate-100 hover:bg-transparent">
                  <TableHead className="w-32 text-[11px] font-bold">{tf.f01718}</TableHead>
                  <TableHead className="text-[11px] font-bold">{tf.f02128}</TableHead>
                  <TableHead className="text-[11px] font-bold">{tf.f00872}</TableHead>
                  <TableHead className="w-20 text-right text-[11px] font-bold">{tf.f00377}</TableHead>
                  <TableHead className="w-32 text-right text-[11px] font-bold">{tf.f02003}</TableHead>
                  <TableHead className="w-20 text-center text-[11px] font-bold">{tf.f00319}</TableHead>
                  <TableHead className="w-20 text-right text-[11px] font-bold pr-6">{tf.f00087}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPurchases.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="h-64 text-center text-slate-400">{tf.f00133}</TableCell></TableRow>
                ) : filteredPurchases.map(p => (
                  <TableRow key={p.id} className="group hover:bg-indigo-50/20 transition-colors border-b border-slate-50 last:border-0 h-16">
                    <TableCell className="text-[10px] text-slate-400 font-medium py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="flex items-center gap-1 whitespace-nowrap"><Clock className="size-2.5 text-slate-300" /> {tf.f00935}: {p.scheduled_date || "-"}</span>
                        {p.purchase_date && (
                          <span className="flex items-center gap-1 text-emerald-600 font-black whitespace-nowrap">
                            <Check className="size-2.5" /> {tf.f02325.replace("{date}", p.purchase_date)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-bold text-slate-700">{p.name || materialMap.get(p.material_id || "")?.name || tf.f00224}</span>
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
                            <Edit2 className="w-3.5 h-3.5 mr-1" /> {tf.f02326}
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
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> {tf.f02327}
                          </Button>
                        </div>
                        {p.material_id && (
                          <div className="flex items-center gap-1.5 flex-wrap mt-1">
                            <span className="text-[10px] text-slate-400 font-medium">
                              #
                              {materialMainCategoryLabel(
                                materialMap.get(p.material_id || "")?.main_category || p.main_category || "기타"
                              )}
                              {(materialMap.get(p.material_id || "")?.mid_category || p.mid_category) &&
                                ` > ${materialMap.get(p.material_id || "")?.mid_category || p.mid_category}`}
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
                        {p.status === "completed" ? tf.f00471 : tf.f01596}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 bg-red-50 hover:bg-red-100" onClick={async () => {
                          if (confirm(tf.f02322)) await deletePurchase(p.id);
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
        if (!open) {
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
                  {dialogMode === 'create' ? tf.f01494 :
                    dialogMode === 'edit' ? tf.f01158 :
                      tf.f02023}
                </DialogTitle>
                <DialogDescription className="text-sm font-medium text-slate-400">
                  {dialogMode === 'create' ? tf.f01603 :
                    dialogMode === 'edit' ? tf.f01010 :
                      tf.f01035}
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
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{tf.f01243}</Label>
                <Input
                  lang="ko"
                  autoFocus
                  placeholder={tf.f01584}
                  className="h-10 text-sm font-bold bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{tf.f01599}</Label>
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
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{tf.f00913}</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(v: string | null) => v && setFormData(prev => ({ ...prev, payment_method: v }))}
                >
                  <SelectTrigger className="h-10 text-sm font-bold bg-slate-50 border-slate-200">
                    <SelectValue>
                      {formData.payment_method === 'card' ? tf.f01502 :
                        formData.payment_method === 'transfer' ? tf.f00057 :
                          formData.payment_method === 'cash' ? tf.f00769 :
                            formData.payment_method === 'deferred' ? tf.f01621 : tf.f00912}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="card">{tf.f01502}</SelectItem>
                    <SelectItem value="transfer">{tf.f00057}</SelectItem>
                    <SelectItem value="cash">{tf.f00769}</SelectItem>
                    <SelectItem value="deferred">{tf.f01621}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{tf.f01966}</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v: string | null) => v && setFormData(prev => ({ ...prev, status: v as "planned" | "completed" }))}
                >
                  <SelectTrigger className="h-10 text-sm font-bold bg-slate-50 border-slate-200">
                    <SelectValue>
                      {formData.status === 'planned' ? tf.f01943 : tf.f01945}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">{tf.f01943}</SelectItem>
                    <SelectItem value="completed">{tf.f01945}</SelectItem>
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
                        <TableHead className="text-[10px] font-black uppercase text-slate-400 py-3">{tf.f02126}</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-slate-400 py-3 w-[220px]">{tf.f00987}</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-slate-400 py-3 w-[100px] text-right">{tf.f00377}</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-slate-400 py-3 w-[120px] text-right">{tf.f00148}</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-slate-400 py-3 w-[140px] text-right">{tf.f01993}</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-slate-400 py-3">{tf.f00197}</TableHead>
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
                          tf={tf}
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
                      <Plus className="w-4 h-4 mr-2" /> {tf.f02130}
                    </Button>
                  </div>
                </div>
              )}

              {/* Single edit mode fallback */}
              {editingPurchase && (
                <Card className="max-w-md mx-auto">
                  <CardHeader><CardTitle>{tf.f00864}</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>{tf.f00377}</Label>
                      <Input type="number" value={formData.quantity} onChange={e => setFormData(prev => ({ ...prev, quantity: Number(e.target.value) }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{tf.f02165}</Label>
                      <Input type="number" value={formData.total_price} onChange={e => setFormData(prev => ({ ...prev, total_price: Number(e.target.value) }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{tf.f01972}</Label>
                      <Textarea value={formData.notes} onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))} />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="p-6 bg-white border-t border-slate-200 shrink-0 flex items-center justify-between shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{tf.f01241}</span>
                <span className="text-2xl font-black text-slate-800 tracking-tighter">
                  ₩{itemsToAdd.reduce((sum, item) => sum + item.total_price, 0).toLocaleString()} <span className="text-lg font-normal text-slate-400 ml-1">{tf.f00487}</span>
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="h-12 px-6 font-bold border-slate-200" onClick={() => setIsDialogOpen(false)}>{tf.f00702}</Button>
                <Button
                  variant={dialogMode === 'confirm' ? "outline" : "default"}
                  className={cn(
                    "h-12 px-6 font-bold shadow-sm",
                    dialogMode === 'confirm' ? "border-indigo-200 text-indigo-600 hover:bg-indigo-50" : "bg-indigo-600 hover:bg-indigo-700 text-white border-none px-8"
                  )}
                  onClick={() => handleSaveOrConfirm(false)}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {dialogMode === 'create' ? tf.f01153 : tf.f01452}
                </Button>

                {dialogMode === 'confirm' && (
                  <Button
                    className="h-12 px-8 bg-emerald-600 hover:bg-black text-white font-black shadow-xl shadow-emerald-100 transition-all active:scale-95"
                    onClick={() => handleSaveOrConfirm(true)}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" /> {tf.f01159}
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
