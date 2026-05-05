"use client";
import { getMessages } from "@/i18n/getMessages";

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
import {
  downloadTemplate,
  parseExcel,
  exportDataToExcel,
  normalizeProductExcelStatus,
  pickExcelCell,
  pickExcelString,
  productImportHeaderAliases,
} from "@/utils/excel";
import { useSettings } from "@/hooks/use-settings";
import { Download, Upload, Settings2 } from "lucide-react";
import Link from "next/link";
import { SAMPLE_PRODUCTS } from "@/utils/sample-data";
import { DASHBOARD_LIST_PAGE_SIZE } from "@/lib/dashboard-list-limit";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";

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
  const tf = getMessages(locale).tenantFlows;
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
      const H = productImportHeaderAliases(locale);
      let successCount = 0;
      for (const row of data) {
        const r = row as Record<string, unknown>;
        const payload: ProductData = {
          code: pickExcelString(r, H.code),
          name: pickExcelString(r, H.name),
          main_category: pickExcelString(r, H.main_category),
          mid_category: pickExcelString(r, H.mid_category),
          price: Number(pickExcelCell(r, H.price)) || 0,
          stock: Number(pickExcelCell(r, H.stock)) || 0,
          supplier: pickExcelString(r, H.supplier),
          status: normalizeProductExcelStatus(pickExcelString(r, H.status)) as ProductData["status"],
        };

        if (payload.name) {
          const id = await addProduct(payload);
          if (id) successCount++;
        }
      }
      toast.success(tf.f02305.replace("{count}", String(successCount)));
    } catch (err) {
      console.error(err);
      toast.error(tf.f01553);
    } finally {
      setIsImporting(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleFormSubmit = async (data: ProductData) => {
    try {
      if (editingProduct) {
        const success = await updateProduct(editingProduct.id, data);
        if (success) toast.success(tf.f01366);
      } else {
        const id = await addProduct(data);
        if (id) toast.success(tf.f01375);
      }
      setIsFormOpen(false);
    } catch (error) {
      toast.error(tf.f00540);
    }
  };

  const handleDelete = async (id: string): Promise<boolean> => {
    const result = await deleteProduct(id);
    if (result.ok) {
      toast.success(tf.f01365);
      return true;
    }
    toast.error(result.message);
    return false;
  };

  const handleLoadSamples = async () => {
    if (productStats.total > 0) {
      if (!window.confirm(tf.f02187)) return;
    }
    
    setIsImporting(true);
    try {
      let count = 0;
      for (const sample of SAMPLE_PRODUCTS) {
        await addProduct(sample);
        count++;
      }
      toast.success(tf.f02306.replace("{count}", String(count)));
    } catch (err) {
      toast.error(tf.f01390);
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
        title={tf.f01351}
        description={tf.f02098}
        icon={Package}
      >
        <div className="flex flex-wrap items-center justify-end gap-2">
          {/* Settings Link */}
          <Link href="/dashboard/settings/categories">
            <Button variant="ghost" size="sm" className="hidden sm:flex text-slate-500 hover:text-slate-900 border border-transparent hover:border-slate-200">
              <Settings2 className="h-4 w-4 mr-2" />
              {tf.f02063}
            </Button>
          </Link>

          {/* Export/Import Buttons */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => exportDataToExcel("product", filteredProducts, locale)}
            className="border-slate-200 text-slate-900 font-medium"
          >
            <Download className="h-4 w-4 mr-2 text-green-600" />
            {tf.f01089}
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => downloadTemplate("product", locale)}
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
              {isImporting ? tf.f00850 : tf.f01086}
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
            {tf.f00348}
          </Button>
          
          <Button 
            onClick={handleCreateNew}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
          >
            <Plus className="h-4 w-4 mr-2" />
            {tf.f00335}
          </Button>
        </div>
      </PageHeader>

      <p className="text-xs text-muted-foreground px-1">
        {tf.f01334} {DASHBOARD_LIST_PAGE_SIZE}{tf.f00898}
      </p>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-blue-50/50">
          <CardContent className="p-4 flex flex-col pt-4">
            <span className="text-xs text-blue-600 font-semibold mb-1 uppercase tracking-wider">{tf.f01799}</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-blue-900">{productStats.total}</span>
              <Package className="h-4 w-4 text-blue-300" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-emerald-50/50">
          <CardContent className="p-4 flex flex-col pt-4">
            <span className="text-xs text-emerald-600 font-semibold mb-1 uppercase tracking-wider">{tf.f02099}</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-900">{productStats.active}</span>
              <Tag className="h-4 w-4 text-emerald-300" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-amber-50/50">
          <CardContent className="p-4 flex flex-col pt-4">
            <span className="text-xs text-amber-600 font-semibold mb-1 uppercase tracking-wider">{tf.f01760}</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-900">{productStats.lowStock}</span>
              <AlertCircle className="h-4 w-4 text-amber-300" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-red-50/50">
          <CardContent className="p-4 flex flex-col pt-4">
            <span className="text-xs text-red-600 font-semibold mb-1 uppercase tracking-wider">{tf.f00747}</span>
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
            placeholder={tf.f01362}
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
              <h3 className="text-lg font-bold text-slate-700">{tf.f01114}</h3>
              <p className="text-slate-500 max-w-xs mx-auto">
                {tf.f01363}
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleLoadSamples} variant="outline" className="bg-white border-blue-200 text-blue-700 hover:bg-blue-50">
                <RefreshCw className="h-4 w-4 mr-2 text-blue-500" />
                {tf.f01391}
              </Button>
              <Button onClick={handleCreateNew} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                <Plus className="h-4 w-4 mr-2" />
                {tf.f01982}
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
                {tf.f01689}
              </Button>
              <span>
                {productsTotalCount === 0
                  ? "0"
                  : `${listPage * DASHBOARD_LIST_PAGE_SIZE + 1}–${Math.min((listPage + 1) * DASHBOARD_LIST_PAGE_SIZE, productsTotalCount)}`}{" "}
                / {tf.f00553} {productsTotalCount}{tf.f00033} · {tf.f02103} {listPage + 1} / {Math.max(1, Math.ceil(productsTotalCount / DASHBOARD_LIST_PAGE_SIZE))}
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
                {tf.f01062}
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
