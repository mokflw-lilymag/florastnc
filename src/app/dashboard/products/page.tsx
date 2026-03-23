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
import { downloadTemplate, parseExcel } from "@/utils/excel";
import { useSettings } from "@/hooks/use-settings";
import { Download, Upload, Settings2 } from "lucide-react";
import Link from "next/link";
import { SAMPLE_PRODUCTS } from "@/utils/sample-data";

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

  const { productCategories } = useSettings();

  const hasAccess = authLoading || isSuperAdmin || ['pro', 'erp_only'].includes(plan);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);

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

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const data = await parseExcel(file);
      let successCount = 0;
      for (const row of data) {
        // Map excel columns to database fields
        const payload: ProductData = {
          code: row['상품코드']?.toString() || '',
          name: row['상품명']?.toString() || '',
          main_category: row['대분류']?.toString() || '',
          mid_category: row['중분류']?.toString() || '',
          price: Number(row['판매가']) || 0,
          stock: Number(row['재고']) || 0,
          supplier: row['공급처']?.toString() || '',
          status: (row['상태(active/inactive)']?.toString().toLowerCase() === 'inactive' ? 'inactive' : 'active') as any,
        };

        if (payload.name) {
          const id = await addProduct(payload);
          if (id) successCount++;
        }
      }
      toast.success(`${successCount}개의 상품이 등록되었습니다.`);
    } catch (err) {
      console.error(err);
      toast.error("엑셀 파일 파싱에 실패했습니다.");
    } finally {
      setIsImporting(false);
      e.target.value = ''; // Reset input
    }
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

  const handleLoadSamples = async () => {
    if (products.length > 0) {
      if (!window.confirm("현재 상품이 이미 존재합니다. 샘플 데이터를 추가로 불러오시겠습니까?")) return;
    }
    
    setIsImporting(true);
    try {
      let count = 0;
      for (const sample of SAMPLE_PRODUCTS) {
        await addProduct(sample);
        count++;
      }
      toast.success(`${count}개의 샘플 상품이 등록되었습니다.`);
    } catch (err) {
      toast.error("샘플 데이터 로딩 중 오류가 발생했습니다.");
    } finally {
      setIsImporting(false);
    }
  };

  if (!hasAccess) {
    return <AccessDenied requiredTier="ERP" />;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="상품 관리"
        description="판매 상품의 목록과 재고를 실시간으로 관리하고 카테고리를 분류합니다."
        icon={Package}
      >
        <div className="flex flex-wrap items-center justify-end gap-2">
          {/* Settings Link */}
          <Link href="/dashboard/settings/categories">
            <Button variant="ghost" size="sm" className="hidden sm:flex text-slate-500 hover:text-slate-900 border border-transparent hover:border-slate-200">
              <Settings2 className="h-4 w-4 mr-2" />
              카테고리 설정
            </Button>
          </Link>

          {/* Export/Import Buttons */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => downloadTemplate('product')}
            className="border-slate-200"
          >
            <Download className="h-4 w-4 mr-2" />
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
              variant="outline" 
              size="sm" 
              disabled={isImporting}
              className="border-slate-200"
            >
              <Upload className={`h-4 w-4 mr-2 ${isImporting ? 'animate-pulse' : ''}`} />
              {isImporting ? '업로드 중...' : '엑셀 업로드'}
            </Button>
          </div>

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
      {products.length === 0 && !loading ? (
        <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="p-4 bg-white rounded-full shadow-sm">
              <Package className="h-10 w-10 text-slate-300" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-700">등록된 상품이 없습니다</h3>
              <p className="text-slate-500 max-w-xs mx-auto">
                상품을 직접 추가하거나 엑셀로 업로드할 수 있습니다. 시스템이 처음이라면 샘플 데이터를 먼저 확인해보세요.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleLoadSamples} variant="outline" className="bg-white">
                <RefreshCw className="h-4 w-4 mr-2 text-blue-500" />
                샘플 데이터 불러오기
              </Button>
              <Button onClick={handleCreateNew} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                첫 상품 등록하기
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ProductTable
          products={filteredProducts}
          onSelectionChange={setSelectedIds}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <ProductForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
        product={editingProduct}
      />
    </div>
  );
}
