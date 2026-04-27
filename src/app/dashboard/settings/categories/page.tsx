"use client";

import { PageHeader } from "@/components/page-header";
import { useSettings, DEFAULT_PRODUCT_CATEGORIES, DEFAULT_MATERIAL_CATEGORIES, DEFAULT_EXPENSE_CATEGORIES } from "@/hooks/use-settings";
import { Settings2, Package, Layers, Home, Wallet, Info, ChevronRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { CategoryManagerCard } from "@/components/settings/category-manager-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";

export default function CategorySettingsPage() {
  const locale = usePreferredLocale();
  const isKo = toBaseLocale(locale) === "ko";
  const tr = (ko: string, en: string) => (isKo ? ko : en);
  const { 
    productCategories, 
    materialCategories, 
    expenseCategories,
    loading, 
    updateProductCategories, 
    updateMaterialCategories,
    updateExpenseCategories,
  } = useSettings();
  
  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-32 px-4 md:px-8 pt-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title={tr("통합 분류(카테고리) 환경설정", "Unified Category Settings")}
          description={tr("상품, 자재, 지출 항목의 분류 체계를 매장 운영 방식에 맞춰 자유롭게 구성하세요.", "Configure category structures for products, materials, and expenses to fit your store operations.")}
          icon={Settings2}
        >
          <div className="flex gap-2">
             <Link href="/dashboard/settings">
                <Button variant="outline" size="sm" className="bg-white border-slate-200 rounded-xl">
                  <Home className="h-4 w-4 mr-2 text-slate-400" />
                  {tr("환경설정 홈", "Settings Home")}
                </Button>
             </Link>
          </div>
        </PageHeader>
      </div>

      <Alert className="bg-indigo-50/50 border-indigo-100 text-indigo-900 rounded-3xl p-6 shadow-sm shadow-indigo-100/50">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600">
            <Info className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <AlertTitle className="font-bold text-lg">{tr("💡 통합 카테고리 관리 안내", "💡 Unified Category Management Guide")}</AlertTitle>
            <AlertDescription className="text-indigo-800/80 leading-relaxed font-medium">
              {tr("이곳에서 변경한 내용은 상품 등록, 재고 관리, 매뉴얼, 지출 관리 등 시스템 전반에 즉시 반영됩니다.", "Changes here are applied immediately across product registration, inventory, manual workflows, and expense management.")}
              <br className="hidden md:block" />
              {tr("이미 등록된 데이터의 분류는 소급 적용되지 않으니 주의해 주세요.", "Please note that existing records are not retroactively reclassified.")}
            </AlertDescription>
          </div>
        </div>
      </Alert>

      <Tabs defaultValue="products" className="w-full">
        <div className="flex flex-col items-center justify-center mb-10 space-y-4">
          <TabsList className="bg-slate-100/80 p-1.5 rounded-3xl h-14 border border-slate-200">
            <TabsTrigger value="products" className="rounded-2xl px-10 data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-blue-600 h-11 transition-all">
              <Package className="h-4.5 w-4.5 mr-2" />
              {tr("상품 분류", "Product Categories")}
            </TabsTrigger>
            <TabsTrigger value="materials" className="rounded-2xl px-10 data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-orange-600 h-11 transition-all">
              <Layers className="h-4.5 w-4.5 mr-2" />
              {tr("자재 분류", "Material Categories")}
            </TabsTrigger>
            <TabsTrigger value="expenses" className="rounded-2xl px-10 data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-emerald-600 h-11 transition-all">
              <Wallet className="h-4.5 w-4.5 mr-2" />
              {tr("지출 분류", "Expense Categories")}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="products" className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CategoryManagerCard
            title={tr("상품 카테고리 관리", "Product Category Management")}
            description={tr("판매하는 상품(꽃다발, 바구니 등)의 대분류와 하위 상세 분류입니다.", "Top-level and detailed categories for products you sell (bouquets, baskets, etc.).")}
            icon={Package}
            initialData={productCategories}
            defaultData={DEFAULT_PRODUCT_CATEGORIES}
            onSave={updateProductCategories}
            colorScheme="blue"
            isLoading={loading}
          />
        </TabsContent>

        <TabsContent value="materials" className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CategoryManagerCard
            title={tr("자재 카테고리 관리", "Material Category Management")}
            description={tr("자재(생화, 식물, 포장재 등)의 체계적 관리를 위한 분류 체계입니다.", "Classification system for managing materials (flowers, plants, packaging, etc.).")}
            icon={Layers}
            initialData={materialCategories}
            defaultData={DEFAULT_MATERIAL_CATEGORIES}
            onSave={updateMaterialCategories}
            colorScheme="orange"
            isLoading={loading}
          />
        </TabsContent>

        <TabsContent value="expenses" className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CategoryManagerCard
            title={tr("지출(Cost) 카테고리 관리", "Expense Category Management")}
            description={tr("매장 운영 시 발생하는 각종 고정비 및 변동비의 분류 체계입니다.", "Classification system for fixed and variable operational costs.")}
            icon={Wallet}
            initialData={expenseCategories}
            defaultData={DEFAULT_EXPENSE_CATEGORIES}
            onSave={updateExpenseCategories}
            colorScheme="green"
            isLoading={loading}
          />
        </TabsContent>
      </Tabs>

      <div className="pt-20">
        <Separator className="bg-slate-100" />
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-8 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Package className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg mb-3">{tr("상품 및 판매 동기화", "Product & Sales Sync")}</h3>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">
              {tr("상품 분류를 수정하면 쇼핑몰 카탈로그 및 판매 내역 통계에 즉시 반영되어 품목별 매출 분석이 용이해집니다.", "Category updates are reflected in catalog and sales statistics immediately for clearer item-level analysis.")}
            </p>
          </div>
          <div className="p-8 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
            <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Layers className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg mb-3">{tr("자재 및 재고 동기화", "Material & Inventory Sync")}</h3>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">
              {tr("자재 분류를 변경하면 [재고 관리] 및 [매입 관리]의 필터에 즉시 실시간 반영되어 편리한 운영이 가능합니다.", "Material categories are reflected in inventory and purchase filters in real time.")}
            </p>
          </div>
          <div className="p-8 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Wallet className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg mb-3">{tr("지출 항목 통합 관리", "Unified Expense Classification")}</h3>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">
              {tr("지출 분류 체계를 세분화하면 매장 운영비, 임대료 및 인건비 등을 더 정확한 지표로 추적하고 분석할 수 있습니다.", "Granular expense categories improve tracking and analysis of rent, labor, and operating costs.")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
