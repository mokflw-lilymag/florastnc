'use client';

import React, { useState } from 'react';
import { 
  Type, Image as ImageIcon, Sparkles, Grid, Maximize, ArrowDown, 
  MessageSquareText, User, Settings, Search, AlignLeft, AlignCenter, 
  AlignRight, ArrowUp, X, Store, Phone, MapPin, Camera, Wand2, Globe
} from 'lucide-react';
import { useEditorStore } from '@/stores/design-store';
import { PAPER_PRESETS } from '@/lib/constants/templates';

interface DesignSidebarProps {
  onOpenGallery: () => void;
  onOpenAIWizard: () => void;
  onOpenAIFontWizard: () => void;
  onOpenSuggestion: (type: 'quote' | 'message') => void;
  onOpenShopSettings: () => void;
  onOpenPhotoEditor: () => void;
}

export const DesignSidebar: React.FC<DesignSidebarProps> = ({
  onOpenGallery,
  onOpenAIWizard,
  onOpenAIFontWizard,
  onOpenSuggestion,
  onOpenShopSettings,
  onOpenPhotoEditor
}) => {
  const {
    currentDimension,
    selectedPresetId,
    setDimension,
    orientation,
    setOrientation,
    foldType,
    setFoldType,
    showFoldingGuide,
    toggleFoldingGuide,
    activePage,
    recipientName,
    setRecipientName,
    senderName,
    setSenderName,
    showToField,
    setShowToField,
    showFromField,
    setShowFromField,
    selectedBlockId,
    textBlocks,
    imageBlocks,
    updateTextBlockContent,
    removeTextBlock,
    updateImageBlockContent,
    removeImageBlock,
    shopSettings,
    applyShopBranding,
    addTextBlock,
    addImageBlock
  } = useEditorStore();

  const [brandingOptions, setBrandingOptions] = useState({
    logo: true,
    name: true,
    tel: true,
    website: true
  });

  const [expandedSections, setExpandedSections] = useState<string[]>(['tools', 'properties']);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  const selectedBlock = [...textBlocks, ...imageBlocks].find(b => b.id === selectedBlockId);
  const isTextBlock = selectedBlockId?.startsWith('text-');
  const isImageBlock = selectedBlockId?.startsWith('image-');

  const handleAddText = () => {
    addTextBlock({
      text: '새 텍스트',
      x: currentDimension.widthMm / 2,
      y: currentDimension.heightMm / 2,
      fontSize: 20,
      colorHex: '#000000',
      fontFamily: "'Bagel Fat One', cursive",
      textAlign: 'center'
    });
  };

  const handleAddImage = () => {
    addImageBlock({
      url: null,
      x: currentDimension.widthMm / 4,
      y: currentDimension.heightMm / 4,
      width: 50,
      height: 50,
      isPrintable: true
    });
  };

  return (
    <aside className="w-[340px] border-r bg-white flex flex-col h-full shadow-xl z-20 overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
        
        {/* Quick Tools */}
        <div className="grid grid-cols-2 gap-3 mb-2">
           <button 
             onClick={onOpenPhotoEditor}
             className="flex flex-col items-center justify-center p-4 bg-rose-50 border border-rose-100 rounded-[2rem] hover:border-rose-400 hover:bg-rose-100 transition-all group active:scale-95 shadow-sm"
           >
             <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-2 group-hover:scale-110 transition-transform">
                <Camera size={20} className="text-rose-600" />
             </div>
             <span className="text-[11px] font-black text-slate-700">매직 스튜지오</span>
           </button>
           <button 
             onClick={onOpenAIFontWizard}
             className="flex flex-col items-center justify-center p-4 bg-amber-50 border border-amber-100 rounded-[2rem] hover:border-amber-400 hover:bg-amber-100 transition-all group active:scale-95 shadow-sm"
           >
             <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-2 group-hover:scale-110 transition-transform">
                <Wand2 size={20} className="text-amber-600" />
             </div>
             <span className="text-[11px] font-black text-slate-700">AI 폰트 마법사</span>
           </button>
        </div>

        {/* AI & Gallery Hero Section */}
        <div className="space-y-3 mb-6">
           <button 
             onClick={onOpenAIWizard}
             className="w-full relative overflow-hidden group p-6 bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-600 text-white rounded-[2.5rem] shadow-lg shadow-indigo-100 transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-4"
           >
             <div className="relative z-10 p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner group-hover:rotate-12 transition-transform">
                <Sparkles size={24} className="animate-pulse" />
             </div>
             <div className="text-left relative z-10">
                <p className="text-lg font-black tracking-tight leading-none">AI 스마트 디자인</p>
                <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-1">Premium AI Artwork</p>
             </div>
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-1000" />
           </button>

           <button 
             onClick={onOpenGallery}
             className="w-full flex items-center gap-4 px-6 py-5 bg-white border-2 border-slate-100 text-slate-700 rounded-[2.5rem] hover:border-indigo-400 hover:text-indigo-600 transition-all font-black text-sm active:scale-95 shadow-sm group"
           >
             <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                <Grid size={18} className="text-slate-400 group-hover:text-indigo-600" />
             </div>
             <span>디자인 템플릿 보관함</span>
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
              <span className="text-sm font-black text-slate-700">용지 규격 및 방향</span>
            </div>
            <div className={`transition-transform duration-300 ${expandedSections.includes('format') ? 'rotate-180' : ''}`}>
              <ArrowDown size={14} className="text-slate-400" />
            </div>
          </button>

          {expandedSections.includes('format') && (
            <div className="px-6 pb-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest ml-1">PAPER SIZE</label>
                 <select 
                   value={selectedPresetId}
                   onChange={(e) => {
                     const preset = PAPER_PRESETS.find(p => p.id === e.target.value);
                     if (preset) {
                       const isPortrait = orientation === 'portrait';
                       const [w, h] = isPortrait 
                         ? [Math.min(preset.widthMm, preset.heightMm), Math.max(preset.widthMm, preset.heightMm)]
                         : [Math.max(preset.widthMm, preset.heightMm), Math.min(preset.widthMm, preset.heightMm)];
                       setDimension({ widthMm: w, heightMm: h }, preset.id);
                     }
                   }}
                   className="w-full p-3.5 bg-slate-50 border-none rounded-2xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                 >
                   <optgroup label="카드 규격">
                     {PAPER_PRESETS.filter(p => p.group === '용지 규격').map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                   </optgroup>
                   <optgroup label="폼텍 라벨">
                     {PAPER_PRESETS.filter(p => p.group === '폼텍 라벨').map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                   </optgroup>
                 </select>
               </div>

               <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setOrientation('landscape')}
                    className={`py-3 rounded-2xl text-[11px] font-black transition-all border-2 ${orientation === 'landscape' ? 'bg-indigo-50 border-indigo-600 text-indigo-700' : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100'}`}
                  >
                    가로형 (Landscape)
                  </button>
                  <button 
                    onClick={() => setOrientation('portrait')}
                    className={`py-3 rounded-2xl text-[11px] font-black transition-all border-2 ${orientation === 'portrait' ? 'bg-indigo-50 border-indigo-600 text-indigo-700' : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100'}`}
                  >
                    세로형 (Portrait)
                  </button>
               </div>

               <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setFoldType('none')}
                    className={`py-3 rounded-2xl text-[11px] font-black transition-all border-2 ${foldType === 'none' ? 'bg-indigo-50 border-indigo-600 text-indigo-700' : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100'}`}
                  >
                    단면 (Flat)
                  </button>
                  <button 
                    disabled={selectedPresetId.startsWith('formtec-')}
                    onClick={() => setFoldType('half')}
                    className={`py-3 rounded-2xl text-[11px] font-black transition-all border-2 disabled:opacity-30 ${foldType === 'half' ? 'bg-indigo-50 border-indigo-600 text-indigo-700' : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100'}`}
                  >
                    접이 (Folding)
                  </button>
               </div>

               {foldType === 'half' && (
                  <div className="flex items-center justify-between p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                    <span className="text-[11px] font-black text-indigo-700">접지 가이드라인 표시</span>
                    <button 
                      onClick={toggleFoldingGuide}
                      className={`w-10 h-5 rounded-full transition-colors relative ${showFoldingGuide ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${showFoldingGuide ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
               )}
            </div>
          )}
        </div>

        {/* Suggestion Tools */}
        <div className="grid grid-cols-1 gap-3">
           <button 
             onClick={() => onOpenSuggestion('message')}
             className="w-full flex items-center gap-4 p-5 bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-[2rem] hover:shadow-lg hover:border-blue-400 transition-all group"
           >
             <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <MessageSquareText size={20} />
             </div>
             <div className="text-left">
                <p className="text-sm font-black text-slate-800">추천 메시지 찾기</p>
                <p className="text-[10px] text-slate-400 font-bold tracking-tight">감동, 축하, 사랑 테마 문구</p>
             </div>
           </button>

           <button 
             onClick={() => onOpenSuggestion('quote')}
             className="w-full flex items-center gap-4 p-5 bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-[2rem] hover:shadow-lg hover:border-indigo-400 transition-all group"
           >
             <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Sparkles size={20} />
             </div>
             <div className="text-left">
                <p className="text-sm font-black text-slate-800">감석 명언 라이브러리</p>
                <p className="text-[10px] text-slate-400 font-bold tracking-tight">격언, 명대사, 시 구절</p>
             </div>
           </button>
        </div>

        {/* Recipient Settings (only if folding & inside) */}
        {activePage === 'inside' && foldType === 'half' && (
          <div className="border border-slate-100 rounded-[2rem] overflow-hidden bg-white shadow-sm">
             <button 
               onClick={() => toggleSection('inside')}
               className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
             >
               <div className="flex items-center gap-3">
                 <User size={18} className="text-emerald-500" />
                 <span className="text-sm font-black text-slate-700">수발신자 자동 배치</span>
               </div>
               <div className={`transition-transform duration-300 ${expandedSections.includes('inside') ? 'rotate-180' : ''}`}>
                 <ArrowDown size={14} className="text-slate-400" />
               </div>
             </button>

             {expandedSections.includes('inside') && (
               <div className="px-6 pb-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
                     <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">To. 수령인</span>
                           <button onClick={() => setShowToField(!showToField)} className={`w-8 h-4 rounded-full transition-all relative ${showToField ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${showToField ? 'left-4.5' : 'left-0.5'}`} />
                           </button>
                        </div>
                        {showToField && (
                           <input 
                             type="text" value={recipientName} onChange={(e) => setRecipientName(e.target.value)}
                             placeholder="받는 사람 이름" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-100 outline-none"
                           />
                        )}
                     </div>
                     <div className="space-y-2 pt-2 border-t border-slate-200/50">
                        <div className="flex justify-between items-center px-1">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">From. 발신인</span>
                           <button onClick={() => setShowFromField(!showFromField)} className={`w-8 h-4 rounded-full transition-all relative ${showFromField ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${showFromField ? 'left-4.5' : 'left-0.5'}`} />
                           </button>
                        </div>
                        {showFromField && (
                           <input 
                             type="text" value={senderName} onChange={(e) => setSenderName(e.target.value)}
                             placeholder="보내는 사람 이름" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-100 outline-none"
                           />
                        )}
                     </div>
                  </div>
               </div>
             )}
          </div>
        )}

        {/* Properties Editor */}
        <div className={`border border-slate-100 rounded-[2.5rem] overflow-hidden bg-white shadow-xl transition-all duration-500 ${selectedBlockId ? 'ring-4 ring-indigo-50 border-indigo-200' : ''}`}>
          <button 
            onClick={() => toggleSection('properties')}
            className="w-full flex items-center justify-between px-6 py-5 bg-white hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Settings size={18} className={selectedBlockId ? 'text-indigo-600 animate-spin-slow' : 'text-slate-400'} />
              <span className="text-sm font-black text-slate-700">선택 요소 속성 편집</span>
            </div>
            <div className={`transition-transform duration-300 ${expandedSections.includes('properties') ? 'rotate-180' : ''}`}>
              <ArrowDown size={14} className="text-slate-400" />
            </div>
          </button>

          {expandedSections.includes('properties') && (
            <div className="px-6 pb-6 animate-in fade-in slide-in-from-top-2 duration-300">
              {!selectedBlock ? (
                <div className="p-10 bg-slate-50/50 rounded-[2rem] text-center border border-dashed border-slate-200">
                   <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <Search size={20} className="text-slate-300" />
                   </div>
                   <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">편집할 요소를 선택하세요</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {isTextBlock ? (
                    <>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest ml-1">CONTENT</label>
                        <textarea 
                          value={(selectedBlock as any).text}
                          onChange={(e) => updateTextBlockContent(selectedBlock.id, { text: e.target.value })}
                          className="w-full p-5 bg-slate-50 border-none rounded-[2rem] text-sm font-bold text-slate-800 focus:bg-white focus:ring-4 focus:ring-indigo-50 shadow-inner min-h-[120px] outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">FONT SIZE</label>
                           <input 
                             type="number" step="0.5"
                             value={Number(((selectedBlock as any).fontSize || 14).toFixed(1))}
                             onChange={(e) => updateTextBlockContent(selectedBlock.id, { fontSize: Number(e.target.value) })}
                             className="w-full p-3.5 bg-slate-50 border-none rounded-2xl text-xs font-black focus:ring-4 focus:ring-indigo-50 outline-none"
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">TEXT COLOR</label>
                           <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-2xl">
                              <input 
                                type="color" value={(selectedBlock as any).colorHex || '#000000'}
                                onChange={(e) => updateTextBlockContent(selectedBlock.id, { colorHex: e.target.value })}
                                className="w-8 h-8 rounded-xl cursor-pointer border-none bg-transparent"
                              />
                              <span className="text-[10px] font-black text-slate-500 font-mono">{(selectedBlock as any).colorHex}</span>
                           </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">FONT FAMILY</label>
                        <select 
                          value={(selectedBlock as any).fontFamily || "sans-serif"}
                          onChange={(e) => updateTextBlockContent(selectedBlock.id, { fontFamily: e.target.value })}
                          className="w-full p-4 bg-slate-50 border-none rounded-2xl text-xs font-black focus:ring-4 focus:ring-indigo-50 outline-none"
                        >
                          <optgroup label="디자인 / 제목체 (Bold)">
                            <option value="'GmarketSansBold', sans-serif">G마켓 산스 (Premium) ⭐</option>
                            <option value="'Bagel Fat One', cursive">베이글팻원 (강력 추천)</option>
                            <option value="'Black Han Sans', sans-serif">블랙한산스 (강렬)</option>
                            <option value="'Do Hyeon', sans-serif">도현체</option>
                            <option value="'Jua', sans-serif">주아체</option>
                          </optgroup>
                          <optgroup label="명조 / 감성체 (Elegant)">
                            <option value="'JoseonPalace', serif">조선궁서체 (고급)</option>
                            <option value="'Gowun Batang', serif">고운바탕</option>
                            <option value="'Nanum Myeongjo', serif">나눔명조</option>
                            <option value="'Song Myung', serif">송명체</option>
                            <option value="'Yeon Sung', serif">연성체</option>
                          </optgroup>
                          <optgroup label="손글씨 / 캘리그라피 (Artistic)">
                            <option value="'Nanum Pen Script', cursive">나눔손글씨</option>
                            <option value="'Gaegu', cursive">개구체</option>
                            <option value="'Gamja Flower', cursive">감자꽃</option>
                            <option value="'Single Day', cursive">싱글데이</option>
                            <option value="'East Sea Dokdo', cursive">독도체</option>
                            <option value="'Poor Story', system-ui">푸레스토리</option>
                          </optgroup>
                          <optgroup label="기타 / 기본 (Common)">
                            <option value="'Noto Sans KR', sans-serif">노토산스 (기본)</option>
                            <option value="'Dongle', sans-serif">동글체</option>
                            <option value="'Gugi', cursive">구기체</option>
                          </optgroup>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pb-4 border-b border-slate-100">
                         <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">STROKE</label>
                            <input 
                              type="number" step="0.5" min="0" max="10"
                              value={(selectedBlock as any).strokeWidth || 0}
                              onChange={(e) => updateTextBlockContent(selectedBlock.id, { strokeWidth: Number(e.target.value) })}
                              className="w-full p-3 bg-slate-50 border-none rounded-xl text-xs font-black outline-none"
                            />
                         </div>
                         <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">COLOR</label>
                            <div className="flex items-center h-full gap-2 p-1.5 bg-slate-50 rounded-xl">
                               <input type="color" value={(selectedBlock as any).strokeColor || '#000000'} onChange={(e) => updateTextBlockContent(selectedBlock.id, { strokeColor: e.target.value })} className="w-8 h-full rounded-lg cursor-pointer" />
                            </div>
                         </div>
                      </div>

                      <div className="space-y-4">
                         <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                            <span>ALIGN & LAYER</span>
                            <div className="flex gap-1">
                               <button onClick={() => { const maxZ = Math.max(...textBlocks.map(b => b.zIndex || 0), ...imageBlocks.map(b => b.zIndex || 0), 0); updateTextBlockContent(selectedBlock.id, { zIndex: maxZ + 1 }); }} className="p-2 bg-slate-50 rounded-lg hover:bg-indigo-50 transition-colors"><ArrowUp size={12} /></button>
                               <button onClick={() => { const minZ = Math.min(...textBlocks.map(b => b.zIndex || 0), ...imageBlocks.map(b => b.zIndex || 0), 0); updateTextBlockContent(selectedBlock.id, { zIndex: Math.max(0, minZ - 1) }); }} className="p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors rotate-180"><ArrowUp size={12} /></button>
                            </div>
                         </div>
                         <div className="flex p-1.5 bg-slate-100 rounded-2xl">
                            <button onClick={() => updateTextBlockContent(selectedBlock.id, { textAlign: 'left' })} className={`flex-1 py-2 flex justify-center rounded-xl transition-all ${ (selectedBlock as any).textAlign === 'left' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400' }`}><AlignLeft size={16} /></button>
                            <button onClick={() => updateTextBlockContent(selectedBlock.id, { textAlign: 'center' })} className={`flex-1 py-2 flex justify-center rounded-xl transition-all ${ (selectedBlock as any).textAlign === 'center' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400' }`}><AlignCenter size={16} /></button>
                            <button onClick={() => updateTextBlockContent(selectedBlock.id, { textAlign: 'right' })} className={`flex-1 py-2 flex justify-center rounded-xl transition-all ${ (selectedBlock as any).textAlign === 'right' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400' }`}><AlignRight size={16} /></button>
                         </div>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-6">
                       <button 
                         onClick={onOpenPhotoEditor}
                         className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-sm shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3"
                       >
                         <Settings size={20} className={onOpenPhotoEditor ? 'animate-spin-slow' : ''} />
                         마법의 주문 사진 편집기
                       </button>

                       <div className="space-y-4">
                          <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                             <span>OPACITY & LAYER</span>
                          </div>
                          <input 
                            type="range" min="0" max="1" step="0.01" value={(selectedBlock as any).opacity ?? 1}
                            onChange={(e) => updateImageBlockContent(selectedBlock.id, { opacity: parseFloat(e.target.value) })}
                            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          />
                       </div>
                    </div>
                  )}

                  <button 
                    onClick={() => {
                       if (isTextBlock) removeTextBlock(selectedBlock.id);
                       else removeImageBlock(selectedBlock.id);
                    }}
                    className="w-full py-4 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-100 active:scale-95 transition-all text-xs font-black border border-rose-100 flex items-center justify-center gap-2"
                  >
                    <X size={14} strokeWidth={3} /> 선택 요소 삭제
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Shop Branding Section */}
        <div className="border border-slate-100 rounded-[2rem] overflow-hidden bg-white shadow-sm">
           <button 
             onClick={() => toggleSection('branding')}
             className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
           >
             <div className="flex items-center gap-3">
               <Store size={18} className="text-indigo-500" />
               <span className="text-sm font-black text-slate-700">상점 브랜딩 자동 배치</span>
             </div>
             <div className={`transition-transform duration-300 ${expandedSections.includes('branding') ? 'rotate-180' : ''}`}>
               <ArrowDown size={14} className="text-slate-400" />
             </div>
           </button>

           {expandedSections.includes('branding') && (
              <div className="px-6 pb-6 space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
                 <div className="p-5 bg-slate-50/50 rounded-[2rem] border border-slate-100/50 flex flex-col items-center gap-4 text-center">
                    <div className="w-16 h-16 bg-white rounded-2xl border border-slate-100 flex items-center justify-center overflow-hidden shadow-sm">
                       {shopSettings.logoUrl ? <img src={shopSettings.logoUrl} className="w-full h-full object-contain p-2" /> : <ImageIcon size={24} className="text-slate-100" />}
                    </div>
                    <div>
                       <p className="text-sm font-black text-slate-800">{shopSettings.name || '상점 정보 없음'}</p>
                       <button onClick={onOpenShopSettings} className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1 hover:underline">프로필 설정 수정</button>
                    </div>
                 </div>

                 <div className="space-y-2 px-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">포함할 항목 선택</label>
                    <div className="grid grid-cols-2 gap-2">
                       {[
                         { id: 'logo', label: '로고', icon: <ImageIcon size={12} /> },
                         { id: 'name', label: '상호명', icon: <Type size={12} /> },
                         { id: 'tel', label: '연락처', icon: <Phone size={12} /> },
                         { id: 'website', label: '홈페이지', icon: <Globe size={12} /> }
                       ].map((opt) => (
                         <button
                           key={opt.id}
                           onClick={() => setBrandingOptions(prev => ({ ...prev, [opt.id]: !prev[opt.id as keyof typeof prev] }))}
                           className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all text-[11px] font-bold ${
                             brandingOptions[opt.id as keyof typeof brandingOptions] 
                               ? 'bg-white border-indigo-200 text-indigo-700 shadow-sm' 
                               : 'bg-slate-50 border-transparent text-slate-400'
                           }`}
                         >
                            <div className={`p-1 rounded-md ${brandingOptions[opt.id as keyof typeof brandingOptions] ? 'bg-indigo-50' : 'bg-slate-100'}`}>
                               {opt.icon}
                            </div>
                            {opt.label}
                         </button>
                       ))}
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-3 pt-2">
                    <button 
                      onClick={() => applyShopBranding('front', brandingOptions)}
                      className="py-4 bg-indigo-50 text-indigo-700 rounded-2xl text-[11px] font-black border border-indigo-100/50 hover:bg-indigo-100 transition-all flex flex-col items-center"
                    >
                      <span>앞면에 배치</span>
                      <span className="text-[8px] font-normal opacity-50">(Cover)</span>
                    </button>
                    <button 
                      onClick={() => applyShopBranding('back', brandingOptions)}
                      className="py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black shadow-xl hover:bg-black transition-all flex flex-col items-center"
                    >
                      <span>뒷면에 배치</span>
                      <span className="text-[8px] font-normal opacity-50">(Back)</span>
                    </button>
                 </div>
              </div>
            )}
        </div>

      </div>

      <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
         <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Engine Ready</span>
         </div>
         <span className="text-[10px] font-black text-slate-300">v4.0 Professional Card Studio</span>
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
