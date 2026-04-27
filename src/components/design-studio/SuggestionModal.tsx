'use client';

import React, { useState } from 'react';
import { X, MessageSquareText, Sparkles, Languages, Check, ArrowRight } from 'lucide-react';
import {
  CATEGORY_LABELS,
  MESSAGE_SUGGESTIONS,
  QUOTE_SUGGESTIONS
} from '@/lib/constants/ContentSuggestions';
import { useEditorStore } from '@/stores/design-store';
import { usePreferredLocale } from '@/hooks/use-preferred-locale';
import { getMessages } from '@/i18n/getMessages';

interface SuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'quote' | 'message';
}

export const SuggestionModal: React.FC<SuggestionModalProps> = ({ isOpen, onClose, type }) => {
  const locale = usePreferredLocale();
  const D = getMessages(locale).dashboard.designStudio;
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
    const isLabel = selectedPresetId?.startsWith('formtec-');

    // 기본값: 전체 중앙
    const fullWidth = currentDimension.widthMm;
    const fullHeight = currentDimension.heightMm;
    
    // 카드 패널 너비 (절반)
    const panelW = isFolding ? fullWidth / 2 : fullWidth;
    
    // 블록 너비 결정 (패널 너비의 약 80~90% 수준으로 넉넉하게)
    const blockW = isLabel ? (fullWidth - 20) : Math.min(panelW - 20, 100);

    // X 좌표 계산 (왼쪽 상단 기준)
    let startX = (fullWidth - blockW) / 2;
    // Y 좌표 계산 (상하 중앙 근처)
    let startY = (fullHeight / 2) - 10;

    if (type === 'quote') {
      if (isFolding && isLandscape) {
        // 가로 접이 카드: 명언은 대개 '뒷면' 혹은 '내지 왼쪽'에 위치 (왼쪽 패널 0~105mm)
        const panelCenter = panelW / 2;
        startX = panelCenter - (blockW / 2);
      }

      if (suggestedQuoteBlockId) removeTextBlock(suggestedQuoteBlockId);
      const id = addTextBlock({
        text: suggestion.content + (suggestion.author ? `\n\n- ${suggestion.author} -` : ''),
        x: startX,
        y: startY,
        fontSize: 14,
        textAlign: 'center',
        colorHex: '#1e293b',
        strokeWidth: 0,
        strokeColor: '#ffffff',
        fontFamily: "'Gowun Batang', serif",
        opacity: 1.0,
        width: blockW,
        lineHeight: 1.6,
        textShadow: 'none'
      });
      setSuggestedQuoteBlockId(id);
      if (!isLabel && activePage === 'outside') setActivePage('inside');
      else if (isLabel) setSelectedBlockId(id);
    } else {
      if (isFolding && isLandscape) {
        // 가로 접이 카드: 메시지는 '내지 오른쪽' (오른쪽 패널 105~210mm)
        const panelCenter = (fullWidth * 0.75);
        startX = panelCenter - (blockW / 2);
      }

      if (suggestedMessageBlockId) removeTextBlock(suggestedMessageBlockId);
      const id = addTextBlock({
        text: suggestion.content,
        x: startX,
        y: startY,
        fontSize: 15,
        textAlign: 'center',
        colorHex: '#1e293b',
        strokeWidth: 0,
        strokeColor: '#ffffff',
        fontFamily: "'Gowun Batang', serif",
        opacity: 1.0,
        width: blockW,
        lineHeight: 1.6,
        textShadow: 'none'
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] w-full max-w-5xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-white/20">
        {/* Header */}
        <div className={`p-8 border-b border-gray-100 flex items-center justify-between ${type === 'quote' ? 'bg-emerald-50/30' : 'bg-blue-50/30'}`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl shadow-lg ${type === 'quote' ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white'}`}>
              {type === 'quote' ? <Sparkles size={24} /> : <MessageSquareText size={24} />}
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-800 tracking-tight">
                {type === 'quote' ? D.suggestionQuote : D.suggestionMessage}
              </h3>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">{D.suggestionLibraryBadge}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center transition-colors shadow-sm border border-gray-100">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside className="w-64 bg-gray-50/50 border-r border-gray-100 p-6 shrink-0 overflow-y-auto custom-scrollbar">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 px-1">{D.suggestionThemeCategory}</label>
            <div className="space-y-1.5">
              {Object.keys(CATEGORY_LABELS).map((key) => (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className={`w-full px-5 py-3.5 text-left text-sm font-black rounded-[1.25rem] transition-all flex items-center justify-between group ${selectedCategory === key
                    ? (type === 'quote' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-blue-500 text-white shadow-lg shadow-blue-100')
                    : 'text-gray-500 hover:bg-white hover:text-gray-800 border border-transparent hover:border-gray-200'
                    }`}
                >
                  <span>{(D as Record<string, string>)[`suggestionCat_${key}`] ?? CATEGORY_LABELS[key]}</span>
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
                <Languages size={14} /> {D.suggestionLangSelect}
              </div>
              <div className="flex p-1 bg-gray-100 rounded-xl">
                <button
                  onClick={() => setSelectedLang('ko')}
                  className={`px-6 py-1.5 text-xs font-black rounded-lg transition-all ${selectedLang === 'ko' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {D.suggestionKo}
                </button>
                <button
                  onClick={() => setSelectedLang('en')}
                  className={`px-6 py-1.5 text-xs font-black rounded-lg transition-all ${selectedLang === 'en' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {D.suggestionEn}
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
                  <p className="text-sm font-black">{D.suggestionEmpty}</p>
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
