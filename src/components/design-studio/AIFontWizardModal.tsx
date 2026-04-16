'use client';

import React, { useState } from 'react';
import { X, Sparkles, CheckCircle2, Wand2, Type, Star } from 'lucide-react';
import { useEditorStore } from '@/stores/design-store';

interface AIFontWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FONT_PRESETS = [
  { 
    id: 'romantic', 
    label: '💕 로맨틱/감성', 
    description: '부드럽고 사랑스러운 느낌의 폰트 조합',
    fonts: [
      { name: '베이글팻원', family: "'Bagel Fat One', cursive", weight: 'Bold' },
      { name: '고운바탕', family: "'Gowun Batang', serif", weight: 'Regular' },
      { name: '나눔손글씨', family: "'Nanum Pen Script', cursive", weight: 'Light' }
    ],
    color: 'bg-rose-50 border-rose-100 text-rose-700'
  },
  { 
    id: 'modern', 
    label: '🏢 모던/심플', 
    description: '깔끔하고 정갈한 가독성 중심 조합',
    fonts: [
      { name: 'G마켓 산스', family: "'GmarketSansBold', sans-serif", weight: 'Black' },
      { name: '노토산스 KR', family: "'Noto Sans KR', sans-serif", weight: 'Medium' },
      { name: '주아체', family: "'Jua', sans-serif", weight: 'Regular' }
    ],
    color: 'bg-slate-50 border-slate-100 text-slate-700'
  },
  { 
    id: 'luxury', 
    label: '💎 럭셔리/고급', 
    description: '품격 있는 격식과 우아함이 돋보이는 조합',
    fonts: [
      { name: '조선궁서체', family: "'JoseonPalace', serif", weight: 'Bold' },
      { name: '송명체', family: "'Song Myung', serif", weight: 'Regular' },
      { name: '나눔명조', family: "'Nanum Myeongjo', serif", weight: 'Bold' }
    ],
    color: 'bg-amber-50 border-amber-100 text-amber-700'
  },
  { 
    id: 'cute', 
    label: '🧸 귀여운/친근함', 
    description: '동글동글하고 다정한 느낌의 폰트 조합',
    fonts: [
      { name: '동글체', family: "'Dongle', sans-serif", weight: 'Bold' },
      { name: '개구체', family: "'Gaegu', cursive", weight: 'Regular' },
      { name: '감자꽃', family: "'Gamja Flower', cursive", weight: 'Regular' }
    ],
    color: 'bg-yellow-50 border-yellow-100 text-yellow-700'
  }
];

export const AIFontWizardModal: React.FC<AIFontWizardModalProps> = ({ isOpen, onClose }) => {
  const { selectedBlockId, textBlocks, updateTextBlockContent } = useEditorStore();
  const [activeTheme, setActiveTheme] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApplyFont = (fontFamily: string) => {
    if (selectedBlockId && selectedBlockId.startsWith('text-')) {
      updateTextBlockContent(selectedBlockId, { fontFamily });
      onClose();
    } else {
      alert('대상 텍스트를 먼저 선택해주세요!');
    }
  };

  const selectedBlock = textBlocks.find(b => b.id === selectedBlockId);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-xl rounded-[3.5rem] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in duration-300 border border-white/20">
        {/* Header */}
        <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 p-10 text-white relative">
          <button onClick={onClose} className="absolute top-8 right-8 p-3 hover:bg-white/20 rounded-full transition-colors backdrop-blur-sm"><X size={20} /></button>
          <div className="flex items-center gap-4 mb-3">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-inner">
               <Wand2 className="animate-pulse" size={32} />
            </div>
            <div>
               <h2 className="text-3xl font-black tracking-tight">AI 폰트 마법사</h2>
               <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Font Kim Design Consultant</p>
            </div>
          </div>
          <div className="mt-4 p-4 bg-black/10 rounded-2xl border border-white/10 backdrop-blur-sm">
             <p className="text-sm font-bold text-white/90 italic">
                {selectedBlock 
                  ? `"${selectedBlock.text.substring(0, 15)}${selectedBlock.text.length > 15 ? '...' : ''}" 에 어울리는 폰트를 찾아드릴게요!`
                  : "현재 선택된 텍스트가 없습니다. 폰트를 적용할 텍스트를 먼저 선택해주세요."}
             </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-10 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 gap-4">
            {FONT_PRESETS.map((theme) => (
              <div 
                key={theme.id}
                className={`group p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer ${
                  activeTheme === theme.id 
                    ? 'border-orange-500 bg-orange-50/50 shadow-xl' 
                    : 'border-slate-100 bg-slate-50 hover:border-slate-300'
                }`}
                onClick={() => setActiveTheme(activeTheme === theme.id ? null : theme.id)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                       {theme.label}
                       {activeTheme === theme.id && <Star className="text-orange-500 fill-orange-500" size={16} />}
                    </h3>
                    <p className="text-xs font-bold text-gray-400 mt-1">{theme.description}</p>
                  </div>
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${theme.color}`}>
                     Theme Set
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 mt-4">
                  {theme.fonts.map((f, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => { e.stopPropagation(); handleApplyFont(f.family); }}
                      className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-400 hover:shadow-lg transition-all group/font"
                    >
                      <div className="flex items-center gap-3">
                        <Type size={16} className="text-slate-300 group-hover/font:text-indigo-500" />
                        <span 
                          className="text-lg font-bold"
                          style={{ fontFamily: f.family }}
                        >
                          {f.name} (Preview)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                         <span className="text-[10px] font-black text-slate-300 group-hover/font:text-indigo-400">{f.weight}</span>
                         <CheckCircle2 size={18} className="text-emerald-500 opacity-0 group-hover/font:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info/legend */}
        <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
           <div className="flex items-center gap-2">
              <Sparkles className="text-orange-500" size={16} />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Powered by AI Typography System</span>
           </div>
           <button 
              onClick={onClose}
              className="px-8 py-3 bg-black text-white rounded-2xl font-black text-xs hover:bg-gray-800 transition-all active:scale-95"
           >
              마칠게요
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
