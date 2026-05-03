"use client";
import { getMessages } from "@/i18n/getMessages";

import React, { useState, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, 
  Search, 
  Package, 
  AlertTriangle, 
  Info, 
  Trash2, 
  Edit2, 
  Layers, 
  Activity,
  Download,
  Upload,
  Settings2,
  RefreshCw,
  Building2,
  Check,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { DASHBOARD_LIST_PAGE_SIZE } from '@/lib/dashboard-list-limit';
import { useMaterials, Material } from '@/hooks/use-materials';
import { useSuppliers } from '@/hooks/use-suppliers';
import { SAMPLE_MATERIALS } from "@/utils/sample-data";
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { downloadTemplate, parseExcel, exportDataToExcel } from "@/utils/excel";
import { useSettings, DEFAULT_MATERIAL_CATEGORIES } from "@/hooks/use-settings";

const DEFAULT_MATERIAL_MAIN = DEFAULT_MATERIAL_CATEGORIES.main[0] ?? "";
import { CategoryManagementDialog } from '@/components/inventory/category-management-dialog';
import Link from 'next/link';
import { toast } from 'sonner';
import { usePreferredLocale } from "@/hooks/use-preferred-locale";

export default function InventoryPage() {
  const {
    materials,
    loading: materialsLoading,
    stats,
    materialsTotalCount,
    listPage,
    setListPage,
    addMaterial,
    updateMaterial,
    deleteMaterial,
  } = useMaterials();
  const { suppliers, loading: suppliersLoading } = useSuppliers();
  const { materialCategories, loading: settingsLoading } = useSettings();
  const loading = materialsLoading || settingsLoading || suppliersLoading;
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedMidCategory, setSelectedMidCategory] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSupplierOpen, setIsSupplierOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);

  const CATEGORIES = materialCategories || DEFAULT_MATERIAL_CATEGORIES;

  const [formData, setFormData] = useState<Partial<Material>>({
    name: "",
    main_category: CATEGORIES.main[0] || DEFAULT_MATERIAL_MAIN,
    mid_category: "",
    unit: "ea",
    spec: "",
    price: 0,
    color: "",
    stock: 0,
    supplier: "",
    supplier_id: "",
    memo: ""
  });

  const excelCell = (row: Record<string, unknown>, keys: string[]) => {
    for (const k of keys) {
      const v = row[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") return v;
    }
    return undefined;
  };
  const excelStr = (v: unknown) => (v === undefined || v === null ? "" : String(v));

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const data = await parseExcel(file);
      let successCount = 0;
      for (const row of data) {
        const r = row as Record<string, unknown>;
        const payload: Partial<Material> = {
          name: excelStr(
            excelCell(r, [
              "자재명",
              "Material name",
              "Material Name",
              "Tên vật tư",
              "name",
              "Name",
            ])
          ),
          main_category: excelStr(
            excelCell(r, ["대분류", "Main category", "Main Category", "Nhóm lớn", "main_category"])
          ),
          mid_category: excelStr(
            excelCell(r, ["중분류", "Sub category", "Sub Category", "Nhóm nhỏ", "mid_category"])
          ),
          unit: excelStr(excelCell(r, ["단위", "Unit", "Đơn vị", "unit"])) || "ea",
          spec: excelStr(excelCell(r, ["규격", "Spec", "Quy cách", "spec"])),
          price: Number(excelCell(r, ["가격", "단가", "Price", "Giá", "Unit price", "price"])) || 0,
          color: excelStr(excelCell(r, ["색상", "Color", "Màu sắc", "color"])),
          stock: Number(excelCell(r, ["재고", "Stock", "Tồn kho", "stock"])) || 0,
          supplier: excelStr(
            excelCell(r, [
              "공급업체",
              "공급처",
              "Supplier",
              "Nhà cung cấp",
              "supplier",
            ])
          ),
          memo: excelStr(excelCell(r, ["메모", "Memo", "Ghi chú", "memo"])),
        };

        if (payload.name) {
          await addMaterial(payload);
          successCount++;
        }
      }
      toast.success(tf.f02319.replace("{count}", String(successCount)));
    } catch (err) {
      console.error(err);
      toast.error(tf.f01087);
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const handleLoadSamples = async () => {
    if (stats.totalTypes > 0) {
      if (!window.confirm(tf.f02188)) return;
    }
    
    setIsImporting(true);
    try {
      let count = 0;
      for (const sample of SAMPLE_MATERIALS) {
        await addMaterial(sample);
        count++;
      }
      toast.success(tf.f02320.replace("{count}", String(count)));
    } catch (err) {
      toast.error(tf.f01390);
    } finally {
      setIsImporting(false);
    }
  };

  const handleSave = async () => {
    if (editingMaterial) {
      await updateMaterial(editingMaterial.id, formData);
    } else {
      await addMaterial(formData);
    }
    setIsAddDialogOpen(false);
    setEditingMaterial(null);
    setFormData({
      name: "",
      main_category: CATEGORIES.main[0] || DEFAULT_MATERIAL_MAIN,
      mid_category: "",
      unit: "ea",
      spec: "",
      price: 0,
      color: "",
      stock: 0,
      supplier: "",
      supplier_id: "",
      memo: ""
    });
  };

  const midCategoriesForSelected = useMemo(() => {
    if (selectedCategory === "all") return [];
    
    // First, get defined mid-categories for this main category from settings
    const definedMids = CATEGORIES.mid[selectedCategory] || [];
    
    // Also get any mid-categories currently used by materials in this main category (for legacy/custom data)
    const usedMids = new Set(
      materials
        .filter(m => m.main_category === selectedCategory)
        .map(m => m.mid_category)
        .filter(Boolean)
    );
    
    // Merge them
    const allMids = Array.from(new Set([...definedMids, ...Array.from(usedMids)]));
    return allMids.sort() as string[];
  }, [materials, selectedCategory, CATEGORIES.mid]);

  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      // Main category filter
      if (selectedCategory !== "all" && m.main_category !== selectedCategory) {
        return false;
      }

      // Mid category filter
      if (selectedMidCategory !== "all" && m.mid_category !== selectedMidCategory) {
        return false;
      }

      // Search term filter
      if (!searchTerm) return true;
      
      const searchLower = searchTerm.toLowerCase();
      return (
        m.name.toLowerCase().includes(searchLower) ||
        m.main_category.toLowerCase().includes(searchLower) ||
        (m.mid_category && m.mid_category.toLowerCase().includes(searchLower)) ||
        m.supplier?.toLowerCase().includes(searchLower) ||
        (m.supplier_id && suppliers.find(s => s.id === m.supplier_id)?.name.toLowerCase().includes(searchLower)) ||
        m.id.toLowerCase().includes(searchLower)
      );
    });
  }, [materials, searchTerm, selectedCategory, selectedMidCategory, suppliers]);

  const openEdit = (m: Material) => {
    setEditingMaterial(m);
    setFormData(m);
    setIsAddDialogOpen(true);
  };

  const getSupplierName = (m: Material) => {
      if (m.supplier_id) {
          return suppliers.find(s => s.id === m.supplier_id)?.name || m.supplier || "-";
      }
      return m.supplier || "-";
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500">
      <PageHeader 
        title={tf.f01757} 
        description={tf.f01734}
        icon={Layers}
      >
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link href="/dashboard/suppliers">
            <Button variant="ghost" size="sm" className="hidden sm:flex text-slate-500 hover:text-slate-900 border border-transparent hover:border-slate-200">
              <Building2 className="h-4 w-4 mr-2" />
              {tf.f00874}
            </Button>
          </Link>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsCategoryDialogOpen(true)}
            className="hidden sm:flex text-slate-500 hover:text-slate-900 border border-transparent hover:border-slate-200"
          >
            <Settings2 className="h-4 w-4 mr-2" />
            {tf.f02063}
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => exportDataToExcel("material", filteredMaterials, locale)}
            className="border-slate-200 text-slate-900 font-medium"
          >
            <Download className="h-4 w-4 mr-2 text-green-600" />
            {tf.f01089}
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => downloadTemplate("material", locale)}
            className="border-slate-200 text-slate-900 font-medium"
          >
            <Download className="h-4 w-4 mr-2 text-slate-500" />
            {tf.f01532}
          </Button>

          <div className="relative">
            <input
              type="file"
              accept=".xlsx, .xls"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleImportExcel}
              disabled={isImporting}
            />
            <Button 
              size="sm" 
              disabled={isImporting}
              className="bg-slate-800 hover:bg-slate-900 text-white shadow-sm transition-all"
            >
              <Upload className={`h-4 w-4 mr-2 ${isImporting ? 'animate-pulse' : ''}`} />
              {isImporting ? tf.f00850 : tf.f01086}
            </Button>
          </div>

          <Button 
            className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all active:scale-95"
            onClick={() => {
              setEditingMaterial(null);
              setFormData({ name: "", main_category: CATEGORIES.main[0] || DEFAULT_MATERIAL_MAIN, mid_category: "", unit: "ea", spec: "", price: 0, color: "", stock: 0, supplier: "", supplier_id: "", memo: "" });
              setIsAddDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" /> {tf.f01377}
          </Button>
        </div>
      </PageHeader>

      <p className="text-xs text-muted-foreground px-1">
        {tf.f01335} {DASHBOARD_LIST_PAGE_SIZE}{tf.f00897}
      </p>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-white overflow-hidden group hover:shadow-lg transition-all border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600 flex items-center gap-2">
              <Package className="w-4 h-4" /> {tf.f01806}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-blue-500">
              {stats.totalTypes} <span className="text-sm font-normal text-muted-foreground ml-1">{tf.f01860}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-green-50 to-white overflow-hidden group hover:shadow-lg transition-all border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
              <Activity className="w-4 h-4" /> {tf.f01997}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-700 to-green-500">
              {stats.totalStock.toLocaleString()} <span className="text-sm font-normal text-muted-foreground ml-1">ea</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-orange-50 to-white overflow-hidden group hover:shadow-lg transition-all border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-600 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {tf.f01760}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-700 to-orange-500 text-orange-600 font-bold">
              {stats.lowStock} <span className="text-sm font-normal text-muted-foreground ml-1">{tf.f01860}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-red-50 to-white overflow-hidden group hover:shadow-lg transition-all border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
              <Info className="w-4 h-4" /> {tf.f02136}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-700 to-red-500 text-red-600 font-bold">
              {stats.outOfStock} <span className="text-sm font-normal text-muted-foreground ml-1">{tf.f01860}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card className="border-none shadow-xl bg-white/80 backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-between pb-4 space-y-0">
          <div>
            <CardTitle className="text-xl font-bold text-gray-800">{tf.f01741}</CardTitle>
            <CardDescription>{tf.f01759}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full max-w-4xl">
            {/* Primary Category Filter */}
            <Select 
              value={selectedCategory} 
              onValueChange={(val: string | null) => {
                setSelectedCategory(val || "all");
                setSelectedMidCategory("all");
              }}
            >
              <SelectTrigger className="w-[150px] bg-slate-50 border-slate-200 text-xs h-9 rounded-xl">
                <SelectValue placeholder={tf.f01074} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tf.f01787}</SelectItem>
                {CATEGORIES.main.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Secondary Category Filter */}
            <Select 
              value={selectedMidCategory} 
              onValueChange={(val: string | null) => setSelectedMidCategory(val || "all")}
              disabled={selectedCategory === "all" || midCategoriesForSelected.length === 0}
            >
              <SelectTrigger className="w-[150px] bg-slate-50 border-slate-200 text-xs h-9 rounded-xl">
                <SelectValue placeholder={tf.f01887} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tf.f01788}</SelectItem>
                {midCategoriesForSelected.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder={tf.f01747} 
                className="pl-9 bg-slate-50 border-slate-200 h-9 rounded-xl focus:bg-white transition-all ring-offset-background text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="space-y-3">
               {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
             </div>
          ) : (
            <div className="rounded-xl border border-gray-100 overflow-x-auto shadow-sm">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow className="hover:bg-transparent border-b">
                    <TableHead className="font-bold text-center w-12 text-gray-600">{tf.f01250}</TableHead>
                    <TableHead className="font-bold text-gray-600">{tf.f01749}</TableHead>
                    <TableHead className="font-bold text-gray-600">{tf.f01746}</TableHead>
                    <TableHead className="font-bold text-gray-600">{tf.f01074}</TableHead>
                    <TableHead className="font-bold text-gray-600">{tf.f01887}</TableHead>
                    <TableHead className="font-bold text-gray-600 text-center">{tf.f01066}</TableHead>
                    <TableHead className="font-bold text-gray-600">{tf.f02374}</TableHead>
                    <TableHead className="font-bold text-gray-600 text-right">{tf.f00021}</TableHead>
                    <TableHead className="font-bold text-gray-600 text-center">{tf.f02375}</TableHead>
                    <TableHead className="font-bold text-gray-600 text-center">{tf.f00538}</TableHead>
                    <TableHead className="font-bold text-gray-600">{tf.f00950}</TableHead>
                    <TableHead className="font-bold text-gray-600">{tf.f00197}</TableHead>
                    <TableHead className="font-bold text-gray-600 text-right">{tf.f00087}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.totalTypes === 0 && materials.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={13} className="h-96 text-center text-muted-foreground font-medium">
                        <div className="flex flex-col items-center justify-center space-y-6 py-12">
                           <div className="p-6 bg-slate-50 rounded-full border border-dashed border-slate-200">
                             <Layers className="w-16 h-16 text-slate-300" />
                           </div>
                           <div className="space-y-2">
                             <h3 className="text-xl font-bold text-slate-800">{tf.f01115}</h3>
                             <p className="max-w-md text-slate-500">
                               {tf.f01981}
                             </p>
                           </div>
                           <div className="flex gap-3">
                              <Button onClick={handleLoadSamples} variant="outline" className="bg-white border-orange-200 text-orange-700 hover:bg-orange-50">
                                <RefreshCw className="w-4 h-4 mr-2 text-orange-500" />
                                {tf.f01391}
                              </Button>
                              <Button onClick={() => {
                                setEditingMaterial(null);
                                setFormData({ name: "", main_category: CATEGORIES.main[0] || DEFAULT_MATERIAL_MAIN, mid_category: "", unit: "ea", spec: "", price: 0, color: "", stock: 0, supplier: "", supplier_id: "", memo: "" });
                                setIsAddDialogOpen(true);
                              }} className="bg-primary hover:bg-primary/90 text-white font-bold">
                                <Plus className="w-4 h-4 mr-2" />
                                {tf.f01983}
                              </Button>
                           </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : materials.length === 0 && stats.totalTypes > 0 ? (
                    <TableRow>
                      <TableCell colSpan={13} className="h-64 text-center text-muted-foreground font-medium">
                        <p>{tf.f02391}</p>
                      </TableCell>
                    </TableRow>
                  ) : filteredMaterials.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={13} className="h-64 text-center text-muted-foreground font-medium">
                        <p>{tf.f00036}</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMaterials.map((material, idx) => (
                      <TableRow key={material.id} className="group hover:bg-gray-50/50 transition-colors">
                        <TableCell className="text-center font-mono text-xs text-slate-400">
                          {listPage * DASHBOARD_LIST_PAGE_SIZE + idx + 1}
                        </TableCell>
                        <TableCell className="font-mono text-[10px] text-slate-500 truncate max-w-[80px]" title={material.id}>
                          {material.id.split('-')[0]}...
                        </TableCell>
                        <TableCell className="font-bold text-gray-800 tracking-tight whitespace-nowrap">
                          {material.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-white border-primary/20 text-primary px-2 py-0.5 whitespace-nowrap">
                            {material.main_category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm whitespace-nowrap">
                          {material.mid_category || '-'}
                        </TableCell>
                        <TableCell className="text-center text-slate-500">{material.unit}</TableCell>
                        <TableCell className="text-slate-500 text-sm">{material.spec || '-'}</TableCell>
                        <TableCell className="text-right font-medium text-gray-700">
                          {material.price.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          {material.color ? (
                            <div className="flex items-center justify-center gap-1">
                              <div 
                                className="w-3 h-3 rounded-full border border-slate-200" 
                                style={{ backgroundColor: material.color }}
                              />
                              <span className="text-xs text-slate-600">{material.color}</span>
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold shadow-sm ${
                            material.stock === 0 ? "bg-red-50 text-red-700 border border-red-100" :
                            material.stock < 10 ? "bg-orange-50 text-orange-700 border border-orange-100" :
                            "bg-green-50 text-green-700 border border-green-100"
                          }`}>
                            {material.stock.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-gray-500 text-sm">{getSupplierName(material)}</TableCell>
                        <TableCell className="text-gray-400 text-xs max-w-[120px] truncate">{material.memo || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 hover:text-blue-600 hover:bg-blue-50"
                              onClick={() => openEdit(material)}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 hover:text-red-600 hover:bg-red-50"
                              onClick={() => {
                                if(window.confirm(tf.f01816)) deleteMaterial(material.id);
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
          {!loading && materialsTotalCount > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-3 py-4 text-sm text-muted-foreground border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={listPage <= 0 || materialsLoading}
                onClick={() => void setListPage(listPage - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                {tf.f01689}
              </Button>
              <span>
                {materialsTotalCount === 0
                  ? "0"
                  : `${listPage * DASHBOARD_LIST_PAGE_SIZE + 1}–${Math.min((listPage + 1) * DASHBOARD_LIST_PAGE_SIZE, materialsTotalCount)}`}{" "}
                / {tf.f00553} {materialsTotalCount}{tf.f00033} · {tf.f02103} {listPage + 1} /{" "}
                {Math.max(1, Math.ceil(materialsTotalCount / DASHBOARD_LIST_PAGE_SIZE))}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={
                  materialsLoading || (listPage + 1) * DASHBOARD_LIST_PAGE_SIZE >= materialsTotalCount
                }
                onClick={() => void setListPage(listPage + 1)}
              >
                {tf.f01062}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px] border-none shadow-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-orange-500">
              {editingMaterial ? tf.f02380 : tf.f02381}
            </DialogTitle>
            <DialogDescription className="text-slate-500">{tf.f02382}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right font-semibold text-slate-700">
                {tf.f01746}
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid grid-cols-2 items-center gap-2">
                <Label className="text-right font-semibold text-slate-700">{tf.f01074}</Label>
                <Select 
                  value={formData.main_category || ""} 
                  onValueChange={(val: string | null) => setFormData({...formData, main_category: val || ""})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={tf.f01403} />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.main.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 items-center gap-2">
                <Label className="text-right font-semibold">{tf.f01887}</Label>
                {formData.main_category && CATEGORIES.mid[formData.main_category]?.length > 0 ? (
                  <Select 
                    value={formData.mid_category || ""} 
                    onValueChange={(val) => setFormData({...formData, mid_category: val || ""})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={tf.f02383} />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.mid[formData.main_category].map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={formData.mid_category || ""}
                    onChange={(e) => setFormData({...formData, mid_category: e.target.value})}
                    placeholder={tf.f02384}
                  />
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="grid grid-cols-2 items-center gap-2">
                 <Label className="text-right font-semibold text-slate-700">{tf.f01066}</Label>
                 <Input
                   value={formData.unit}
                   onChange={(e) => setFormData({...formData, unit: e.target.value})}
                   placeholder={tf.f02385}
                 />
               </div>
               <div className="grid grid-cols-2 items-center gap-2">
                  <Label className="text-right font-semibold text-slate-700">{tf.f02374}</Label>
                  <Input
                    value={formData.spec || ""}
                    onChange={(e) => setFormData({...formData, spec: e.target.value})}
                  />
               </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid grid-cols-2 items-center gap-2">
                <Label className="text-right font-semibold text-slate-700">{tf.f00021}</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: Number(e.target.value)})}
                />
              </div>
              <div className="grid grid-cols-2 items-center gap-2">
                <Label className="text-right font-semibold text-slate-700">{tf.f02375}</Label>
                <Input
                  value={formData.color || ""}
                  onChange={(e) => setFormData({...formData, color: e.target.value})}
                  placeholder={tf.f02386}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="stock" className="text-right font-semibold text-slate-700">
                {tf.f02379}
              </Label>
              <Input
                id="stock"
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({...formData, stock: Number(e.target.value)})}
                className="col-span-3 font-bold text-primary"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="supplier_select" className="text-right font-semibold text-slate-700">
                {tf.f00950}
              </Label>
              <div className="col-span-3 space-y-2">
                  <Popover open={isSupplierOpen} onOpenChange={setIsSupplierOpen}>
                    <PopoverTrigger 
                      render={
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={isSupplierOpen}
                          className="w-full justify-between font-normal"
                        />
                      }
                    >
                      {formData.supplier_id
                        ? suppliers.find((s) => s.id === formData.supplier_id)?.name
                        : tf.f02387}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput placeholder={tf.f02388} />
                        <CommandList>
                          <CommandEmpty>{tf.f00036}</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="none"
                              onSelect={() => {
                                setFormData({ ...formData, supplier_id: "" });
                                setIsSupplierOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  !formData.supplier_id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {tf.f02389}
                            </CommandItem>
                            {suppliers.map((s) => (
                              <CommandItem
                                key={s.id}
                                value={s.name}
                                onSelect={() => {
                                  setFormData({ ...formData, supplier_id: s.id, supplier: s.name });
                                  setIsSupplierOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.supplier_id === s.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {s.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <Input
                    placeholder={tf.f02390}
                    value={formData.supplier || ""}
                    onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                  />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="memo" className="text-right font-semibold text-slate-700">
                {tf.f00197}
              </Label>
              <Input
                id="memo"
                value={formData.memo || ""}
                onChange={(e) => setFormData({...formData, memo: e.target.value})}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              {tf.f00702}
            </Button>
            <Button
              onClick={handleSave}
              className="bg-primary hover:bg-primary/90 text-white font-bold px-8 shadow-lg shadow-primary/20"
            >
              {tf.f01771}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CategoryManagementDialog 
        open={isCategoryDialogOpen} 
        onOpenChange={setIsCategoryDialogOpen} 
      />
    </div>
  );
}
