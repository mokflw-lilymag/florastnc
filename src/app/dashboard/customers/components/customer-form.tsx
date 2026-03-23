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

interface CustomerFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CustomerData) => void;
  customer?: Customer | null;
}

export function CustomerForm({ isOpen, onOpenChange, onSubmit, customer }: CustomerFormProps) {
  const [formData, setFormData] = useState<CustomerData>({
    name: "",
    contact: "",
    type: "individual",
    company_name: "",
    department: "",
    email: "",
    address: "",
    grade: "일반",
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
        grade: customer.grade || "일반",
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
        grade: "일반",
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
            {customer ? "고객 정보 수정" : "새 고객 등록"}
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            고객의 이름, 연락처, 유형 등 상세 정보를 입력해주세요.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 py-4">
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer-name" className="text-slate-700 font-medium">고객명 <span className="text-red-500">*</span></Label>
                <Input 
                  id="customer-name"
                  value={formData.name} 
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="예: 홍길동"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">고객 유형</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={val => setFormData(prev => ({ ...prev, type: val as any }))}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">개인</SelectItem>
                    <SelectItem value="company">기업</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer-contact" className="text-slate-700 font-medium">연락처 <span className="text-red-500">*</span></Label>
                <Input 
                  id="customer-contact"
                  value={formData.contact} 
                  onChange={e => setFormData(prev => ({ ...prev, contact: e.target.value }))}
                  placeholder="010-0000-0000"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-email" className="text-slate-700 font-medium">이메일</Label>
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
                  <Label htmlFor="company-name" className="text-slate-700 font-medium">회사명</Label>
                  <Input 
                    id="company-name"
                    value={formData.company_name || ""} 
                    onChange={e => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                    placeholder="예: (주)릴리매그"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department" className="text-slate-700 font-medium">부서/팀</Label>
                  <Input 
                    id="department"
                    value={formData.department || ""} 
                    onChange={e => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    placeholder="예: 마케팅팀"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="address" className="text-slate-700 font-medium">주소</Label>
              <Input 
                id="address"
                value={formData.address || ""} 
                onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="상세 주소를 입력하세요"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">고객 등급</Label>
                <Select 
                  value={formData.grade || "일반"} 
                  onValueChange={val => setFormData(prev => ({ ...prev, grade: val }))}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="일반">일반</SelectItem>
                    <SelectItem value="VIP">VIP</SelectItem>
                    <SelectItem value="VVIP">VVIP</SelectItem>
                    <SelectItem value="GOLD">GOLD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="memo" className="text-slate-700 font-medium">메모</Label>
              <Textarea 
                id="memo"
                value={formData.memo || ""} 
                onChange={e => setFormData(prev => ({ ...prev, memo: e.target.value }))}
                placeholder="특이사항이나 취향 등을 기록하세요"
                className="resize-none h-20"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <DialogClose render={<Button type="button" variant="ghost">취소</Button>} />
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]">
              {customer ? "수정 완료" : "고객 등록"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
