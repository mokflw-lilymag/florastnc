'use client';

import React from 'react';
import { X, Check, Printer, Grid, Trash2 } from 'lucide-react';

interface FormtecModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: any;
  formtecLabelType: string;
  formtecSelectedCells: number[];
  setFormtecSelectedCells: (cells: number[] | ((prev: number[]) => number[])) => void;
  formtecMessage: string;
  setFormtecMessage: (msg: string) => void;
  formtecFontSize: number;
  setFormtecFontSize: (size: number) => void;
  formtecIsBold: boolean;
  setFormtecIsBold: (bold: boolean) => void;
  formtecTextAlign: 'left' | 'center' | 'right';
  setFormtecTextAlign: (align: 'left' | 'center' | 'right') => void;
  formtecBgColor: string;
  setFormtecBgColor: (color: string) => void;
  formtecTextColor: string;
  setFormtecTextColor: (color: string) => void;
  onPrint: () => void;
  isGenerating: boolean;
}

export const FormtecModal: React.FC<FormtecModalProps> = ({
  isOpen, onClose, config, formtecSelectedCells, setFormtecSelectedCells,
  formtecMessage, setFormtecMessage, formtecFontSize, setFormtecFontSize,
  formtecIsBold, setFormtecIsBold, formtecTextAlign, setFormtecTextAlign,
  formtecBgColor, setFormtecBgColor, formtecTextColor, setFormtecTextColor,
  onPrint, isGenerating
}) => {
  if (!isOpen) return null;

  const rows = config ? Math.ceil(config.cells / config.cols) : 1;
  const cols = config ? config.cols : 1;
  const totalCells = config ? config.cells : 1;

  const toggleCell = (idx: number) => {
    setFormtecSelectedCells((prev: number[]) => 
      prev.includes(idx) ? prev.filter((c: number) => c !== idx) : [...prev, idx]
    );
  };

  const selectAll = () => setFormtecSelectedCells(Array.from({ length: totalCells }, (_, i) => i));
  const clearAll = () => setFormtecSelectedCells([]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden border border-white/20 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-8 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-emerald-100/30 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200 text-white">
                <Printer size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-800 tracking-tight">라벨지 대량 인쇄 설정</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Bulk Printing Architecture</p>
              </div>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center transition-colors shadow-sm border border-gray-100">
              <X size={20} className="text-gray-400" />
            </button>
          </div>
        </div>

        <div className="p-10 space-y-8 overflow-y-auto flex-1 custom-scrollbar">
          {/* Label Grid Picker */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Grid size={14} className="text-emerald-500" />
                인쇄 위치 선택 <span className="text-emerald-600">({formtecSelectedCells.length}/{totalCells})</span>
              </label>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-[10px] px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl font-black border border-emerald-100 hover:bg-emerald-100 transition-all">전체 선택</button>
                <button onClick={clearAll} className="text-[10px] px-3 py-1.5 bg-gray-50 text-gray-500 rounded-xl font-black border border-gray-100 hover:bg-gray-100 transition-all">초기화</button>
              </div>
            </div>

            <div className="bg-slate-50 rounded-[2.5rem] p-6 border border-gray-100 shadow-inner">
              <div className="bg-white rounded-2xl border border-gray-200 mx-auto shadow-2xl overflow-hidden relative group transition-transform hover:scale-[1.02]" style={{ aspectRatio: '210/297', maxHeight: '350px' }}>
                <div className="grid h-full w-full p-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)`, gap: '4px' }}>
                  {Array.from({ length: totalCells }).map((_, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => toggleCell(idx)} 
                      className={`group/cell border transition-all cursor-pointer flex items-center justify-center text-[10px] font-black rounded-sm relative overflow-hidden ${
                        formtecSelectedCells.includes(idx) 
                          ? 'bg-emerald-600 border-emerald-700 text-white shadow-lg animate-in zoom-in-95' 
                          : 'bg-white border-gray-200 text-gray-300 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-500'
                      }`}
                    >
                      {idx + 1}
                      {formtecSelectedCells.includes(idx) && (
                        <div className="absolute top-0 right-0 p-0.5"><Check size={8} strokeWidth={4} /></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Additional Message Area */}
          <div className="space-y-4">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">추가 메시지 (라벨 하단)</label>
            <div className="p-6 bg-slate-50 rounded-[2rem] border border-gray-100 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
              <textarea 
                value={formtecMessage} 
                onChange={(e) => setFormtecMessage(e.target.value)} 
                placeholder="캔버스 내용 외에 라벨마다 추가로 출력할 메시지를 입력하세요 (예: To. 소중한 분께)" 
                className="w-full bg-transparent text-gray-800 text-sm font-bold min-h-[100px] outline-none border-none resize-none placeholder:text-gray-300 leading-relaxed" 
              />
              <div className="flex items-center justify-between pt-4 border-t border-gray-200/50 mt-4">
                 <div className="flex gap-3">
                   <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-lg border border-gray-100">
                     <input type="color" value={formtecTextColor} onChange={(e) => setFormtecTextColor(e.target.value)} className="w-4 h-4 rounded-sm border-none bg-transparent cursor-pointer" />
                     <span className="text-[9px] font-black text-gray-400 uppercase">{formtecTextColor}</span>
                   </div>
                   <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-lg border border-gray-100">
                     <span className="text-[9px] font-black text-gray-400 uppercase">SIZE</span>
                     <input type="number" value={formtecFontSize} onChange={(e) => setFormtecFontSize(Number(e.target.value))} className="w-10 bg-transparent text-[10px] font-black outline-none border-none" />
                   </div>
                 </div>
                 <div className="flex bg-gray-100 p-0.5 rounded-lg">
                    {['left', 'center', 'right'].map((a) => (
                      <button 
                        key={a} 
                        onClick={() => setFormtecTextAlign(a as any)} 
                        className={`px-3 py-1 rounded text-[9px] font-black transition-all ${formtecTextAlign === a ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}
                      >
                        {a.toUpperCase()}
                      </button>
                    ))}
                 </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 bg-gray-50 flex gap-4 shrink-0">
          <button onClick={onClose} className="flex-1 py-5 bg-white border border-gray-200 text-gray-600 rounded-[2rem] font-black text-sm shadow-sm hover:bg-gray-100 transition-all">취소 및 닫기</button>
          <button 
            onClick={onPrint} 
            disabled={isGenerating || formtecSelectedCells.length === 0}
            className="flex-1 py-5 bg-emerald-600 text-white rounded-[2rem] font-black text-sm shadow-2xl shadow-emerald-100 hover:bg-emerald-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="animate-spin" /> : <Printer size={18} />}
            나머지 대량 라벨 인쇄 (PDF)
          </button>
        </div>
      </div>
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
};

function Loader2({ className }: { className?: string }) {
  return <span className={`animate-spin inline-block border-2 border-white/30 border-t-white rounded-full w-4 h-4 ${className}`} />;
}
