"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogClose,
  DialogDescription
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import Textarea from "@/components/ui/textarea";
import { Customer, CustomerData } from "@/types/customer";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";

interface CustomerFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CustomerData) => void;
  customer?: Customer | null;
}

export function CustomerForm({ isOpen, onOpenChange, onSubmit, customer }: CustomerFormProps) {
  const locale = usePreferredLocale();
  const isKo = toBaseLocale(locale) === "ko";
  const tr = (ko: string, en: string) => (isKo ? ko : en);
  const [formData, setFormData] = useState<CustomerData>({
    name: "",
    contact: "",
    type: "individual",
    company_name: "",
    department: "",
    email: "",
    address: "",
    grade: tr("일반", "General"),
    points: 0,
    memo: ""
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        contact: customer.contact || "",
        type: customer.type,
        company_name: customer.company_name || "",
        department: customer.department || "",
        email: customer.email || "",
        address: customer.address || "",
        grade: customer.grade || tr("일반", "General"),
        points: customer.points || 0,
        memo: customer.memo || ""
      });
    } else {
      setFormData({
        name: "",
        contact: "",
        type: "individual",
        company_name: "",
        department: "",
        email: "",
        address: "",
        grade: tr("일반", "General"),
        points: 0,
        memo: ""
      });
    }
  }, [customer, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">
            {customer ? tr("고객 정보 수정", "Edit Customer") : tr("새 고객 등록", "New Customer")}
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            {tr("고객의 이름, 연락처, 유형 등 상세 정보를 입력해주세요.", "Enter customer details like name, contact, and type.")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 py-4">
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer-name" className="text-slate-700 font-medium">{tr("고객명", "Name")} <span className="text-red-500">*</span></Label>
                <Input 
                  id="customer-name"
                  value={formData.name} 
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={tr("예: 홍길동", "e.g. John Doe")}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">{tr("고객 유형", "Customer Type")}</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={val => setFormData(prev => ({ ...prev, type: val as any }))}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">{tr("개인", "Individual")}</SelectItem>
                    <SelectItem value="company">{tr("기업", "Company")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer-contact" className="text-slate-700 font-medium">{tr("연락처", "Contact")} <span className="text-red-500">*</span></Label>
                <Input 
                  id="customer-contact"
                  value={formData.contact} 
                  onChange={e => setFormData(prev => ({ ...prev, contact: e.target.value }))}
                  placeholder="010-0000-0000"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-email" className="text-slate-700 font-medium">{tr("이메일", "Email")}</Label>
                <Input 
                  id="customer-email"
                  type="email"
                  value={formData.email || ""} 
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="example@email.com"
                />
              </div>
            </div>

            {formData.type === 'company' && (
              <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200">
                <div className="space-y-2">
                  <Label htmlFor="company-name" className="text-slate-700 font-medium">{tr("회사명", "Company Name")}</Label>
                  <Input 
                    id="company-name"
                    value={formData.company_name || ""} 
                    onChange={e => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                    placeholder={tr("예: (주)릴리매그", "e.g. Lilymag Lab")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department" className="text-slate-700 font-medium">{tr("부서/팀", "Department/Team")}</Label>
                  <Input 
                    id="department"
                    value={formData.department || ""} 
                    onChange={e => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    placeholder={tr("예: 마케팅팀", "e.g. Marketing Team")}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="address" className="text-slate-700 font-medium">{tr("주소", "Address")}</Label>
              <Input 
                id="address"
                value={formData.address || ""} 
                onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder={tr("상세 주소를 입력하세요", "Enter detailed address")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">{tr("고객 등급", "Customer Grade")}</Label>
                <Select 
                  value={formData.grade || tr("일반", "General")} 
                  onValueChange={val => setFormData(prev => ({ ...prev, grade: val }))}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={tr("일반", "General")}>{tr("일반", "General")}</SelectItem>
                    <SelectItem value="VIP">VIP</SelectItem>
                    <SelectItem value="VVIP">VVIP</SelectItem>
                    <SelectItem value="GOLD">GOLD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-points" className="text-slate-700 font-medium">{tr("포인트 (선입금 잔액)", "Points (Prepaid Balance)")}</Label>
                <Input 
                  id="customer-points"
                  type="number"
                  value={formData.points === undefined ? "" : formData.points} 
                  onChange={e => setFormData(prev => ({ ...prev, points: e.target.value ? parseInt(e.target.value) : 0 }))}
                  placeholder={tr("예: 50000", "e.g. 50000")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="memo" className="text-slate-700 font-medium">{tr("메모", "Memo")}</Label>
              <Textarea 
                id="memo"
                value={formData.memo || ""} 
                onChange={e => setFormData(prev => ({ ...prev, memo: e.target.value }))}
                placeholder={tr("특이사항이나 취향 등을 기록하세요", "Record notes or preferences")}
                className="resize-none h-20"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <DialogClose render={<Button type="button" variant="ghost">{tr("취소", "Cancel")}</Button>} />
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]">
              {customer ? tr("수정 완료", "Save Changes") : tr("고객 등록", "Create Customer")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
