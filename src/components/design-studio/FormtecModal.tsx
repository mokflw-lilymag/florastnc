'use client';

import React, { useEffect, useRef } from 'react';
import { X, Check, Printer, Grid as GridIcon, Trash2, Loader2, AlignCenter, RefreshCw } from 'lucide-react';
import { useEditorStore } from '@/stores/design-store';
import { LABEL_CONFIGS, PAPER_PRESETS } from '@/lib/constants/templates';
import { cn } from '@/lib/utils';

interface FormtecModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrint: () => void;
  isGenerating: boolean;
}

/**
 * 캔버스의 디자인 요소를 라벨 칸 안에 정교하게 미리보기하는 컴포넌트
 */
const CanvasDesignMiniPreview: React.FC<{ scale: number; widthMm: number; heightMm: number }> = ({ scale, widthMm, heightMm }) => {
  const { textBlocks, imageBlocks, backgroundUrl, frontBackgroundUrl, foldType } = useEditorStore();
  const displayBg = foldType === 'half' ? (frontBackgroundUrl || backgroundUrl) : backgroundUrl;

  return (
    <div 
      className="relative bg-white overflow-hidden pointer-events-none"
      style={{
        width: `${widthMm * scale}mm`,
        height: `${heightMm * scale}mm`,
      }}
    >
      <div 
        className="absolute top-0 left-0 origin-top-left"
        style={{
          width: `${widthMm}mm`,
          height: `${heightMm}mm`,
          transform: `scale(${scale})`,
          backgroundColor: '#ffffff'
        }}
      >
        {displayBg && (
          <img src={displayBg} alt="bg" className="absolute inset-0 w-full h-full object-cover" />
        )}

        {imageBlocks.map(img => (
          <div
            key={img.id}
            className="absolute"
            style={{
              left: `${img.x}mm`,
              top: `${img.y}mm`,
              width: `${img.width}mm`,
              height: `${img.height}mm`,
              transform: `rotate(${img.rotation}deg)`,
            }}
          >
            <img src={img.url} className="w-full h-full object-contain" alt="mini-img" />
          </div>
        ))}

        {textBlocks.map(block => {
          const drawWidth = block.width || widthMm;
          const drawX = block.x;

          return (
            <div
              key={block.id}
              className="absolute flex items-center justify-center"
              style={{
                left: `${drawX}mm`,
                top: `${block.y}mm`,
                width: `${drawWidth}mm`,
                height: block.height ? `${block.height}mm` : 'auto',
                color: block.colorHex || '#000000',
                fontFamily: block.fontFamily,
                fontSize: `${block.fontSize}pt`,
                textAlign: block.textAlign as any,
                lineHeight: 1.4,
                transform: `rotate(${block.rotation || 0}deg)`,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                textShadow: (block.strokeWidth || 0) > 0 ? `0 0 1px ${block.strokeColor}` : 'none',
                opacity: block.opacity ?? 1
              }}
            >
              {block.text}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const FormtecModal: React.FC<FormtecModalProps> = ({
  isOpen, onClose, onPrint, isGenerating
}) => {
  const {
    selectedPresetId,
    formtecSelectedCells,
    setFormtecSelectedCells,
    formtecAdditionalMessage,
    setFormtecAdditionalMessage,
    alignDesignCenter,
    currentDimension,
    setPaperSize
  } = useEditorStore();

  const config = selectedPresetId ? (LABEL_CONFIGS as any)[selectedPresetId] : (LABEL_CONFIGS as any)['formtec-8'];
  
  useEffect(() => {
    if (isOpen && config) {
      // 기본적으로 모든 칸을 선택 상태로 시작
      if (formtecSelectedCells.length === 0) {
        setFormtecSelectedCells(Array.from({ length: config.cells }, (_, i) => i));
      }
      
      // [핵심] 화면 크기를 바꾸지 않고, 내부적으로만 라벨 크기에 맞춰 중앙 정렬 실행
      setTimeout(() => {
        alignDesignCenter({ widthMm: config.widthMm, heightMm: config.heightMm });
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen || !config) return null;

  const rows = Math.ceil(config.cells / config.cols);
  const cols = config.cols;
  const totalCells = config.cells;

  const toggleCell = (idx: number) => {
    const isSelected = formtecSelectedCells.includes(idx);
    if (isSelected) {
      setFormtecSelectedCells(formtecSelectedCells.filter(c => c !== idx));
    } else {
      setFormtecSelectedCells([...formtecSelectedCells, idx]);
    }
  };

  const selectAll = () => setFormtecSelectedCells(Array.from({ length: totalCells }, (_, i) => i));
  const selectFirst = () => setFormtecSelectedCells([0]);
  const clearAll = () => setFormtecSelectedCells([]);

  const SCALE = 0.5; 
  const displayWidth = 210 * SCALE;
  const displayHeight = 297 * SCALE;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative bg-white rounded-[2.5rem] w-full max-w-5xl shadow-2xl overflow-hidden border border-gray-200 max-h-[95vh] flex flex-col animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="px-10 py-8 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white shrink-0">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-blue-600 rounded-[1.25rem] text-white shadow-xl shadow-blue-100">
              <Printer size={28} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">라벨 인쇄 위치 설정</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black rounded uppercase tracking-widest">{selectedPresetId}</span>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none pt-0.5">Physical Grid Management</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => alignDesignCenter({ widthMm: config.widthMm, heightMm: config.heightMm })} 
              className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg active:scale-95 group"
            >
              <AlignCenter size={16} /> 중앙 정렬 재시도
            </button>
            <button onClick={onClose} className="w-12 h-12 rounded-full bg-white hover:bg-gray-50 flex items-center justify-center transition-all shadow-sm border border-gray-100 text-gray-400 hover:text-gray-900">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden lg:flex-row flex-col">
          {/* Left Area: Paper Grid */}
          <div className="flex-1 bg-gray-50 p-10 flex flex-col items-center justify-center overflow-auto custom-scrollbar relative border-r border-gray-100/50">
            {/* Paper Container */}
            <div 
              className="bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] relative border border-gray-200"
              style={{
                width: `${displayWidth}mm`,
                height: `${displayHeight}mm`,
                paddingTop: `${config.marginTopMm * SCALE}mm`,
                paddingLeft: `${config.marginLeftMm * SCALE}mm`,
                paddingRight: `${(210 - (config.marginLeftMm + config.cols * config.widthMm + (config.cols-1) * config.hGapMm)) * SCALE}mm`,
                display: 'grid',
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gridTemplateRows: `repeat(${rows}, 1fr)`,
                columnGap: `${config.hGapMm * SCALE}mm`,
                rowGap: `${config.vGapMm * SCALE}mm`,
              }}
            >
              {Array.from({ length: totalCells }).map((_, idx) => {
                const position = idx + 1;
                const isSelected = formtecSelectedCells.includes(idx);
                return (
                  <div 
                    key={idx} 
                    onClick={() => toggleCell(idx)} 
                    className={cn(
                      "relative border transition-all cursor-pointer overflow-hidden select-none group",
                      isSelected 
                        ? "border-blue-500 bg-white ring-2 ring-blue-50 z-10" 
                        : "border-gray-100 bg-gray-50/30 opacity-40 hover:opacity-100 hover:border-blue-200"
                    )}
                  >
                    {isSelected ? (
                      <div className="w-full h-full relative">
                        <CanvasDesignMiniPreview scale={SCALE} widthMm={config.widthMm} heightMm={config.heightMm} />
                        <div className="absolute top-1.5 left-1.5 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white text-[9px] font-black shadow-lg z-20 border-2 border-white">
                           ✓
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1 group-hover:scale-110 transition-transform">
                        <span className="text-lg font-black text-gray-200 group-hover:text-blue-200">{position}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Area: Sidebar */}
          <div className="w-full lg:w-[380px] p-10 flex flex-col gap-10 overflow-y-auto bg-white custom-scrollbar">
            <div className="space-y-5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">빠른 위치 선택</label>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={selectAll} className="flex items-center justify-center gap-2 py-4 bg-gray-900 text-white rounded-[1.25rem] text-xs font-black shadow-lg">전체 인쇄</button>
                <button onClick={selectFirst} className="flex items-center justify-center gap-2 py-4 bg-blue-50 text-blue-700 border border-blue-100 rounded-[1.25rem] text-xs font-black">1번 칸만</button>
              </div>
            </div>

            <div className="space-y-5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">추가 인쇄 문구</label>
              <textarea 
                value={formtecAdditionalMessage} 
                onChange={(e) => setFormtecAdditionalMessage(e.target.value)} 
                placeholder="예) 보낸이/받는이 이름" 
                className="w-full bg-gray-50/50 text-gray-900 text-sm font-bold min-h-[140px] p-6 rounded-[2rem] border border-gray-100 outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-200 resize-none" 
              />
            </div>

            <div className="mt-auto">
               <button 
                onClick={() => {
                  // 인쇄 직전 차원 복구 (인쇄 로직이 currentDimension을 참조할 수 있으므로 주의 필요)
                  // 하지만 PrintCommander는 jobData로 전달받으므로 안전할 수 있음
                  onPrint();
                }} 
                disabled={isGenerating || formtecSelectedCells.length === 0}
                className="w-full py-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-[2rem] font-black text-base shadow-xl active:scale-95 transition-all flex items-center justify-center gap-4 disabled:bg-gray-100"
              >
                {isGenerating ? <Loader2 size={24} className="animate-spin" /> : <Printer size={24} />}
                {formtecSelectedCells.length}개 라벨 인쇄
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
