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
import { useEditorStore, smartFitText } from '@/stores/design-store';
import { useAuth } from '@/hooks/use-auth';
import { useTenantPlanAccess } from '@/hooks/use-tenant-plan-access';
import { AccessDenied } from '@/components/access-denied';
import { FreePlanUpsell } from '@/components/subscription/free-plan-upsell';
import { useRouter } from 'next/navigation';
import { toBaseLocale } from '@/i18n/config';
import { pickUiText } from '@/i18n/pick-ui-text';
import { toast } from 'sonner';
import { LABEL_CONFIGS, PAPER_PRESETS } from '@/lib/constants/templates';
import { createClient } from '@/utils/supabase/client';
import { usePartnerTouchUi } from '@/hooks/use-partner-touch-ui';
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
  const router = useRouter();
  const {
    hasRibbonAccess: canUseStudio,
    isFreeTier,
    isLoading: planAccessLoading,
  } = useTenantPlanAccess();
  const touchUi = usePartnerTouchUi();
  const locale = usePreferredLocale();
  const D = getMessages(locale).dashboard.designStudio;
  const [mobileStudioTab, setMobileStudioTab] = useState<'tools' | 'canvas'>('canvas');
  const mainRef = React.useRef<HTMLElement>(null);

  const fitZoomToScreen = React.useCallback(() => {
    const { currentDimension: dim, setZoom: sz } = useEditorStore.getState();
    if (!mainRef.current) return;
    
    const vw = mainRef.current.clientWidth;
    const vh = mainRef.current.clientHeight;
    
    // 모바일과 데스크톱의 여백을 다르게 설정하여 UI를 가리지 않도록 함
    const paddingX = touchUi ? 40 : 120;
    const paddingY = touchUi ? 160 : 200;
    
    const zByW = Math.max(0, vw - paddingX) / dim.widthMm;
    const zByH = Math.max(0, vh - paddingY) / dim.heightMm;
    
    // 너무 작거나 크지 않게 제한 (최소 0.5, 최대 10)
    const z = Math.max(0.5, Math.min(10, Math.min(zByW, zByH)));
    sz(z);
  }, [touchUi]);

  /** 화면 크기나 용지 크기 변경 시 줌 자동 조절 */
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      requestAnimationFrame(fitZoomToScreen);
    });
    
    ro.observe(el);
    // 용지 크기가 변경되었을 때도 맞춤 실행
    fitZoomToScreen();
    
    return () => ro.disconnect();
  }, [fitZoomToScreen, currentDimension.widthMm, currentDimension.heightMm, mobileStudioTab]);

  const showToolsPanel = !touchUi || mobileStudioTab === 'tools';
  const showCanvasPanel = !touchUi || mobileStudioTab === 'canvas';

  // Modal States
  const [isPhotoEditorOpen, setIsPhotoEditorOpen] = useState(false);
  const [isShopSettingsOpen, setIsShopSettingsOpen] = useState(false);

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
  }, [selectedPresetId, zoom, textBlocks, imageBlocks]);

  const requirePaidExport = (): boolean => {
    if (!isFreeTier) return true;
    const base = toBaseLocale(locale);
    toast.error(
      pickUiText(
        base,
        'PDF·인쇄는 PRINT CORE 이상 플랜에서 이용할 수 있습니다.',
        'PDF and print require PRINT CORE or higher.',
        'PDF/in cần gói PRINT CORE trở lên.',
        'PDF・印刷はPRINT CORE以上でご利用ください。',
        '导出 PDF/打印需 PRINT CORE 及以上。',
        'PDF e impresión requieren PRINT CORE o superior.',
        'PDF e impressão exigem PRINT CORE o superior.',
        'PDF et impression nécessitent PRINT CORE ou plus.',
        'PDF und Druck ab PRINT CORE.',
        'PDF и печать — с PRINT CORE.',
      ),
    );
    router.push('/dashboard/subscription');
    return false;
  };

  const handlePrintRequest = async () => {
    if (!requirePaidExport()) return;
    toast.loading(D.pdfGenMulti, { id: 'print-loading' });
    try {
      const state = useEditorStore.getState();
      const allPagesData = [
        { 
          backgroundUrl: state.backgroundUrl, 
          frontBackgroundUrl: state.frontBackgroundUrl, 
          backBackgroundUrl: state.backBackgroundUrl, 
          brandingTextInfo: state.brandingTextInfo, 
          textBlocks: state.textBlocks || [], 
          imageBlocks: state.imageBlocks 
        }
      ];

      // Dynamically import PrintCommander to avoid blocking initial load
      const { PrintCommander } = await import('@/lib/print-commander');

      const pdfBytes = await PrintCommander.generatePdf({
        paperSizeMm: state.currentDimension,
        margins: { top: 10, right: 10, bottom: 10, left: 10 },
        pages: allPagesData.map((p, idx) => {
          const isOutside = idx === 0;
          const brandInfo = p.brandingTextInfo || { shopName: '', contact: '', address: '', message: '' };
          const hasBrandInfo = isOutside && (brandInfo.shopName || brandInfo.contact || brandInfo.address || brandInfo.message);
          
          let generatedBlocks: any[] = [];
          let generatedImages: any[] = [];
          if (hasBrandInfo) {
            const centerX = state.foldType === 'half' && state.orientation === 'landscape' ? state.currentDimension.widthMm / 4 : state.currentDimension.widthMm / 2;
            const centerY = state.foldType === 'half' && state.orientation === 'portrait' ? state.currentDimension.heightMm / 4 : state.currentDimension.heightMm / 2;
            
            const bottomY = state.foldType === 'half' && state.orientation === 'portrait' ? state.currentDimension.heightMm / 2 - 20 : state.currentDimension.heightMm - 20;
            const topY = brandInfo.position === 'center' ? centerY + 21 : bottomY;
            
            if (brandInfo.logoUrl) {
              generatedImages.push({
                id: 'b_logo',
                url: brandInfo.logoUrl,
                x: centerX - 20,
                y: topY - 52,
                width: 40,
                height: 40,
                isPrintable: true
              });
            }
            const fontFam = brandInfo.fontFamily || 'Pretendard';
            if (brandInfo.shopName) generatedBlocks.push({ id: 'b_name', text: brandInfo.shopName, x: centerX, y: topY - 10, fontSize: 10, colorHex: '#64748b', textAlign: 'center', fontFamily: fontFam });
            if (brandInfo.contact) generatedBlocks.push({ id: 'b_tel', text: brandInfo.contact, x: centerX, y: topY - 5, fontSize: 8, colorHex: '#64748b', textAlign: 'center', fontFamily: fontFam });
            if (brandInfo.address) generatedBlocks.push({ id: 'b_add', text: brandInfo.address, x: centerX, y: topY, fontSize: 8, colorHex: '#64748b', textAlign: 'center', fontFamily: fontFam });
            if (brandInfo.message) generatedBlocks.push({ id: 'b_msg', text: brandInfo.message, x: centerX, y: topY + 6, fontSize: 7, colorHex: '#64748b', textAlign: 'center', fontFamily: fontFam });
          }

          return {
            ...p,
            textBlocks: [
              ...(p.textBlocks || []).map((tb: any) => ({ ...tb, size: tb.fontSize })),
              ...generatedBlocks.map(tb => ({ ...tb, size: tb.fontSize }))
            ],
            imageBlocks: [
              ...(p.imageBlocks || []).map((img: any) => ({ ...img, isPrintable: true })),
              ...generatedImages
            ]
          };
        })
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
    if (!requirePaidExport()) return;
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
            }

            const { widthMm, heightMm } = useEditorStore.getState().currentDimension;
            const isCard = !isFormtec;
            
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
              colorHex: '#ffffff',
              strokeWidth: 0.5,
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
  }, [orderId, currentOrderId, supabase, addTextBlock, resetDesign, setCurrentOrderId, setDimension, printTarget, textBlocks.length]);

  // fitZoomToScreen is now defined at the top of the component

  if (!planAccessLoading && !canUseStudio) {
    return <AccessDenied requiredTier="Ribbon" />;
  }

  return (
    <div className="flex flex-col h-full min-h-0 flex-1 bg-white overflow-hidden relative">
      {isFreeTier && tenantId ? (
        <div className="shrink-0 border-b border-indigo-100 px-3 py-2">
          <FreePlanUpsell tenantId={tenantId} variant="design" className="mb-0" />
        </div>
      ) : null}
      
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

          <div className="h-8 w-px bg-gray-100 hidden sm:block" />
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
            onOpenShopSettings={() => setIsShopSettingsOpen(true)}
            onOpenPhotoEditor={() => setIsPhotoEditorOpen(true)}
          />
        </div>

        {/* Main Canvas Area */}
        <main
          ref={mainRef}
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
                touchUi
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
      <ShopSettingsModal isOpen={isShopSettingsOpen} onClose={() => setIsShopSettingsOpen(false)} />
      


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
