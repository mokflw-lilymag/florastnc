"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductTable } from "./components/product-table";
import { ProductForm } from "./components/product-form";
import { useProducts } from "@/hooks/use-products";
import { Product, ProductData } from "@/types/product";
import { Plus, Search, RefreshCw, Package, Tag, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { AccessDenied } from "@/components/access-denied";
import { Skeleton } from "@/components/ui/skeleton";
import { downloadTemplate, parseExcel, exportDataToExcel } from "@/utils/excel";
import { useSettings } from "@/hooks/use-settings";
import { Download, Upload, Settings2 } from "lucide-react";
import Link from "next/link";
import { SAMPLE_PRODUCTS } from "@/utils/sample-data";
import { DASHBOARD_LIST_PAGE_SIZE } from "@/lib/dashboard-list-limit";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";

export default function ProductsPage() {
  const { profile, isSuperAdmin, isLoading: authLoading } = useAuth();
  const plan = profile?.tenants?.plan || (isSuperAdmin ? "pro" : "free");

  const {
    products,
    loading,
    isRefreshing,
    fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    productStats,
    productsTotalCount,
    listPage,
    setListPageAndFetch,
  } = useProducts();

  const { productCategories } = useSettings();

  const hasAccess = authLoading || isSuperAdmin || ['pro', 'erp_only'].includes(plan);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const locale = usePreferredLocale();
  const isKo = toBaseLocale(locale) === "ko";
  const tr = (ko: string, en: string) => (isKo ? ko : en);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    const lowerSearch = searchTerm.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(lowerSearch) || 
      (p.code?.toLowerCase().includes(lowerSearch))
    );
  }, [products, searchTerm]);

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
      toast.success(tr(`${successCount}개의 상품이 등록되었습니다.`, `${successCount} products imported.`));
    } catch (err) {
      console.error(err);
      toast.error(tr("엑셀 파일 파싱에 실패했습니다.", "Failed to parse Excel file."));
    } finally {
      setIsImporting(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleFormSubmit = async (data: ProductData) => {
    try {
      if (editingProduct) {
        const success = await updateProduct(editingProduct.id, data);
        if (success) toast.success(tr("상품이 수정되었습니다.", "Product updated."));
      } else {
        const id = await addProduct(data);
        if (id) toast.success(tr("새 상품이 등록되었습니다.", "Product created."));
      }
      setIsFormOpen(false);
    } catch (error) {
      toast.error(tr("저장 중 오류가 발생했습니다.", "Error while saving."));
    }
  };

  const handleDelete = async (id: string): Promise<boolean> => {
    const result = await deleteProduct(id);
    if (result.ok) {
      toast.success(tr("상품이 삭제되었습니다.", "Product deleted."));
      return true;
    }
    toast.error(result.message);
    return false;
  };

  const handleLoadSamples = async () => {
    if (productStats.total > 0) {
      if (!window.confirm(tr("현재 상품이 이미 존재합니다. 샘플 데이터를 추가로 불러오시겠습니까?", "Products already exist. Load sample data anyway?"))) return;
    }
    
    setIsImporting(true);
    try {
      let count = 0;
      for (const sample of SAMPLE_PRODUCTS) {
        await addProduct(sample);
        count++;
      }
      toast.success(tr(`${count}개의 샘플 상품이 등록되었습니다.`, `${count} sample products imported.`));
    } catch (err) {
      toast.error(tr("샘플 데이터 로딩 중 오류가 발생했습니다.", "Sample data load failed."));
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
        title={tr("상품 관리", "Product Management")}
        description={tr("판매 상품의 목록과 재고를 실시간으로 관리하고 카테고리를 분류합니다.", "Manage products, stock, and categories in real time.")}
        icon={Package}
      >
        <div className="flex flex-wrap items-center justify-end gap-2">
          {/* Settings Link */}
          <Link href="/dashboard/settings/categories">
            <Button variant="ghost" size="sm" className="hidden sm:flex text-slate-500 hover:text-slate-900 border border-transparent hover:border-slate-200">
              <Settings2 className="h-4 w-4 mr-2" />
              {tr("카테고리 설정", "Category Settings")}
            </Button>
          </Link>

          {/* Export/Import Buttons */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => exportDataToExcel('product', filteredProducts)}
            className="border-slate-200 text-slate-900 font-medium"
          >
            <Download className="h-4 w-4 mr-2 text-green-600" />
            {tr("데이터 다운로드", "Download Data")}
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => downloadTemplate('product')}
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
              {isImporting ? tr('가져오는 중...', 'Importing...') : tr('데이터 가져오기', 'Import Data')}
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
            {tr("새로고침", "Refresh")}
          </Button>
          
          <Button 
            onClick={handleCreateNew}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
          >
            <Plus className="h-4 w-4 mr-2" />
            {tr("상품 추가", "Add Product")}
          </Button>
        </div>
      </PageHeader>

      <p className="text-xs text-muted-foreground px-1">
        {tr("상단 요약 카드는 매장 전체 상품 기준입니다. 아래 표는 이름순으로 한 번에", "Top summary uses all products. Table is paged by")} {DASHBOARD_LIST_PAGE_SIZE}{tr("건씩 페이지를 나눠 불러옵니다. 검색은 현재 페이지 안에서만 적용됩니다.", " rows sorted by name. Search applies on current page only.")}
      </p>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-blue-50/50">
          <CardContent className="p-4 flex flex-col pt-4">
            <span className="text-xs text-blue-600 font-semibold mb-1 uppercase tracking-wider">{tr("전체 상품", "Total Products")}</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-blue-900">{productStats.total}</span>
              <Package className="h-4 w-4 text-blue-300" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-emerald-50/50">
          <CardContent className="p-4 flex flex-col pt-4">
            <span className="text-xs text-emerald-600 font-semibold mb-1 uppercase tracking-wider">{tr("판매 중", "Active")}</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-900">{productStats.active}</span>
              <Tag className="h-4 w-4 text-emerald-300" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-amber-50/50">
          <CardContent className="p-4 flex flex-col pt-4">
            <span className="text-xs text-amber-600 font-semibold mb-1 uppercase tracking-wider">{tr("재고 부족", "Low Stock")}</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-900">{productStats.lowStock}</span>
              <AlertCircle className="h-4 w-4 text-amber-300" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-red-50/50">
          <CardContent className="p-4 flex flex-col pt-4">
            <span className="text-xs text-red-600 font-semibold mb-1 uppercase tracking-wider">{tr("품절", "Out of Stock")}</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-red-900">{productStats.outOfStock}</span>
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
            placeholder={tr("상품명 또는 코드로 검색...", "Search product name or code...")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-slate-200 bg-white shadow-sm focus:ring-blue-500/20"
          />
        </div>
      </div>

      {/* Product Table */}
      {productStats.total === 0 && !loading ? (
        <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="p-4 bg-white rounded-full shadow-sm">
              <Package className="h-10 w-10 text-slate-300" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-700">{tr("등록된 상품이 없습니다", "No products registered")}</h3>
              <p className="text-slate-500 max-w-xs mx-auto">
                {tr("상품을 직접 추가하거나 엑셀로 업로드할 수 있습니다. 시스템이 처음이라면 샘플 데이터를 먼저 확인해보세요.", "Add products manually or import from Excel. You can start with sample data.")}
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleLoadSamples} variant="outline" className="bg-white border-blue-200 text-blue-700 hover:bg-blue-50">
                <RefreshCw className="h-4 w-4 mr-2 text-blue-500" />
                {tr("샘플 데이터 불러오기", "Load Sample Data")}
              </Button>
              <Button onClick={handleCreateNew} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                <Plus className="h-4 w-4 mr-2" />
                {tr("첫 상품 등록하기", "Add First Product")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <ProductTable
            products={filteredProducts}
            pageProducts={products}
            registeredTotal={productStats.total}
            onSelectionChange={setSelectedIds}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
          {productsTotalCount > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-3 py-4 text-sm text-muted-foreground">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={listPage <= 0 || isRefreshing}
                onClick={() => void setListPageAndFetch(listPage - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                {tr("이전", "Prev")}
              </Button>
              <span>
                {productsTotalCount === 0
                  ? "0"
                  : `${listPage * DASHBOARD_LIST_PAGE_SIZE + 1}–${Math.min((listPage + 1) * DASHBOARD_LIST_PAGE_SIZE, productsTotalCount)}`}{" "}
                / {tr("전체", "Total")} {productsTotalCount}{tr("건", "")} · {tr("페이지", "Page")} {listPage + 1} / {Math.max(1, Math.ceil(productsTotalCount / DASHBOARD_LIST_PAGE_SIZE))}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={
                  isRefreshing || (listPage + 1) * DASHBOARD_LIST_PAGE_SIZE >= productsTotalCount
                }
                onClick={() => void setListPageAndFetch(listPage + 1)}
              >
                {tr("다음", "Next")}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </>
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
