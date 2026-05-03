"use client";
import { getMessages } from "@/i18n/getMessages";

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

export default function CategorySettingsPage() {
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
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
          title={tf.f02084}
          description={tf.f01360}
          icon={Settings2}
        >
          <div className="flex gap-2">
             <Link href="/dashboard/settings">
                <Button variant="outline" size="sm" className="bg-white border-slate-200 rounded-xl">
                  <Home className="h-4 w-4 mr-2 text-slate-400" />
                  {tf.f02221}
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
            <AlertTitle className="font-bold text-lg">{tf.f00810}</AlertTitle>
            <AlertDescription className="text-indigo-800/80 leading-relaxed font-medium">
              {tf.f01679}
              <br className="hidden md:block" />
              {tf.f01685}
            </AlertDescription>
          </div>
        </div>
      </Alert>

      <Tabs defaultValue="products" className="w-full">
        <div className="flex flex-col items-center justify-center mb-10 space-y-4">
          <TabsList className="bg-slate-100/80 p-1.5 rounded-3xl h-14 border border-slate-200">
            <TabsTrigger value="products" className="rounded-2xl px-10 data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-blue-600 h-11 transition-all">
              <Package className="h-4.5 w-4.5 mr-2" />
              {tf.f01354}
            </TabsTrigger>
            <TabsTrigger value="materials" className="rounded-2xl px-10 data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-orange-600 h-11 transition-all">
              <Layers className="h-4.5 w-4.5 mr-2" />
              {tf.f01736}
            </TabsTrigger>
            <TabsTrigger value="expenses" className="rounded-2xl px-10 data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-emerald-600 h-11 transition-all">
              <Wallet className="h-4.5 w-4.5 mr-2" />
              {tf.f01940}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="products" className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CategoryManagerCard
            title={tf.f01358}
            description={tf.f02101}
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
            title={tf.f01739}
            description={tf.f01743}
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
            title={tf.f01951}
            description={tf.f01169}
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
            <h3 className="font-bold text-slate-800 text-lg mb-3">{tf.f01353}</h3>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">
              {tf.f01355}
            </p>
          </div>
          <div className="p-8 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
            <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Layers className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg mb-3">{tf.f01735}</h3>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">
              {tf.f01737}
            </p>
          </div>
          <div className="p-8 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Wallet className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg mb-3">{tf.f01950}</h3>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">
              {tf.f01941}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
