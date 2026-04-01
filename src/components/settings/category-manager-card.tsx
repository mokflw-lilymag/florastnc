"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CategoryData } from "@/hooks/use-settings";
import { Plus, Trash2, Save, RotateCcw, LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface CategoryManagerCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  initialData: CategoryData | null;
  defaultData: CategoryData;
  onSave: (data: CategoryData) => Promise<void>;
  colorScheme?: "blue" | "orange" | "green";
  isLoading?: boolean;
}

export function CategoryManagerCard({
  title,
  description,
  icon: Icon,
  initialData,
  defaultData,
  onSave,
  colorScheme = "blue",
  isLoading = false,
}: CategoryManagerCardProps) {
  const [data, setData] = useState<CategoryData>(initialData || defaultData);
  const [selectedMain, setSelectedMain] = useState<string>("");
  const [newMain, setNewMain] = useState("");
  const [newMid, setNewMid] = useState("");

  // Sync with initialData if it changes from outside
  useEffect(() => {
    if (initialData) {
      setData(JSON.parse(JSON.stringify(initialData)));
    }
  }, [initialData]);

  const scheme = {
    blue: {
      bg: "bg-blue-100",
      text: "text-blue-600",
      active: "bg-blue-600 border-blue-600",
      shadow: "shadow-blue-200",
      button: "bg-blue-600 hover:bg-blue-700",
      border: "border-blue-100",
    },
    orange: {
      bg: "bg-orange-100",
      text: "text-orange-600",
      active: "bg-orange-600 border-orange-600",
      shadow: "shadow-orange-200",
      button: "bg-orange-600 hover:bg-orange-700",
      border: "border-orange-100",
    },
    green: {
      bg: "bg-green-100",
      text: "text-green-600",
      active: "bg-green-600 border-green-600",
      shadow: "shadow-green-200",
      button: "bg-green-600 hover:bg-green-700",
      border: "border-green-100",
    }
  }[colorScheme];

  const handleAddMain = () => {
    if (!newMain) return;
    if (data.main.includes(newMain)) return toast.error("이미 존재하는 카테고리입니다.");
    
    setData({
      main: [...data.main, newMain],
      mid: { ...data.mid, [newMain]: [] }
    });
    setNewMain("");
    setSelectedMain(newMain);
  };

  const handleAddMid = () => {
    if (!newMid || !selectedMain) return;
    const list = data.mid[selectedMain] || [];
    if (list.includes(newMid)) return toast.error("이미 존재하는 소분류입니다.");
    
    setData({
      ...data,
      mid: { ...data.mid, [selectedMain]: [...list, newMid] }
    });
    setNewMid("");
  };

  const handleDeleteMain = (cat: string) => {
    if (window.confirm(`'${cat}' 대분류를 삭제하시겠습니까?\n하위 분류도 모두 삭제됩니다.`)) {
      const nextMain = data.main.filter(m => m !== cat);
      const nextMid = { ...data.mid };
      delete nextMid[cat];
      setData({ ...data, main: nextMain, mid: nextMid });
      if (selectedMain === cat) setSelectedMain("");
    }
  };

  const handleDeleteMid = (cat: string) => {
    if (!selectedMain) return;
    setData({
      ...data,
      mid: { ...data.mid, [selectedMain]: data.mid[selectedMain].filter(m => m !== cat) }
    });
  };

  const handleRestore = () => {
    if (window.confirm("초기 기본값으로 복원하시겠습니까? (저장 전까지는 실제 반영되지 않습니다)")) {
      setData(JSON.parse(JSON.stringify(defaultData)));
      setSelectedMain("");
      toast.info("기본값으로 설정되었습니다. 저장을 눌러야 반영됩니다.");
    }
  };

  const handleSave = async () => {
    await onSave(data);
  };

  return (
    <div className="space-y-6">
      <div className={`flex items-center justify-between border-b ${scheme.border} pb-3`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 ${scheme.bg} rounded-lg ${scheme.text}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">{title}</h2>
            <p className="text-sm text-slate-500">{description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            size="sm"
            onClick={handleRestore}
            disabled={isLoading}
            className="bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            기본값 복원
          </Button>
          <Button 
            size="sm"
            disabled={isLoading}
            onClick={handleSave} 
            className={`${scheme.button} text-white shadow-lg ${scheme.shadow}`}
          >
            <Save className="h-4 w-4 mr-2" />
            변경사항 저장
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <Card className="md:col-span-5 border-none shadow-sm bg-slate-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              대분류 (Main)
              <Badge variant="outline" className="font-normal text-[10px]">Total {data.main.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input 
                placeholder="추가하실 대분류" 
                value={newMain} 
                onChange={(e) => setNewMain(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddMain()}
                className="bg-white"
              />
              <Button onClick={handleAddMain} size="icon" variant="ghost" className="shrink-0 border border-slate-200 hover:bg-white">
                <Plus className="h-4 w-4 text-slate-500" />
              </Button>
            </div>
            <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
              {data.main.map(cat => (
                <div 
                  key={cat} 
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all ${selectedMain === cat ? `${scheme.active} text-white shadow-md` : 'bg-white hover:border-slate-300 border-slate-100 text-slate-700 shadow-sm'}`}
                  onClick={() => setSelectedMain(cat)}
                >
                  <span className="font-medium text-sm">{cat}</span>
                  <div className="flex items-center gap-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${selectedMain === cat ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                      {data.mid[cat]?.length || 0}
                    </span>
                    <Button variant="ghost" size="icon" className={`h-7 w-7 ${selectedMain === cat ? 'text-white hover:bg-red-500/20' : 'text-slate-300 hover:text-red-500'}`} onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteMain(cat);
                    }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-7 border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              {selectedMain ? (
                <div className="flex items-center gap-2">
                  <span className={`${scheme.text}`}>[{selectedMain}]</span> 하위 분류
                </div>
              ) : "분류를 선택하세요"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedMain ? (
              <>
                <div className="flex gap-2">
                  <Input 
                    placeholder="새 하위 분류 입력" 
                    value={newMid} 
                    onChange={(e) => setNewMid(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddMid()}
                  />
                  <Button onClick={handleAddMid} size="icon" className={scheme.button}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
                  {data.mid[selectedMain]?.map(cat => (
                    <div key={cat} className="flex items-center justify-between p-2.5 pl-4 rounded-xl border border-slate-100 bg-slate-50/30 group hover:border-slate-200 hover:bg-white transition-all">
                      <span className="text-sm font-medium text-slate-600">{cat}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all" onClick={() => handleDeleteMid(cat)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  {(!data.mid[selectedMain] || data.mid[selectedMain].length === 0) && (
                    <div className="col-span-2 py-12 text-center text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-2xl">
                      등록된 하위 분류가 없습니다.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-slate-300 space-y-4 border-2 border-dashed border-slate-50 rounded-2xl">
                <div className="p-4 bg-slate-50 rounded-full">
                  <Icon className="h-10 w-10 opacity-20" />
                </div>
                <p className="text-sm">관리할 대분류를 선택해주세요.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
