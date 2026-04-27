"use client";

import { useState, useEffect, useMemo } from "react";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
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
import { Product, ProductData } from "@/types/product";

import { useSettings, DEFAULT_PRODUCT_CATEGORIES } from "@/hooks/use-settings";

interface ProductFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ProductData) => void;
  product?: Product | null;
}

export function ProductForm({ isOpen, onOpenChange, onSubmit, product }: ProductFormProps) {
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const tr = (koText: string, enText: string) => (baseLocale === "ko" ? koText : enText);

  const sizeLabels = useMemo<Record<string, string>>(
    () => ({
      small: tr("소형 (꽃다발/꽃함)", "Small (bouquet / box)"),
      medium: tr("중형 (꽃바구니/난)", "Medium (basket / orchid)"),
      large: tr("대형 (화환/대형관엽)", "Large (wreath / large foliage)"),
    }),
    [baseLocale]
  );

  const ribbonLabels = useMemo<Record<string, string>>(
    () => ({
      "38mm": tr("38mm (슬림형)", "38mm (slim)"),
      "70mm": tr("70mm (표준 리본)", "70mm (standard ribbon)"),
      "100mm": tr("100mm (화환용 와이드)", "100mm (wreath wide)"),
      none: tr("사용 안함 (카드)", "None (card only)"),
    }),
    [baseLocale]
  );

  const statusLabels = useMemo<Record<string, string>>(
    () => ({
      active: tr("판매중", "Active"),
      inactive: tr("비활성 (미노출)", "Inactive (hidden)"),
      sold_out: tr("품절", "Sold out"),
    }),
    [baseLocale]
  );

  const [formData, setFormData] = useState<ProductData>({
    name: "",
    main_category: "",
    mid_category: "",
    price: 0,
    stock: 0,
    supplier: "",
    code: "",
    status: "active",
    extra_data: {
      item_size: "medium",
      ribbon_size: "70mm"
    }
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        main_category: product.main_category || "",
        mid_category: product.mid_category || "",
        price: product.price,
        stock: product.stock,
        supplier: product.supplier || "",
        code: product.code || "",
        status: product.status,
        extra_data: product.extra_data || {
          item_size: "medium",
          ribbon_size: "70mm"
        }
      });
    } else {
      setFormData({
        name: "",
        main_category: "",
        mid_category: "",
        price: 0,
        stock: 0,
        supplier: "",
        code: "",
        status: "active",
        extra_data: {
          item_size: "medium",
          ribbon_size: "70mm"
        }
      });
    }
  }, [product, isOpen]);

  const { productCategories } = useSettings();
  const CATEGORIES = productCategories || DEFAULT_PRODUCT_CATEGORIES;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const mainCategory = formData.main_category as string;
  const subCategories = (mainCategory && CATEGORIES.mid[mainCategory]) || [];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">
            {product ? tr("상품 정보 수정", "Edit product") : tr("새 상품 등록", "Add product")}
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            {tr("상품의 이름, 가격, 카테고리 등 상세 정보를 입력해주세요.", "Enter name, price, category, and other details.")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 py-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-slate-700 font-medium">
                {tr("상품명", "Product name")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={tr("예: 장미 꽃다발 (M)", "e.g. Rose bouquet (M)")}
                className="border-slate-200 focus:ring-blue-500/20"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="main_category" className="text-slate-700 font-medium">
                  {tr("대분류", "Main category")} <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.main_category || ""}
                  onValueChange={(value: string | null) => setFormData({ ...formData, main_category: value || undefined, mid_category: "" })}
                >
                  <SelectTrigger className="border-slate-200 focus:ring-blue-500/20">
                    <SelectValue placeholder={tr("선택", "Select")} />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.main.map((cat: string) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="mid_category" className="text-slate-700 font-medium">{tr("중분류", "Subcategory")}</Label>
                <Select
                  value={formData.mid_category || ""}
                  onValueChange={(value: string | null) => setFormData({ ...formData, mid_category: value || undefined })}
                  disabled={!formData.main_category}
                >
                  <SelectTrigger className="border-slate-200 focus:ring-blue-500/20">
                    <SelectValue placeholder={tr("선택", "Select")} />
                  </SelectTrigger>
                  <SelectContent>
                    {subCategories.map((cat: string) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="product-price" className="text-slate-700 font-medium">
                  {tr("판매 가격 (₩)", "Price (₩)")} <span className="text-red-500">*</span>
                </Label>
                <Input 
                  id="product-price"
                  type="number" 
                  value={formData.price} 
                  onChange={e => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
                  required
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-stock" className="text-slate-700 font-medium">{tr("초기 재고", "Initial stock")}</Label>
                <Input 
                  id="product-stock"
                  type="number" 
                  value={formData.stock} 
                  onChange={e => setFormData(prev => ({ ...prev, stock: Number(e.target.value) }))}
                  className="font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="product-code" className="text-slate-700 font-medium">{tr("관리 코드 (SKU)", "SKU / code")}</Label>
                <Input 
                  id="product-code"
                  value={formData.code || ""} 
                  onChange={e => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  placeholder={tr("예: FLOW-001", "e.g. FLOW-001")}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-supplier" className="text-slate-700 font-medium">{tr("공급업체", "Supplier")}</Label>
                <Input 
                  id="product-supplier"
                  value={formData.supplier || ""} 
                  onChange={e => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                  placeholder={tr("예: 양재꽃시장 A", "e.g. Wholesale market A")}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-dashed border-slate-100 mb-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-blue-600 uppercase">
                  {tr("기본 상품 규격 (배송비 자동용)", "Default size (shipping rules)")}
                </Label>
                <Select 
                  value={formData.extra_data?.item_size || "medium"} 
                  onValueChange={val => setFormData(prev => ({ 
                    ...prev, 
                    extra_data: { ...prev.extra_data, item_size: val } 
                  }))}
                >
                  <SelectTrigger className="h-9 rounded-xl border-blue-100 bg-blue-50/30 text-xs shadow-none">
                    <SelectValue>{sizeLabels[formData.extra_data?.item_size || ""]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">{sizeLabels.small}</SelectItem>
                    <SelectItem value="medium">{sizeLabels.medium}</SelectItem>
                    <SelectItem value="large">{sizeLabels.large}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-indigo-600 uppercase">
                  {tr("기본 리본 선정 (출력 설정용)", "Default ribbon (print settings)")}
                </Label>
                <Select 
                  value={formData.extra_data?.ribbon_size || "70mm"} 
                  onValueChange={val => setFormData(prev => ({ 
                    ...prev, 
                    extra_data: { ...prev.extra_data, ribbon_size: val } 
                  }))}
                >
                  <SelectTrigger className="h-9 rounded-xl border-indigo-100 bg-indigo-50/30 text-xs shadow-none">
                    <SelectValue>{ribbonLabels[formData.extra_data?.ribbon_size || "70mm"]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="38mm">{ribbonLabels["38mm"]}</SelectItem>
                    <SelectItem value="70mm">{ribbonLabels["70mm"]}</SelectItem>
                    <SelectItem value="100mm">{ribbonLabels["100mm"]}</SelectItem>
                    <SelectItem value="none">{ribbonLabels.none}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">{tr("판매 상태", "Sale status")}</Label>
              <Select 
                value={formData.status} 
                onValueChange={val => setFormData(prev => ({ ...prev, status: val as any }))}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue>{statusLabels[formData.status || "active"]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{statusLabels.active}</SelectItem>
                  <SelectItem value="inactive">{statusLabels.inactive}</SelectItem>
                  <SelectItem value="sold_out">{statusLabels.sold_out}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <DialogClose render={<Button type="button" variant="ghost">{tr("취소", "Cancel")}</Button>} />
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]">
              {product ? tr("수정 완료", "Save changes") : tr("상품 등록", "Add product")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
