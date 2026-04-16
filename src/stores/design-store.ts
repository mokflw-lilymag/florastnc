import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import { createClient } from '@/utils/supabase/client';

// --- Smart Utility: Auto-fitting and Line Breaking ---
export const smartFitText = (text: string, maxWidthMm: number, baseFontSize: number) => {
  if (!text) return { text: '', fontSize: baseFontSize };
  
  // 1. 지능형 줄바꿈 (한국어 조사 기반)
  let processedText = text;
  if (text.length > 15 && !text.includes('\n')) {
    const splitPoints = text.match(/[가-힣]+[은|는|이|가|을|를|에|와|과|도]/g);
    if (splitPoints && splitPoints.length > 0) {
      const point = splitPoints[Math.floor(splitPoints.length / 2)];
      processedText = text.replace(point, point + '\n');
    } else {
      const words = text.split(' ');
      if (words.length > 1) {
        const mid = Math.floor(words.length / 2);
        processedText = words.slice(0, mid).join(' ') + '\n' + words.slice(mid).join(' ');
      }
    }
  }

  // 2. 가변 폰트 사이즈 계산
  let adjustedSize = baseFontSize;
  const lines = processedText.split('\n');
  const longestLine = Math.max(...lines.map(l => l.length));
  
  if (longestLine > 12) adjustedSize = baseFontSize * (12 / longestLine);
  if (lines.length > 2) adjustedSize = adjustedSize * (2 / lines.length);

  return { text: processedText, fontSize: Math.max(adjustedSize, 8) };
};

const supabase = createClient();

export interface TextBlock {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  colorHex: string;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
  zIndex?: number;
  opacity?: number;
  isLocked?: boolean;
  width?: number; // 가로 너비 (mm)
  lineHeight?: number; // 줄 간격 (기본 1.0)
  rotation?: number; // 회전 (도)
  textShadow?: string; // CSS 텍스트 그림자 속성
  strokeColor?: string; // 테두리 색상
  strokeWidth?: number; // 테두리 두께
}

export interface ImageBlock {
  id: string;
  url: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  isPrintable: boolean;
  zIndex?: number;
  rotation?: number; // 회전 (도)
}

export interface Dimension {
  widthMm: number;
  heightMm: number;
}

export type Orientation = 'landscape' | 'portrait';
export type FoldType = 'none' | 'half'; // none: Flat, half: Folding

export interface PageData {
  backgroundUrl: string | null;
  frontBackgroundUrl?: string | null;
  backBackgroundUrl?: string | null;
  textBlocks: TextBlock[];
  imageBlocks: ImageBlock[];
  margins?: { top: number; right: number; bottom: number; left: number };
}

export interface ShopSettings {
  name: string;
  tel: string;
  address: string;
  website: string;
  sns: string;
  logoUrl: string | null;
}

export interface BrandingOptions {
  logo: boolean;
  name: boolean;
  tel: boolean;
  website: boolean;
}

interface EditorState {
  currentDimension: Dimension;
  selectedPresetId: string; // 추가: 현재 선택된 용지 규격 ID
  orientation: Orientation;
  foldType: FoldType;
  
  // Current active page data
  activePage: 'outside' | 'inside';
  backgroundUrl: string | null;
  frontBackgroundUrl: string | null;
  backBackgroundUrl: string | null;
  textBlocks: TextBlock[];
  imageBlocks: ImageBlock[];
  margins: { top: number; right: number; bottom: number; left: number };
  
  // Full pages data
  pages: {
    outside: PageData;
    inside: PageData;
  };
  
  selectedBlockId: string | null;
  selectedBlockIds: string[]; // 다중 선택 지원
  designId: string | null;
  showFoldingGuide: boolean;
  
  // Recipient and Sender info
  recipientName: string;
  senderName: string;
  showToField: boolean;
  showFromField: boolean;
  toBlockId: string | null;
  fromBlockId: string | null;
  suggestedMessageBlockId: string | null;
  suggestedQuoteBlockId: string | null;
  zoom: number;
  isGenerating: boolean;

  shopSettings: ShopSettings;
  tenantId: string | null;

  // Actions
  setZoom: (zoom: number) => void;
  setIsGenerating: (is: boolean) => void;
  setRecipientName: (name: string) => void;
  setSenderName: (name: string) => void;
  setShowToField: (show: boolean) => void;
  setShowFromField: (show: boolean) => void;
  setToBlockId: (id: string | null) => void;
  setFromBlockId: (id: string | null) => void;
  setSuggestedMessageBlockId: (id: string | null) => void;
  setSuggestedQuoteBlockId: (id: string | null) => void;
  setActivePage: (page: 'outside' | 'inside') => void;
  setDimension: (dimension: Dimension, presetId: string) => void;
  setOrientation: (orientation: Orientation) => void;
  setFoldType: (foldType: FoldType) => void;
  setBackgroundUrl: (url: string | null) => void;
  setFrontBackgroundUrl: (url: string | null) => void;
  setBackBackgroundUrl: (url: string | null) => void;
  setMargins: (margins: { top: number; right: number; bottom: number; left: number }) => void;
  addTextBlock: (block: Omit<TextBlock, 'id'>) => string;
  updateTextBlockPosition: (id: string, x: number, y: number) => void;
  updateTextBlockContent: (id: string, updates: Partial<TextBlock>) => void;
  removeTextBlock: (id: string) => void;
  
  addImageBlock: (block: Omit<ImageBlock, 'id'>) => string;
  updateImageBlockPosition: (id: string, x: number, y: number) => void;
  updateImageBlockContent: (id: string, updates: Partial<ImageBlock>) => void;
  removeImageBlock: (id: string) => void;
  
  setSelectedBlockId: (id: string | null) => void;
  setSelectedBlockIds: (ids: string[]) => void;
  toggleBlockSelection: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  saveDesign: (category?: string) => Promise<void>;
  loadDesign: (id?: string) => Promise<void>;
  listDesigns: () => Promise<any[]>;
  setDesignId: (id: string | null) => void;
  setTenantId: (id: string | null) => void;
  toggleFoldingGuide: () => void;

  updateShopSettings: (updates: Partial<ShopSettings>) => void;
  applyShopBranding: (target: 'front' | 'back', options?: BrandingOptions) => void;
  moveSelectedBlocks: (dx: number, dy: number) => void;
  resetDesign: () => void;
  currentOrderId: string | null;
  setCurrentOrderId: (id: string | null) => void;
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      currentDimension: { widthMm: 210, heightMm: 148 },
      selectedPresetId: 'a5',
      orientation: 'landscape',
      foldType: 'half',
      
      activePage: 'outside',
      backgroundUrl: null,
      frontBackgroundUrl: null,
      backBackgroundUrl: null,
      textBlocks: [],
      imageBlocks: [],
      margins: { top: 5, right: 5, bottom: 5, left: 5 },
      pages: {
        outside: { backgroundUrl: null, frontBackgroundUrl: null, backBackgroundUrl: null, textBlocks: [], imageBlocks: [], margins: { top: 5, right: 5, bottom: 5, left: 5 } },
        inside: { backgroundUrl: null, frontBackgroundUrl: null, backBackgroundUrl: null, textBlocks: [], imageBlocks: [], margins: { top: 5, right: 5, bottom: 5, left: 5 } }
      },
      
      shopSettings: { name: '', tel: '', address: '', sns: '', logoUrl: null },
      selectedBlockId: null,
      selectedBlockIds: [],
      designId: null,
      tenantId: null,
      showFoldingGuide: true,
      
      recipientName: '받는 분',
      senderName: '보내는 분',
      showToField: false,
      showFromField: false,
      toBlockId: null,
      fromBlockId: null,
      suggestedMessageBlockId: null,
      suggestedQuoteBlockId: null,
      zoom: 3.78,
      isGenerating: false,
      currentOrderId: null,

      setCurrentOrderId: (id) => set({ currentOrderId: id }),

      resetDesign: () => set((state) => ({
        designId: null,
        currentOrderId: null, // 초기화 시 ID도 비움
        backgroundUrl: null,
        frontBackgroundUrl: null,
        backBackgroundUrl: null,
        textBlocks: [],
        imageBlocks: [],
        selectedBlockId: null,
        selectedBlockIds: [],
        recipientName: '받는 분',
        senderName: '보내는 분',
        showToField: false,
        showFromField: false,
        pages: {
          outside: { 
            ...state.pages.outside,
            backgroundUrl: null, frontBackgroundUrl: null, backBackgroundUrl: null, 
            textBlocks: [], imageBlocks: [] 
          },
          inside: { 
            ...state.pages.inside,
            backgroundUrl: null, frontBackgroundUrl: null, backBackgroundUrl: null, 
            textBlocks: [], imageBlocks: [] 
          }
        }
      })),

      setZoom: (zoom) => set({ zoom }),
      setIsGenerating: (is) => set({ isGenerating: is }),
      setRecipientName: (name) => set({ recipientName: name }),
      setSenderName: (name) => set({ senderName: name }),
      setShowToField: (show) => set({ showToField: show }),
      setShowFromField: (show) => set({ showFromField: show }),
      setToBlockId: (id) => set({ toBlockId: id }),
      setFromBlockId: (id) => set({ fromBlockId: id }),
      setSuggestedMessageBlockId: (id) => set({ suggestedMessageBlockId: id }),
      setSuggestedQuoteBlockId: (id) => set({ suggestedQuoteBlockId: id }),
      
      setActivePage: (page) => {
        const state = get();
        if (state.activePage === page) return;

        // 1. 현재 페이지의 상태를 pages 객체에 저장
        const updatedPages = {
          ...state.pages,
          [state.activePage]: {
            ...state.pages[state.activePage],
            backgroundUrl: state.backgroundUrl,
            frontBackgroundUrl: state.frontBackgroundUrl,
            backBackgroundUrl: state.backBackgroundUrl,
            textBlocks: state.textBlocks,
            imageBlocks: state.imageBlocks,
            margins: state.margins
          }
        };

        // 2. 목적지 페이지 데이터를 로드
        const targetData = updatedPages[page];

        set({
          activePage: page,
          pages: updatedPages,
          backgroundUrl: targetData.backgroundUrl || null,
          frontBackgroundUrl: targetData.frontBackgroundUrl || state.frontBackgroundUrl || null,
          backBackgroundUrl: targetData.backBackgroundUrl || state.backBackgroundUrl || null,
          textBlocks: targetData.textBlocks,
          imageBlocks: targetData.imageBlocks,
          margins: targetData.margins || { top: 5, right: 5, bottom: 5, left: 5 },
          selectedBlockId: null
        });
      },

      setDimension: (dimension, presetId) => set((state) => {
        const scaleX = dimension.widthMm / state.currentDimension.widthMm;
        const scaleY = dimension.heightMm / state.currentDimension.heightMm;
        const scaleFont = Math.min(scaleX, scaleY);

        const isLabel = presetId?.startsWith('formtec-');
        const isCard = presetId === 'a5' || presetId === 'a6' || presetId === 'postcard' || dimension.widthMm === 210;
        const newMargins = { top: 5, right: 5, bottom: 5, left: 5 };
        const newFoldType: FoldType = isLabel ? 'none' : 'half';

        // [지능형 판단] 용지 종류에 따른 자동 정렬 위치 값 (mm 단위)
        const getAutoX = (currentX: number, blockWidth: number = 0) => {
          if (isLabel) return dimension.widthMm / 2 - (blockWidth / 2);
          if (isCard && state.activePage === 'inside') return (dimension.widthMm * 0.75) - (blockWidth / 2);
          if (isCard && state.activePage === 'outside') return (dimension.widthMm * 0.5) - (blockWidth / 2);
          return currentX * scaleX;
        };

        const getAutoY = (currentY: number) => {
          if (isLabel || isCard) return dimension.heightMm * 0.45; // 약간 위쪽 중앙
          return currentY * scaleY;
        };

        const scaleTextBlocks = (blocks: TextBlock[]) => blocks.map(b => {
          const newWidth = b.width ? b.width * scaleX : undefined;
          return {
            ...b,
            x: getAutoX(b.x, b.width),
            y: getAutoY(b.y),
            width: newWidth,
            fontSize: b.fontSize * scaleFont,
          };
        });

        const scaleImageBlocks = (blocks: ImageBlock[]) => blocks.map(b => ({
          ...b,
          x: getAutoX(b.x, b.width),
          y: getAutoY(b.y),
          width: b.width * scaleX,
          height: b.height * scaleY,
        }));

        const updatedPages = {
          outside: {
            ...state.pages.outside,
            margins: newMargins,
            textBlocks: scaleTextBlocks(state.pages.outside.textBlocks),
            imageBlocks: scaleImageBlocks(state.pages.outside.imageBlocks)
          },
          inside: {
            ...state.pages.inside,
            margins: newMargins,
            textBlocks: scaleTextBlocks(state.pages.inside.textBlocks),
            imageBlocks: scaleImageBlocks(state.pages.inside.imageBlocks)
          }
        };

        return { 
          currentDimension: dimension, 
          selectedPresetId: presetId || null,
          foldType: newFoldType,
          margins: newMargins,
          textBlocks: scaleTextBlocks(state.textBlocks),
          imageBlocks: scaleImageBlocks(state.imageBlocks),
          pages: updatedPages
        };
      }),

      setOrientation: (orientation) => set((state) => {
        const { widthMm, heightMm } = state.currentDimension;
        const isLandscape = orientation === 'landscape';
        if ((widthMm > heightMm) === isLandscape) return { orientation };
        
        const newDimension = { widthMm: heightMm, heightMm: widthMm };
        const scaleX = newDimension.widthMm / widthMm;
        const scaleY = newDimension.heightMm / heightMm;
        
        const scaleTextBlocks = (blocks: TextBlock[]) => blocks.map(b => ({
          ...b,
          x: b.x * scaleX,
          y: b.y * scaleY,
          width: b.width ? b.width * scaleX : undefined,
          fontSize: b.fontSize * Math.min(scaleX, scaleY),
        }));

        const scaleImageBlocks = (blocks: ImageBlock[]) => blocks.map(b => ({
          ...b,
          x: b.x * scaleX,
          y: b.y * scaleY,
          width: b.width * scaleX,
          height: b.height * scaleY,
        }));
        
        const updatedPages = {
          outside: { ...state.pages.outside, textBlocks: scaleTextBlocks(state.pages.outside.textBlocks), imageBlocks: scaleImageBlocks(state.pages.outside.imageBlocks) },
          inside: { ...state.pages.inside, textBlocks: scaleTextBlocks(state.pages.inside.textBlocks), imageBlocks: scaleImageBlocks(state.pages.inside.imageBlocks) }
        };

        return {
          orientation,
          currentDimension: newDimension,
          textBlocks: scaleTextBlocks(state.textBlocks),
          imageBlocks: scaleImageBlocks(state.imageBlocks),
          pages: updatedPages
        };
      }),

      setFoldType: (foldType) => set({ foldType }),
      setBackgroundUrl: (url) => set({ backgroundUrl: url }),
      setFrontBackgroundUrl: (url) => set({ frontBackgroundUrl: url }),
      setBackBackgroundUrl: (url) => set({ backBackgroundUrl: url }),
      setMargins: (margins) => set({ margins }),

      addTextBlock: (block) => {
        const { text, fontSize } = smartFitText(block.text || '', 80, block.fontSize || 18);
        const newId = `text-${Math.random().toString(36).substr(2, 9)}`;
        set((state) => {
          const maxZ = Math.max(0, ...state.textBlocks.map(b => b.zIndex || 0), ...state.imageBlocks.map(b => b.zIndex || 0));
          return {
            textBlocks: [...state.textBlocks, { ...block, id: newId, text, fontSize, zIndex: maxZ + 1 }],
            selectedBlockId: newId,
            selectedBlockIds: [newId]
          };
        });
        return newId;
      },

      updateTextBlockPosition: (id, x, y) => set((state) => {
        const block = state.textBlocks.find(b => b.id === id);
        if (!block) return {};
        
        let finalX = x;
        let finalY = y;
        const { margins, currentDimension, foldType } = state;
        const isLandscape = currentDimension.widthMm > currentDimension.heightMm;
        
        // Clamping logic
        let minX = margins.left;
        let maxX = currentDimension.widthMm - margins.right;
        let minY = margins.top;
        let maxY = currentDimension.heightMm - margins.bottom;

        if (foldType === 'half') {
          if (isLandscape) {
            const midX = currentDimension.widthMm / 2;
            if (x < midX) maxX = midX - 2; else minX = midX + 2;
          } else {
            const midY = currentDimension.heightMm / 2;
            if (y < midY) maxY = midY - 2; else minY = midY + 2;
          }
        }

        const halfWidth = (block.width || 0) / 2;
        finalX = Math.max(minX + halfWidth, Math.min(x, maxX - halfWidth));
        finalY = Math.max(minY, Math.min(y, maxY));

        return {
          textBlocks: state.textBlocks.map(b => b.id === id ? { ...b, x: finalX, y: finalY } : b)
        };
      }),

      updateTextBlockContent: (id, updates) => set((state) => ({
        textBlocks: state.textBlocks.map(b => b.id === id ? { ...b, ...updates } : b)
      })),

      removeTextBlock: (id) => set((state) => ({
        textBlocks: state.textBlocks.filter(b => b.id !== id),
        selectedBlockId: state.selectedBlockId === id ? null : state.selectedBlockId,
        toBlockId: state.toBlockId === id ? null : state.toBlockId,
        fromBlockId: state.fromBlockId === id ? null : state.fromBlockId,
        suggestedMessageBlockId: state.suggestedMessageBlockId === id ? null : state.suggestedMessageBlockId,
        suggestedQuoteBlockId: state.suggestedQuoteBlockId === id ? null : state.suggestedQuoteBlockId
      })),

      addImageBlock: (block) => {
        const newId = `image-${Math.random().toString(36).substr(2, 9)}`;
        set((state) => {
          const maxZ = Math.max(0, ...state.textBlocks.map(b => b.zIndex || 0), ...state.imageBlocks.map(b => b.zIndex || 0));
          return {
            imageBlocks: [...state.imageBlocks, { ...block, id: newId, zIndex: maxZ + 1 }],
            selectedBlockId: newId,
            selectedBlockIds: [newId]
          };
        });
        return newId;
      },

      updateImageBlockPosition: (id, x, y) => set((state) => {
        const block = state.imageBlocks.find(b => b.id === id);
        if (!block) return {};
        
        const { margins, currentDimension, foldType } = state;
        const isLandscape = currentDimension.widthMm > currentDimension.heightMm;
        
        let minX = margins.left;
        let maxX = currentDimension.widthMm - margins.right;
        let minY = margins.top;
        let maxY = currentDimension.heightMm - margins.bottom;

        if (foldType === 'half') {
          if (isLandscape) {
            const midX = currentDimension.widthMm / 2;
            if (x + block.width / 2 < midX) maxX = midX - 1; else minX = midX + 1;
          } else {
            const midY = currentDimension.heightMm / 2;
            if (y + block.height / 2 < midY) maxY = midY - 1; else minY = midY + 1;
          }
        }

        const clampedX = Math.max(minX, Math.min(x, maxX - block.width));
        const clampedY = Math.max(minY, Math.min(y, maxY - block.height));

        return {
          imageBlocks: state.imageBlocks.map(b => b.id === id ? { ...b, x: clampedX, y: clampedY } : b)
        };
      }),

      updateImageBlockContent: (id, updates) => set((state) => ({
        imageBlocks: state.imageBlocks.map(b => b.id === id ? { ...b, ...updates } : b)
      })),

      removeImageBlock: (id) => set((state) => ({
        imageBlocks: state.imageBlocks.filter(b => b.id !== id),
        selectedBlockId: state.selectedBlockId === id ? null : state.selectedBlockId
      })),

      setSelectedBlockId: (id) => set({ selectedBlockId: id, selectedBlockIds: id ? [id] : [] }),
      setSelectedBlockIds: (ids) => set({ selectedBlockIds: ids, selectedBlockId: ids.length === 1 ? ids[0] : null }),
      toggleBlockSelection: (id) => set((state) => {
        const isSelected = state.selectedBlockIds.includes(id);
        const newIds = isSelected ? state.selectedBlockIds.filter(bid => bid !== id) : [...state.selectedBlockIds, id];
        return { selectedBlockIds: newIds, selectedBlockId: newIds.length === 1 ? newIds[0] : null };
      }),
      selectAll: () => set((state) => {
        const allIds = [...state.textBlocks.map(b => b.id), ...state.imageBlocks.map(b => b.id)];
        return { selectedBlockIds: allIds, selectedBlockId: allIds.length === 1 ? allIds[0] : null };
      }),
      deselectAll: () => set({ selectedBlockId: null, selectedBlockIds: [] }),

      moveSelectedBlocks: (dx, dy) => set((state) => ({
        textBlocks: state.textBlocks.map(b => state.selectedBlockIds.includes(b.id) ? { ...b, x: b.x + dx, y: b.y + dy } : b),
        imageBlocks: state.imageBlocks.map(b => state.selectedBlockIds.includes(b.id) ? { ...b, x: b.x + dx, y: b.y + dy } : b)
      })),

      saveDesign: async (category?: string) => {
        const state = get();
        const updatedPages = {
          ...state.pages,
          [state.activePage]: {
            backgroundUrl: state.backgroundUrl,
            frontBackgroundUrl: state.frontBackgroundUrl,
            backBackgroundUrl: state.backBackgroundUrl,
            textBlocks: state.textBlocks,
            imageBlocks: state.imageBlocks,
            margins: state.margins
          }
        };

        const data: any = {
          dimension: state.currentDimension,
          orientation: state.orientation,
          fold_type: state.foldType,
          pages: updatedPages,
          category: category || 'general',
          tenant_id: state.tenantId
        };

        if (state.designId) {
          const { error } = await supabase.from('card_designs').update(data).eq('id', state.designId);
          if (error) alert('저장 실패: ' + error.message);
          else alert('성공적으로 저장되었습니다!');
        } else {
          if (!state.tenantId) {
            alert('테넌트 정보가 없어 저장할 수 없습니다.');
            return;
          }
          const { data: inserted, error } = await supabase.from('card_designs').insert(data).select().single();
          if (error) alert('저장 실패: ' + error.message);
          else if (inserted) {
            set({ designId: inserted.id });
            alert('성공적으로 저장되었습니다!');
          }
        }
      },

      listDesigns: async () => {
        const state = get();
        if (!state.tenantId) return [];
        const { data, error } = await supabase
          .from('card_designs')
          .select('*')
          .eq('tenant_id', state.tenantId)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('List error:', error);
          return [];
        }
        return data || [];
      },

      loadDesign: async (id) => {
        const state = get();
        if (!id || !state.tenantId) return;
        const { data, error } = await supabase
          .from('card_designs')
          .select('*')
          .eq('id', id)
          .eq('tenant_id', state.tenantId)
          .single();
        
        if (error || !data) {
          alert('디자인을 불러올 수 없습니다: ' + (error?.message || '조회 실패'));
          return;
        }

        const loadedPages = data.pages;
        set({
          designId: data.id,
          currentDimension: data.dimension,
          orientation: data.orientation,
          foldType: data.fold_type,
          activePage: 'outside',
          pages: loadedPages,
          backgroundUrl: loadedPages.outside.backgroundUrl,
          textBlocks: loadedPages.outside.textBlocks,
          imageBlocks: loadedPages.outside.imageBlocks,
          margins: loadedPages.outside.margins || { top: 5, right: 5, bottom: 5, left: 5 },
          selectedBlockId: null
        });
      },

      setDesignId: (id) => set({ designId: id }),
      setTenantId: (id) => set({ tenantId: id }),
      toggleFoldingGuide: () => set((state) => ({ showFoldingGuide: !state.showFoldingGuide })),

      updateShopSettings: (updates) => set((state) => ({
        shopSettings: { ...state.shopSettings, ...updates }
      })),

      applyShopBranding: (target, options = { logo: true, name: true, tel: true, website: true }) => {
        const { shopSettings, currentDimension, orientation, foldType, margins, addTextBlock, addImageBlock, setActivePage } = get();
        setActivePage('outside');
        
        const isLandscape = orientation === 'landscape';
        const isFolding = foldType === 'half';
        const { widthMm, heightMm } = currentDimension;

        // ── 1. 대상 섹션의 중앙 X, Y를 계산 ──────────────────────────────
        // 접이 카드: 'back'는 왼쪽(가로)/위쪽(세로), 'front'는 오른쪽(가로)/아래쪽(세로)
        // 단면 카드: 전체 캔버스
        let sectionCenterX: number;
        let sectionCenterY: number;
        let rotation = 0;

        if (isFolding) {
          if (isLandscape) {
            // 가로 접이: left half = back, right half = front
            sectionCenterX = target === 'back' ? widthMm * 0.25 : widthMm * 0.75;
            sectionCenterY = heightMm / 2;
          } else {
            // 세로 접이: top half = back (180°), bottom half = front
            sectionCenterX = widthMm / 2;
            if (target === 'front') {
              sectionCenterY = heightMm * 0.75;
              rotation = 0;
            } else {
              sectionCenterY = heightMm * 0.25;
              rotation = 180; // 뒷면은 뒤집혀 인쇄
            }
          }
        } else {
          // 단면
          sectionCenterX = widthMm / 2;
          sectionCenterY = heightMm / 2;
        }

        // ── 2. 브랜딩 요소 크기 정의 ─────────────────────────────────────
        const LOGO_W = 20;     // mm
        const LOGO_H = 20;     // mm
        const TEXT_W = 60;     // mm — 텍스트 블록 너비 (x = center - TEXT_W/2)
        const NAME_H = 7;      // 상호명 텍스트 높이 추정
        const TEL_H = 5;
        const WEB_H = 4;
        const GAP = 2;         // 요소 간 간격

        // ── 3. 전체 브랜딩 블록의 총 높이 계산 ──────────────────────────
        let totalH = 0;
        if (options.logo && shopSettings.logoUrl) totalH += LOGO_H + GAP;
        if (options.name && shopSettings.name)    totalH += NAME_H + GAP;
        if (options.tel  && shopSettings.tel)     totalH += TEL_H  + GAP;
        if (options.website && shopSettings.website) totalH += WEB_H + GAP;
        if (totalH > 0) totalH -= GAP; // 마지막 GAP 제거

        // ── 4. 시작 Y 위치 (섹션 중앙에서 총 높이의 절반을 뺀 위치) ─────
        let currentY = sectionCenterY - totalH / 2;

        // ── 5. 각 요소 배치 ───────────────────────────────────────────────
        if (options.logo && shopSettings.logoUrl) {
          addImageBlock({
            url: shopSettings.logoUrl,
            x: sectionCenterX - LOGO_W / 2,  // 이미지는 좌상단 기준 → 중앙 정렬
            y: currentY,
            width: LOGO_W,
            height: LOGO_H,
            opacity: 1.0,
            rotation: rotation
          });
          currentY += LOGO_H + GAP;
        }

        if (options.name && shopSettings.name) {
          addTextBlock({
            text: shopSettings.name,
            x: sectionCenterX - TEXT_W / 2,   // 텍스트도 좌상단 기준 → 중앙 정렬
            y: currentY,
            fontSize: 9,
            fontFamily: "'GmarketSansBold', sans-serif",
            textAlign: 'center',
            colorHex: '#1e293b',
            width: TEXT_W,
            opacity: 1.0,
            rotation: rotation
          });
          currentY += NAME_H + GAP;
        }

        if (options.tel && shopSettings.tel) {
          addTextBlock({
            text: `Tel. ${shopSettings.tel}`,
            x: sectionCenterX - TEXT_W / 2,
            y: currentY,
            fontSize: 7,
            fontFamily: "'GmarketSansBold', sans-serif",
            textAlign: 'center',
            colorHex: '#475569',
            width: TEXT_W,
            opacity: 0.9,
            rotation: rotation
          });
          currentY += TEL_H + GAP;
        }

        if (options.website && shopSettings.website) {
          addTextBlock({
            text: shopSettings.website,
            x: sectionCenterX - TEXT_W / 2,
            y: currentY,
            fontSize: 6,
            fontFamily: "'Noto Sans KR', sans-serif",
            textAlign: 'center',
            colorHex: '#94a3b8',
            width: TEXT_W,
            opacity: 0.8,
            rotation: rotation
          });
        }
      }
    }),
    { 
      name: 'florasync-design-studio-storage-v2',
      storage: createJSONStorage(() => ({
        getItem: async (name) => await idbGet(name),
        setItem: async (name, value) => await idbSet(name, value),
        removeItem: async (name) => await idbDel(name),
      })),
      partialize: (state) => ({
        currentDimension: state.currentDimension,
        selectedPresetId: state.selectedPresetId,
        orientation: state.orientation,
        foldType: state.foldType,
        shopSettings: state.shopSettings,
        tenantId: state.tenantId,
        margins: state.margins,
        currentOrderId: state.currentOrderId,
      })
    }
  )
);
