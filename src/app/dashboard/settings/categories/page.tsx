"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettings, CategoryData } from "@/hooks/use-settings";
import { Settings2, Plus, Trash2, Save, RotateCcw } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function CategorySettingsPage() {
  const { productCategories, materialCategories, loading, updateProductCategories, updateMaterialCategories, refresh } = useSettings();
  
  const [prodCats, setProdCats] = useState<CategoryData | null>(null);
  const [matCats, setMatCats] = useState<CategoryData | null>(null);
  
  const [activeMainTab, setActiveMainTab] = useState<'product' | 'material'>('product');
  const [selectedMainCat, setSelectedMainCat] = useState<string>("");
  const [newMainCat, setNewMainCat] = useState("");
  const [newMidCat, setNewMidCat] = useState("");

  useEffect(() => {
    if (productCategories) setProdCats(JSON.parse(JSON.stringify(productCategories)));
    if (materialCategories) setMatCats(JSON.parse(JSON.stringify(materialCategories)));
  }, [productCategories, materialCategories]);

  const activeData = activeMainTab === 'product' ? prodCats : matCats;
  const setActiveData = activeMainTab === 'product' ? setProdCats : setMatCats;

  const handleAddMainCat = () => {
    if (!newMainCat || !activeData) return;
    if (activeData.main.includes(newMainCat)) {
      toast.error("이미 존재하는 카테고리입니다.");
      return;
    }
    const updated = {
      ...activeData,
      main: [...activeData.main, newMainCat],
      mid: { ...activeData.mid, [newMainCat]: [] }
    };
    setActiveData(updated);
    setNewMainCat("");
  };

  const handleDeleteMainCat = (cat: string) => {
    if (!activeData) return;
    const updated = {
      ...activeData,
      main: activeData.main.filter(m => m !== cat),
      mid: { ...activeData.mid }
    };
    delete updated.mid[cat];
    setActiveData(updated);
    if (selectedMainCat === cat) setSelectedMainCat("");
  };

  const handleAddMidCat = () => {
    if (!newMidCat || !selectedMainCat || !activeData) return;
    if (activeData.mid[selectedMainCat].includes(newMidCat)) {
      toast.error("이미 존재하는 하위 카테고리입니다.");
      return;
    }
    const updated = {
      ...activeData,
      mid: {
        ...activeData.mid,
        [selectedMainCat]: [...activeData.mid[selectedMainCat], newMidCat]
      }
    };
    setActiveData(updated);
    setNewMidCat("");
  };

  const handleDeleteMidCat = (midCat: string) => {
    if (!selectedMainCat || !activeData) return;
    const updated = {
      ...activeData,
      mid: {
        ...activeData.mid,
        [selectedMainCat]: activeData.mid[selectedMainCat].filter(m => m !== midCat)
      }
    };
    setActiveData(updated);
  };

  const handleSave = async () => {
    if (activeMainTab === 'product' && prodCats) {
      await updateProductCategories(prodCats);
    } else if (activeMainTab === 'material' && matCats) {
      await updateMaterialCategories(matCats);
    }
  };

  if (loading && !prodCats) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="카테고리 설정"
        description="상품 및 자재의 분류 체계를 사용자님의 환경에 맞게 커스터마이징하세요."
        icon={Settings2}
      >
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refresh()}>
            <RotateCcw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
          <Button size="sm" onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            <Save className="h-4 w-4 mr-2" />
            설정 저장
          </Button>
        </div>
      </PageHeader>

      <div className="flex gap-4 p-1 bg-slate-100 rounded-lg w-fit">
        <Button 
          variant={activeMainTab === 'product' ? 'default' : 'ghost'} 
          onClick={() => { setActiveMainTab('product'); setSelectedMainCat(""); }}
          className="rounded-md"
        >
          상품 카테고리
        </Button>
        <Button 
          variant={activeMainTab === 'material' ? 'default' : 'ghost'} 
          onClick={() => { setActiveMainTab('material'); setSelectedMainCat(""); }}
          className="rounded-md"
        >
          자재 카테고리
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Main Categories */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">대분류 관리</CardTitle>
            <CardDescription>메뉴에 표시될 주요 분류를 추가하거나 삭제합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input 
                placeholder="새 대분류 입력" 
                value={newMainCat} 
                onChange={(e) => setNewMainCat(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddMainCat()}
              />
              <Button onClick={handleAddMainCat} size="icon" className="shrink-0"><Plus className="h-4 w-4" /></Button>
            </div>
            
            <div className="space-y-1 max-h-[400px] overflow-y-auto">
              {activeData?.main.map(cat => (
                <div 
                  key={cat} 
                  className={`flex items-center justify-between p-2 rounded-md group cursor-pointer border ${selectedMainCat === cat ? 'bg-blue-50 border-blue-200' : 'hover:bg-slate-50 border-transparent'}`}
                  onClick={() => setSelectedMainCat(cat)}
                >
                  <span className={`font-medium ${selectedMainCat === cat ? 'text-blue-700' : 'text-slate-700'}`}>{cat}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => { e.stopPropagation(); handleDeleteMainCat(cat); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Mid Categories */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedMainCat ? `[${selectedMainCat}] 하위 분류` : "대분류를 선택하세요"}
            </CardTitle>
            <CardDescription>선택한 대분류에 속하는 세부 분류를 관리합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedMainCat ? (
              <div className="h-64 flex items-center justify-center text-slate-400 italic">
                좌측에서 대분류를 먼저 선택해주세요.
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <Input 
                    placeholder="새 하위 분류 입력" 
                    value={newMidCat} 
                    onChange={(e) => setNewMidCat(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddMidCat()}
                  />
                  <Button onClick={handleAddMidCat} size="icon" className="shrink-0"><Plus className="h-4 w-4" /></Button>
                </div>
                
                <div className="space-y-1 max-h-[400px] overflow-y-auto">
                  {activeData?.mid[selectedMainCat]?.map(cat => (
                    <div key={cat} className="flex items-center justify-between p-2 rounded-md group border border-transparent hover:bg-slate-50">
                      <span className="text-slate-700">{cat}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteMidCat(cat)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {activeData?.mid[selectedMainCat]?.length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-sm">등록된 하위 분류가 없습니다.</div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
