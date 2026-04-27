'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Save, 
  ChevronLeft, 
  ChevronRight,
  Maximize2,
  Minimize2,
  Trash2,
  Layout,
  Layers,
  Sparkles,
  Download,
  Printer,
  Search,
  X,
  Store,
  Camera,
  Wand2,
  ZoomIn,
  ZoomOut,
  Maximize,
  PanelLeft,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EditorCanvas } from '@/components/design-studio/EditorCanvas';
import { DesignSidebar } from '@/components/design-studio/DesignSidebar';
import { PhotoEditModal } from '@/components/design-studio/PhotoEditModal';
import { ShopSettingsModal } from '@/components/design-studio/ShopSettingsModal';
import { SuggestionModal } from '@/components/design-studio/SuggestionModal';
import { GalleryModal } from '@/components/design-studio/GalleryModal';
import { FormtecModal } from '@/components/design-studio/FormtecModal';
import { useEditorStore, smartFitText } from '@/stores/design-store';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { PrintCommander } from '@/lib/print-commander';
import { LABEL_CONFIGS, PAPER_PRESETS } from '@/lib/constants/templates';
import { createClient } from '@/utils/supabase/client';
import { usePartnerTouchUi } from '@/hooks/use-partner-touch-ui';
import { useIsCapacitorAndroid } from '@/hooks/use-capacitor-android';
import { cn } from '@/lib/utils';
import { usePreferredLocale } from '@/hooks/use-preferred-locale';
import { getMessages } from '@/i18n/getMessages';

function DesignStudioContent() {
  const lastProcessedOrderId = React.useRef<string | null>(null);
  const supabase = createClient();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const printTarget = searchParams.get('target'); // 'card' or 'formtec'

  const { 
    zoom,
    setZoom,
    resetDesign,
    currentOrderId,
    setCurrentOrderId,
    setSelectedBlockId,
    textBlocks, 
    imageBlocks,
    addTextBlock, 
    setDimension, 
    selectedPresetId, 
    activePage, 
    setActivePage, 
    currentDimension, 
    isGenerating, 
    setIsGenerating, 
    setTenantId,
    updateShopSettings,
    setRecipientName,
    setSenderName,
    setShowToField,
    setShowFromField,
    setSuggestedMessageBlockId,
    setSuggestedQuoteBlockId,
    setToBlockId,
    setFromBlockId,
    setMargins,
    saveDesign,
    setFormtecSelectedCells
  } = useEditorStore();
  const { tenantId } = useAuth();
  const touchUi = usePartnerTouchUi();
  const isAndroidApp = useIsCapacitorAndroid();
  const locale = usePreferredLocale();
  const D = getMessages(locale).dashboard.designStudio;
  const [mobileStudioTab, setMobileStudioTab] = useState<'tools' | 'canvas'>('canvas');

  /** 화면 크기에 맞춰 종이가 꽉 차도록 줌(Zoom) 자동 조절 */
  useEffect(() => {
    const fit = () => {
      const { currentDimension: dim, setZoom: sz } = useEditorStore.getState();
      
      // 데스크톱 사이드바(340px) 고려하여 가용한 넓이 계산
      const sidebarWidth = window.innerWidth >= 1024 ? 340 : 0;
      const vw = window.innerWidth - sidebarWidth - (touchUi ? 20 : 60);
      const vh = window.innerHeight - (touchUi ? (isAndroidApp ? 240 : 200) : 160);
      
      const zByW = (vw * 0.95) / dim.widthMm;
      const zByH = (vh * 0.92) / dim.heightMm;
      
      // 너무 작거나 크지 않게 제한 (데스크톱에서는 좀 더 유연하게)
      const z = Math.max(0.5, Math.min(10, Math.min(zByW, zByH)));
      sz(z);
    };
    
    const id = requestAnimationFrame(fit);
    const onResize = () => requestAnimationFrame(fit);
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('resize', onResize);
    };
  }, [currentDimension.widthMm, currentDimension.heightMm, touchUi, isAndroidApp, mobileStudioTab]);

  const showToolsPanel = !touchUi || mobileStudioTab === 'tools';
  const showCanvasPanel = !touchUi || mobileStudioTab === 'canvas';

  // Modal States
  const [isPhotoEditorOpen, setIsPhotoEditorOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [activeSuggestionType, setActiveSuggestionType] = useState<'quote' | 'message' | null>(null);
  const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false);
  const [isShopSettingsOpen, setIsShopSettingsOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isFormtecModalOpen, setIsFormtecModalOpen] = useState(false);

  // Shop Settings Load
  useEffect(() => {
    if (tenantId) {
      setTenantId(tenantId);
      const fetchShop = async () => {
        // 1. Fetch Tenant basic info (Name, Logo)
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', tenantId)
          .single();
        
        // 2. Fetch System Settings (Phone, Website)
        const { data: systemData } = await supabase
          .from('system_settings')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('id', `settings_${tenantId}`)
          .maybeSingle();

        const sData = systemData?.data || {};

        if (tenantData) {
          updateShopSettings({
            name: tenantData.name || sData.siteName || '',
            tel: sData.contactPhone || tenantData.tel || '', // Use system settings phone primarily
            address: sData.address || tenantData.address || '',
            website: sData.siteWebsite || '',
            logoUrl: tenantData.logo_url || null
          });
        }
      };
      fetchShop();
    }
  }, [supabase, tenantId, updateShopSettings, setTenantId]);

  // Sidebar에서 PDF 인쇄 버튼 클릭 시 이벤트 수신
  useEffect(() => {
    const handleRequestPrint = () => handlePrintRequest();
    window.addEventListener('request-print', handleRequestPrint);
    return () => window.removeEventListener('request-print', handleRequestPrint);
  }, [selectedPresetId, zoom, textBlocks, imageBlocks, activePage]);

  const handlePrintRequest = async () => {
    if (selectedPresetId?.startsWith('formtec-')) {
      setSelectedBlockId(null);
      setIsFormtecModalOpen(true);
      return;
    }
    toast.loading(D.pdfGenMulti, { id: 'print-loading' });
    try {
      const state = useEditorStore.getState();
      const allPagesData = [
        state.activePage === 'outside' 
          ? { backgroundUrl: state.backgroundUrl, frontBackgroundUrl: state.frontBackgroundUrl, backBackgroundUrl: state.backBackgroundUrl, textBlocks: state.textBlocks, imageBlocks: state.imageBlocks }
          : state.pages.outside,
        state.activePage === 'inside'
          ? { backgroundUrl: state.backgroundUrl, textBlocks: state.textBlocks, imageBlocks: state.imageBlocks }
          : state.pages.inside
      ];

      const pdfBytes = await PrintCommander.generatePdf({
        paperSizeMm: state.currentDimension,
        margins: { top: 10, right: 10, bottom: 10, left: 10 },
        pages: allPagesData.map(p => ({
          ...p,
          textBlocks: p.textBlocks.map(tb => ({ ...tb, size: tb.fontSize })),
          imageBlocks: p.imageBlocks?.map(img => ({ ...img, isPrintable: true }))
        }))
      });
      toast.dismiss('print-loading');
      if (pdfBytes) {
        PrintCommander.triggerPrintPopup(pdfBytes);
        toast.success(D.pdfGenFrontBackDone);
      }
    } catch (e) {
      console.error('PDF Generation Error:', e);
      toast.dismiss('print-loading');
      toast.error(D.pdfGenErr);
    }
  };

  const handleSave = async () => {
    setIsGenerating(true);
    const state = useEditorStore.getState();
    try {
      await state.saveDesign();
      toast.success(D.designSavedCloud);
    } catch (e) {
      console.error(e);
      toast.error(D.saveErr);
    } finally {
      setIsGenerating(false);
    }
  };

  const isProcessingOrder = React.useRef(false); // 동시성 제어용 즉각 잠금

  // Order Details Logic (Auto-placement of order messages)
  useEffect(() => {
    if (!orderId || isProcessingOrder.current) return;

    // [핵심] 세션에서 이미지 처리했는지 확인 (새로고침 대응)
    const sessionKey = `fstudio_init_${orderId}`;
    const hasInitializedInSession = sessionStorage.getItem(sessionKey);

    // 1. 이미 세션에서 완료했거나, 2. 스토어의 주문 ID와 같다면 절대 다시 실행 안 함
    if (hasInitializedInSession || (currentOrderId === orderId && textBlocks.length > 0)) {
      return;
    }

    // 통신 시작 전 즉시 동기적 잠금 (Race Condition 방지)
    isProcessingOrder.current = true;

    const fetchOrder = async () => {
      try {
        const { data: order, error } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();
        
        if (order && !error) {
          // 입장 시에만 리셋 (편집 중인 데이터가 없을 때만)
          if (textBlocks.length === 0) {
            resetDesign();
            
            const message = order.message_content || order.ribbon_text || order.message?.content || "";
            const sender = order.orderer_name || order.orderer?.name || "";
            
            // 용지 규격 설정
            const isFormtec = printTarget === 'formtec';
            if (isFormtec) {
              const preset = PAPER_PRESETS.find(p => p.id === 'formtec-8');
              if (preset) setDimension({ widthMm: preset.widthMm, heightMm: preset.heightMm }, preset.id);
              setFormtecSelectedCells([0]); // 첫 번째 칸 기본 선택
            } else {
              setDimension({ widthMm: 210, heightMm: 148 }, 'a5');
              setActivePage('inside');
            }

            const { widthMm, heightMm } = useEditorStore.getState().currentDimension;
            const isCard = !isFormtec;
            const isInside = useEditorStore.getState().activePage === 'inside';
            
            // 1. 메시지 처리 및 정확한 중앙 좌표 계산
            const fontSizeMsg = 15;
            // [교정] smartFitText 대신 22자마다 자동 줄바꿈 처리 (폰트 크기는 15px 고정)
            const processedMsg = message.replace(/(.{22})/g, '$1\n').trim(); 
            
            const margins = useEditorStore.getState().margins;
            const TEXT_BOX_WIDTH = isCard ? (widthMm / 2 - 20) : (widthMm - 20);
            
            const msgX = isCard 
              ? (widthMm * 0.75) - (TEXT_BOX_WIDTH / 2)
              : (widthMm / 2) - (TEXT_BOX_WIDTH / 2);
            
            const msgY = (heightMm / 2) - 10; // 세로 중앙에서 살짝 위로
            
            const msgId = addTextBlock({
              text: processedMsg || D.newMessage,
              x: msgX, 
              y: msgY, 
              fontSize: 15, 
              textAlign: 'center',
              fontFamily: "'Gowun Batang', serif", 
              colorHex: isInside ? '#000000' : '#ffffff',
              strokeWidth: isInside ? 0 : 0.5,
              width: TEXT_BOX_WIDTH
            });
            setSuggestedMessageBlockId(msgId);
            
            // 2. 수발신자 처리 (스토어 액션 호출로 캔버스 동기화)
            const recipient = order.recipient_name || order.recipient?.name || "";
            if (recipient) {
              setRecipientName(recipient);
              setShowToField(true);
            }
            if (sender) {
              setSenderName(sender);
              setShowFromField(true);
            }
            // 모든 작업 완료 후 세션 및 스토어 기록
            sessionStorage.setItem(sessionKey, 'true');
            setCurrentOrderId(orderId);
            toast.success(isCard ? D.msgPlacedCard : D.msgPlacedLabel);
          }
        }
      } catch (e) {
        console.error('Order fetch error:', e);
      } finally {
        isProcessingOrder.current = false;
      }
    };
    fetchOrder();
  }, [orderId, currentOrderId, supabase, addTextBlock, resetDesign, setCurrentOrderId, setDimension, setActivePage, printTarget, textBlocks.length]);

  const fitZoomToScreen = React.useCallback(() => {
    const { currentDimension: dim, setZoom: sz } = useEditorStore.getState();
    const vw = window.innerWidth - 20;
    const vh = window.innerHeight - (isAndroidApp ? 220 : 180);
    const zByW = (vw * 0.96) / dim.widthMm;
    const zByH = (vh * 0.92) / dim.heightMm;
    const z = Math.max(0.65, Math.min(8, Math.min(zByW, zByH)));
    sz(z);
  }, [isAndroidApp]);

  return (
    <div className="flex flex-col h-full min-h-0 flex-1 bg-white overflow-hidden relative">
      
      {/* Top Professional Header */}
      <header className={cn(
        "bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between z-30 shrink-0 gap-2",
        touchUi ? "min-h-[3.5rem] px-3 py-2 flex-wrap" : "h-20 px-8"
      )}>
        <div className={cn("flex items-center gap-3 min-w-0", touchUi ? "flex-1" : "gap-6")}>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
             <div className={cn("bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100 shrink-0", touchUi ? "w-9 h-9" : "w-10 h-10")}>
                <Wand2 size={touchUi ? 20 : 24} />
             </div>
             <div className="min-w-0">
                <h1 className={cn("font-black text-gray-800 tracking-tight leading-none truncate", touchUi ? "text-sm" : "text-xl")}>{D.studioTitle}</h1>
                {!touchUi && (
                  <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.3em] mt-1">{D.studioSubtitle}</p>
                )}
             </div>
          </div>

          {!touchUi && <div className="h-8 w-px bg-gray-100 hidden sm:block" />}

          <div className={cn("flex items-center gap-0.5 bg-gray-50 p-1 rounded-2xl border border-gray-100 shrink-0", touchUi && "ml-auto")}>
             <button 
                type="button"
                onClick={() => setActivePage('outside')}
                className={cn(
                  "rounded-xl font-black transition-all",
                  touchUi ? "px-3 py-2 text-[10px]" : "px-5 py-2 text-xs",
                  activePage === 'outside' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                )}
             >
                {touchUi ? D.coverShort : D.coverLong}
             </button>
             <button 
                type="button"
                onClick={() => setActivePage('inside')}
                className={cn(
                  "rounded-xl font-black transition-all",
                  touchUi ? "px-3 py-2 text-[10px]" : "px-5 py-2 text-xs",
                  activePage === 'inside' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                )}
             >
                {touchUi ? D.insideShort : D.insideLong}
             </button>
          </div>
        </div>

        <div className={cn("flex items-center gap-2 shrink-0", touchUi && "w-full justify-end")}>
          <div className="hidden lg:flex items-center gap-3 mr-4">
             <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{D.activeWorkspace}</span>
                <span className="text-xs font-black text-gray-600">{currentDimension.widthMm} x {currentDimension.heightMm} mm</span>
             </div>
             <Layout className="text-gray-200" size={24} />
          </div>

          <button 
            type="button"
            onClick={handleSave}
            disabled={isGenerating}
            className={cn(
              "flex items-center gap-2 bg-gray-900 text-white rounded-2xl font-black shadow-xl hover:bg-black active:scale-95 transition-all",
              touchUi ? "px-4 py-2.5 text-[11px]" : "px-6 py-3 text-xs"
            )}
          >
            {isGenerating ? <Loader2 className="animate-spin" /> : <Save size={16} />}
            {touchUi ? D.save : D.saveDesign}
          </button>

          <button 
            type="button"
            onClick={handlePrintRequest}
            className={cn(
              "flex items-center justify-center bg-white border border-gray-100 text-gray-600 rounded-2xl hover:bg-gray-50 hover:text-indigo-600 transition-all shadow-sm",
              touchUi ? "w-11 h-11" : "w-12 h-12"
            )}
          >
            <Printer size={20} />
          </button>
        </div>
      </header>

      {touchUi && (
        <div className="flex lg:hidden border-b border-gray-100 bg-white shrink-0">
          <button
            type="button"
            onClick={() => setMobileStudioTab('tools')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-colors",
              mobileStudioTab === 'tools'
                ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/40"
                : "text-gray-400 border-b-2 border-transparent"
            )}
          >
            <PanelLeft className="h-4 w-4 shrink-0" aria-hidden />
            {D.toolsPaper}
          </button>
          <button
            type="button"
            onClick={() => setMobileStudioTab('canvas')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-colors",
              mobileStudioTab === 'canvas'
                ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/40"
                : "text-gray-400 border-b-2 border-transparent"
            )}
          >
            <Eye className="h-4 w-4 shrink-0" aria-hidden />
            {D.previewEdit}
          </button>
        </div>
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden relative flex-col lg:flex-row">
        <div
          className={cn(
            "min-h-0 overflow-hidden flex flex-col lg:w-[340px] lg:shrink-0",
            showToolsPanel ? "flex flex-1 w-full lg:flex-none" : "hidden lg:flex"
          )}
        >
          <DesignSidebar 
            onOpenGallery={() => setIsGalleryOpen(true)}
            onOpenSuggestion={(type) => { setActiveSuggestionType(type); setIsSuggestionModalOpen(true); }}
            onOpenShopSettings={() => setIsShopSettingsOpen(true)}
            onOpenPhotoEditor={() => setIsPhotoEditorOpen(true)}
          />
        </div>

        {/* Main Canvas Area */}
        <main
          className={cn(
            "flex-1 relative bg-neutral-100/50 flex flex-col items-center justify-center overflow-auto custom-scrollbar min-h-0 min-w-0",
            touchUi ? "p-2" : "p-12",
            showCanvasPanel ? "flex" : "hidden lg:flex"
          )}
        >
            <EditorCanvas />
            
            {/* Zoom Controller Overlay */}
            <div
              className={cn(
                "fixed left-1/2 -translate-x-1/2 flex items-center gap-1 sm:gap-2 bg-white/95 backdrop-blur-xl px-3 sm:px-4 py-2 sm:py-2.5 rounded-[2rem] shadow-2xl border border-white z-40 max-w-[calc(100vw-1rem)]",
                touchUi && isAndroidApp
                  ? "bottom-[calc(5.5rem+env(safe-area-inset-bottom))]"
                  : touchUi
                    ? "bottom-[calc(4.5rem+env(safe-area-inset-bottom))]"
                    : "bottom-10"
              )}
            >
              <button type="button" onClick={() => setZoom(Math.max(1, zoom - 0.5))} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors touch-manipulation"><ZoomOut size={18} /></button>
              <div className="w-16 sm:w-20 text-center flex flex-col items-center">
                <span className="text-[9px] font-black text-indigo-300 uppercase leading-none mb-0.5">{D.scale}</span>
                <span className="text-xs font-black text-indigo-600 tabular-nums">{Math.round((zoom / 3.78) * 100)}%</span>
              </div>
              <button type="button" onClick={() => setZoom(Math.min(10, zoom + 0.5))} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors touch-manipulation"><ZoomIn size={18} /></button>
              <div className="w-px h-4 bg-gray-100 mx-1 sm:mx-2 hidden sm:block" />
              <button type="button" onClick={() => setZoom(3.78)} className="hidden sm:flex items-center gap-2 px-3 py-1.5 hover:bg-indigo-50 text-xs font-black text-gray-500 hover:text-indigo-600 rounded-xl transition-all touch-manipulation"><Maximize size={14} /> 100%</button>
              {touchUi && (
                <button
                  type="button"
                  onClick={fitZoomToScreen}
                  className="px-3 py-1.5 hover:bg-indigo-50 text-[11px] font-black text-indigo-600 rounded-xl transition-all touch-manipulation whitespace-nowrap"
                >
                  {D.fit}
                </button>
              )}
            </div>
        </main>
      </div>

      {/* Modals Assembly */}
      <PhotoEditModal isOpen={isPhotoEditorOpen} onClose={() => setIsPhotoEditorOpen(false)} />
      <SuggestionModal isOpen={isSuggestionModalOpen} onClose={() => setIsSuggestionModalOpen(false)} type={activeSuggestionType || 'message'} />
      <GalleryModal isOpen={isGalleryOpen} onClose={() => setIsGalleryOpen(false)} />
      <ShopSettingsModal isOpen={isShopSettingsOpen} onClose={() => setIsShopSettingsOpen(false)} />
      
      {isFormtecModalOpen && (
        <FormtecModal 
          isOpen={isFormtecModalOpen} 
          onClose={() => setIsFormtecModalOpen(false)}
          onPrint={async () => {
             const state = useEditorStore.getState();
             setIsGenerating(true);
             toast.loading(D.labelPdfGen, { id: 'label-print' });
             
             try {
               // 캔버스 데이터 + 추가 메시지 블록 조합
               const messageToAdd = state.formtecAdditionalMessage;
               let finalBlocks = [...state.textBlocks];
               
               if (messageToAdd) {
                  finalBlocks.push({
                    id: 'bulk-extra',
                    text: messageToAdd,
                    x: state.currentDimension.widthMm / 2,
                    y: state.currentDimension.heightMm - 10,
                    fontSize: 10,
                    textAlign: 'center',
                    colorHex: '#64748b'
                  } as any);
               }

               const pdfBytes = await PrintCommander.generatePdf({
                 paperSizeMm: state.currentDimension,
                 labelType: state.selectedPresetId || 'formtec-8',
                 selectedCells: state.formtecSelectedCells,
                 textBlocks: finalBlocks.map(tb => ({ ...tb, size: tb.fontSize })),
                 imageBlocks: state.imageBlocks.map(img => ({ ...img, isPrintable: true }))
               });

               if (pdfBytes) {
                 PrintCommander.triggerPrintPopup(pdfBytes);
                 toast.success(D.labelPdfReady, { id: 'label-print' });
               }
               setIsFormtecModalOpen(false);
             } catch (e) {
               console.error(e);
               toast.error(D.labelPrintErr, { id: 'label-print' });
             } finally {
               setIsGenerating(false);
             }
          }}
          isGenerating={isGenerating}
        />
      )}

      {isGenerating && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-xl z-[200] flex flex-col items-center justify-center animate-in fade-in duration-500">
          <div className="w-20 h-20 border-8 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
          <p className="mt-8 text-xl font-black text-indigo-900 tracking-tighter animate-pulse">{D.syncing}</p>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
}

export default function DesignStudio() {
  const locale = usePreferredLocale();
  const D = getMessages(locale).dashboard.designStudio;
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">{D.loadingStudio}</div>}>
      <DesignStudioContent />
    </Suspense>
  );
}

function Loader2({ className }: { className?: string }) {
  return <span className={`animate-spin inline-block border-2 border-white/30 border-t-white rounded-full w-3 h-3 ${className}`} />;
}
