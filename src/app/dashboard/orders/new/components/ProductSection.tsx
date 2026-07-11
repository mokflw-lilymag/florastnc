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
import { useCurrency } from "@/hooks/use-currency";
import { useProductSearch } from "@/hooks/use-product-search";
import { useDebounce } from "@/hooks/use-debounce";
import { useSettings, DEFAULT_PRODUCT_CATEGORIES } from "@/hooks/use-settings";

interface ProductSectionProps {
    initialCategory?: string;
    onAddProduct: (product: Product) => void;
    onOpenCustomProductDialog: () => void;
    onTabChange?: (tab: string) => void;
}

export function ProductSection({
    initialCategory,
    onAddProduct,
    onOpenCustomProductDialog,
    onTabChange
}: ProductSectionProps) {
    const locale = usePreferredLocale();
    const { format: formatCurrency } = useCurrency();
    const tf = getMessages(locale).tenantFlows;
    const { productCategories } = useSettings();
    
    const { results, loading, searchProducts } = useProductSearch();

    // 2차 카테고리(중분류) 정렬을 위한 레퍼런스 기준 정의
    const REFERENCE_MID_ORDER = [
        // 1. 꽃다발 / 꽃바구니 / 경조화환 (가장 주요 카테고리)
        '꽃다발', '꽃바구니', '경조화환', '센터피스', '플라워박스', '행사용꽃',
        // 2. 어버이날 기획상품
        '어버이날컬렉션',
        // 3. 플랜트 (분화/관엽)
        '소품', '중품', '대품', '동서양난',
        // 4. 자재/부자재
        '드라이플라워카드/토퍼', '바구니', '화병/화기', '원예자재', '포장자재',
        // 5. 기타
        '기타'
    ];

    // 1안: 로컬 상품들의 2차 카테고리(중분류)를 추출하여 레퍼런스 순서대로 정렬
    const categories = React.useMemo(() => {
        const mids = new Set<string>();
        results.forEach(p => {
            if (p.mid_category) {
                mids.add(p.mid_category);
            }
        });
        if (mids.size === 0) return ['일반'];
        
        return Array.from(mids).sort((a, b) => {
            const idxA = REFERENCE_MID_ORDER.indexOf(a);
            const idxB = REFERENCE_MID_ORDER.indexOf(b);
            
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.localeCompare(b, 'ko');
        });
    }, [results]);

    const [activeTab, setActiveTab] = useState(initialCategory || categories[0]);
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    // 컴포넌트 마운트 시 전체 활성 상품 로드 (최대 1000개)
    useEffect(() => {
        searchProducts("", undefined, 1000);
    }, [searchProducts]);

    useEffect(() => {
        if (!activeTab || !categories.includes(activeTab)) {
            setActiveTab(categories[0]);
        }
    }, [categories, activeTab]);

    // 가격 낮은 순 정렬 및 로컬 필터링 처리 (1안 - 중분류 매칭 + 검색어 매칭)
    const sortedProducts = React.useMemo(() => {
        return results
            .filter(p => {
                const matchesTab = p.mid_category === activeTab || (!p.mid_category && activeTab === '일반');
                const matchesSearch = !debouncedSearchTerm || 
                    (p.name && p.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
                    (p.code && p.code.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
                return matchesTab && matchesSearch;
            })
            .sort((a, b) => {
                if (a.price !== b.price) {
                    return a.price - b.price; // 가격순 정렬
                }
                return (a.name || "").localeCompare(b.name || "");
            });
    }, [results, activeTab, debouncedSearchTerm]);

    const ProductGrid = ({ products }: { products: Product[] }) => {
        if (loading) {
            return <div className="text-center py-8 text-muted-foreground text-sm">{tf.f00037}</div>;
        }
        if (products.length === 0) {
            return <div className="text-center py-8 text-muted-foreground text-sm">{tf.f00168}</div>;
        }
        return (
            <ScrollArea className="h-[210px] pr-2.5">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 pb-2">
                    {products.map((product) => (
                        <Button
                            key={product.id}
                            variant="outline"
                            className="h-auto py-3 min-h-[5rem] flex flex-col items-center justify-center space-y-1 hover:border-primary hover:bg-primary/5 hover:text-primary transition-all shadow-sm w-full"
                            onClick={() => onAddProduct(product)}
                            disabled={product.stock <= 0}
                        >
                            <span className="font-bold text-sm text-center leading-tight break-keep line-clamp-2 text-foreground group-hover:text-primary">
                                {product.name}
                            </span>
                            <span className="text-sm font-bold text-primary">
                                {formatCurrency(product.price)}
                            </span>
                            {product.stock <= 0 && <Badge variant="destructive" className="text-[10px] h-5 px-1 mt-1">{tf.f00747}</Badge>}
                            {product.stock > 0 && <span className="text-[10px] text-muted-foreground">{tf.f00538}: {product.stock}</span>}
                        </Button>
                    ))}
                </div>
            </ScrollArea>
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
                    <TabsList className="flex flex-wrap w-full justify-start h-auto p-1 bg-slate-100/70 border rounded-xl gap-1.5 mb-6">
                        {categories.map((cat) => (
                            <TabsTrigger
                                key={cat}
                                value={cat}
                                className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm px-4 py-2 text-sm font-medium transition-all rounded-lg flex-none border border-transparent data-[state=active]:border-slate-200 whitespace-nowrap"
                            >
                                {cat}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <TabsContent value={activeTab} className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-medium text-muted-foreground">{activeTab} {tf.f00214}</h4>
                                <div className="relative w-48">
                                    <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder={tf.f00339}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-8 h-8 text-sm"
                                    />
                                </div>
                            </div>
                            <ProductGrid products={sortedProducts} />
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
