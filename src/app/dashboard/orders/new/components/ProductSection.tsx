import { Product } from "@/types/product";
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Plus, Search, Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface CategoryData {
    name: string;
    products: Product[];
}

interface ProductSectionProps {
    categories: CategoryData[];
    allProducts: Product[]; // Full list of products for the branch
    initialCategory?: string;
    onAddProduct: (product: Product) => void;
    onOpenCustomProductDialog: () => void;
    onTabChange?: (tab: string) => void;
}

export function ProductSection({
    categories,
    allProducts,
    initialCategory,
    onAddProduct,
    onOpenCustomProductDialog,
    onTabChange
}: ProductSectionProps) {
    const [activeTab, setActiveTab] = useState(initialCategory || (categories[0]?.name || ""));
    const [searchTerm, setSearchTerm] = useState("");

    // Update active tab if categories change and current tab is invalid
    React.useEffect(() => {
        if (initialCategory && categories.find(c => c.name === initialCategory)) {
            setActiveTab(initialCategory);
            return;
        }
        if (categories.length > 0 && (!activeTab || !categories.find(c => c.name === activeTab))) {
            setActiveTab(categories[0].name);
        }
    }, [categories, activeTab, initialCategory]);

    const filteredAllProducts = allProducts.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());

        let matchesCategory = true;
        if (activeTab) {
            const mCat = p.main_category || "";
            const midCat = p.mid_category || "";
            const name = p.name || "";

            if (activeTab === '화환' || activeTab === '축하화환' || activeTab === '근조화환' || activeTab === '경조화환') {
                matchesCategory = mCat.includes('화환') || midCat.includes('화환') || name.includes('화환') || name.includes('근조') || name.includes('축하');
            } else if (activeTab === '동서양란' || activeTab === '동양란/서양란') {
                matchesCategory = mCat.includes('란') || midCat.includes('란') || name.includes('란') || mCat.includes('난') || midCat.includes('난') || name.includes('난') || name.includes('동양란') || name.includes('서양란') || name.includes('호접란');
            } else if (activeTab === '동양란') {
                matchesCategory = mCat.includes('동양란') || midCat.includes('동양란') || name.includes('동양란');
            } else if (activeTab === '서양란') {
                matchesCategory = mCat.includes('서양란') || midCat.includes('서양란') || name.includes('서양란') || mCat.includes('호접란') || midCat.includes('호접란') || name.includes('호접란');
            } else if (activeTab === '플랜트' || activeTab === '식물/분재' || activeTab === '관엽식물') {
                matchesCategory = mCat.includes('플랜트') || mCat.includes('관엽') || mCat.includes('공기정화') || mCat.includes('분재') || mCat.includes('식물');
            } else {
                matchesCategory = mCat.includes(activeTab) || midCat.includes(activeTab) || name.includes(activeTab);
            }
        }

        return matchesSearch && matchesCategory;
    });

    const ProductGrid = ({ products }: { products: Product[] }) => {
        if (products.length === 0) {
            return <div className="text-center py-8 text-muted-foreground text-sm">등록된 상품이 없습니다.</div>;
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
                            {product.price.toLocaleString()}원
                        </span>
                        {product.stock <= 0 && <Badge variant="destructive" className="text-[10px] h-5 px-1 mt-1">품절</Badge>}
                        {product.stock > 0 && <span className="text-[10px] text-muted-foreground">재고: {product.stock}</span>}
                    </Button>
                ))}
            </div>
        );
    };

    return (
        <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-semibold">상품 선택</CardTitle>
                <Button variant="outline" size="sm" onClick={onOpenCustomProductDialog}>
                    <Plus className="w-4 h-4 mr-1" />
                    직접 입력
                </Button>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={(val) => {
                    setActiveTab(val);
                    onTabChange?.(val);
                }} className="w-full">
                    <ScrollArea className="w-full whitespace-nowrap rounded-lg border bg-slate-50 p-1 mb-6">
                        <TabsList className="inline-flex w-max min-w-full justify-start h-10 p-0 bg-transparent gap-1">
                            {categories.map((cat) => (
                                <TabsTrigger
                                    key={cat.name}
                                    value={cat.name}
                                    className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm px-4 py-2 text-sm font-medium transition-all rounded-md"
                                >
                                    {cat.name}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>

                    {categories.map((cat) => (
                        <TabsContent key={cat.name} value={cat.name} className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-medium text-muted-foreground">{cat.name} 판매 순위 상품</h4>
                                </div>
                                <ProductGrid products={cat.products} />
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>

                <div className="mt-6 pt-4 border-t space-y-3">
                    <Label>상품 전체 검색 및 선택</Label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="상품명 검색..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    <Popover>
                      <PopoverTrigger 
                        render={
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-[300px] justify-between h-9"
                          />
                        }
                      >
                        상품 전체 목록에서 선택...
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0">
                        <Command>
                          <CommandInput placeholder="상품명 검색..." />
                          <CommandList>
                            <CommandEmpty>결과가 없습니다.</CommandEmpty>
                            <CommandGroup>
                              {allProducts.map((p) => (
                                <CommandItem
                                  key={p.id}
                                  value={p.name}
                                  disabled={p.stock <= 0}
                                  onSelect={() => {
                                    onAddProduct(p);
                                    setSearchTerm("");
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4 opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span>{p.name}</span>
                                    <span className="text-xs text-muted-foreground">{p.price.toLocaleString()}원</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    </div>
                    {searchTerm && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                            {filteredAllProducts.slice(0, 6).map(p => (
                                <Button
                                    key={p.id}
                                    variant="ghost"
                                    className="justify-start h-auto py-2 text-left"
                                    onClick={() => {
                                        onAddProduct(p);
                                        setSearchTerm("");
                                    }}
                                    disabled={p.stock <= 0}
                                >
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium">{p.name}</span>
                                        <span className="text-xs text-muted-foreground">{p.price.toLocaleString()}원</span>
                                    </div>
                                </Button>
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
