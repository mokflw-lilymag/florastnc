'use client';

import React, { useState } from 'react';
import {
  Image as ImageIcon, Maximize, ArrowDown,
  Settings, Search, X, Store, Camera, Globe, Layers, Phone
} from 'lucide-react';
import { useEditorStore } from '@/stores/design-store';
import { PAPER_PRESETS } from '@/lib/constants/templates';
import { usePreferredLocale } from '@/hooks/use-preferred-locale';
import { getMessages } from '@/i18n/getMessages';
import { useAuthStore } from '@/stores/auth-store';
import { getActiveFontItems } from '@/lib/font-catalog';

interface DesignSidebarProps {
  onOpenGallery?: () => void;
  onOpenSuggestion?: (type: 'quote' | 'message') => void;
  onOpenShopSettings?: () => void;
  onOpenPhotoEditor?: () => void;
}

export const DesignSidebar: React.FC<DesignSidebarProps> = ({
  onOpenPhotoEditor
}) => {
  const locale = usePreferredLocale();
  const D = getMessages(locale).dashboard.designStudio;
  const DS = D as Record<string, string>;
  const activeFonts = getActiveFontItems();
  const paperPresetLabel = (presetId: string, fallback: string) => {
    const key = `paperPreset_${presetId.replace(/-/g, '_')}`;
    return DS[key] ?? fallback;
  };

  const {
    currentDimension,
    selectedPresetId,
    setDimension,
    brandingTextInfo,
    updateBrandingTextInfo,
    selectedBlockId,
    imageBlocks,
    updateImageBlockContent,
    removeImageBlock,
    addImageBlock,
    isGenerating,
    shopSettings
  } = useEditorStore();

  const [expandedSections, setExpandedSections] = useState<string[]>(['format', 'branding', 'properties']);

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  const selectedBlock = imageBlocks.find(b => b.id === selectedBlockId);
  const isImageBlock = selectedBlockId?.startsWith('image-');

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const getSpawnCoords = (blockWidth: number, blockHeight: number) => {
    const { widthMm, heightMm } = currentDimension;
    return {
      x: (widthMm / 2) - (blockWidth / 2),
      y: (heightMm / 2) - (blockHeight / 2)
    };
  };

  const handleAddImage = () => {
    fileInputRef.current?.click();
  };

  const onImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const { x, y } = getSpawnCoords(40, 40);
      addImageBlock({
        url,
        x,
        y,
        width: 40,
        height: 40,
        isPrintable: true
      });
      e.target.value = '';
    }
  };

  return (
    <aside className="w-full lg:w-[340px] lg:shrink-0 border-r bg-white flex flex-col h-full min-h-0 shadow-xl z-20 overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">

        <div className="mb-2 space-y-2">
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            onChange={onImageFileChange} 
            className="hidden" 
          />
          <button
            onClick={handleAddImage}
            className="w-full flex items-center justify-center gap-2 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl hover:bg-emerald-100 font-black text-[13px] transition-all active:scale-95 shadow-sm"
          >
            <ImageIcon size={18} /> {D.addImageLayer}
          </button>
        </div>

        {/* Paper Format Section */}
        <div className="border border-slate-100 rounded-[2rem] overflow-hidden bg-white shadow-sm">
          <button
            onClick={() => toggleSection('format')}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Maximize size={18} className="text-slate-400" />
              <span className="text-sm font-black text-slate-700">{D.paperFormatTitle}</span>
            </div>
            <div className={`transition-transform duration-300 ${expandedSections.includes('format') ? 'rotate-180' : ''}`}>
              <ArrowDown size={14} className="text-slate-400" />
            </div>
          </button>

          {expandedSections.includes('format') && (
            <div className="px-6 pb-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest ml-1">{D.paperSizeLabel}</label>
                <select
                  value={selectedPresetId || ''}
                  onChange={(e) => {
                    const preset = PAPER_PRESETS.find(p => p.id === e.target.value);
                    if (preset) {
                      setDimension({ widthMm: preset.widthMm, heightMm: preset.heightMm }, preset.id);
                    }
                  }}
                  className="w-full p-3.5 bg-slate-50 border-none rounded-2xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {PAPER_PRESETS.map(p => (
                    <option key={p.id} value={p.id}>{paperPresetLabel(p.id, p.label)}</option>
                  ))}
                </select>
              </div>

            </div>
          )}
        </div>

        {/* Branding Form Section */}
        <div className="border border-slate-100 rounded-[2rem] overflow-hidden bg-white shadow-sm">
          <button
            onClick={() => toggleSection('branding')}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Store size={18} className="text-indigo-500" />
              <span className="text-sm font-black text-slate-700">상점 브랜딩 설정</span>
            </div>
            <div className={`transition-transform duration-300 ${expandedSections.includes('branding') ? 'rotate-180' : ''}`}>
              <ArrowDown size={14} className="text-slate-400" />
            </div>
          </button>

          {expandedSections.includes('branding') && (
            <div className="px-6 pb-6 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="text-xs font-bold text-slate-500 mb-2 border-b border-slate-100 pb-2 flex justify-between items-center">
                <span>출력할 정보를 선택하세요</span>
              </div>
              
              <div className="mb-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">브랜드 텍스트 폰트</label>
                <select
                  value={brandingTextInfo.fontFamily || 'Pretendard'}
                  onChange={(e) => updateBrandingTextInfo({ fontFamily: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-100 outline-none"
                  style={{ fontFamily: brandingTextInfo.fontFamily || 'Pretendard' }}
                >
                  {activeFonts.map(font => (
                    <option key={font.family} value={font.family} style={{ fontFamily: font.family }}>
                      {font.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">브랜드 텍스트 위치</label>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-colors ${brandingTextInfo.position === 'center' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
                    onClick={() => updateBrandingTextInfo({ position: 'center' })}
                  >
                    중앙 정렬
                  </button>
                  <button
                    className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-colors ${brandingTextInfo.position !== 'center' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
                    onClick={() => updateBrandingTextInfo({ position: 'bottom' })}
                  >
                    하단 정렬
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
                <span className="text-[11px] font-black text-slate-600">로고 이미지</span>
                <button
                  onClick={() => {
                    updateBrandingTextInfo({ logoUrl: brandingTextInfo.logoUrl ? '' : (shopSettings.logoUrl || '') });
                  }}
                  className={`w-8 h-4 rounded-full transition-colors relative ${brandingTextInfo.logoUrl ? 'bg-indigo-600' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${brandingTextInfo.logoUrl ? 'left-4.5' : 'left-0.5'}`} style={{ left: brandingTextInfo.logoUrl ? '18px' : '2px' }} />
                </button>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
                <span className="text-[11px] font-black text-slate-600">상호명</span>
                <button
                  onClick={() => {
                    updateBrandingTextInfo({ shopName: brandingTextInfo.shopName ? '' : (shopSettings.name || '') });
                  }}
                  className={`w-8 h-4 rounded-full transition-colors relative ${brandingTextInfo.shopName ? 'bg-indigo-600' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all`} style={{ left: brandingTextInfo.shopName ? '18px' : '2px' }} />
                </button>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
                <span className="text-[11px] font-black text-slate-600">연락처</span>
                <button
                  onClick={() => {
                    updateBrandingTextInfo({ contact: brandingTextInfo.contact ? '' : (shopSettings.tel || '') });
                  }}
                  className={`w-8 h-4 rounded-full transition-colors relative ${brandingTextInfo.contact ? 'bg-indigo-600' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all`} style={{ left: brandingTextInfo.contact ? '18px' : '2px' }} />
                </button>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
                <span className="text-[11px] font-black text-slate-600">주소</span>
                <button
                  onClick={() => {
                    updateBrandingTextInfo({ address: brandingTextInfo.address ? '' : (shopSettings.address || '') });
                  }}
                  className={`w-8 h-4 rounded-full transition-colors relative ${brandingTextInfo.address ? 'bg-indigo-600' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all`} style={{ left: brandingTextInfo.address ? '18px' : '2px' }} />
                </button>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">홈페이지 / 추가 문구</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={brandingTextInfo.message}
                    onChange={(e) => updateBrandingTextInfo({ message: e.target.value })}
                    placeholder="예: www.flora.com"
                    className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-100 outline-none"
                  />
                  <button
                    onClick={() => updateBrandingTextInfo({ message: brandingTextInfo.message ? '' : 'www.' })}
                    className={`shrink-0 w-8 h-4 rounded-full transition-colors relative ${brandingTextInfo.message ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all`} style={{ left: brandingTextInfo.message ? '18px' : '2px' }} />
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Properties Editor (Image Only) */}
        <div className={`border border-slate-100 rounded-[2.5rem] overflow-hidden bg-white shadow-xl transition-all duration-500 ${selectedBlockId ? 'ring-4 ring-indigo-50 border-indigo-200' : ''}`}>
          <button
            onClick={() => toggleSection('properties')}
            className="w-full flex items-center justify-between px-6 py-5 bg-white hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Settings size={18} className={selectedBlockId ? 'text-indigo-600 animate-spin-slow' : 'text-slate-400'} />
              <span className="text-sm font-black text-slate-700">{D.propertyPanelTitle}</span>
            </div>
            <div className={`transition-transform duration-300 ${expandedSections.includes('properties') ? 'rotate-180' : ''}`}>
              <ArrowDown size={14} className="text-slate-400" />
            </div>
          </button>

          {expandedSections.includes('properties') && (
            <div className="px-6 pb-6 animate-in fade-in slide-in-from-top-2 duration-300">
              {!selectedBlock || !isImageBlock ? (
                <div className="p-10 bg-slate-50/50 rounded-[2rem] text-center border border-dashed border-slate-200">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <Search size={20} className="text-slate-300" />
                  </div>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{D.selectElementHint}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{D.imageUploadLabel}</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const url = URL.createObjectURL(file);
                            updateImageBlockContent(selectedBlock.id, { url });
                          }
                        }}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200"
                      />
                    </div>

                    {onOpenPhotoEditor && (
                      <button
                        onClick={onOpenPhotoEditor}
                        className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-sm shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3"
                      >
                        <Settings size={20} className={isGenerating ? 'animate-spin-slow' : ''} />
                        {D.magicPhotoEditor}
                      </button>
                    )}

                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                        <span>{D.propOpacityLayer}</span>
                      </div>
                      <input
                        type="range" min="0" max="1" step="0.01" value={(selectedBlock as any).opacity ?? 1}
                        onChange={(e) => updateImageBlockContent(selectedBlock.id, { opacity: parseFloat(e.target.value) })}
                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => removeImageBlock(selectedBlock.id)}
                    className="w-full py-4 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-100 active:scale-95 transition-all text-xs font-black border border-rose-100 flex items-center justify-center gap-2"
                  >
                    <X size={14} strokeWidth={3} /> {D.deleteSelected}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={() => useEditorStore.getState().saveDesign()}
            className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-black shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            {D.designSaveSidebar}
          </button>
          <button 
            onClick={() => (window as any).dispatchEvent(new CustomEvent('request-print'))}
            className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
          >
             📥 {D.pdfPrint}
          </button>
        </div>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{D.engineReady}</span>
          </div>
          <span className="text-[10px] font-black text-slate-300">{D.engineVersionLabel}</span>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .animate-spin-slow { animation: spin 10s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </aside>
  );
};
