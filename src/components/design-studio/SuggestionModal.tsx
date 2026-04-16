'use client';

import React, { useState } from 'react';
import { X, MessageSquareText, Sparkles, Languages, Check, ArrowRight } from 'lucide-react';
import {
  CATEGORY_LABELS,
  MESSAGE_SUGGESTIONS,
  QUOTE_SUGGESTIONS
} from '@/lib/constants/ContentSuggestions';
import { useEditorStore } from '@/stores/design-store';

interface SuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'quote' | 'message';
}

export const SuggestionModal: React.FC<SuggestionModalProps> = ({ isOpen, onClose, type }) => {
  const {
    addTextBlock,
    removeTextBlock,
    suggestedQuoteBlockId,
    setSuggestedQuoteBlockId,
    suggestedMessageBlockId,
    setSuggestedMessageBlockId,
    currentDimension,
    foldType,
    margins,
    activePage,
    setActivePage,
    setSelectedBlockId,
    selectedPresetId
  } = useEditorStore();

  const [selectedCategory, setSelectedCategory] = useState<string>('lover');
  const [selectedLang, setSelectedLang] = useState<'ko' | 'en'>('ko');

  if (!isOpen) return null;

  const handleSelect = (suggestion: any) => {
    const isFolding = foldType === 'half';
    const isLandscape = currentDimension.widthMm > currentDimension.heightMm;
    const isInsidePage = activePage === 'inside';
    const isLabel = selectedPresetId?.startsWith('formtec-');

    let startX = (margins.left + (currentDimension.widthMm - margins.right)) / 2;
    let startY = (margins.top + (currentDimension.heightMm - margins.bottom)) / 2;
    let width = (currentDimension.widthMm - margins.left - margins.right) - 10;

    if (type === 'quote') {
      if (isFolding) {
        if (isLandscape) {
          // 가로 접이의 왼쪽 면 정밀 중앙: (여백 ~ 접힘선)의 중간
          startX = (margins.left + (currentDimension.widthMm / 2)) / 2;
          width = (currentDimension.widthMm / 2) - margins.left - 10;
        } else {
          // 세로 접이의 상단 면 정밀 중앙: (여백 ~ 접힘선)의 중간
          startY = (margins.top + (currentDimension.heightMm / 2)) / 2;
          width = currentDimension.widthMm - margins.left - margins.right - 10;
        }
      }

      if (suggestedQuoteBlockId) removeTextBlock(suggestedQuoteBlockId);
      const id = addTextBlock({
        text: suggestion.content + (suggestion.author ? `\n\n- ${suggestion.author} -` : ''),
        x: startX,
        y: startY,
        fontSize: 14,
        textAlign: 'center',
        colorHex: isInsidePage ? '#1e293b' : '#ffffff',
        strokeWidth: isInsidePage ? 0 : 0.5,
        strokeColor: isInsidePage ? 'transparent' : '#000000',
        fontFamily: "'Gowun Batang', serif",
        opacity: isInsidePage ? 1.0 : 0.8,
        width: width,
        lineHeight: 1.6,
        textShadow: isInsidePage ? 'none' : 'rgba(0,0,0,0.5) 0px 2px 4px'
      });
      setSuggestedQuoteBlockId(id);
      if (!isLabel && activePage === 'outside') setActivePage('inside');
      else if (isLabel) setSelectedBlockId(id);
    } else {
      if (isFolding) {
        if (isLandscape) {
          // 가로 접이의 오른쪽 면 정밀 중앙: (접힘선 ~ 우측 여백 제외 끝)의 중간
          startX = (currentDimension.widthMm / 2 + (currentDimension.widthMm - margins.right)) / 2;
          width = (currentDimension.widthMm / 2) - margins.right - 10;
        } else {
          // 세로 접이의 하단 면 정밀 중앙: (접힘선 ~ 하단 여백 제외 끝)의 중간
          startY = (currentDimension.heightMm / 2 + (currentDimension.heightMm - margins.bottom)) / 2;
          width = currentDimension.widthMm - margins.left - margins.right - 10;
        }
      }

      if (suggestedMessageBlockId) removeTextBlock(suggestedMessageBlockId);
      const id = addTextBlock({
        text: suggestion.content,
        x: startX,
        y: startY,
        fontSize: 15, // [교정] 조건 없이 기본 15px로 고정
        textAlign: 'center',
        colorHex: isInsidePage ? '#000000' : '#ffffff',
        strokeWidth: isInsidePage ? 0 : 0.5,
        strokeColor: isInsidePage ? 'transparent' : '#000000',
        fontFamily: "'Gowun Batang', serif",
        opacity: 1.0,
        width: width,
        lineHeight: 1.6,
        textShadow: isInsidePage ? 'none' : 'rgba(0,0,0,0.5) 0px 2px 4px'
      });
      setSuggestedMessageBlockId(id);
      if (!isLabel && activePage === 'outside') setActivePage('inside');
      else if (isLabel) setSelectedBlockId(id);
    }
    onClose();
  };

  const suggestions = (type === 'quote' ? QUOTE_SUGGESTIONS : MESSAGE_SUGGESTIONS)
    .filter(s => s.category === selectedCategory && s.lang === selectedLang);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] w-full max-w-5xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-white/20">
        {/* Header */}
        <div className={`p-8 border-b border-gray-100 flex items-center justify-between ${type === 'quote' ? 'bg-emerald-50/30' : 'bg-blue-50/30'}`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl shadow-lg ${type === 'quote' ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white'}`}>
              {type === 'quote' ? <Sparkles size={24} /> : <MessageSquareText size={24} />}
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-800 tracking-tight">
                {type === 'quote' ? '명언 라이브러리' : '추천 메시지 찾기'}
              </h3>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">PRO-CONTENT LIBRARY</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center transition-colors shadow-sm border border-gray-100">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside className="w-64 bg-gray-50/50 border-r border-gray-100 p-6 shrink-0 overflow-y-auto custom-scrollbar">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 px-1">THEME CATEGORY</label>
            <div className="space-y-1.5">
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className={`w-full px-5 py-3.5 text-left text-sm font-black rounded-[1.25rem] transition-all flex items-center justify-between group ${selectedCategory === key
                    ? (type === 'quote' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-blue-500 text-white shadow-lg shadow-blue-100')
                    : 'text-gray-500 hover:bg-white hover:text-gray-800 border border-transparent hover:border-gray-200'
                    }`}
                >
                  <span>{label}</span>
                  {selectedCategory === key && <ArrowRight size={14} className="animate-pulse" />}
                </button>
              ))}
            </div>
          </aside>

          {/* Content Area */}
          <div className="flex-1 flex flex-col bg-slate-50/50">
            {/* Lang Toggle */}
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white/50 px-8">
              <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                <Languages size={14} /> LANGUAGE SELECT
              </div>
              <div className="flex p-1 bg-gray-100 rounded-xl">
                <button
                  onClick={() => setSelectedLang('ko')}
                  className={`px-6 py-1.5 text-xs font-black rounded-lg transition-all ${selectedLang === 'ko' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  한국어
                </button>
                <button
                  onClick={() => setSelectedLang('en')}
                  className={`px-6 py-1.5 text-xs font-black rounded-lg transition-all ${selectedLang === 'en' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  English
                </button>
              </div>
            </div>

            {/* List */}
            <div className="p-8 overflow-y-auto custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-5 auto-rows-max">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  onClick={() => handleSelect(suggestion)}
                  className={`group relative p-8 transition-all bg-white rounded-[2rem] border border-gray-100 flex flex-col text-left shadow-sm hover:shadow-2xl hover:-translate-y-1 active:scale-95 duration-300 ${type === 'quote' ? 'hover:border-emerald-200' : 'hover:border-blue-200'
                    }`}
                >
                  <p className="text-[15px] text-gray-700 leading-relaxed whitespace-pre-wrap font-medium">
                    {suggestion.content}
                  </p>

                  {suggestion.author && (
                    <div className="mt-6 pt-4 border-t border-gray-50 text-right">
                      <span className="text-xs font-black text-gray-400 italic">― {suggestion.author}</span>
                    </div>
                  )}

                  {/* Hover Overlay Icon */}
                  <div className={`absolute bottom-6 left-6 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-xl text-white ${type === 'quote' ? 'bg-emerald-500' : 'bg-blue-500'
                    }`}>
                    <Check size={16} strokeWidth={3} />
                  </div>
                </button>
              ))}

              {suggestions.length === 0 && (
                <div className="col-span-full py-24 flex flex-col items-center justify-center text-gray-300 animate-pulse">
                  <MessageSquareText size={48} className="mb-4 opacity-10" />
                  <p className="text-sm font-black">내용을 준비 중입니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
};
