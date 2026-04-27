import { useState, useEffect, useRef } from 'react';
import { X, Upload, Plus, Trash2, Globe, FileText, Check, Settings } from 'lucide-react';
import { type CustomFontInfo, saveCustomFontToDB, getAllCustomFonts, deleteCustomFontFromDB, getHiddenFonts, setHiddenFonts } from './lib/font-store';
import type { FontItem } from './App';
import { usePreferredLocale } from '@/hooks/use-preferred-locale';
import { getMessages } from '@/i18n/getMessages';

function fillRibbonTemplate(template: string, vars: Record<string, string | number>): string {
  let s = template;
  for (const [key, val] of Object.entries(vars)) {
    s = s.split(`{{${key}}}`).join(String(val));
  }
  return s;
}

interface FontManagerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  baseFonts: FontItem[];
  onSettingsChanged: () => void;
}

export function FontManagerDialog({ isOpen, onClose, baseFonts, onSettingsChanged }: FontManagerDialogProps) {
  const locale = usePreferredLocale();
  const R = getMessages(locale).dashboard.ribbon;
  const [tab, setTab] = useState<'list' | 'add-system' | 'add-custom'>('list');
  const [customFonts, setCustomFonts] = useState<CustomFontInfo[]>([]);
  const [hiddenFonts, setHiddenState] = useState<string[]>([]);
  
  const [addType, setAddType] = useState<'local' | 'web'>('local');
  const [fontName, setFontName] = useState('');
  const [fontFamily, setFontFamily] = useState('');
  const [webUrl, setWebUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [systemFonts, setSystemFonts] = useState<any[]>([]);
  const [selectedSystemFullName, setSelectedSystemFullName] = useState<string>('');
  const [fontSearchTerm, setFontSearchTerm] = useState<string>('');
  const [isRequestingFonts, setIsRequestingFonts] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadFonts();
    }
  }, [isOpen]);

  const loadFonts = async () => {
    try {
      const custom = await getAllCustomFonts();
      setCustomFonts(custom);
      setHiddenState(getHiddenFonts());
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleHide = (fontId: string) => {
    const newHidden = hiddenFonts.includes(fontId) 
      ? hiddenFonts.filter(id => id !== fontId)
      : [...hiddenFonts, fontId];
    setHiddenState(newHidden);
    setHiddenFonts(newHidden);
    onSettingsChanged();
  };

  const handleDeleteCustom = async (id: string) => {
    if (confirm(R.fontConfirmDelete)) {
      await deleteCustomFontFromDB(id);
      await loadFonts();
      onSettingsChanged();
    }
  };

  const handleAddSystemFont = async () => {
    if (!selectedSystemFullName) return;
    // selectedSystemFullName은 이제 파일명(filename)을 담고 있음
    const fontInfo = systemFonts.find((f: any) => f.filename === selectedSystemFullName);
    if (!fontInfo) return;
    try {
      // Vite 개발서버에서 폰트 파일 직접 다운로드 (Node.js)
      const res = await fetch(`/api/local-fonts/file/${encodeURIComponent(fontInfo.filename)}`);
      if (!res.ok) throw new Error(fillRibbonTemplate(R.fontErrDownload, { status: res.status }));
      const blob = await res.blob();
      
      const id = `font-custom-${Date.now()}`;
      const displayName = fontName || fontInfo.name;
      const newFont: CustomFontInfo = {
        id,
        name: displayName,
        source: 'local',
        blob: blob,
        fontFamily: displayName
      };
      await saveCustomFontToDB(newFont);
      setFontName('');
      setSelectedSystemFullName('');
      setFontSearchTerm('');
      setSystemFonts([]);
      setTab('list');
      await loadFonts();
      onSettingsChanged();
      alert(fillRibbonTemplate(R.fontMgrSystemAdded, { name: displayName }));
    } catch (e: any) {
      alert(fillRibbonTemplate(R.fontMgrAddError, { msg: e.message ?? String(e) }));
    }
  };

  const handleAddFont = async () => {
    if (!fontName) {
      alert(R.fontMgrEnterName);
      return;
    }
    
    const id = `font-custom-${Date.now()}`;
    const newFont: CustomFontInfo = {
      id,
      name: fontName,
      source: addType,
    };

    if (addType === 'local') {
      if (!selectedFile) {
        alert(R.fontMgrPickFile);
        return;
      }
      newFont.blob = selectedFile;
      newFont.fontFamily = fontName; 
    } else {
      if (!webUrl || !fontFamily) {
        alert(R.fontMgrWebFields);
        return;
      }
      // 보안 및 제한 정책 적용
      const webFontCount = customFonts.filter(f => f.source === 'web').length;
      if (webFontCount >= 5) {
        alert(R.fontMgrWebLimit);
        return;
      }
      
      const isValidWebFontUrl = webUrl.startsWith('https://') && 
        (webUrl.includes('fonts.googleapis.com') || 
         webUrl.includes('cdn') || 
         webUrl.endsWith('.css') || 
         webUrl.endsWith('.woff') || 
         webUrl.endsWith('.woff2') || 
         webUrl.endsWith('.ttf'));

      if (!isValidWebFontUrl) {
        alert(R.fontMgrWebInvalid);
        return;
      }

      newFont.webUrl = webUrl;
      newFont.fontFamily = fontFamily;
    }

    try {
      await saveCustomFontToDB(newFont);
      setFontName('');
      setFontFamily('');
      setWebUrl('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTab('list');
      await loadFonts();
      onSettingsChanged();
      alert(R.fontMgrCustomOk);
    } catch (e) {
      alert(R.fontMgrSaveErr);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-400" />
            {R.fontMgrTitle}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/50">
          <button 
            onClick={() => setTab('list')}
            className={`flex-1 py-3 text-xs sm:text-sm font-medium transition-colors ${tab === 'list' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-slate-300'}`}
          >
            {R.fontMgrTabList}
          </button>
          <button 
            onClick={() => setTab('add-system')}
            className={`flex-1 py-3 text-xs sm:text-sm font-medium transition-colors ${tab === 'add-system' ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/10' : 'text-slate-400 hover:text-slate-300'}`}
          >
            {R.fontMgrTabSystem}
          </button>
          <button 
            onClick={() => setTab('add-custom')}
            className={`flex-1 py-3 text-xs sm:text-sm font-medium transition-colors ${tab === 'add-custom' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-slate-300'}`}
          >
            {R.fontMgrTabOther}
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto w-full">
          {tab === 'list' ? (
            <div className="space-y-6">
              <div className="bg-slate-800/50 rounded-lg p-4 mb-4 text-sm text-slate-300">{R.fontMgrListHint}</div>

              {customFonts.filter(f => f.source === 'local').length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 mb-3 ml-1 uppercase tracking-wider">{R.fontMgrSecLocalAdded}</h3>
                  <div className="space-y-2">
                    {customFonts.filter(f => f.source === 'local').map(font => {
                      const isHidden = hiddenFonts.includes(font.id);
                      return (
                        <div key={font.id} className={`flex w-full items-center justify-between p-3 rounded-lg border ${isHidden ? 'bg-slate-900/50 border-slate-800 text-slate-500' : 'bg-slate-800 border-slate-700 text-slate-200'}`}>
                          <div className="flex items-center gap-3">
                            <button onClick={() => handleToggleHide(font.id)} className={`w-5 h-5 rounded flex shrink-0 items-center justify-center border ${isHidden ? 'border-slate-600' : 'bg-blue-500 border-blue-500'}`}>
                              {!isHidden && <Check className="w-3.5 h-3.5 text-white" />}
                            </button>
                            <div className="truncate pr-2">
                               <div className="font-semibold truncate max-w-[250px] sm:w-[300px]">{font.name}</div>
                               <div className="text-xs opacity-70 flex items-center gap-1 mt-0.5">
                                 <FileText className="w-3 h-3"/> {R.fontMgrBadgeLocalFile}
                               </div>
                            </div>
                          </div>
                          <button onClick={() => handleDeleteCustom(font.id)} className="p-2 text-rose-400 hover:bg-rose-400/10 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {customFonts.filter(f => f.source === 'web').length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-slate-400 mb-3 ml-1 uppercase tracking-wider">{R.fontMgrSecWebAdded}</h3>
                  <div className="space-y-2">
                    {customFonts.filter(f => f.source === 'web').map(font => {
                      const isHidden = hiddenFonts.includes(font.id);
                      return (
                        <div key={font.id} className={`flex w-full items-center justify-between p-3 rounded-lg border ${isHidden ? 'bg-slate-900/50 border-slate-800 text-slate-500' : 'bg-slate-800 border-slate-700 text-slate-200'}`}>
                          <div className="flex items-center gap-3">
                            <button onClick={() => handleToggleHide(font.id)} className={`w-5 h-5 rounded flex shrink-0 items-center justify-center border ${isHidden ? 'border-slate-600' : 'bg-blue-500 border-blue-500'}`}>
                              {!isHidden && <Check className="w-3.5 h-3.5 text-white" />}
                            </button>
                            <div className="truncate pr-2">
                               <div className="font-semibold truncate max-w-[250px] sm:w-[300px]">{font.name}</div>
                               <div className="text-xs opacity-70 flex items-center gap-1 mt-0.5">
                                 <Globe className="w-3 h-3"/> {R.fontMgrBadgeWebCss}
                               </div>
                            </div>
                          </div>
                          <button onClick={() => handleDeleteCustom(font.id)} className="p-2 text-rose-400 hover:bg-rose-400/10 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-slate-400 mb-3 mt-6 ml-1 uppercase tracking-wider">{R.fontMgrSecBuiltin}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {baseFonts.map(font => {
                    const isHidden = hiddenFonts.includes(font.value);
                    return (
                      <button 
                        key={font.value}
                        onClick={() => handleToggleHide(font.value)}
                        className={`flex w-full items-center gap-3 p-3 rounded-lg border transition-all text-left ${isHidden ? 'bg-slate-900/50 border-slate-800 text-slate-500' : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'}`}
                      >
                         <div className={`w-5 h-5 rounded flex shrink-0 items-center justify-center border ${isHidden ? 'border-slate-600' : 'bg-blue-500 border-blue-500'}`}>
                            {!isHidden && <Check className="w-3.5 h-3.5 text-white" />}
                         </div>
                         <div className="truncate">
                           <span className={`block font-semibold ${!isHidden ? font.value : ''}`}>{font.name}</span>
                         </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : tab === 'add-system' ? (
             <div className="space-y-6">
               <div className="p-3 bg-amber-900/20 border border-amber-500/30 rounded-lg">
                 <p className="text-xs text-amber-300/90 leading-relaxed">{R.fontMgrCopyright}</p>
               </div>
               <div className="bg-slate-800/30 border border-slate-700/50 p-6 rounded-xl space-y-4">
                 <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-300 mb-1">{R.fontLblDisplayNameOpt}</label>
                    <input 
                      type="text" 
                      value={fontName}
                      onChange={e => setFontName(e.target.value)}
                      placeholder={R.fontPhDisplayNameOpt}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white outline-none focus:border-blue-500"
                    />
                 </div>
                 
                 {systemFonts.length === 0 ? (
                   <button 
                     onClick={async () => {
                       try {
                         setIsRequestingFonts(true);
                         // Vite 개발서버가 직접 C:\Windows\Fonts 를 읽어줌 (Node.js)
                         const res = await fetch('/api/local-fonts');
                         if (!res.ok) throw new Error(`HTTP ${res.status}`);
                         const data = await res.json();
                         if (data.status !== 'success' || !data.fonts || data.fonts.length === 0) {
                           alert(R.fontErrNoFonts);
                           return;
                         }
                         setSystemFonts(data.fonts);
                       } catch (e: any) {
                         console.error("Font API error:", e);
                         alert(fillRibbonTemplate(R.fontErrListLoad, { msg: e.message ?? String(e) }));
                       } finally {
                         setIsRequestingFonts(false);
                       }
                     }}
                     disabled={isRequestingFonts}
                     className={`w-full text-white font-medium py-4 rounded-xl transition-colors flex justify-center items-center gap-2 shadow-lg text-lg ${isRequestingFonts ? 'bg-slate-700 cursor-wait' : 'bg-blue-600 hover:bg-blue-500'}`}
                   >
                      <Settings className={`w-6 h-6 ${isRequestingFonts ? 'animate-spin opacity-50' : ''}`} /> 
                      {isRequestingFonts ? R.fontMgrLoadingWinFonts : R.fontMgrLoadWinFonts}
                   </button>
                 ) : (
                   <div className="space-y-4 p-4 bg-slate-900/50 rounded-lg border border-slate-800">
                      <div>
                        <label className="block text-sm font-semibold text-blue-400 mb-2">
                          {fillRibbonTemplate(R.fontLblSearchFonts, { count: systemFonts.length })}
                        </label>
                        <input 
                          type="text"
                          placeholder={R.fontPhFontSearch}
                          value={fontSearchTerm}
                          onChange={e => setFontSearchTerm(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500 placeholder-slate-500 mb-2"
                        />
                        <select 
                          value={selectedSystemFullName}
                          onChange={e => setSelectedSystemFullName(e.target.value)}
                          className="w-full bg-slate-800 border-slate-600 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500 overflow-hidden text-base"
                        >
                          <option value="">{R.fontOptSelectFont}</option>
                          {systemFonts
                            .filter((f: any) => f.name.toLowerCase().includes(fontSearchTerm.toLowerCase()) || f.filename.toLowerCase().includes(fontSearchTerm.toLowerCase()))
                            .map((f: any, i: number) => (
                            <option key={i} value={f.filename}>{f.name} ({f.extension}, {f.size_kb}KB)</option>
                          ))}
                        </select>
                      </div>
                      
                      <button 
                        onClick={handleAddSystemFont}
                        disabled={!selectedSystemFullName}
                        className={`w-full font-medium py-3.5 rounded-lg transition-colors flex justify-center items-center gap-2 text-base ${selectedSystemFullName ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
                      >
                         <Plus className="w-5 h-5" />{' '}
                         {selectedSystemFullName
                           ? fillRibbonTemplate(R.fontBtnAddList, { name: fontName || selectedSystemFullName })
                           : R.fontBtnPickFirst}
                      </button>
                      
                      <p className="text-xs text-slate-500 text-center mt-2">{R.fontNoteMobileSync}</p>
                   </div>
                 )}
               </div>
             </div>
          ) : (
             <div className="space-y-6">
               <div className="p-3 bg-amber-900/20 border border-amber-500/30 rounded-lg">
                 <p className="text-xs text-amber-300/90 leading-relaxed">{R.fontMgrCopyright}</p>
               </div>
               <div className="flex gap-4 p-1 bg-slate-800 rounded-lg">
                  <button onClick={() => setAddType('local')} className={`flex-1 py-2 text-sm rounded-md font-medium flex items-center justify-center gap-2 transition-all ${addType === 'local' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                     <Upload className="w-4 h-4" /> {R.fontTabLocalFile}
                  </button>
                  <button onClick={() => setAddType('web')} className={`flex-1 py-2 text-sm rounded-md font-medium flex items-center justify-center gap-2 transition-all ${addType === 'web' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                     <Globe className="w-4 h-4" /> {R.fontTabWebUrl}
                  </button>
               </div>

               <div className="bg-slate-800/30 border border-slate-700/50 p-5 rounded-xl space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">{R.fontLblDisplayName}</label>
                    <input 
                      type="text" 
                      value={fontName}
                      onChange={e => setFontName(e.target.value)}
                      placeholder={R.fontPhDisplayNameExample}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  {addType === 'local' ? (
                     <div>
                       <label className="block text-sm font-medium text-slate-300 mb-1">{R.fontLblPickFile}</label>
                       <input 
                         type="file" 
                         ref={fileInputRef}
                         accept=".ttf,.otf,.woff,.woff2"
                         onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                         className="block w-full text-sm text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-700 file:text-slate-300 hover:file:bg-slate-600 file:cursor-pointer cursor-pointer bg-slate-900 border border-slate-700 rounded-lg"
                       />
                     </div>
                  ) : (
                     <>
                       <div>
                         <label className="block text-sm font-medium text-slate-300 mb-1">{R.fontLblWebCssUrl}</label>
                         <input 
                           type="text" 
                           value={webUrl}
                           onChange={e => setWebUrl(e.target.value)}
                           placeholder="https://fonts.googleapis.com/css2?..."
                           className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white outline-none focus:border-blue-500 text-sm"
                         />
                       </div>
                       <div>
                         <label className="block text-sm font-medium text-slate-300 mb-1">{R.fontLblCssFamily}</label>
                         <input 
                           type="text" 
                           value={fontFamily}
                           onChange={e => setFontFamily(e.target.value)}
                           placeholder="'Jua', sans-serif"
                           className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white outline-none focus:border-blue-500 text-sm"
                         />
                       </div>
                     </>
                  )}

                  <button 
                    onClick={handleAddFont}
                    className="w-full mt-4 bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 rounded-lg transition-colors flex justify-center items-center gap-2"
                  >
                    <Plus className="w-5 h-5" /> {R.fontBtnAddSubmit}
                  </button>
               </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
