import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import { createClient } from '@/utils/supabase/client';

// --- Smart Utility: Auto-fitting and Line Breaking ---
export const smartFitText = (text: string, maxWidthMm: number, baseFontSize: number) => {
  if (!text) return { text: '', fontSize: baseFontSize };

  // 1. 지능형 줄바꿈 고도화 (이미 줄바꿈이 있거나 텍스트가 짧으면 수행하지 않음)
  let processedText = text;
  if (text.length > 20 && !text.includes('\n')) {
    // 한국어 조사 및 공백 기반 분할 지점 탐색
    const words = text.split(' ');
    if (words.length > 3) {
      const mid = Math.floor(words.length / 2);
      processedText = words.slice(0, mid).join(' ') + '\n' + words.slice(mid).join(' ');
    } else {
      // 아주 긴 단어 하나만 있는 특수한 경우를 위한 방어 로직
      const splitPoints = text.match(/[가-힣]{2,}[은|는|이|가|을|를|에|와|과|도]/g);
      if (splitPoints && splitPoints.length > 0) {
        const point = splitPoints[Math.floor(splitPoints.length / 2)];
        processedText = text.replace(point, point + '\n');
      }
    }
  }

  // 2. 가변 폰트 사이즈 계산 (너비에 맞춰 자동으로 줄어듦)
  let adjustedSize = baseFontSize;
  const lines = processedText.split('\n');
  const longestLine = Math.max(...lines.map(l => l.length));

  // 기준을 좀 더 넉넉하게 조정
  if (longestLine > 15) adjustedSize = baseFontSize * (15 / longestLine);
  if (lines.length > 2) adjustedSize = adjustedSize * (2 / lines.length);

  return { text: processedText, fontSize: Math.max(adjustedSize, 7) };
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
  lineHeight?: number; // 줄 간격 (기본 1.6)
  letterSpacing?: number; // 자간 (mm 또는 em, 여기선 mm 기준 가공 예정)
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
  opacity?: number; // 투명도 (0~1)
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
  selectedPresetId: string | null; // 추가: 현재 선택된 용지 규격 ID
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
  formtecSelectedCells: number[];
  formtecAdditionalMessage: string;

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
  setFormtecSelectedCells: (cells: number[]) => void;
  setFormtecAdditionalMessage: (msg: string) => void;
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
  alignDesignCenter: (specificDimension?: { widthMm: number, heightMm: number }) => void;
  setPaperSize: (dimension: { widthMm: number, heightMm: number }) => void;
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
      margins: { top: 15, right: 15, bottom: 15, left: 15 },
      pages: {
        outside: { backgroundUrl: null, frontBackgroundUrl: null, backBackgroundUrl: null, textBlocks: [], imageBlocks: [], margins: { top: 15, right: 15, bottom: 15, left: 15 } },
        inside: { backgroundUrl: null, frontBackgroundUrl: null, backBackgroundUrl: null, textBlocks: [], imageBlocks: [], margins: { top: 15, right: 15, bottom: 15, left: 15 } }
      },

      shopSettings: { name: '', tel: '', address: '', website: '', sns: '', logoUrl: null },
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
      formtecSelectedCells: [],
      formtecAdditionalMessage: '',

      setCurrentOrderId: (id) => set({ currentOrderId: id }),
      setFormtecSelectedCells: (cells) => set({ formtecSelectedCells: cells }),
      setFormtecAdditionalMessage: (msg) => set({ formtecAdditionalMessage: msg }),

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
      setRecipientName: (name) => {
        const state = get();
        set({ recipientName: name });
        if (state.toBlockId) {
          state.updateTextBlockContent(state.toBlockId, { text: `To. ${name}` });
        }
      },
      setSenderName: (name) => {
        const state = get();
        set({ senderName: name });
        if (state.fromBlockId) {
          state.updateTextBlockContent(state.fromBlockId, { text: `From. ${name}` });
        }
      },
      setShowToField: (show) => {
        const state = get();
        if (show === state.showToField) return;

        if (show) {
          const { widthMm } = state.currentDimension;
          const { margins } = state;
          const isLandscape = widthMm > state.currentDimension.heightMm;

          // 우측 상단 배치 (정밀 계산)
          const blockWidth = (widthMm / 2) - margins.right - 20;
          const x = isLandscape
            ? (widthMm / 2 + (widthMm - margins.right)) / 2
            : margins.left;
          const y = margins.top + 10;

          const id = state.addTextBlock({
            text: `To. ${state.recipientName || '수령인'}`,
            x, y,
            fontSize: 14,
            width: blockWidth,
            textAlign: isLandscape ? 'center' : 'left',
            colorHex: '#1e293b',
            fontFamily: "'Gowun Batang', serif"
          });
          set({ showToField: true, toBlockId: id });
        } else {
          if (state.toBlockId) state.removeTextBlock(state.toBlockId);
          set({ showToField: false, toBlockId: null });
        }
      },
      setShowFromField: (show) => {
        const state = get();
        if (show === state.showFromField) return;

        if (show) {
          const { widthMm, heightMm } = state.currentDimension;
          const { margins } = state;
          const isLandscape = widthMm > heightMm;

          // 우측 하단 배치 (정밀 계산)
          const blockWidth = (widthMm / 2) - margins.right - 20;
          const x = isLandscape
            ? (widthMm / 2 + (widthMm - margins.right)) / 2
            : widthMm - margins.right;
          const y = heightMm - margins.bottom - 20;

          const id = state.addTextBlock({
            text: `From. ${state.senderName || '발신인'}`,
            x, y,
            fontSize: 12,
            width: blockWidth,
            textAlign: isLandscape ? 'center' : 'right',
            colorHex: '#475569',
            fontFamily: "'Gowun Batang', serif"
          });
          set({ showFromField: true, fromBlockId: id });
        } else {
          if (state.fromBlockId) state.removeTextBlock(state.fromBlockId);
          set({ showFromField: false, fromBlockId: null });
        }
      },
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

        const wasLabel = state.selectedPresetId?.startsWith('formtec-');
        const isLabel = presetId?.startsWith('formtec-');
        const isCard = presetId === 'a5' || presetId === 'a6' || presetId === 'postcard' || dimension.widthMm === 210;
        const panelWidth = isCard ? dimension.widthMm / 2 : dimension.widthMm;
        const newMargins = { top: 10, right: 10, bottom: 10, left: 10 };
        const newFoldType: FoldType = isLabel ? 'none' : 'half';
        const newActivePage: PageSide = (wasLabel && isCard) ? 'inside' : state.activePage;

        // [지능형 판단] 용지 종류에 따른 자동 정렬 위치 값 (mm 단위)
        const getAutoX = (currentX: number, blockWidth: number = 0, targetPage: PageSide) => {
          if (isLabel) return (dimension.widthMm / 2) - (blockWidth / 2);
          
          if (isCard) {
            const panelStartX = dimension.widthMm / 2;
            const panelCenter = panelStartX + (panelWidth / 2);
            return panelCenter - (blockWidth / 2); // 왼쪽 상단 좌표 반환
          }
          
          return currentX * scaleX;
        };

        const getAutoWidth = (currentWidth: number | undefined) => {
          if (!currentWidth) return undefined;
          const scaledWidth = currentWidth * scaleX;
          if (isCard) return Math.min(scaledWidth, panelWidth - 20);
          return scaledWidth;
        };

        const getAutoY = (currentY: number, blockHeight: number = 0) => {
          if (isLabel || isCard) return (dimension.heightMm * 0.45) - (blockHeight / 2); // 위쪽 중앙 기준 왼쪽 상단 좌표
          return currentY * scaleY;
        };

        const scaleTextBlocks = (blocks: TextBlock[], targetPage: PageSide) => blocks.map(b => {
          const newW = getAutoWidth(b.width) || panelWidth * 0.8;
          return {
            ...b,
            x: getAutoX(b.x, newW, targetPage),
            y: getAutoY(b.y),
            width: newW,
            fontSize: b.fontSize * scaleFont,
          };
        });

        const scaleImageBlocks = (blocks: ImageBlock[], targetPage: PageSide) => blocks.map(b => {
          const newW = getAutoWidth(b.width) || panelWidth * 0.5;
          return {
            ...b,
            x: getAutoX(b.x, newW, targetPage),
            y: getAutoY(b.y),
            width: newW,
            height: b.height * scaleY,
          };
        });

        // 라벨에서 카드로 갈 때는 현재 내용을 내지로 복사
        const sourceTextBlocks = (wasLabel && isCard) ? state.textBlocks : state.pages.outside.textBlocks;
        const sourceImageBlocks = (wasLabel && isCard) ? state.imageBlocks : state.pages.outside.imageBlocks;

        const updatedPages = {
          outside: {
            ...state.pages.outside,
            margins: newMargins,
            textBlocks: scaleTextBlocks(state.pages.outside.textBlocks, 'outside'),
            imageBlocks: scaleImageBlocks(state.pages.outside.imageBlocks, 'outside')
          },
          inside: {
            ...state.pages.inside,
            margins: newMargins,
            textBlocks: scaleTextBlocks((wasLabel && isCard) ? state.textBlocks : state.pages.inside.textBlocks, 'inside'),
            imageBlocks: scaleImageBlocks((wasLabel && isCard) ? state.imageBlocks : state.pages.inside.imageBlocks, 'inside')
          }
        };

        return {
          currentDimension: dimension,
          selectedPresetId: presetId || null,
          foldType: newFoldType,
          activePage: newActivePage,
          margins: newMargins,
          textBlocks: newActivePage === 'inside' ? updatedPages.inside.textBlocks : updatedPages.outside.textBlocks,
          imageBlocks: newActivePage === 'inside' ? updatedPages.inside.imageBlocks : updatedPages.outside.imageBlocks,
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
        const newId = `text-${Math.random().toString(36).substr(2, 9)}`;

        // [총괄 교정] 폰트 크기 강제 축소 방지: 넘겨받은 fontSize가 있으면 그대로 사용
        const { text, fontSize: autoFontSize } = smartFitText(block.text || '', 80, block.fontSize || 18);
        const finalFontSize = block.fontSize || autoFontSize;

        set((state) => {
          const maxZ = Math.max(0, ...state.textBlocks.map(b => b.zIndex || 0), ...state.imageBlocks.map(b => b.zIndex || 0));
          return {
            textBlocks: [...state.textBlocks, { ...block, id: newId, text, fontSize: finalFontSize, zIndex: maxZ + 1 }],
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

        const blockWidth = block.width || 0;
        finalX = Math.max(minX, Math.min(x, maxX - blockWidth));
        finalY = Math.max(minY, Math.min(y, maxY));

        return {
          textBlocks: state.textBlocks.map(b => b.id === id ? { ...b, x: finalX, y: finalY } : b)
        };
      }),

      updateTextBlockContent: (id, updates) => set((state) => {
        // [지능형 폰트 동기화] 본문(메시지)이나 수발신자 중 하나의 폰트가 바뀌면 나머지도 같이 변경 (명언은 독립적)
        const isSyncGroup = id === state.toBlockId || id === state.fromBlockId || id === state.suggestedMessageBlockId;

        if (updates.fontFamily && isSyncGroup) {
          return {
            textBlocks: state.textBlocks.map(b => {
              const shouldSync = b.id === state.toBlockId || b.id === state.fromBlockId || b.id === state.suggestedMessageBlockId;
              return shouldSync ? { ...b, ...updates } : (b.id === id ? { ...b, ...updates } : b);
            })
          };
        }

        return {
          textBlocks: state.textBlocks.map(b => b.id === id ? { ...b, ...updates } : b)
        };
      }),

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

        const tenantIdForSave = state.tenantId || 'demo-tenant';

        const data: any = {
          dimension: state.currentDimension,
          orientation: state.orientation,
          fold_type: state.foldType,
          pages: updatedPages,
          category: category || 'general',
          tenant_id: tenantIdForSave
        };

        if (state.designId) {
          const { error } = await supabase.from('card_designs').update(data).eq('id', state.designId);
          if (error) {
            console.error('Save update error:', error);
            alert('저장 실패: ' + error.message);
          } else {
            alert('성공적으로 업데이트되었습니다!');
          }
        } else {
          const { data: inserted, error } = await supabase.from('card_designs').insert(data).select().single();
          if (error) {
            console.error('Save insert error:', error);
            alert('신규 저장 실패: ' + error.message);
          } else if (inserted) {
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
          margins: loadedPages.outside.margins || { top: 10, right: 10, bottom: 10, left: 10 },
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
        const { shopSettings, currentDimension, orientation, foldType, addTextBlock, addImageBlock, setActivePage } = get();
        setActivePage('outside');

        const isLandscape = orientation === 'landscape';
        const isFolding = foldType === 'half';
        const { widthMm, heightMm } = currentDimension;

        let sectionCenterX: number;
        let sectionCenterY: number;
        let rotation = 0;

        if (isFolding) {
          if (isLandscape) {
            const leftPageCenter = widthMm / 4;
            const rightPageCenter = (widthMm * 3) / 4;
            sectionCenterX = target === 'back' ? leftPageCenter : rightPageCenter;
            sectionCenterY = heightMm / 2;
          } else {
            sectionCenterX = widthMm / 2;
            const topPageCenter = heightMm / 4;
            const bottomPageCenter = (heightMm * 3) / 4;
            if (target === 'front') {
              sectionCenterY = bottomPageCenter;
              rotation = 0;
            } else {
              sectionCenterY = topPageCenter;
              rotation = 180;
            }
          }
        } else {
          sectionCenterX = widthMm / 2;
          sectionCenterY = heightMm / 2;
        }

        const LOGO_W = 20;
        const LOGO_H = 20;
        const TEXT_W = isFolding ? (widthMm / 2 - 20) : (widthMm - 20);
        const NAME_H = 7;
        const TEL_H = 5;
        const WEB_H = 4;
        const GAP = 2;

        let totalH = 0;
        if (options.logo && shopSettings.logoUrl) totalH += LOGO_H + GAP;
        if (options.name && shopSettings.name) totalH += NAME_H + GAP;
        if (options.tel && shopSettings.tel) totalH += TEL_H + GAP;
        if (options.website && shopSettings.website) totalH += WEB_H + GAP;
        if (totalH > 0) totalH -= GAP;

        let currentY = sectionCenterY - totalH / 2;

        if (options.logo && shopSettings.logoUrl) {
          addImageBlock({
            url: shopSettings.logoUrl,
            x: sectionCenterX,
            y: currentY + (LOGO_H / 2),
            width: LOGO_W,
            height: LOGO_H,
            opacity: 1.0,
            rotation: rotation,
            isPrintable: true
          });
          currentY += LOGO_H + GAP;
        }

        if (options.name && shopSettings.name) {
          addTextBlock({
            text: shopSettings.name,
            x: sectionCenterX,
            y: currentY + (NAME_H / 2),
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
            x: sectionCenterX - (TEXT_W / 2),
            y: currentY,
          });
          currentY += TEL_H + GAP;
        }
      },
      setPaperSize: (dimension) => set({ currentDimension: dimension }),
      alignDesignCenter: (specificDimension) => {
        const state = get();
        const { textBlocks, imageBlocks, currentDimension, activePage, pages, selectedPresetId } = state;
        const targetDimension = specificDimension || currentDimension;
        const isCard = selectedPresetId === 'a5' || selectedPresetId === 'a6' || selectedPresetId === 'postcard' || targetDimension.widthMm === 210;
        
        if (textBlocks.length === 0 && imageBlocks.length === 0) return;

        // [지능형 영역 판단] 카드인 경우 우측 패널 중앙을 목표로 함
        const targetAreaX = isCard ? targetDimension.widthMm * 0.5 : 0;
        const targetAreaWidth = isCard ? targetDimension.widthMm * 0.5 : targetDimension.widthMm;

        // 1. Calculate bounding box
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        [...textBlocks, ...imageBlocks].forEach(block => {
          const w = block.width || (('text' in block) ? targetAreaWidth * 0.8 : 20);
          const h = block.height || (('text' in block) ? 10 : 20);
          minX = Math.min(minX, block.x);
          minY = Math.min(minY, block.y);
          maxX = Math.max(maxX, block.x + w);
          maxY = Math.max(maxY, block.y + h);
        });

        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        
        // 2. [특수 로직] 단일 블록일 경우
        if (textBlocks.length === 1 && imageBlocks.length === 0) {
          const b = textBlocks[0];
          const newW = Math.min(b.width || targetAreaWidth * 0.8, targetAreaWidth - 20);
          const newTextBlocks = [{
            ...b,
            width: newW,
            x: targetAreaX + (targetAreaWidth - newW) / 2, // 패널 내 중앙 배치 (왼쪽 상단 좌표)
            y: (targetDimension.heightMm - (b.height || 20)) / 2,
            textAlign: 'center' as const
          }];
          set({
            textBlocks: newTextBlocks,
            pages: { ...pages, [activePage]: { ...pages[activePage], textBlocks: newTextBlocks } }
          });
          return;
        }

        // 3. 다중 블록 일괄 이동
        const offsetX = targetAreaX + (targetAreaWidth - contentWidth) / 2 - minX;
        const offsetY = (targetDimension.heightMm - contentHeight) / 2 - minY;

        const newTextBlocks = textBlocks.map(b => ({ ...b, x: b.x + offsetX, y: b.y + offsetY }));
        const newImageBlocks = imageBlocks.map(b => ({ ...b, x: b.x + offsetX, y: b.y + offsetY }));

        set({
          textBlocks: newTextBlocks,
          imageBlocks: newImageBlocks,
          pages: {
            ...pages,
            [activePage]: {
              ...pages[activePage],
              textBlocks: newTextBlocks,
              imageBlocks: newImageBlocks
            }
          }
        });
      }
    }),
    {
      name: 'floxync-design-studio-storage-v2',
      storage: createJSONStorage(() => ({
        getItem: async (name) => (await idbGet(name)) ?? null,
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
