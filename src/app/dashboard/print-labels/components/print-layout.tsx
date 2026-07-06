"use client";
import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { LabelGrid } from "./label-grid";
import { LabelItemData } from "./label-item";
import { PAPER_PRESETS } from "./paper-presets";

interface PrintLayoutProps {
  rawLabels: LabelItemData[];
  initialPresetId?: string;
  initialStart?: number;
}

export function PrintLayout({ rawLabels, initialPresetId = "3109", initialStart = 1 }: PrintLayoutProps) {
  const preset = useMemo(() => {
    return PAPER_PRESETS.find(p => p.id === initialPresetId) || PAPER_PRESETS[0];
  }, [initialPresetId]);

  const validStartPos = useMemo(() => {
    if (preset.type === 'roll') return 1;
    if (initialStart < 1) return 1;
    if (initialStart > preset.totalLabels) return preset.totalLabels;
    return initialStart;
  }, [initialStart, preset]);

  const labelsToRender = useMemo(() => {
    if (preset.type === 'roll') return rawLabels;
    const finalLabels: (LabelItemData | null)[] = Array(preset.totalLabels).fill(null);
    let currentPos = validStartPos - 1;
    for (const item of rawLabels) {
      if (currentPos < preset.totalLabels) {
        finalLabels[currentPos] = item;
        currentPos++;
      }
    }
    return finalLabels;
  }, [rawLabels, preset, validStartPos]);

  const isFormtec = preset.type === 'formtec';

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <style jsx global>{`
        @media print {
          @page {
            size: ${isFormtec ? 'A4' : `${preset.width} ${preset.height}`};
            margin: 0 !important;
          }
          /* 부모 엘리먼트들이 인쇄 시 어떠한 여백이나 오프셋도 생성하지 않도록 완전 무력화 */
          html, body, #__next, [data-overlay-container="true"], main, div {
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            position: static !important;
            transform: none !important;
            box-shadow: none !important;
          }
          /* 모든 요소를 숨기기 */
          body * {
            visibility: hidden !important;
          }
          /* 인쇄 대상 영역 및 내부 하위 자식 요소들만 보이도록 지정 */
          #printable-area-wrapper,
          #printable-area-wrapper * {
            visibility: visible !important;
          }
          #printable-area-wrapper {
            visibility: visible !important;
            position: absolute !important;
            left: 0px !important;
            top: 0px !important;
            margin: 0px !important;
            width: ${preset.width} !important;
            height: ${isFormtec ? preset.height : 'auto'} !important;
            box-sizing: border-box !important;
            background-color: white !important;
            /* 폼텍 공식 정밀 여백 반영: 상 우 하 좌 */
            padding-top: ${preset.paddingTop} !important;
            padding-right: ${preset.paddingRight} !important;
            padding-bottom: ${preset.paddingBottom} !important;
            padding-left: ${preset.paddingLeft} !important;
          }
        }
      `}</style>

      {/* 상단 컨트롤 바 */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-5 py-3 shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-slate-800">라벨 인쇄 미리보기</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {preset.name} · {isFormtec ? `${validStartPos}번 칸부터 출력` : '연속 출력'} · 총 {rawLabels.length}개 라벨
          </p>
          {isFormtec && (
            <p className="text-[11px] text-amber-600 font-semibold mt-1">
              ⚠️ 인쇄 시 브라우저 여백을 반드시 <strong>"없음(None)"</strong>으로 설정하세요.
            </p>
          )}
        </div>
        <Button 
          onClick={() => {
            window.print();
            // 브라우저의 window.print()는 모달이 닫힐 때까지 스크립트 실행을 블록합니다.
            // 인쇄 취소 혹은 저장을 누른 후 자동으로 이 새 탭이 닫히도록 close 호출
            window.close();
          }} 
          className="h-10 px-6 font-bold bg-primary hover:bg-primary/90"
        >
          <Printer className="mr-2 h-4 w-4" />
          인쇄하기
        </Button>
      </div>

      {/* 미리보기 + 실제 인쇄 대상 영역 */}
      <div className="flex justify-center bg-slate-100 p-6 rounded-2xl border border-dashed border-slate-300 overflow-auto">
        <div
          id="printable-area-wrapper"
          className="bg-white shadow-lg border border-slate-300 overflow-hidden flex-shrink-0"
          style={{
            width: preset.width,
            height: isFormtec ? preset.height : 'auto',
            boxSizing: 'border-box',
            paddingTop: preset.paddingTop,
            paddingRight: preset.paddingRight,
            paddingBottom: preset.paddingBottom,
            paddingLeft: preset.paddingLeft,
          }}
        >
          <LabelGrid items={labelsToRender} preset={preset} />
        </div>
      </div>
    </div>
  );
}
