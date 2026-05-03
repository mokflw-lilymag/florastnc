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
import { pickUiText } from "@/i18n/pick-ui-text";

export default function SuppliersPage() {
  const { suppliers, loading, addSupplier, updateSupplier, deleteSupplier } = useSuppliers();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const baseLocale = toBaseLocale(locale);
  const phSupplierPhone = pickUiText(
    baseLocale,
    "02-000-0000",
    "+82 2-0000-0000",
    "028 0000 0000"
  );
  const phSupplierEmail = pickUiText(
    baseLocale,
    "supplier@example.com",
    "supplier@example.com",
    "nha_cung_cap@company.com"
  );
  const phSupplierBiz = pickUiText(
    baseLocale,
    "000-00-00000",
    "Tax ID / registration no.",
    "Mã số ĐKKD"
  );
  const supplierSpecialtyLabel = useMemo(() => {
    const t = getMessages(locale).tenantFlows;
    const m: Record<string, string> = {
      생화: t.f02394,
      분화: t.f02395,
      서양란: t.f02396,
      동양란: t.f02397,
      화환: t.f02398,
      자재: t.f02399,
      기타: t.f00115,
    };
    return (v: string | undefined) => (v ? m[v] || v : "");
  }, [locale]);
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
      toast.success(tf.f02300.replace("{count}", String(successCount)));
    } catch (err) {
      console.error(err);
      toast.error(tf.f01087);
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };


  const handleSave = async () => {
    if (!formData.name) {
      toast.error(tf.f01544);
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
        title={tf.f00874}
        description={tf.f01643}
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
            {tf.f01089}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadTemplate('supplier')}
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
              {isImporting ? tf.f01535 : tf.f01552}
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
            <Plus className="w-4 h-4 mr-2" /> {tf.f01492}
          </Button>
        </div>
      </PageHeader>

      <Card className="border-none shadow-xl bg-white/80 backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-between pb-4 space-y-0">
          <div>
            <CardTitle className="text-xl font-bold text-gray-800">{tf.f01111}</CardTitle>
            <CardDescription>{tf.f00951}</CardDescription>
          </div>
          <div className="flex items-center gap-2 w-full max-w-sm">
            <div className="relative w-full group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder={tf.f01543}
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
                    <TableHead className="font-bold text-gray-600">{tf.f02376}</TableHead>
                    <TableHead className="font-bold text-gray-600">{tf.f00444}</TableHead>
                    <TableHead className="font-bold text-gray-600">{tf.f02377}</TableHead>
                    <TableHead className="font-bold text-gray-600">{tf.f02378}</TableHead>
                    <TableHead className="font-bold text-gray-600">{tf.f00650}</TableHead>
                    <TableHead className="font-bold text-gray-600">{tf.f00504}</TableHead>
                    <TableHead className="font-bold text-gray-600 text-right">{tf.f00087}</TableHead>
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
                      <p>{tf.f01112}</p>
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
                        <TableCell
                          className="text-gray-600 text-sm max-w-[200px] truncate"
                          title={`${supplier.supplier_type ? tf.f02400 + supplierSpecialtyLabel(supplier.supplier_type) : ""} ${supplier.memo || ""}`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            {supplier.supplier_type && (
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-xs font-medium shrink-0 text-slate-700">
                                {supplierSpecialtyLabel(supplier.supplier_type)}
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
                                if (window.confirm(tf.f01816)) deleteSupplier(supplier.id);
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
              {editingSupplier ? tf.f00882 : tf.f01370}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right font-semibold text-slate-700">
                {tf.f02376}
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="col-span-3 border-gray-200"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="contact" className="text-right font-semibold text-slate-700">
                {tf.f00444}
              </Label>
              <Input
                id="contact"
                placeholder={phSupplierPhone}
                value={formData.contact || ""}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                className="col-span-3 border-gray-200"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right font-semibold text-slate-700">
                {tf.f00504}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={phSupplierEmail}
                value={formData.email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="col-span-3 border-gray-200"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="business" className="text-right font-semibold text-slate-700">
                {tf.f02378}
              </Label>
              <Input
                id="business"
                placeholder={phSupplierBiz}
                value={formData.business_number || ""}
                onChange={(e) => setFormData({ ...formData, business_number: e.target.value })}
                className="col-span-3 border-gray-200"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="address" className="text-right font-semibold text-slate-700">
                {tf.f00650}
              </Label>
              <Input
                id="address"
                value={formData.address || ""}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="col-span-3 border-gray-200"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="supplier_type" className="text-right font-semibold text-slate-700">
                {tf.f02377}
              </Label>
              <div className="col-span-3">
                <Select
                  value={formData.supplier_type || "unassigned"}
                  onValueChange={(val: any) => setFormData({ ...formData, supplier_type: val === "unassigned" ? "" : (val || "") })}
                >
                  <SelectTrigger className="border-gray-200">
                    <SelectValue placeholder={tf.f02392} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">{tf.f02393}</SelectItem>
                    <SelectItem value="생화">{tf.f02394}</SelectItem>
                    <SelectItem value="분화">{tf.f02395}</SelectItem>
                    <SelectItem value="서양란">{tf.f02396}</SelectItem>
                    <SelectItem value="동양란">{tf.f02397}</SelectItem>
                    <SelectItem value="화환">{tf.f02398}</SelectItem>
                    <SelectItem value="자재">{tf.f02399}</SelectItem>
                    <SelectItem value="기타">{tf.f00115}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="memo" className="text-right font-semibold text-slate-700">
                {tf.f00197}
              </Label>
              <Input
                id="memo"
                value={formData.memo || ""}
                onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                className="col-span-3 border-gray-200"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>{tf.f00702}</Button>
            <Button onClick={handleSave} className="bg-slate-800 text-white font-bold hover:bg-slate-900 border-none transition-all">{tf.f01771}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
