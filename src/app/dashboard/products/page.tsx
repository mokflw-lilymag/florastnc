"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductTable } from "./components/product-table";
import { ProductForm } from "./components/product-form";
import { useProducts } from "@/hooks/use-products";
import { Product, ProductData } from "@/types/product";
import { Plus, Search, RefreshCw, Package, Tag, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { AccessDenied } from "@/components/access-denied";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProductsPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const plan = profile?.tenants?.plan || "free";
  const isSuperAdmin = profile?.role === 'super_admin';

  const { 
    products, 
    loading, 
    isRefreshing, 
    fetchProducts, 
    addProduct, 
    updateProduct, 
    deleteProduct 
  } = useProducts();

  if (!authLoading && !isSuperAdmin && !['pro', 'erp_only'].includes(plan)) {
    return <AccessDenied requiredTier="ERP" />;
  }

  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    const lowerSearch = searchTerm.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(lowerSearch) || 
      (p.code?.toLowerCase().includes(lowerSearch))
    );
  }, [products, searchTerm]);

  const stats = useMemo(() => {
    return {
      total: products.length,
      active: products.filter(p => p.status === 'active' && p.stock > 0).length,
      lowStock: products.filter(p => p.stock > 0 && p.stock < 10).length,
      outOfStock: products.filter(p => p.stock <= 0).length
    };
  }, [products]);

  const handleCreateNew = () => {
    setEditingProduct(null);
    setIsFormOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: ProductData) => {
    try {
      if (editingProduct) {
        const success = await updateProduct(editingProduct.id, data);
        if (success) toast.success("상품이 수정되었습니다.");
      } else {
        const id = await addProduct(data);
        if (id) toast.success("새 상품이 등록되었습니다.");
      }
      setIsFormOpen(false);
    } catch (error) {
      toast.error("저장 중 오류가 발생했습니다.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const success = await deleteProduct(id);
      if (success) toast.success("상품이 삭제되었습니다.");
    } catch (error) {
      toast.error("삭제 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="상품 관리"
        description="판매 상품의 목록과 재고를 실시간으로 관리하고 카테고리를 분류합니다."
        icon={Package}
      >
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchProducts()}
            disabled={isRefreshing}
            className="hidden sm:flex border-slate-200"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
          <Button 
            onClick={handleCreateNew}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
          >
            <Plus className="h-4 w-4 mr-2" />
            상품 추가
          </Button>
        </div>
      </PageHeader>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-blue-50/50">
          <CardContent className="p-4 flex flex-col pt-4">
            <span className="text-xs text-blue-600 font-semibold mb-1 uppercase tracking-wider">전체 상품</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-blue-900">{stats.total}</span>
              <Package className="h-4 w-4 text-blue-300" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-emerald-50/50">
          <CardContent className="p-4 flex flex-col pt-4">
            <span className="text-xs text-emerald-600 font-semibold mb-1 uppercase tracking-wider">판매 중</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-900">{stats.active}</span>
              <Tag className="h-4 w-4 text-emerald-300" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-amber-50/50">
          <CardContent className="p-4 flex flex-col pt-4">
            <span className="text-xs text-amber-600 font-semibold mb-1 uppercase tracking-wider">재고 부족</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-900">{stats.lowStock}</span>
              <AlertCircle className="h-4 w-4 text-amber-300" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-red-50/50">
          <CardContent className="p-4 flex flex-col pt-4">
            <span className="text-xs text-red-600 font-semibold mb-1 uppercase tracking-wider">품절</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-red-900">{stats.outOfStock}</span>
              <AlertCircle className="h-4 w-4 text-red-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="상품명 또는 코드로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-slate-200 bg-white shadow-sm focus:ring-blue-500/20"
          />
        </div>
      </div>

      {/* Product Table */}
      <ProductTable
        products={filteredProducts}
        onSelectionChange={setSelectedIds}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ProductForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
        product={editingProduct}
      />
    </div>
  );
}
