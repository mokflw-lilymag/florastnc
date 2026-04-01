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
import { Product, ProductData } from "@/types/product";

import { useSettings, DEFAULT_PRODUCT_CATEGORIES } from "@/hooks/use-settings";

interface ProductFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ProductData) => void;
  product?: Product | null;
}

export function ProductForm({ isOpen, onOpenChange, onSubmit, product }: ProductFormProps) {
  const sizeLabels: Record<string, string> = {
    small: "소형 (꽃다발/꽃함)",
    medium: "중형 (꽃바구니/난)",
    large: "대형 (화환/대형관엽)"
  };

  const ribbonLabels: Record<string, string> = {
    "38mm": "38mm (슬림형)",
    "70mm": "70mm (표준 리본)",
    "100mm": "100mm (화환용 와이드)",
    none: "사용 안함 (카드)"
  };

  const statusLabels: Record<string, string> = {
    active: "판매중",
    inactive: "비활성 (미노출)",
    sold_out: "품절"
  };

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
            {product ? "상품 정보 수정" : "새 상품 등록"}
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            상품의 이름, 가격, 카테고리 등 상세 정보를 입력해주세요.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 py-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-slate-700 font-medium">상품명 <span className="text-red-500">*</span></Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="예: 장미 꽃다발 (M)"
                className="border-slate-200 focus:ring-blue-500/20"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="main_category" className="text-slate-700 font-medium">대분류 <span className="text-red-500">*</span></Label>
                <Select
                  value={formData.main_category || ""}
                  onValueChange={(value: string | null) => setFormData({ ...formData, main_category: value || undefined, mid_category: "" })}
                >
                  <SelectTrigger className="border-slate-200 focus:ring-blue-500/20">
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.main.map((cat: string) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="mid_category" className="text-slate-700 font-medium">중분류</Label>
                <Select
                  value={formData.mid_category || ""}
                  onValueChange={(value: string | null) => setFormData({ ...formData, mid_category: value || undefined })}
                  disabled={!formData.main_category}
                >
                  <SelectTrigger className="border-slate-200 focus:ring-blue-500/20">
                    <SelectValue placeholder="선택" />
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
                <Label htmlFor="product-price" className="text-slate-700 font-medium">판매 가격 (₩) <span className="text-red-500">*</span></Label>
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
                <Label htmlFor="product-stock" className="text-slate-700 font-medium">초기 재고</Label>
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
                <Label htmlFor="product-code" className="text-slate-700 font-medium">관리 코드 (SKU)</Label>
                <Input 
                  id="product-code"
                  value={formData.code || ""} 
                  onChange={e => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="예: FLOW-001"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-supplier" className="text-slate-700 font-medium">공급업체</Label>
                <Input 
                  id="product-supplier"
                  value={formData.supplier || ""} 
                  onChange={e => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                  placeholder="예: 양재꽃시장 A"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-dashed border-slate-100 mb-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-blue-600 uppercase">기본 상품 규격 (배송비 자동용)</Label>
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
                    <SelectItem value="small">소형 (꽃다발/꽃함)</SelectItem>
                    <SelectItem value="medium">중형 (꽃바구니/난)</SelectItem>
                    <SelectItem value="large">대형 (화환/대형관엽)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-indigo-600 uppercase">기본 리본 선정 (출력 설정용)</Label>
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
                    <SelectItem value="38mm">38mm (슬림형)</SelectItem>
                    <SelectItem value="70mm">70mm (표준 리본)</SelectItem>
                    <SelectItem value="100mm">100mm (화환용 와이드)</SelectItem>
                    <SelectItem value="none">사용 안함 (카드)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">판매 상태</Label>
              <Select 
                value={formData.status} 
                onValueChange={val => setFormData(prev => ({ ...prev, status: val as any }))}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue>{statusLabels[formData.status || "active"]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">판매중</SelectItem>
                  <SelectItem value="inactive">비활성 (미노출)</SelectItem>
                  <SelectItem value="sold_out">품절</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <DialogClose render={<Button type="button" variant="ghost">취소</Button>} />
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]">
              {product ? "수정 완료" : "상품 등록"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
