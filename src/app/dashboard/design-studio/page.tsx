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
  Maximize
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EditorCanvas } from '@/components/design-studio/EditorCanvas';
import { DesignSidebar } from '@/components/design-studio/DesignSidebar';
import { PhotoEditModal } from '@/components/design-studio/PhotoEditModal';
import { ShopSettingsModal } from '@/components/design-studio/ShopSettingsModal';
import { AIFontWizardModal } from '@/components/design-studio/AIFontWizardModal';
import { AIWizardModal } from '@/components/design-studio/AIWizardModal';
import { SuggestionModal } from '@/components/design-studio/SuggestionModal';
import { GalleryModal } from '@/components/design-studio/GalleryModal';
import { FormtecModal } from '@/components/design-studio/FormtecModal';
import { useEditorStore, smartFitText } from '@/stores/design-store';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { PrintCommander } from '@/lib/print-commander';
import { LABEL_CONFIGS, PAPER_PRESETS } from '@/lib/constants/templates';
import { createClient } from '@/utils/supabase/client';

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
    textBlocks, 
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
    saveDesign
  } = useEditorStore();
  const { tenantId } = useAuth();

  // Modal States
  const [isPhotoEditorOpen, setIsPhotoEditorOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isAiWizardOpen, setIsAiWizardOpen] = useState(false);
  const [isAIFontWizardOpen, setIsAIFontWizardOpen] = useState(false);
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

  const handlePrintRequest = async () => {
    if (selectedPresetId?.startsWith('formtec-')) {
      setIsFormtecModalOpen(true);
      return;
    }
    toast.loading('고해상도 다중 페이지 PDF를 생성하고 있습니다...', { id: 'print-loading' });
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
        toast.success('앞뒷면 PDF 생성이 완료되었습니다.');
      }
    } catch (e) {
      console.error('PDF Generation Error:', e);
      toast.dismiss('print-loading');
      toast.error('PDF 생성 중 오류가 발생했습니다.');
    }
  };

  const handleSave = async () => {
    setIsGenerating(true);
    const state = useEditorStore.getState();
    try {
      await state.saveDesign();
      toast.success('디자인이 클라우드에 저장되었습니다.');
    } catch (e) {
      console.error(e);
      toast.error('저장 중 오류가 발생했습니다.');
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
            const msgX = isCard 
              ? (widthMm * 0.75) 
              : (widthMm / 2);
            const msgY = heightMm / 2;
            
            const msgId = addTextBlock({
              text: processedMsg || '새로운 메시지',
              x: msgX, 
              y: msgY, 
              fontSize: 15, // 무조건 15px로 고정
              textAlign: 'center',
              fontFamily: "'Gowun Batang', serif", 
              colorHex: isInside ? '#000000' : '#ffffff',
              strokeWidth: isInside ? 0 : 0.5,
              width: isCard ? (widthMm / 2 - margins.right - 20) : (widthMm - margins.left - margins.right - 20)
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
            toast.success(`${isCard ? '카드 내지 우측' : '폼텍 라벨 중앙'}에 메시지를 배치했습니다.`);
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

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-white overflow-hidden relative">
      
      {/* Top Professional Header */}
      <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                <Wand2 size={24} />
             </div>
             <div>
                <h1 className="text-xl font-black text-gray-800 tracking-tight leading-none">PROFESSIONAL STUDIO</h1>
                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.3em] mt-1">Design Architecture v4.2</p>
             </div>
          </div>

          <div className="h-8 w-px bg-gray-100" />

          <div className="flex items-center gap-1 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
             <button 
                onClick={() => setActivePage('outside')}
                className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${activePage === 'outside' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
             >
                앞면/뒷면 (Cover)
             </button>
             <button 
                onClick={() => setActivePage('inside')}
                className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${activePage === 'inside' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
             >
                내지/안쪽 (Inside)
             </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-3 mr-4">
             <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Active Workspace</span>
                <span className="text-xs font-black text-gray-600">{currentDimension.widthMm} x {currentDimension.heightMm} mm</span>
             </div>
             <Layout className="text-gray-200" size={24} />
          </div>

          <button 
            onClick={handleSave}
            disabled={isGenerating}
            className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-2xl text-xs font-black shadow-xl hover:bg-black active:scale-95 transition-all"
          >
            {isGenerating ? <Loader2 className="animate-spin" /> : <Save size={16} />}
            디자인 저장
          </button>

          <button 
            onClick={handlePrintRequest}
            className="w-12 h-12 flex items-center justify-center bg-white border border-gray-100 text-gray-600 rounded-2xl hover:bg-gray-50 hover:text-indigo-600 transition-all shadow-sm"
          >
            <Printer size={20} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <DesignSidebar 
          onOpenGallery={() => setIsGalleryOpen(true)}
          onOpenAIWizard={() => setIsAiWizardOpen(true)}
          onOpenAIFontWizard={() => setIsAIFontWizardOpen(true)}
          onOpenSuggestion={(type) => { setActiveSuggestionType(type); setIsSuggestionModalOpen(true); }}
          onOpenShopSettings={() => setIsShopSettingsOpen(true)}
          onOpenPhotoEditor={() => setIsPhotoEditorOpen(true)}
        />

        {/* Main Canvas Area */}
        <main className="flex-1 relative bg-neutral-100/50 flex flex-col items-center justify-center overflow-auto custom-scrollbar p-12">
            <EditorCanvas />
            
            {/* Zoom Controller Overlay */}
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/95 backdrop-blur-xl px-4 py-2.5 rounded-[2rem] shadow-2xl border border-white z-40 transition-all hover:scale-105 active:scale-95">
              <button onClick={() => setZoom(Math.max(1, zoom - 0.5))} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors"><ZoomOut size={18} /></button>
              <div className="w-20 text-center flex flex-col items-center">
                <span className="text-[9px] font-black text-indigo-300 uppercase leading-none mb-0.5">Scale</span>
                <span className="text-xs font-black text-indigo-600 tabular-nums">{Math.round((zoom / 3.78) * 100)}%</span>
              </div>
              <button onClick={() => setZoom(Math.min(10, zoom + 0.5))} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors"><ZoomIn size={18} /></button>
              <div className="w-px h-4 bg-gray-100 mx-2" />
              <button onClick={() => setZoom(3.78)} className="flex items-center gap-2 px-4 py-1.5 hover:bg-indigo-50 text-xs font-black text-gray-500 hover:text-indigo-600 rounded-xl transition-all"><Maximize size={14} /> 100%</button>
            </div>
        </main>
      </div>

      {/* Modals Assembly */}
      <PhotoEditModal isOpen={isPhotoEditorOpen} onClose={() => setIsPhotoEditorOpen(false)} />
      <AIWizardModal isOpen={isAiWizardOpen} onClose={() => setIsAiWizardOpen(false)} />
      <AIFontWizardModal isOpen={isAIFontWizardOpen} onClose={() => setIsAIFontWizardOpen(false)} />
      <SuggestionModal isOpen={isSuggestionModalOpen} onClose={() => setIsSuggestionModalOpen(false)} type={activeSuggestionType || 'message'} />
      <GalleryModal isOpen={isGalleryOpen} onClose={() => setIsGalleryOpen(false)} />
      <ShopSettingsModal isOpen={isShopSettingsOpen} onClose={() => setIsShopSettingsOpen(false)} />
      
      {isFormtecModalOpen && (
        <FormtecModal 
          isOpen={isFormtecModalOpen} 
          onClose={() => setIsFormtecModalOpen(false)}
          config={selectedPresetId ? (LABEL_CONFIGS as any)[selectedPresetId] : undefined}
          formtecLabelType={selectedPresetId || ''}
          formtecSelectedCells={[]} // Simplified for now, would need state in store if persist wanted
          setFormtecSelectedCells={() => {}} 
          formtecMessage="" setFormtecMessage={() => {}} 
          formtecFontSize={12} setFormtecFontSize={() => {}}
          formtecIsBold={false} setFormtecIsBold={() => {}}
          formtecTextAlign="center" setFormtecTextAlign={() => {}}
          formtecBgColor="#ffffff" setFormtecBgColor={() => {}}
          formtecTextColor="#000000" setFormtecTextColor={() => {}}
          onPrint={async () => {
             // Logic to call PrintCommander with cells
             toast.success('라벨 PDF 생성을 시작합니다.');
             setIsFormtecModalOpen(false);
          }}
          isGenerating={false}
        />
      )}

      {isGenerating && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-xl z-[200] flex flex-col items-center justify-center animate-in fade-in duration-500">
          <div className="w-20 h-20 border-8 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
          <p className="mt-8 text-xl font-black text-indigo-900 tracking-tighter animate-pulse">Design System Syncing...</p>
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
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading Studio...</div>}>
      <DesignStudioContent />
    </Suspense>
  );
}

function Loader2({ className }: { className?: string }) {
  return <span className={`animate-spin inline-block border-2 border-white/30 border-t-white rounded-full w-3 h-3 ${className}`} />;
}
