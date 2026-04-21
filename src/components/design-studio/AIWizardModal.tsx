'use client';

import React, { useState, useEffect } from 'react';
import { X, Sparkles, Wand2, CheckCircle2, RotateCcw, ArrowRight, Loader2, Palette, Heart, Image as ImageIcon } from 'lucide-react';
import { useEditorStore } from '@/stores/design-store';

interface AIWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EVENT_PRESETS = [
  { id: 'floral', label: '🌸 풍성한 꽃/그리너리', color: 'bg-rose-50 text-rose-700 border-rose-100 ring-rose-500', basePrompt: 'Elegant floral and botanical arrangement, lush greenery, soft warm lighting, aesthetic design' },
  { id: 'watercolor', label: '🎨 감성 수채화 워시', color: 'bg-indigo-50 text-indigo-700 border-indigo-100 ring-indigo-500', basePrompt: 'Soft pastel watercolor wash background, dreamy gradient, abstract color bleeding, ethereal aesthetic' },
  { id: 'modern_abstract', label: '🏢 모던/추상 패턴', color: 'bg-slate-50 text-slate-700 border-slate-100 ring-slate-500', basePrompt: 'Modern minimalist abstract background, geometric paper texture, clean subtle shapes, sophisticated' },
  { id: 'landscape', label: '⛰️ 자연/풍경 무드', color: 'bg-emerald-50 text-emerald-700 border-emerald-100 ring-emerald-500', basePrompt: 'Beautiful serene natural landscape background, soft skies, aesthetic scenery, gentle sunlight' },
  { id: 'luxury_gold', label: '✨ 럭셔리 골드/텍스처', color: 'bg-amber-50 text-amber-700 border-amber-100 ring-amber-500', basePrompt: 'Luxurious elegant textures, subtle gold foils, marble or silk background, premium aesthetic' },
  { id: 'celebration', label: '🎉 축하/파티 무드', color: 'bg-pink-50 text-pink-700 border-pink-100 ring-pink-500', basePrompt: 'Festive celebration aesthetic, subtle glowing bokeh, bright cheerful background, joyful atmosphere' }
];

const SAMPLE_TAGS = [
  "은은한 그라데이션", "고급 종이 질감", "빛의 번짐(보케)", "여백 넉넉하게", "깔끔한 파스텔 톤", "유화풍 붓터치"
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

  const [aiStep, setAiStep] = useState<'input' | 'complete' | 'favorites'>('input');
  const [activeAiThemeTab, setActiveAiThemeTab] = useState<string | null>(null);
  const [aiThemePrompt, setAiThemePrompt] = useState('');
  const [aiGeneratedImages, setAiGeneratedImages] = useState<{ url: string; seed: number }[]>([]);
  
  // 즐겨찾기 상태
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('floxync_ai_favorites');
      if (saved) {
        try { setFavorites(JSON.parse(saved)); } catch (e) {}
      }
    }
  }, [isOpen]);

  const toggleFavorite = (url: string) => {
    let next: string[];
    if (favorites.includes(url)) {
      next = favorites.filter(u => u !== url);
    } else {
      next = [url, ...favorites].slice(0, 20); // 최대 20장 저장
    }
    setFavorites(next);
    localStorage.setItem('floxync_ai_favorites', JSON.stringify(next));
  };

  const handleTagClick = (tag: string) => {
    setAiThemePrompt(prev => prev ? `${prev}, ${tag}` : tag);
  };

  if (!isOpen) return null;

  const handleAISmartDesign = async (isVariation: boolean = false) => {
    setIsGenerating(true);
    if (!isVariation) setAiGeneratedImages([]);

    try {
      setActivePage('outside');
      
      const selectedPreset = EVENT_PRESETS.find(p => p.id === activeAiThemeTab);
      const basePrompt = selectedPreset?.basePrompt || 'Beautiful elegant floral background, soft minimalist composition';
      const userAddition = aiThemePrompt ? `, custom style: ${aiThemePrompt}` : '';
      const finalPrompt = basePrompt + userAddition;

      const response = await fetch('/api/ai/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          theme: activeAiThemeTab || 'modern',
          orientation,
          foldType,
          widthMm: currentDimension.widthMm,
          heightMm: currentDimension.heightMm,
          count: 2
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '디자인 생성 실패');

      const images = data.images || [];
      setAiGeneratedImages(images);

      if (images.length > 0 && !isVariation) {
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
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />

      <div className="relative bg-white w-full max-w-lg rounded-[3.5rem] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in duration-300 border border-white/20">
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-purple-700 p-8 text-white relative">
          <button onClick={onClose} className="absolute top-6 right-8 p-3 hover:bg-white/10 rounded-full transition-colors backdrop-blur-sm"><X size={20} /></button>
          
          <div className="flex items-center justify-between mb-2 pr-12">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-inner">
                <Sparkles className="animate-pulse" size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight">AI 스마트 디자인</h2>
                <p className="text-white/60 text-xs font-black uppercase tracking-[0.2em] mt-1">SaaS Partner Toolkit</p>
              </div>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-2 mt-4 bg-black/20 p-1.5 rounded-2xl backdrop-blur-md w-max">
            <button 
              onClick={() => setAiStep('input')} 
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${aiStep !== 'favorites' ? 'bg-white text-indigo-700 shadow-md' : 'text-white/70 hover:text-white'}`}
            >
              새로 생성하기
            </button>
            <button 
              onClick={() => setAiStep('favorites')} 
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${aiStep === 'favorites' ? 'bg-white text-indigo-700 shadow-md' : 'text-white/70 hover:text-white'}`}
            >
              내 보관함 <span className="bg-indigo-500/30 px-1.5 rounded-md text-xs">{favorites.length}</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6 max-h-[65vh] overflow-y-auto custom-scrollbar">
          {aiStep === 'input' ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                  <Palette size={14} className="text-indigo-500" />
                  디자인 목적 (시즌/행사 프리셋)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {EVENT_PRESETS.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setActiveAiThemeTab(activeAiThemeTab === t.id ? null : t.id)}
                      className={`group relative py-3 px-4 rounded-3xl border-2 text-sm font-black transition-all flex flex-col gap-1 items-start ${activeAiThemeTab === t.id
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100 scale-105'
                          : `${t.color} hover:border-gray-300 bg-white`
                        }`}
                    >
                      <span>{t.label}</span>
                      {activeAiThemeTab === t.id && (
                        <div className="absolute top-3 right-3"><CheckCircle2 size={16} /></div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                  <Wand2 size={14} className="text-purple-500" />
                  추가 옵션 (태그 클릭 시 텍스트 추가됨)
                </label>
                
                <div className="flex flex-wrap gap-2 mb-2 px-1">
                  {SAMPLE_TAGS.map(tag => (
                    <button 
                      key={tag}
                      onClick={() => handleTagClick(tag)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 transition-colors rounded-full text-xs font-bold text-slate-600 border border-slate-200 cursor-pointer"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>

                <div className="p-4 bg-slate-50 rounded-[2rem] border border-gray-100 group-focus-within:border-indigo-400 transition-colors">
                  <textarea
                    value={aiThemePrompt}
                    onChange={e => setAiThemePrompt(e.target.value)}
                    placeholder="예) 파스텔 톤 수채화 느낌으로 그려줘"
                    className="w-full bg-transparent text-gray-800 text-sm font-bold h-24 resize-none outline-none placeholder:text-gray-300 leading-relaxed"
                  />
                </div>
              </div>

              <button
                onClick={() => handleAISmartDesign(false)}
                disabled={isGenerating}
                className="w-full group relative py-5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-[0.98] transition-all overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles />}
                  AI 배경 디자인 생성
                </span>
              </button>
            </div>
          ) : aiStep === 'favorites' ? (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
              {favorites.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center">
                  <Heart size={40} className="text-slate-200 mb-4" />
                  <p className="text-slate-500 font-bold">보관된 디자인이 없습니다.</p>
                  <p className="text-slate-400 text-sm mt-1">생성된 디자인의 우측 상단 ❤️ 버튼을 눌러 저장하세요.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {favorites.map((url, idx) => (
                    <div
                      key={idx}
                      className="group relative rounded-[1.5rem] overflow-hidden border-2 border-slate-200 hover:border-indigo-500 transition-all cursor-pointer aspect-square bg-slate-100"
                    >
                      <img 
                        src={url} 
                        alt="Favorite" 
                        onClick={() => {
                          if (foldType === 'half') setFrontBackgroundUrl(url);
                          else setBackgroundUrl(url);
                          onClose();
                        }}
                        className="w-full h-full object-cover" 
                      />
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(url); }}
                        className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm hover:scale-110 transition-transform text-rose-500"
                      >
                        <Heart size={16} fill="currentColor" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
              <div className="grid grid-cols-2 gap-4">
                {aiGeneratedImages.map((img, idx) => {
                  const isFav = favorites.includes(img.url);
                  return (
                    <div
                      key={idx}
                      onClick={() => foldType === 'half' ? setFrontBackgroundUrl(img.url) : setBackgroundUrl(img.url)}
                      className={`group relative cursor-pointer rounded-[2rem] overflow-hidden border-4 transition-all duration-300 ${currentSelection === img.url
                          ? 'border-indigo-600 shadow-2xl scale-[1.05] z-10'
                          : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                    >
                      <img src={img.url} alt="AI Artwork" className="w-full aspect-square object-cover" />
                      
                      {/* 즐겨찾기 버튼 */}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(img.url); }}
                        className={`absolute top-4 left-4 p-2.5 rounded-full shadow-lg transition-all z-20 ${isFav ? 'bg-rose-50 text-rose-500 scale-110' : 'bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm'}`}
                      >
                        <Heart size={18} fill={isFav ? "currentColor" : "none"} />
                      </button>

                      {currentSelection === img.url && (
                        <div className="absolute top-4 right-4 bg-indigo-600 text-white p-2.5 rounded-full shadow-lg animate-in zoom-in-50 z-20">
                          <CheckCircle2 size={24} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button
                  onClick={() => onClose()}
                  className="w-full py-4 bg-black text-white rounded-3xl font-black shadow-xl hover:bg-gray-900 transition-all flex items-center justify-center gap-3"
                >
                  이 디자인으로 적용 <ArrowRight size={20} />
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleAISmartDesign(true)}
                    disabled={isGenerating}
                    className="py-4 bg-indigo-50 text-indigo-700 rounded-3xl font-black text-sm hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
                  >
                    {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <RotateCcw size={18} />}
                    이 느낌으로 한장 더!
                  </button>
                  <button
                    onClick={() => setAiStep('input')}
                    className="py-4 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                  >
                    처음부터 다시
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Global Generator Overlay */}
        {isGenerating && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="relative">
              <div className="w-24 h-24 border-8 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="text-indigo-600 animate-pulse" size={32} />
              </div>
            </div>
            <div className="mt-10 text-center space-y-2">
              <p className="text-2xl font-black bg-gradient-to-r from-indigo-700 to-indigo-500 bg-clip-text text-transparent tracking-tighter animate-bounce">
                AI가 배경 그리는 중...
              </p>
              <p className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.3em]">Masterpiece Creation in progress</p>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
};
