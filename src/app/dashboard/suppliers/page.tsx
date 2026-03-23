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
  ClipboardList
} from 'lucide-react';
import { useSuppliers, Supplier } from '@/hooks/use-suppliers';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from 'sonner';

export default function SuppliersPage() {
  const { suppliers, loading, addSupplier, updateSupplier, deleteSupplier } = useSuppliers();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [formData, setFormData] = useState<Partial<Supplier>>({
    name: "",
    contact: "",
    email: "",
    address: "",
    business_number: "",
    memo: ""
  });

  const handleSave = async () => {
    if (!formData.name) {
      toast.error("업체명은 필수 항목입니다.");
      return;
    }

    if (editingSupplier) {
      await updateSupplier(editingSupplier.id, formData);
    } else {
      await addSupplier(formData);
    }
    setIsAddDialogOpen(false);
    setEditingSupplier(null);
    setFormData({ name: "", contact: "", email: "", address: "", business_number: "", memo: "" });
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
        title="거래처 관리" 
        description="원부자재 및 상품 공급 업체를 관리하고 거래 상세 내역을 파악합니다."
        icon={Building2}
      >
        <div className="flex items-center gap-2">
           <Button 
            className="bg-slate-800 hover:bg-slate-900 text-white shadow-lg shadow-slate-200 transition-all active:scale-95"
            onClick={() => {
              setEditingSupplier(null);
              setFormData({ name: "", contact: "", email: "", address: "", business_number: "", memo: "" });
              setIsAddDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" /> 신규 거래처 등록
          </Button>
        </div>
      </PageHeader>

      <Card className="border-none shadow-xl bg-white/80 backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-between pb-4 space-y-0">
          <div>
            <CardTitle className="text-xl font-bold text-gray-800">등록된 거래처</CardTitle>
            <CardDescription>공급업체별 정보를 실시간으로 관리하세요</CardDescription>
          </div>
          <div className="flex items-center gap-2 w-full max-w-sm">
            <div className="relative w-full group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="업체명, 연락처 검색..." 
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
               {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
             </div>
          ) : (
            <div className="rounded-xl border border-gray-100 overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow className="hover:bg-transparent border-b">
                    <TableHead className="font-bold text-gray-600">업체명</TableHead>
                    <TableHead className="font-bold text-gray-600">연락처</TableHead>
                    <TableHead className="font-bold text-gray-600">사업자번호</TableHead>
                    <TableHead className="font-bold text-gray-600">주소</TableHead>
                    <TableHead className="font-bold text-gray-600">이메일</TableHead>
                    <TableHead className="font-bold text-gray-600 text-right">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-64 text-center text-muted-foreground font-medium">
                        <div className="flex flex-col items-center justify-center space-y-4">
                           <div className="p-4 bg-slate-50 rounded-full">
                             <Phone className="w-10 h-10 text-slate-300" />
                           </div>
                           <p>등록된 거래처가 없습니다.</p>
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
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                                if(window.confirm("정말 삭제하시겠습니까?")) deleteSupplier(supplier.id);
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
              {editingSupplier ? "거래처 정보 수정" : "새 거래처 등록"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right font-semibold text-slate-700">업체명</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="col-span-3 border-gray-200"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="contact" className="text-right font-semibold text-slate-700">연락처</Label>
              <Input
                id="contact"
                placeholder="02-000-0000"
                value={formData.contact}
                onChange={(e) => setFormData({...formData, contact: e.target.value})}
                className="col-span-3 border-gray-200"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right font-semibold text-slate-700">이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder="supplier@example.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="col-span-3 border-gray-200"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="business" className="text-right font-semibold text-slate-700">사업자번호</Label>
              <Input
                id="business"
                placeholder="000-00-00000"
                value={formData.business_number}
                onChange={(e) => setFormData({...formData, business_number: e.target.value})}
                className="col-span-3 border-gray-200"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="address" className="text-right font-semibold text-slate-700">주소</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                className="col-span-3 border-gray-200"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="memo" className="text-right font-semibold text-slate-700">메모</Label>
              <Input
                id="memo"
                value={formData.memo}
                onChange={(e) => setFormData({...formData, memo: e.target.value})}
                className="col-span-3 border-gray-200"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>취소</Button>
            <Button onClick={handleSave} className="bg-slate-800 text-white font-bold hover:bg-slate-900 border-none transition-all">저장하기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
