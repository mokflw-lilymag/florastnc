"use client";

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
  Building2
} from 'lucide-react';
import { useMaterials, Material } from '@/hooks/use-materials';
import { useSuppliers } from '@/hooks/use-suppliers';
import { SAMPLE_MATERIALS } from "@/utils/sample-data";
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { downloadTemplate, parseExcel, exportDataToExcel } from "@/utils/excel";
import { useSettings } from "@/hooks/use-settings";
import Link from 'next/link';
import { toast } from 'sonner';

export default function InventoryPage() {
  const { materials, loading: materialsLoading, stats, addMaterial, updateMaterial, deleteMaterial } = useMaterials();
  const { suppliers, loading: suppliersLoading } = useSuppliers();
  const { materialCategories, loading: settingsLoading } = useSettings();
  const loading = materialsLoading || settingsLoading || suppliersLoading;
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const CATEGORIES = materialCategories || {
    main: ["생화", "식물", "부자재", "포장재", "기타"],
    mid: { "생화": [], "식물": [], "부자재": [], "포장재": [], "기타": [] }
  };

  const [formData, setFormData] = useState<Partial<Material>>({
    name: "",
    main_category: CATEGORIES.main[0] || "생화",
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

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const data = await parseExcel(file);
      let successCount = 0;
      for (const row of data) {
        const payload: Partial<Material> = {
          name: row['자재명']?.toString() || '',
          main_category: row['대분류']?.toString() || '',
          mid_category: row['중분류']?.toString() || '',
          unit: row['단위']?.toString() || 'ea',
          spec: row['규격']?.toString() || '',
          price: Number(row['가격'] || row['단가']) || 0,
          color: row['색상']?.toString() || '',
          stock: Number(row['재고']) || 0,
          supplier: row['공급업체'] || row['공급처'] || '',
          memo: row['메모']?.toString() || '',
        };

        if (payload.name) {
          await addMaterial(payload);
          successCount++;
        }
      }
      toast.success(`${successCount}개의 자재가 등록되었습니다.`);
    } catch (err) {
      console.error(err);
      toast.error("데이터 가져오기에 실패했습니다.");
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const handleLoadSamples = async () => {
    if (materials.length > 0) {
      if (!window.confirm("현재 자재가 이미 존재합니다. 샘플 데이터를 추가로 불러오시겠습니까?")) return;
    }
    
    setIsImporting(true);
    try {
      let count = 0;
      for (const sample of SAMPLE_MATERIALS) {
        await addMaterial(sample);
        count++;
      }
      toast.success(`${count}개의 샘플 자재가 등록되었습니다.`);
    } catch (err) {
      toast.error("샘플 데이터 로딩 중 오류가 발생했습니다.");
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
      main_category: CATEGORIES.main[0] || "생화",
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

  const filteredMaterials = useMemo(() => {
    return materials.filter(m => 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.main_category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.mid_category && m.mid_category.toLowerCase().includes(searchTerm.toLowerCase())) ||
      m.supplier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.supplier_id && suppliers.find(s => s.id === m.supplier_id)?.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      m.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [materials, searchTerm, suppliers]);

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
        title="재고 관리" 
        description="자재 및 상품의 실시간 재고를 관리하고 입출고 내역을 확인합니다."
        icon={Layers}
      >
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link href="/dashboard/suppliers">
            <Button variant="ghost" size="sm" className="hidden sm:flex text-slate-500 hover:text-slate-900 border border-transparent hover:border-slate-200">
              <Building2 className="h-4 w-4 mr-2" />
              거래처 관리
            </Button>
          </Link>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => exportDataToExcel('material', filteredMaterials)}
            className="border-slate-200 text-slate-900 font-medium"
          >
            <Download className="h-4 w-4 mr-2 text-green-600" />
            데이터 다운로드
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => downloadTemplate('material')}
            className="border-slate-200 text-slate-900 font-medium"
          >
            <Download className="h-4 w-4 mr-2 text-slate-500" />
            양식 다운로드
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
              {isImporting ? '가져오는 중...' : '데이터 가져오기'}
            </Button>
          </div>

          <Button 
            className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all active:scale-95"
            onClick={() => {
              setEditingMaterial(null);
              setFormData({ name: "", main_category: CATEGORIES.main[0] || "생화", mid_category: "", unit: "ea", spec: "", price: 0, color: "", stock: 0, supplier: "", supplier_id: "", memo: "" });
              setIsAddDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" /> 새 자재 등록
          </Button>
        </div>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-white overflow-hidden group hover:shadow-lg transition-all border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600 flex items-center gap-2">
              <Package className="w-4 h-4" /> 전체 품목
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-blue-500">
              {stats.totalTypes} <span className="text-sm font-normal text-muted-foreground ml-1">종</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-green-50 to-white overflow-hidden group hover:shadow-lg transition-all border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
              <Activity className="w-4 h-4" /> 총 재고량
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
              <AlertTriangle className="w-4 h-4" /> 재고 부족
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-700 to-orange-500 text-orange-600 font-bold">
              {stats.lowStock} <span className="text-sm font-normal text-muted-foreground ml-1">종</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-red-50 to-white overflow-hidden group hover:shadow-lg transition-all border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
              <Info className="w-4 h-4" /> 품절 품목
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-700 to-red-500 text-red-600 font-bold">
              {stats.outOfStock} <span className="text-sm font-normal text-muted-foreground ml-1">종</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card className="border-none shadow-xl bg-white/80 backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-between pb-4 space-y-0">
          <div>
            <CardTitle className="text-xl font-bold text-gray-800">자재 현황</CardTitle>
            <CardDescription>재고 관리 항목을 효율적으로 관리하세요</CardDescription>
          </div>
          <div className="flex items-center gap-2 w-full max-w-sm">
            <div className="relative w-full group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="자재명, 카테고리, 거래처 검색..." 
                className="pl-9 bg-gray-50 border-gray-200 focus:bg-white transition-all ring-offset-background"
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
                    <TableHead className="font-bold text-center w-12 text-gray-600">번호</TableHead>
                    <TableHead className="font-bold text-gray-600">자재ID</TableHead>
                    <TableHead className="font-bold text-gray-600">자재명</TableHead>
                    <TableHead className="font-bold text-gray-600">대분류</TableHead>
                    <TableHead className="font-bold text-gray-600">중분류</TableHead>
                    <TableHead className="font-bold text-gray-600 text-center">단위</TableHead>
                    <TableHead className="font-bold text-gray-600">규격</TableHead>
                    <TableHead className="font-bold text-gray-600 text-right">가격</TableHead>
                    <TableHead className="font-bold text-gray-600 text-center">색상</TableHead>
                    <TableHead className="font-bold text-gray-600 text-center">재고</TableHead>
                    <TableHead className="font-bold text-gray-600">공급업체</TableHead>
                    <TableHead className="font-bold text-gray-600">메모</TableHead>
                    <TableHead className="font-bold text-gray-600 text-right">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materials.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={13} className="h-96 text-center text-muted-foreground font-medium">
                        <div className="flex flex-col items-center justify-center space-y-6 py-12">
                           <div className="p-6 bg-slate-50 rounded-full border border-dashed border-slate-200">
                             <Layers className="w-16 h-16 text-slate-300" />
                           </div>
                           <div className="space-y-2">
                             <h3 className="text-xl font-bold text-slate-800">등록된 자재가 없네요!</h3>
                             <p className="max-w-md text-slate-500">
                               처음 시작이 막막하시다면 클릭 한 번으로 기본 샘플 데이터(꽃, 꽃바구니 등)를 불러올 수 있습니다.
                             </p>
                           </div>
                           <div className="flex gap-3">
                              <Button onClick={handleLoadSamples} variant="outline" className="bg-white border-orange-200 text-orange-700 hover:bg-orange-50">
                                <RefreshCw className="w-4 h-4 mr-2 text-orange-500" />
                                샘플 데이터 불러오기
                              </Button>
                              <Button onClick={() => {
                                setEditingMaterial(null);
                                setFormData({ name: "", main_category: CATEGORIES.main[0] || "생화", mid_category: "", unit: "ea", spec: "", price: 0, color: "", stock: 0, supplier: "", supplier_id: "", memo: "" });
                                setIsAddDialogOpen(true);
                              }} className="bg-primary hover:bg-primary/90 text-white font-bold">
                                <Plus className="w-4 h-4 mr-2" />
                                첫 자재 등록하기
                              </Button>
                           </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredMaterials.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={13} className="h-64 text-center text-muted-foreground font-medium">
                         <p>검색 결과가 없습니다.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMaterials.map((material, idx) => (
                      <TableRow key={material.id} className="group hover:bg-gray-50/50 transition-colors">
                        <TableCell className="text-center font-mono text-xs text-slate-400">
                          {idx + 1}
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
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                                if(window.confirm("정말 삭제하시겠습니까?")) deleteMaterial(material.id);
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
        </CardContent>
      </Card>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px] border-none shadow-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-orange-500">
              {editingMaterial ? "자재 정보 수정" : "새 자재 등록"}
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              재고 관리를 위해 자재의 상세 정보를 입력해 주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right font-semibold text-slate-700">자재명</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid grid-cols-2 items-center gap-2">
                <Label className="text-right font-semibold text-slate-700">대분류</Label>
                <Select 
                  value={formData.main_category || ""} 
                  onValueChange={(val) => setFormData({...formData, main_category: val as string})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.main.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 items-center gap-2">
                <Label className="text-right font-semibold">중분류</Label>
                <Input
                  value={formData.mid_category || ""}
                  onChange={(e) => setFormData({...formData, mid_category: e.target.value})}
                  placeholder="중분류 입력"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="grid grid-cols-2 items-center gap-2">
                 <Label className="text-right font-semibold text-slate-700">단위</Label>
                 <Input
                   value={formData.unit}
                   onChange={(e) => setFormData({...formData, unit: e.target.value})}
                   placeholder="ea, 롤 등"
                 />
               </div>
               <div className="grid grid-cols-2 items-center gap-2">
                  <Label className="text-right font-semibold text-slate-700">규격</Label>
                  <Input
                    value={formData.spec || ""}
                    onChange={(e) => setFormData({...formData, spec: e.target.value})}
                  />
               </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid grid-cols-2 items-center gap-2">
                <Label className="text-right font-semibold text-slate-700">가격</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: Number(e.target.value)})}
                />
              </div>
              <div className="grid grid-cols-2 items-center gap-2">
                <Label className="text-right font-semibold text-slate-700">색상</Label>
                <Input
                  value={formData.color || ""}
                  onChange={(e) => setFormData({...formData, color: e.target.value})}
                  placeholder="빨강, #FF0000"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="stock" className="text-right font-semibold text-slate-700">현재 재고</Label>
              <Input
                id="stock"
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({...formData, stock: Number(e.target.value)})}
                className="col-span-3 font-bold text-primary"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="supplier_select" className="text-right font-semibold text-slate-700">공급업체</Label>
              <div className="col-span-3 space-y-2">
                  <Select 
                    value={formData.supplier_id || "none"} 
                    onValueChange={(val: string | null) => setFormData({...formData, supplier_id: val === "none" || !val ? "" : val})}
                  >
                    <SelectTrigger id="supplier_select">
                      <SelectValue placeholder="등록된 거래처 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">직접 입력 또는 선택안함</SelectItem>
                      {suppliers.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="직접 입력 (위에서 선택하지 않은 경우)"
                    value={formData.supplier || ""}
                    onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                  />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="memo" className="text-right font-semibold text-slate-700">메모</Label>
              <Input
                id="memo"
                value={formData.memo || ""}
                onChange={(e) => setFormData({...formData, memo: e.target.value})}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>취소</Button>
            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-white font-bold px-8 shadow-lg shadow-primary/20">저장하기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
