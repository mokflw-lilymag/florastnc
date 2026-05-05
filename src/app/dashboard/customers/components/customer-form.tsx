"use client";
import { getMessages } from "@/i18n/getMessages";

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
import { pickUiText } from "@/i18n/pick-ui-text";

interface CustomerFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CustomerData) => void;
  customer?: Customer | null;
}

export function CustomerForm({ isOpen, onOpenChange, onSubmit, customer }: CustomerFormProps) {
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const baseLocale = toBaseLocale(locale);
  const phContact = pickUiText(
    baseLocale,
    "010-0000-0000",
    "+1 555-000-0000",
    "0909 000 000",
    "090-0000-0000",
    "138-0000-0000",
    "+34 600 000 000",
    "+55 11 90000-0000",
    "+33 6 00 00 00 00",
    "+49 151 00000000",
    "+7 900 000-00-00",
  );
  const phEmail = pickUiText(
    baseLocale,
    "example@email.com",
    "you@example.com",
    "email@company.com",
    "info@yourshop.jp",
    "lianxi@yourshop.cn",
    "cliente@tutienda.com",
    "cliente@sualoja.com",
    "client@boutique.com",
    "kunde@beispiel.de",
    "klient@primer.ru",
  );
  const [formData, setFormData] = useState<CustomerData>({
    name: "",
    contact: "",
    type: "individual",
    company_name: "",
    department: "",
    email: "",
    address: "",
    grade: tf.f00525,
    points: 0,
    memo: ""
  });

  useEffect(() => {
    const t = getMessages(locale).tenantFlows;
    if (customer) {
      setFormData({
        name: customer.name,
        contact: customer.contact || "",
        type: customer.type,
        company_name: customer.company_name || "",
        department: customer.department || "",
        email: customer.email || "",
        address: customer.address || "",
        grade: customer.grade || t.f00525,
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
        grade: t.f00525,
        points: 0,
        memo: ""
      });
    }
  }, [customer, isOpen, locale]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">
            {customer ? tf.f00070 : tf.f00342}
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            {tf.f00084}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 py-4">
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer-name" className="text-slate-700 font-medium">{tf.f00076} <span className="text-red-500">*</span></Label>
                <Input 
                  id="customer-name"
                  value={formData.name} 
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={tf.f00456}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">{tf.f00066}</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={val => setFormData(prev => ({ ...prev, type: val as any }))}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">{tf.f00028}</SelectItem>
                    <SelectItem value="company">{tf.f00109}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer-contact" className="text-slate-700 font-medium">{tf.f00444} <span className="text-red-500">*</span></Label>
                <Input 
                  id="customer-contact"
                  value={formData.contact} 
                  onChange={e => setFormData(prev => ({ ...prev, contact: e.target.value }))}
                  placeholder={phContact}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-email" className="text-slate-700 font-medium">{tf.f00504}</Label>
                <Input 
                  id="customer-email"
                  type="email"
                  value={formData.email || ""} 
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder={phEmail}
                />
              </div>
            </div>

            {formData.type === 'company' && (
              <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200">
                <div className="space-y-2">
                  <Label htmlFor="company-name" className="text-slate-700 font-medium">{tf.f00779}</Label>
                  <Input 
                    id="company-name"
                    value={formData.company_name || ""} 
                    onChange={e => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                    placeholder={tf.f00449}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department" className="text-slate-700 font-medium">{tf.f00296}</Label>
                  <Input 
                    id="department"
                    value={formData.department || ""} 
                    onChange={e => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    placeholder={tf.f00454}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="address" className="text-slate-700 font-medium">{tf.f00650}</Label>
              <Input 
                id="address"
                value={formData.address || ""} 
                onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder={tf.f00316}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">{tf.f00062}</Label>
                <Select 
                  value={formData.grade || tf.f00525} 
                  onValueChange={val => setFormData(prev => ({ ...prev, grade: val }))}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={tf.f00525}>{tf.f00525}</SelectItem>
                    <SelectItem value="VIP">VIP</SelectItem>
                    <SelectItem value="VVIP">VVIP</SelectItem>
                    <SelectItem value="GOLD">GOLD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-points" className="text-slate-700 font-medium">{tf.f00728}</Label>
                <Input 
                  id="customer-points"
                  type="number"
                  value={formData.points === undefined ? "" : formData.points} 
                  onChange={e => setFormData(prev => ({ ...prev, points: e.target.value ? parseInt(e.target.value) : 0 }))}
                  placeholder={tf.f00453}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="memo" className="text-slate-700 font-medium">{tf.f00197}</Label>
              <Textarea 
                id="memo"
                value={formData.memo || ""} 
                onChange={e => setFormData(prev => ({ ...prev, memo: e.target.value }))}
                placeholder={tf.f00721}
                className="resize-none h-20"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <DialogClose render={<Button type="button" variant="ghost">{tf.f00702}</Button>} />
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]">
              {customer ? tf.f00395 : tf.f00063}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
