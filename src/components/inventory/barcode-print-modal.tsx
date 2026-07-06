"use client";

import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Minus, Plus, Printer, Trash2 } from "lucide-react";
import { PAPER_PRESETS } from "@/app/dashboard/print-labels/components/paper-presets";
import { LabelGrid } from "@/app/dashboard/print-labels/components/label-grid";
import type { LabelItemData } from "@/app/dashboard/print-labels/components/label-item";

export interface PrintQueueItem {
  id: string;      // 자재 ID (바코드)
  name: string;    // 자재명
  quantity: number;// 출력 매수
}

interface BarcodePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialItems: PrintQueueItem[];
}

export function BarcodePrintModal({ isOpen, onClose, initialItems }: BarcodePrintModalProps) {
  const [items, setItems] = useState<PrintQueueItem[]>(initialItems);
  const [presetId, setPresetId] = useState<string>("3109"); // 초기 렌더링 시에는 서버/클라이언트 불일치 방지를 위해 고정값 사용
  const [startPos, setStartPos] = useState<number>(1);

  // 컴포넌트 마운트 시 localStorage에서 이전에 사용한 프리셋 번호 불러오기
  React.useEffect(() => {
    const savedPreset = localStorage.getItem("preferred_label_preset");
    if (savedPreset) {
      setPresetId(savedPreset);
    }
  }, []);

  // 프리셋이 변경될 때마다 localStorage에 저장
  const handlePresetChange = (value: string) => {
    setPresetId(value);
    localStorage.setItem("preferred_label_preset", value);
  };

  // 다이얼로그 열릴 때 아이템 리셋
  React.useEffect(() => {
    if (isOpen) {
      setItems(initialItems);
    }
  }, [isOpen, initialItems]);

  const preset = useMemo(() => {
    return PAPER_PRESETS.find((p) => p.id === presetId) || PAPER_PRESETS[0];
  }, [presetId]);
  const isFormtec = preset.type === "formtec";

  const validStartPos = useMemo(() => {
    if (!isFormtec) return 1;
    if (startPos < 1) return 1;
    if (startPos > preset.totalLabels) return preset.totalLabels;
    return startPos;
  }, [startPos, preset, isFormtec]);

  const updateQuantity = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newQ = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQ };
        }
        return item;
      })
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // 실제로 그려질 바코드 배열 전개 (수량만큼 복사)
  const expandedLabels = useMemo(() => {
    const list: LabelItemData[] = [];
    items.forEach((item) => {
      for (let i = 0; i < item.quantity; i++) {
        list.push({ id: item.id, name: item.name, barcode: item.id });
      }
    });
    return list;
  }, [items]);

  // 폼텍인 경우 startPos 반영하여 null(빈칸) 채우기
  const labelsToRender = useMemo(() => {
    if (!isFormtec) return expandedLabels;
    const finalLabels: (LabelItemData | null)[] = Array(preset.totalLabels).fill(null);
    let currentPos = validStartPos - 1;
    for (const item of expandedLabels) {
      if (currentPos < preset.totalLabels) {
        finalLabels[currentPos] = item;
        currentPos++;
      }
    }
    return finalLabels;
  }, [expandedLabels, preset, validStartPos, isFormtec]);

  const handlePrint = () => {
    // 모달 내의 불안정한 CSS 인쇄 대신, 이미 안정성이 검증된 print-labels 페이지로 새 창을 띄움
    if (items.length === 0) return;
    
    // items 파라미터 조립: "바코드:수량,바코드:수량"
    const itemsParam = items.map(item => `${item.id}:${item.quantity}`).join(',');
    const printUrl = `/dashboard/print-labels?type=material&preset=${presetId}&start=${validStartPos}&items=${itemsParam}`;
    
    window.open(printUrl, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[1200px] w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-slate-50 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Printer className="h-5 w-5" />
            바코드 라벨 인쇄 (미리보기)
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* 좌측 패널: 설정 및 대기열 */}
          <div className="w-[400px] border-r bg-white flex flex-col h-full shrink-0 hide-print">
            <div className="p-5 border-b space-y-4 shrink-0">
              <div className="space-y-1.5">
                <Label>용지 선택</Label>
                <Select value={presetId} onValueChange={handlePresetChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="용지를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAPER_PRESETS.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isFormtec && (
                <div className="space-y-1.5">
                  <Label>시작 위치 (빈 칸 건너뛰기)</Label>
                  <Input 
                    type="number" 
                    min={1} 
                    max={preset.totalLabels} 
                    value={startPos} 
                    onChange={(e) => setStartPos(parseInt(e.target.value) || 1)}
                  />
                  <p className="text-[11px] text-slate-500">
                    * 쓰다 남은 폼텍 용지 재활용 시, 출력 시작 칸 번호를 입력하세요.
                  </p>
                </div>
              )}
              
              <Button onClick={handlePrint} className="w-full mt-2" size="lg">
                <Printer className="mr-2 h-4 w-4" />
                인쇄 실행 ({expandedLabels.length}장)
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 bg-slate-50/50">
              <div className="px-3 py-2 text-sm font-semibold text-slate-600 flex justify-between">
                <span>출력 대기열</span>
                <span>총 {expandedLabels.length}장</span>
              </div>
              <div className="space-y-2 p-2">
                {items.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    선택된 자재가 없습니다.
                  </div>
                ) : (
                  items.map((item) => (
                    <div key={item.id} className="bg-white border rounded-lg p-3 shadow-sm flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">{item.name}</p>
                        <p className="text-xs text-slate-500 font-mono">{item.id}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 ml-1" onClick={() => removeItem(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 우측 패널: 미리보기 캔버스 */}
          <div className="flex-1 bg-slate-200 overflow-auto p-8 flex items-start justify-center relative">
            {/* 실제 인쇄 시엔 이 영역이 화면을 꽉 채움 */}
            <div 
              id="printable-modal-area"
              className="bg-white shadow-xl mx-auto"
              style={{
                width: isFormtec ? "210mm" : preset.width,
                height: isFormtec ? "297mm" : "auto",
                minHeight: isFormtec ? "297mm" : preset.height,
                paddingTop: preset.paddingTop,
                paddingRight: preset.paddingRight,
                paddingBottom: preset.paddingBottom,
                paddingLeft: preset.paddingLeft,
                // 스크린에서만 보이는 스케일 및 박스 스타일링 (인쇄 시엔 media print에 의해 무시됨)
                boxSizing: "border-box"
              }}
            >
              <LabelGrid items={labelsToRender} preset={preset} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
