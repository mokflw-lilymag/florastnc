"use client";

import { getMessages } from "@/i18n/getMessages";
import { Product } from "@/types/product";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Plus, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { useProductSearch } from "@/hooks/use-product-search";
import { useDebounce } from "@/hooks/use-debounce";

interface ProductSectionProps {
    initialCategory?: string;
    onAddProduct: (product: Product) => void;
    onOpenCustomProductDialog: () => void;
    onTabChange?: (tab: string) => void;
}

const DEFAULT_CATEGORIES = [
    '꽃다발', '꽃바구니', '센터피스', '경조화환', '플랜트', '동양란', '서양란', '기타'
];

export function ProductSection({
    initialCategory,
    onAddProduct,
    onOpenCustomProductDialog,
    onTabChange
}: ProductSectionProps) {
    const locale = usePreferredLocale();
    const tf = getMessages(locale).tenantFlows;
    const [activeTab, setActiveTab] = useState(initialCategory || DEFAULT_CATEGORIES[0]);
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    
    const { results, loading, searchProducts } = useProductSearch();

    useEffect(() => {
        searchProducts(debouncedSearchTerm, activeTab, 50);
    }, [debouncedSearchTerm, activeTab, searchProducts]);

    const ProductGrid = ({ products }: { products: Product[] }) => {
        if (loading) {
            return <div className="text-center py-8 text-muted-foreground text-sm">{tf.f00037}</div>;
        }
        if (products.length === 0) {
            return <div className="text-center py-8 text-muted-foreground text-sm">{tf.f00168}</div>;
        }
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {products.map((product) => (
                    <Button
                        key={product.id}
                        variant="outline"
                        className="h-auto py-3 min-h-[5rem] flex flex-col items-center justify-center space-y-1 hover:border-primary hover:bg-primary/5 hover:text-primary transition-all shadow-sm"
                        onClick={() => onAddProduct(product)}
                        disabled={product.stock <= 0}
                    >
                        <span className="font-bold text-sm text-center leading-tight break-keep line-clamp-2 text-foreground group-hover:text-primary">
                            {product.name}
                        </span>
                        <span className="text-sm font-bold text-primary">
                            {product.price.toLocaleString()}{tf.f00487}
                        </span>
                        {product.stock <= 0 && <Badge variant="destructive" className="text-[10px] h-5 px-1 mt-1">{tf.f00747}</Badge>}
                        {product.stock > 0 && <span className="text-[10px] text-muted-foreground">{tf.f00538}: {product.stock}</span>}
                    </Button>
                ))}
            </div>
        );
    };

    return (
        <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-semibold">{tf.f00329}</CardTitle>
                <Button variant="outline" size="sm" onClick={onOpenCustomProductDialog}>
                    <Plus className="w-4 h-4 mr-1" />
                    {tf.f00668}
                </Button>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={(val) => {
                    setActiveTab(val);
                    onTabChange?.(val);
                }} className="w-full">
                    <ScrollArea className="w-full whitespace-nowrap rounded-lg border bg-slate-50 p-1 mb-6">
                        <TabsList className="inline-flex w-max min-w-full justify-start h-10 p-0 bg-transparent gap-1">
                            {DEFAULT_CATEGORIES.map((cat) => (
                                <TabsTrigger
                                    key={cat}
                                    value={cat}
                                    className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm px-4 py-2 text-sm font-medium transition-all rounded-md"
                                >
                                    {cat}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>

                    <TabsContent value={activeTab} className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-medium text-muted-foreground">{activeTab} {tf.f00726}</h4>
                                <div className="relative w-48">
                                    <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder={tf.f00503}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-8 h-8 text-sm"
                                    />
                                </div>
                            </div>
                            <ProductGrid products={results} />
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
