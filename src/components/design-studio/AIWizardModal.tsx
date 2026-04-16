'use client';

import React, { useState } from 'react';
import { X, Sparkles, Wand2, CheckCircle2, RotateCcw, ArrowRight, Loader2, Palette } from 'lucide-react';
import { useEditorStore } from '@/stores/design-store';

interface AIWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const THEME_PRESETS = [
  { id: 'romantic', label: '💕 로맨틱/감성', color: 'bg-rose-50 text-rose-700 border-rose-100 ring-rose-500' },
  { id: 'modern', label: '🏢 모던/심플', color: 'bg-slate-50 text-slate-700 border-slate-100 ring-slate-500' },
  { id: 'luxury', label: '💎 럭셔리/골드', color: 'bg-amber-50 text-amber-700 border-amber-100 ring-amber-500' },
  { id: 'cute', label: '🧸 귀여운/3D', color: 'bg-yellow-50 text-yellow-700 border-yellow-100 ring-yellow-500' },
  { id: 'retro', label: '📻 레트로/빈티지', color: 'bg-orange-50 text-orange-700 border-orange-100 ring-orange-500' },
  { id: 'artistic', label: '🎨 예술적/추상', color: 'bg-purple-50 text-purple-700 border-purple-100 ring-purple-500' }
];

export const AIWizardModal: React.FC<AIWizardModalProps> = ({ isOpen, onClose }) => {
  const { 
    setFrontBackgroundUrl, 
    setBackgroundUrl, 
    foldType, 
    orientation, 
    currentDimension,
    setIsGenerating,
    isGenerating,
    setActivePage,
    frontBackgroundUrl,
    backgroundUrl
  } = useEditorStore();

  const [aiStep, setAiStep] = useState<'input' | 'complete'>('input');
  const [activeAiThemeTab, setActiveAiThemeTab] = useState<string | null>(null);
  const [aiThemePrompt, setAiThemePrompt] = useState('');
  const [aiGeneratedImages, setAiGeneratedImages] = useState<{ url: string; seed: number }[]>([]);

  if (!isOpen) return null;

  const handleAISmartDesign = async (specificStyle?: string) => {
    setIsGenerating(true);
    setAiGeneratedImages([]);
    
    try {
      setActivePage('outside');
      const response = await fetch('/api/ai/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: specificStyle || aiThemePrompt || 'Beautiful artistic cover',
          theme: activeAiThemeTab || 'modern',
          orientation,
          foldType,
          widthMm: currentDimension.widthMm,
          heightMm: currentDimension.heightMm
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '디자인 생성 실패');

      const images = data.images || [];
      setAiGeneratedImages(images);
      
      if (images.length > 0) {
        const imageUrl = images[0].url;
        if (foldType === 'half') setFrontBackgroundUrl(imageUrl);
        else setBackgroundUrl(imageUrl);
      }
      setAiStep('complete');
    } catch (error: any) {
      console.error('AI Smart Design error:', error);
      alert(`디자인 생성 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const currentSelection = foldType === 'half' ? frontBackgroundUrl : backgroundUrl;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-lg rounded-[3.5rem] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in duration-300 border border-white/20">
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-purple-700 p-10 text-white relative">
          <button onClick={onClose} className="absolute top-8 right-8 p-3 hover:bg-white/10 rounded-full transition-colors backdrop-blur-sm"><X size={20} /></button>
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-inner">
               <Sparkles className="animate-pulse" size={28} />
            </div>
            <div>
               <h2 className="text-3xl font-black tracking-tight">AI 스마트 디자인</h2>
               <p className="text-white/60 text-xs font-black uppercase tracking-[0.2em] mt-1">Premium Generative Artwork</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {aiStep === 'input' ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                  <Palette size={14} className="text-indigo-500" />
                  STYLE THEME PRESET
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {THEME_PRESETS.map(t => (
                    <button 
                      key={t.id} 
                      onClick={() => setActiveAiThemeTab(activeAiThemeTab === t.id ? null : t.id)} 
                      className={`group relative p-4 rounded-3xl border-2 text-sm font-black transition-all flex flex-col gap-2 ${
                        activeAiThemeTab === t.id 
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100 scale-105' 
                          : `${t.color} hover:border-gray-300`
                      }`}
                    >
                      <span>{t.label}</span>
                      {activeAiThemeTab === t.id && (
                         <div className="absolute top-2 right-2"><CheckCircle2 size={16} /></div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                  <Wand2 size={14} className="text-purple-500" />
                  CUSTOM PROMPT (OPTIONAL)
                </label>
                <div className="p-6 bg-slate-50 rounded-[2.5rem] border border-gray-100 group-focus-within:border-indigo-400 transition-colors">
                  <textarea 
                    value={aiThemePrompt} 
                    onChange={e => setAiThemePrompt(e.target.value)} 
                    placeholder="예) 수채화 풍의 부드러운 장미 정원 정오의 햇살" 
                    className="w-full bg-transparent text-gray-800 text-base font-bold h-32 resize-none outline-none placeholder:text-gray-300 leading-relaxed" 
                  />
                  <div className="flex justify-end pt-2 border-t border-gray-200/50 mt-4">
                     <span className="text-[10px] font-black text-indigo-400 uppercase">Input ready</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => handleAISmartDesign()} 
                disabled={isGenerating}
                className="w-full group relative py-6 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white rounded-[2.5rem] font-black text-lg shadow-2xl shadow-indigo-100 hover:scale-[1.02] active:scale-[0.98] transition-all overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                <span className="relative z-10 flex items-center justify-center gap-3">
                   {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles />}
                   AI 디자인 시작하기
                </span>
              </button>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
              <div className="grid grid-cols-2 gap-4">
                {aiGeneratedImages.map((img, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => foldType === 'half' ? setFrontBackgroundUrl(img.url) : setBackgroundUrl(img.url)} 
                    className={`group relative cursor-pointer rounded-[2rem] overflow-hidden border-4 transition-all duration-300 ${
                      currentSelection === img.url 
                        ? 'border-indigo-600 shadow-2xl scale-[1.05] z-10' 
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img.url} alt="AI Artwork" className="w-full aspect-square object-cover" />
                    {currentSelection === img.url && (
                      <div className="absolute top-4 right-4 bg-indigo-600 text-white p-2 rounded-full shadow-lg animate-in zoom-in-50">
                        <CheckCircle2 size={24} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <button 
                  onClick={() => setIsAiWizardOpen(false)}
                  className="w-full py-5 bg-black text-white rounded-3xl font-black text-base shadow-xl hover:bg-gray-900 transition-all flex items-center justify-center gap-3"
                >
                  선택한 디자인 적용 <ArrowRight size={20} />
                </button>
                <button 
                  onClick={() => setAiStep('input')} 
                  className="w-full py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-base hover:bg-slate-200 transition-all flex items-center justify-center gap-3"
                >
                  <RotateCcw size={20} /> 테마 다시 설정
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Global Generator Overlay */}
        {isGenerating && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-xl z-[200] flex flex-col items-center justify-center animate-in fade-in duration-700">
            <div className="relative">
              <div className="w-24 h-24 border-8 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                 <Sparkles className="text-indigo-600 animate-pulse" size={32} />
              </div>
            </div>
            <div className="mt-10 text-center space-y-2">
              <p className="text-2xl font-black bg-gradient-to-r from-indigo-700 to-indigo-500 bg-clip-text text-transparent tracking-tighter animate-bounce">
                AI 아티스트가 그리는 중...
              </p>
              <p className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.3em]">Masterpiece Creation in progress</p>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
};
