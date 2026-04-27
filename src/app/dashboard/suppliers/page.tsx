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
  Building2,
  Trash2,
  Edit2,
  Phone,
  Mail,
  MapPin,
  ClipboardList,
  Download,
  Upload
} from 'lucide-react';
import { useSuppliers, Supplier } from '@/hooks/use-suppliers';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { downloadTemplate, parseExcel, exportDataToExcel } from "@/utils/excel";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";

export default function SuppliersPage() {
  const { suppliers, loading, addSupplier, updateSupplier, deleteSupplier } = useSuppliers();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const locale = usePreferredLocale();
  const isKo = toBaseLocale(locale) === "ko";
  const tr = (ko: string, en: string) => (isKo ? ko : en);

  const [formData, setFormData] = useState<Partial<Supplier>>({
    name: "",
    contact: "",
    email: "",
    address: "",
    business_number: "",
    supplier_type: "",
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
        const payload: Partial<Supplier> = {
          name: row['거래처명']?.toString() || row['업체명']?.toString() || row['상호']?.toString() || '',
          contact: row['연락처']?.toString() || row['전화번호']?.toString() || '',
          email: row['이메일']?.toString() || '',
          address: row['주소']?.toString() || '',
          business_number: row['사업자번호']?.toString() || '',
          memo: row['메모']?.toString() || row['비고']?.toString() || '',
        };

        let type = row['유형']?.toString() || '';
        let manager = row['담당자']?.toString() || '';
        if (type) payload.supplier_type = type;
        if (manager) payload.memo = (payload.memo ? payload.memo + ' / ' : '') + `담당자: ${manager}`;

        if (payload.name) {
          await addSupplier(payload);
          successCount++;
        }
      }
      toast.success(tr(`${successCount}개의 거래처가 등록되었습니다.`, `${successCount} suppliers imported.`));
    } catch (err) {
      console.error(err);
      toast.error(tr("데이터 가져오기에 실패했습니다.", "Failed to import data."));
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };


  const handleSave = async () => {
    if (!formData.name) {
      toast.error(tr("업체명은 필수 항목입니다.", "Company name is required."));
      return;
    }

    if (editingSupplier) {
      await updateSupplier(editingSupplier.id, formData);
    } else {
      await addSupplier(formData);
    }
    setIsAddDialogOpen(false);
    setEditingSupplier(null);
    setFormData({ name: "", contact: "", email: "", address: "", business_number: "", supplier_type: "", memo: "" });
  };

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.contact?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.memo?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [suppliers, searchTerm]);

  const openEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setFormData(s);
    setIsAddDialogOpen(true);
  };

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title={tr("거래처 관리", "Supplier Management")}
        description={tr("원부자재 및 상품 공급 업체를 관리하고 거래 상세 내역을 파악합니다.", "Manage vendors for materials/products and track details.")}
        icon={Building2}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportDataToExcel('supplier', filteredSuppliers)}
            className="border-slate-200 text-slate-900 font-medium"
          >
            <Download className="h-4 w-4 mr-2 text-green-600" />
            {tr("데이터 다운로드", "Download Data")}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadTemplate('supplier')}
            className="border-slate-200 text-slate-900 font-medium"
          >
            <Download className="h-4 w-4 mr-2 text-slate-500" />
            {tr("양식 다운로드", "Download Template")}
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
              {isImporting ? tr('업로드 중...', 'Uploading...') : tr('엑셀 업로드', 'Upload Excel')}
            </Button>
          </div>

          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all active:scale-95"
            onClick={() => {
              setEditingSupplier(null);
              setFormData({ name: "", contact: "", email: "", address: "", business_number: "", supplier_type: "", memo: "" });
              setIsAddDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" /> {tr("신규 거래처 등록", "Add Supplier")}
          </Button>
        </div>
      </PageHeader>

      <Card className="border-none shadow-xl bg-white/80 backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-between pb-4 space-y-0">
          <div>
            <CardTitle className="text-xl font-bold text-gray-800">{tr("등록된 거래처", "Suppliers")}</CardTitle>
            <CardDescription>{tr("공급업체별 정보를 실시간으로 관리하세요", "Manage supplier information in real time.")}</CardDescription>
          </div>
          <div className="flex items-center gap-2 w-full max-w-sm">
            <div className="relative w-full group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder={tr("업체명, 연락처 검색...", "Search company or contact...")}
                className="pl-9 bg-gray-50 border-gray-200 focus:bg-white transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
            </div>
          ) : (
            <div className="rounded-xl border border-gray-100 overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow className="hover:bg-transparent border-b">
                    <TableHead className="font-bold text-gray-600">업체명</TableHead>
                    <TableHead className="font-bold text-gray-600">연락처</TableHead>
                    <TableHead className="font-bold text-gray-600">주요품목</TableHead>
                    <TableHead className="font-bold text-gray-600">사업자번호</TableHead>
                    <TableHead className="font-bold text-gray-600">주소</TableHead>
                    <TableHead className="font-bold text-gray-600">이메일</TableHead>
                    <TableHead className="font-bold text-gray-600 text-right">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-64 text-center text-muted-foreground font-medium">
                        <div className="flex flex-col items-center justify-center space-y-4">
                          <div className="p-4 bg-slate-50 rounded-full">
                            <Phone className="w-10 h-10 text-slate-300" />
                          </div>
                      <p>{tr("등록된 거래처가 없습니다.", "No suppliers found.")}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSuppliers.map((supplier) => (
                      <TableRow key={supplier.id} className="group hover:bg-gray-50/50 transition-colors">
                        <TableCell className="font-bold text-gray-800">
                          {supplier.name}
                        </TableCell>
                        <TableCell className="text-gray-600 py-4">
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            {supplier.contact || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600 text-sm max-w-[200px] truncate" title={`${supplier.supplier_type ? '유형: ' + supplier.supplier_type : ''} ${supplier.memo || ''}`}>
                          <div className="flex items-center gap-2 overflow-hidden">
                            {supplier.supplier_type && (
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-xs font-medium shrink-0 text-slate-700">
                                {supplier.supplier_type}
                              </span>
                            )}
                            {supplier.memo && (
                              <>
                                <ClipboardList className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{supplier.memo}</span>
                              </>
                            )}
                            {!supplier.supplier_type && !supplier.memo && '-'}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-500 font-mono text-sm">
                          {supplier.business_number || '-'}
                        </TableCell>
                        <TableCell className="text-gray-500 text-xs">
                          <div className="flex items-center gap-2 max-w-[200px] truncate" title={supplier.address}>
                            <MapPin className="w-3 h-3 text-slate-300 shrink-0" />
                            {supplier.address || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-500 text-sm">
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            {supplier.email || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:text-blue-600 hover:bg-blue-50"
                              onClick={() => openEdit(supplier)}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:text-red-600 hover:bg-red-50"
                              onClick={() => {
                                if (window.confirm(tr("정말 삭제하시겠습니까?", "Are you sure you want to delete?"))) deleteSupplier(supplier.id);
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
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              {editingSupplier ? tr("거래처 정보 수정", "Edit Supplier") : tr("새 거래처 등록", "New Supplier")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right font-semibold text-slate-700">업체명</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="col-span-3 border-gray-200"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="contact" className="text-right font-semibold text-slate-700">연락처</Label>
              <Input
                id="contact"
                placeholder="02-000-0000"
                value={formData.contact || ""}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                className="col-span-3 border-gray-200"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right font-semibold text-slate-700">이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder="supplier@example.com"
                value={formData.email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="col-span-3 border-gray-200"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="business" className="text-right font-semibold text-slate-700">사업자번호</Label>
              <Input
                id="business"
                placeholder="000-00-00000"
                value={formData.business_number || ""}
                onChange={(e) => setFormData({ ...formData, business_number: e.target.value })}
                className="col-span-3 border-gray-200"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="address" className="text-right font-semibold text-slate-700">주소</Label>
              <Input
                id="address"
                value={formData.address || ""}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="col-span-3 border-gray-200"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="supplier_type" className="text-right font-semibold text-slate-700">주요품목</Label>
              <div className="col-span-3">
                <Select
                  value={formData.supplier_type || "unassigned"}
                  onValueChange={(val: any) => setFormData({ ...formData, supplier_type: val === "unassigned" ? "" : (val || "") })}
                >
                  <SelectTrigger className="border-gray-200">
                    <SelectValue placeholder="주요품목(유형) 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">선택 없음</SelectItem>
                    <SelectItem value="생화">생화</SelectItem>
                    <SelectItem value="분화">분화</SelectItem>
                    <SelectItem value="서양란">서양란</SelectItem>
                    <SelectItem value="동양란">동양란</SelectItem>
                    <SelectItem value="화환">화환</SelectItem>
                    <SelectItem value="자재">자재(포장/화기등)</SelectItem>
                    <SelectItem value="기타">기타</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="memo" className="text-right font-semibold text-slate-700">메모</Label>
              <Input
                id="memo"
                value={formData.memo || ""}
                onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                className="col-span-3 border-gray-200"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>{tr("취소", "Cancel")}</Button>
            <Button onClick={handleSave} className="bg-slate-800 text-white font-bold hover:bg-slate-900 border-none transition-all">{tr("저장하기", "Save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
