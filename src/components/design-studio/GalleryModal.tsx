'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { X, Layers, History, Loader2, Search, Trash2, Layout, Sparkles, Settings2 } from 'lucide-react';
import { GALLERY_CATEGORIES, FREE_TEMPLATES } from '@/lib/constants/templates';
import { useEditorStore } from '@/stores/design-store';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';

interface GalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type RemoteTheme = {
  id: string;
  slug: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  design_gallery_assets?: { id: string; image_url: string; sort_order: number }[];
};

export const GalleryModal: React.FC<GalleryModalProps> = ({ isOpen, onClose }) => {
  const { isSuperAdmin } = useAuth();
  const {
    listDesigns,
    loadDesign,
    setDesignId,
    setActivePage,
    removeTextBlock,
    removeImageBlock,
    foldType,
    setFrontBackgroundUrl,
    setBackBackgroundUrl,
    setBackgroundUrl,
    applyShopBranding,
  } = useEditorStore();

  const [savedDesigns, setSavedDesigns] = useState<any[]>([]);
  const [activeGalleryTab, setActiveGalleryTab] = useState<string>('my_designs');
  const [isLoading, setIsLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogSource, setCatalogSource] = useState<'remote' | 'legacy'>('legacy');
  const [remoteThemes, setRemoteThemes] = useState<RemoteTheme[]>([]);

  const refreshCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('design_gallery_themes')
        .select('*, design_gallery_assets(*)')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error || !data?.length) {
        setCatalogSource('legacy');
        setRemoteThemes([]);
        setActiveGalleryTab((prev) => {
          if (prev === 'my_designs') return prev;
          return FREE_TEMPLATES[prev]?.length ? prev : 'my_designs';
        });
        return;
      }

      const normalized: RemoteTheme[] = data.map((t: RemoteTheme) => ({
        ...t,
        design_gallery_assets: [...(t.design_gallery_assets ?? [])].sort(
          (a, b) => a.sort_order - b.sort_order
        ),
      }));

      setRemoteThemes(normalized);
      setCatalogSource('remote');
      setActiveGalleryTab((prev) => {
        if (prev === 'my_designs') return prev;
        return normalized.some((t) => t.slug === prev) ? prev : 'my_designs';
      });
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && activeGalleryTab === 'my_designs') {
      setIsLoading(true);
      listDesigns().then((designs) => {
        setSavedDesigns(designs);
        setIsLoading(false);
      });
    }
  }, [isOpen, activeGalleryTab, listDesigns]);

  useEffect(() => {
    if (isOpen) {
      refreshCatalog();
    }
  }, [isOpen, refreshCatalog]);

  if (!isOpen) return null;

  const legacyThemeTabs = GALLERY_CATEGORIES.filter((c) => c.id !== 'my_designs');
  const remoteThemeTabs = remoteThemes.map((t) => ({ id: t.slug, label: t.label }));
  const themeTabs = catalogSource === 'remote' ? remoteThemeTabs : legacyThemeTabs;

  const getTemplateUrls = (tabSlug: string): string[] => {
    if (tabSlug === 'my_designs') return [];
    if (catalogSource === 'remote') {
      const t = remoteThemes.find((x) => x.slug === tabSlug);
      return (t?.design_gallery_assets ?? []).map((a) => a.image_url);
    }
    return FREE_TEMPLATES[tabSlug] ?? [];
  };

  const loadTemplate = (imageUrl: string) => {
    setIsLoading(true);

    const state = useEditorStore.getState();

    ['outside', 'inside'].forEach((p) => {
      state.setActivePage(p as 'outside' | 'inside');
      const cur = useEditorStore.getState();
      cur.textBlocks.forEach((b) => cur.removeTextBlock(b.id));
      cur.imageBlocks.forEach((b) => cur.removeImageBlock(b.id));
    });

    state.setActivePage('outside');

    if (foldType === 'half') {
      setFrontBackgroundUrl(imageUrl);
      setBackBackgroundUrl(null);
    } else {
      setBackgroundUrl(imageUrl);
    }

    state.setActivePage('inside');
    state.setActivePage('outside');

    setDesignId(null);
    applyShopBranding('back');

    setIsLoading(false);
    toast.success('배경이 적용되었습니다. 왼쪽 패널에서 텍스트 또는 이미지(PNG 등) 레이어를 추가하세요.');
    onClose();
  };

  const templateUrls = getTemplateUrls(activeGalleryTab);

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[3rem] w-full max-w-6xl max-h-[90vh] flex flex-col shadow-[0_40px_100px_rgba(0,0,0,0.5)] overflow-hidden border border-white/20">
        {/* Header */}
        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-teal-50 to-white shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 shrink-0">
              <Layers size={24} />
            </div>
            <div className="min-w-0">
              <h3 className="text-2xl font-black text-gray-800 tracking-tight truncate">
                마이 디자인 & 프로 템플릿
              </h3>
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mt-1">
                Template Architecture v4.0
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-12 h-12 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center transition-all shadow-sm border border-gray-100 hover:scale-110 active:scale-90"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden min-h-0">
            {/* Navigation Sidebar */}
            <aside className="w-64 bg-gray-50/50 border-r border-gray-100 p-8 shrink-0 overflow-y-auto custom-scrollbar">
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                    Storage
                  </label>
                  <button
                    type="button"
                    onClick={() => setActiveGalleryTab('my_designs')}
                    className={`w-full px-5 py-4 text-left text-sm font-black rounded-2xl transition-all flex items-center gap-3 ${
                      activeGalleryTab === 'my_designs'
                        ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-100'
                        : 'text-gray-500 hover:bg-white hover:text-gray-800'
                    }`}
                  >
                    <History size={18} />
                    <span>작업 보관함</span>
                  </button>
                </div>

                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-2">
                    Design Themes
                    {catalogLoading && <Loader2 className="animate-spin w-3 h-3 text-emerald-500" />}
                  </label>
                  <div className="flex flex-col gap-1.5">
                    {themeTabs.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => setActiveGalleryTab(category.id)}
                        className={`px-5 py-3.5 text-left text-sm font-black rounded-xl transition-all border ${
                          activeGalleryTab === category.id
                            ? 'bg-white border-emerald-500 text-emerald-600 shadow-md'
                            : 'text-gray-400 bg-transparent border-transparent hover:bg-white/50 hover:text-gray-700'
                        }`}
                      >
                        <span>{category.label}</span>
                      </button>
                    ))}
                  </div>
                  {catalogSource === 'legacy' && (
                    <p className="text-[9px] font-bold text-amber-600/90 px-1 leading-snug">
                      DB 카탈로그가 없어 기본 템플릿을 표시합니다. Supabase에 SQL을 적용하면 클라우드에서 관리할 수 있습니다.
                    </p>
                  )}
                </div>
              </div>
            </aside>

            {/* Main Grid Area */}
            <div className="flex-1 p-10 overflow-y-auto bg-slate-50/30 custom-scrollbar relative min-h-0">
              {isLoading && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-[100] flex flex-col items-center justify-center gap-4">
                  <Loader2 className="animate-spin text-emerald-600" size={40} />
                  <p className="text-sm font-black text-emerald-800 tracking-tighter">데이터를 불러오고 있습니다...</p>
                </div>
              )}

              {activeGalleryTab === 'my_designs' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 animate-in fade-in duration-500">
                  {savedDesigns.length === 0 && !isLoading ? (
                    <div className="col-span-full py-32 flex flex-col items-center justify-center text-gray-300">
                      <Trash2 size={48} className="mb-4 opacity-10" />
                      <p className="text-sm font-black">저장된 디자인이 없습니다.</p>
                    </div>
                  ) : (
                    savedDesigns.map((design) => (
                      <div
                        key={design.id}
                        role="button"
                        tabIndex={0}
                        className="group bg-white border border-gray-100 rounded-[2rem] overflow-hidden hover:border-emerald-500 hover:shadow-2xl transition-all cursor-pointer relative flex flex-col"
                        onClick={() => {
                          loadDesign(design.id);
                          onClose();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            loadDesign(design.id);
                            onClose();
                          }
                        }}
                      >
                        <div className="aspect-[4/3] bg-gray-50 flex items-center justify-center overflow-hidden relative">
                          {design.background_url ? (
                            <img
                              src={design.background_url}
                              alt="preview"
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-2 opacity-10">
                              <Layout size={40} />
                              <span className="text-[10px] font-black">PREVIEW N/A</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-emerald-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md p-2 rounded-xl text-emerald-600 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 shadow-lg">
                            <History size={16} />
                          </div>
                        </div>
                        <div className="p-6 bg-white flex-1">
                          <div className="text-[10px] font-black text-gray-300 mb-1 uppercase tracking-widest">
                            {new Date(design.created_at).toLocaleDateString()}
                          </div>
                          <div className="text-sm font-black text-gray-800 truncate tracking-tight">
                            {design.id.substring(0, 12)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : templateUrls.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-2">
                  <Search size={40} className="opacity-20" />
                  <p className="text-sm font-black">이 테마에 등록된 디자인이 없습니다.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-in zoom-in-95 duration-300">
                  {templateUrls.map((url, index) => (
                    <div
                      key={`${url}-${index}`}
                      role="button"
                      tabIndex={0}
                      className="group bg-white border border-gray-100 rounded-[2rem] overflow-hidden hover:border-emerald-500 hover:shadow-2xl transition-all cursor-pointer relative"
                      onClick={() => loadTemplate(url)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          loadTemplate(url);
                        }
                      }}
                    >
                      <div className="aspect-[3/4.2] bg-gray-50 flex items-center justify-center overflow-hidden relative">
                        <img
                          src={url}
                          alt={`Template ${index}`}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[80%] opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                          <span className="w-full py-3 bg-white text-emerald-600 rounded-2xl text-[11px] font-black shadow-2xl flex items-center justify-center gap-2">
                            <Sparkles size={14} /> 템플릿 적용하기
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};
