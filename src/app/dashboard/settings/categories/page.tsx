"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSettings, CategoryData } from "@/hooks/use-settings";
import { Settings2, Plus, Trash2, Save, RotateCcw, Package, Layers } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function CategorySettingsPage() {
  const { 
    productCategories, 
    materialCategories, 
    loading, 
    updateProductCategories, 
    updateMaterialCategories, 
    refresh 
  } = useSettings();
  
  const [prodCats, setProdCats] = useState<CategoryData | null>(null);
  const [matCats, setMatCats] = useState<CategoryData | null>(null);
  
  const [selectedProdMain, setSelectedProdMain] = useState<string>("");
  const [selectedMatMain, setSelectedMatMain] = useState<string>("");
  
  const [newProdMain, setNewProdMain] = useState("");
  const [newProdMid, setNewProdMid] = useState("");
  
  const [newMatMain, setNewMatMain] = useState("");
  const [newMatMid, setNewMatMid] = useState("");

  useEffect(() => {
    if (productCategories && !prodCats) setProdCats(JSON.parse(JSON.stringify(productCategories)));
    if (materialCategories && !matCats) setMatCats(JSON.parse(JSON.stringify(materialCategories)));
  }, [productCategories, materialCategories, prodCats, matCats]);

  // Handle empty state gracefully
  const ensureProdCats = () => {
    if (!prodCats) return { main: [], mid: {} };
    return prodCats;
  };
  
  const ensureMatCats = () => {
    if (!matCats) return { main: [], mid: {} };
    return matCats;
  };

  const handleAddProdMain = () => {
    if (!newProdMain) return;
    const current = ensureProdCats();
    if (current.main.includes(newProdMain)) return toast.error("이미 존재하는 카테고리입니다.");
    
    setProdCats({
      main: [...current.main, newProdMain],
      mid: { ...current.mid, [newProdMain]: [] }
    });
    setNewProdMain("");
    setSelectedProdMain(newProdMain);
  };

  const handleAddMatMain = () => {
    if (!newMatMain) return;
    const current = ensureMatCats();
    if (current.main.includes(newMatMain)) return toast.error("이미 존재하는 카테고리입니다.");
    
    setMatCats({
      main: [...current.main, newMatMain],
      mid: { ...current.mid, [newMatMain]: [] }
    });
    setNewMatMain("");
    setSelectedMatMain(newMatMain);
  };

  const handleRestoreProd = () => {
    if (productCategories) {
      setProdCats(JSON.parse(JSON.stringify(productCategories)));
      toast.success("상품 카테고리가 마지막 저장 상태로 복구되었습니다.");
    }
  };

  const handleRestoreMat = () => {
    if (materialCategories) {
      setMatCats(JSON.parse(JSON.stringify(materialCategories)));
      toast.success("자재 카테고리가 마지막 저장 상태로 복구되었습니다.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20">
      <PageHeader
        title="카테고리 환경설정"
        description="상품 및 자재의 분류 체계를 각각 독립적으로 관리하세요."
        icon={Settings2}
      >
        <Button variant="outline" size="sm" onClick={() => refresh()}>
          <RotateCcw className="h-4 w-4 mr-2" />
          새로고침
        </Button>
      </PageHeader>

      {/* --- 상품 카테고리 섹션 --- */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-blue-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">상품 카테고리 관리</h2>
              <p className="text-sm text-slate-500">판매용 상품의 분류 체계입니다.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              size="sm"
              onClick={handleRestoreProd}
              disabled={loading || !productCategories}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              상품 카테고리 복구
            </Button>
            <Button 
              disabled={loading}
              onClick={() => prodCats && updateProductCategories(prodCats)} 
              className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200"
            >
              <Save className="h-4 w-4 mr-2" />
              상품 카테고리 저장
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-none shadow-sm bg-slate-50/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">대분류 (Main)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="새 상품 대분류 입력" 
                  value={newProdMain} 
                  onChange={(e) => setNewProdMain(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddProdMain()}
                />
                <Button onClick={handleAddProdMain} size="icon" className="shrink-0 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
                {prodCats?.main.map(cat => (
                  <div 
                    key={cat} 
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all ${selectedProdMain === cat ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white hover:bg-slate-50 border-slate-100 text-slate-700'}`}
                    onClick={() => setSelectedProdMain(cat)}
                  >
                    <span className="font-semibold">{cat}</span>
                    <Button variant="ghost" size="icon" className={`h-8 w-8 ${selectedProdMain === cat ? 'text-white hover:text-red-200' : 'text-slate-300 hover:text-red-500'}`} onClick={(e) => {
                      e.stopPropagation();
                      if (!prodCats) return;
                      const nextMain = prodCats.main.filter(m => m !== cat);
                      const nextMid = {...prodCats.mid};
                      delete nextMid[cat];
                      setProdCats({...prodCats, main: nextMain, mid: nextMid});
                      if (selectedProdMain === cat) setSelectedProdMain("");
                    }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">
                {selectedProdMain ? `[${selectedProdMain}] 중분류 (Sub)` : "대분류를 선택하세요"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedProdMain ? (
                <>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="새 중분류 입력" 
                      value={newProdMid} 
                      onChange={(e) => setNewProdMid(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newProdMid && selectedProdMain) {
                          const current = ensureProdCats();
                          const list = current.mid[selectedProdMain] || [];
                          if (list.includes(newProdMid)) return toast.error("이미 존재합니다.");
                          setProdCats({...current, mid: {...current.mid, [selectedProdMain]: [...list, newProdMid]}});
                          setNewProdMid("");
                        }
                      }}
                    />
                    <Button onClick={() => {
                      if (newProdMid && selectedProdMain) {
                        const current = ensureProdCats();
                        const list = current.mid[selectedProdMain] || [];
                        if (list.includes(newProdMid)) return toast.error("이미 존재합니다.");
                        setProdCats({...current, mid: {...current.mid, [selectedProdMain]: [...list, newProdMid]}});
                        setNewProdMid("");
                      }
                    }} size="icon" className="shrink-0"><Plus className="h-4 w-4" /></Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
                    {prodCats?.mid[selectedProdMain]?.map(cat => (
                      <div key={cat} className="flex items-center justify-between p-2 pl-3 rounded-lg border border-slate-100 bg-slate-50/50 group">
                        <span className="text-sm font-medium text-slate-600">{cat}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all" onClick={() => {
                          if (!prodCats) return;
                          setProdCats({...prodCats, mid: {...prodCats.mid, [selectedProdMain]: prodCats.mid[selectedProdMain].filter(m => m !== cat)}});
                        }}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    ))}
                    {prodCats?.mid[selectedProdMain]?.length === 0 && (
                      <div className="col-span-2 py-10 text-center text-slate-400 text-sm italic">등록된 중분류가 없습니다.</div>
                    )}
                  </div>
                </>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-slate-300 space-y-2">
                  <Package className="h-12 w-12 opacity-20" />
                  <p>왼쪽에서 관리할 대분류를 선택해주세요.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator className="bg-slate-100" />

      {/* --- 자재 카테고리 섹션 --- */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-orange-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">자재 카테고리 관리</h2>
              <p className="text-sm text-slate-500">부자재, 생화 등 자적 수급 분류입니다.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              size="sm"
              onClick={handleRestoreMat}
              disabled={loading || !materialCategories}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              자재 카테고리 복구
            </Button>
            <Button 
              disabled={loading}
              onClick={() => matCats && updateMaterialCategories(matCats)} 
              className="bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-200"
            >
              <Save className="h-4 w-4 mr-2" />
              자재 카테고리 저장
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-none shadow-sm bg-slate-50/50">
            <CardHeader>
              <CardTitle className="text-lg">대분류 (자재)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="새 자재 대분류 입력" 
                  value={newMatMain} 
                  onChange={(e) => setNewMatMain(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddMatMain()}
                />
                <Button onClick={handleAddMatMain} size="icon" className="shrink-0 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
                {matCats?.main.map(cat => (
                  <div 
                    key={cat} 
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all ${selectedMatMain === cat ? 'bg-orange-600 border-orange-600 text-white shadow-md' : 'bg-white hover:bg-slate-50 border-slate-100 text-slate-700'}`}
                    onClick={() => setSelectedMatMain(cat)}
                  >
                    <span className="font-semibold">{cat}</span>
                    <Button variant="ghost" size="icon" className={`h-8 w-8 ${selectedMatMain === cat ? 'text-white hover:text-red-200' : 'text-slate-300 hover:text-red-500'}`} onClick={(e) => {
                      e.stopPropagation();
                      if (!matCats) return;
                      const nextMain = matCats.main.filter(m => m !== cat);
                      const nextMid = {...matCats.mid};
                      delete nextMid[cat];
                      setMatCats({...matCats, main: nextMain, mid: nextMid});
                      if (selectedMatMain === cat) setSelectedMatMain("");
                    }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">
                {selectedMatMain ? `[${selectedMatMain}] 중분류 (자재)` : "대분류를 선택하세요"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedMatMain ? (
                <>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="새 중분류 입력" 
                      value={newMatMid} 
                      onChange={(e) => setNewMatMid(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newMatMid && selectedMatMain) {
                          const current = ensureMatCats();
                          const list = current.mid[selectedMatMain] || [];
                          if (list.includes(newMatMid)) return toast.error("이미 존재합니다.");
                          setMatCats({...current, mid: {...current.mid, [selectedMatMain]: [...list, newMatMid]}});
                          setNewMatMid("");
                        }
                      }}
                    />
                    <Button onClick={() => {
                      if (newMatMid && selectedMatMain) {
                        const current = ensureMatCats();
                        const list = current.mid[selectedMatMain] || [];
                        if (list.includes(newMatMid)) return toast.error("이미 존재합니다.");
                        setMatCats({...current, mid: {...current.mid, [selectedMatMain]: [...list, newMatMid]}});
                        setNewMatMid("");
                      }
                    }} size="icon" className="shrink-0"><Plus className="h-4 w-4" /></Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
                    {matCats?.mid[selectedMatMain]?.map(cat => (
                      <div key={cat} className="flex items-center justify-between p-2 pl-3 rounded-lg border border-slate-100 bg-slate-50/50 group">
                        <span className="text-sm font-medium text-slate-600">{cat}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all" onClick={() => {
                          if (!matCats) return;
                          setMatCats({...matCats, mid: {...matCats.mid, [selectedMatMain]: matCats.mid[selectedMatMain].filter(m => m !== cat)}});
                        }}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    ))}
                    {matCats?.mid[selectedMatMain]?.length === 0 && (
                      <div className="col-span-2 py-10 text-center text-slate-400 text-sm italic">등록된 중분류가 없습니다.</div>
                    )}
                  </div>
                </>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-slate-300 space-y-2">
                  <Layers className="h-12 w-12 opacity-20" />
                  <p>왼쪽에서 관리할 대분류를 선택해주세요.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
