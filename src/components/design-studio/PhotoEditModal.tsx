'use client';

/**
 * 🎨 Photo Cover Magic Studio v2.5 (Premium Edition)
 * 제작: Antigravity (Advanced AI Coding Agent)
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  X, Upload, RotateCcw, Check, Loader2, Camera,
  FlipHorizontal, FlipVertical, Move, ZoomIn, ZoomOut,
  RotateCw, Image as ImageIcon, Sparkles, Wand2, 
  Trash2, Layers, Maximize2, Scissors, Smile, Sliders
} from 'lucide-react';
import { useEditorStore } from '@/stores/design-store';
import {
  applyCanvasEffect,
  compositeFrameOnCanvas,
  FILTER_EFFECTS,
  FRAME_DEFS,
} from '@/lib/photo/filterPresets';
import { QUICK_BG_COLORS, removeImageBackground } from '@/lib/photo/backgroundRemoval';

// Dynamic import helper for the heavy AI removal library
let removeBackgroundFn: any = null;
const loadAI = async () => {
  if (!removeBackgroundFn) {
    const mod = await import('@imgly/background-removal');
    // Handle different export patterns (default or named)
    removeBackgroundFn = mod.default || mod.removeBackground || mod;
  }
  return removeBackgroundFn;
};

// --- Types & Constants ---
interface PhotoEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TransformState {
  scale: number;
  x: number;
  y: number;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  opacity: number;
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
}

interface StickerInstance {
  id: string;
  url: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

type TabId = 'enhance' | 'adjust' | 'sticker' | 'frame' | 'nukkgi' | 'crop';
type Orientation = 'portrait' | 'landscape';

const DEFAULT_TRANSFORM: TransformState = {
  scale: 1.0, x: 0, y: 0, rotation: 0,
  flipH: false, flipV: false, opacity: 1.0,
  brightness: 1.0, contrast: 1.0, saturation: 1.0, blur: 0,
};

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'enhance', label: '보정', icon: <Sparkles size={18} /> },
  { id: 'adjust', label: '상세', icon: <Sliders size={18} /> },
  { id: 'nukkgi', label: '누끼', icon: <Scissors size={18} /> },
  { id: 'sticker', label: '스티커', icon: <Smile size={18} /> },
  { id: 'frame', label: '프레임', icon: <ImageIcon size={18} /> },
  { id: 'crop', label: '자르기', icon: <Scissors size={18} /> },
];

const STICKER_CATEGORIES = {
  '❤️ 사랑': [
    { id: 'h1', url: 'https://api.iconify.design/noto:heart-decoration.svg' },
    { id: 'h2', url: 'https://api.iconify.design/noto:heart-with-arrow.svg' },
    { id: 'h3', url: 'https://api.iconify.design/noto:revolving-hearts.svg' },
    { id: 'h4', url: 'https://api.iconify.design/noto:love-letter.svg' },
    { id: 'h5', url: 'https://api.iconify.design/noto:kiss-mark.svg' },
  ],
  '🎉 파티': [
    { id: 'p1', url: 'https://api.iconify.design/noto:party-popper.svg' },
    { id: 'p2', url: 'https://api.iconify.design/noto:confetti-ball.svg' },
    { id: 'p3', url: 'https://api.iconify.design/noto:birthday-cake.svg' },
    { id: 'p4', url: 'https://api.iconify.design/noto:balloon.svg' },
    { id: 'p5', url: 'https://api.iconify.design/noto:clinking-glasses.svg' },
  ],
  '🌸 자연': [
    { id: 'n1', url: 'https://api.iconify.design/noto:cherry-blossom.svg' },
    { id: 'n2', url: 'https://api.iconify.design/noto:sunflower.svg' },
    { id: 'n3', url: 'https://api.iconify.design/noto:four-leaf-clover.svg' },
    { id: 'n4', url: 'https://api.iconify.design/noto:sun-with-face.svg' },
    { id: 'n5', url: 'https://api.iconify.design/noto:rainbow.svg' },
  ],
  '✨ 장식': [
    { id: 'd1', url: 'https://api.iconify.design/noto:star.svg' },
    { id: 'd2', url: 'https://api.iconify.design/noto:sparkles.svg' },
    { id: 'd3', url: 'https://api.iconify.design/noto:ribbon.svg' },
    { id: 'd4', url: 'https://api.iconify.design/noto:gem-stone.svg' },
    { id: 'd5', url: 'https://api.iconify.design/noto:crown.svg' },
  ],
  '😊 미소': [
    { id: 'e1', url: 'https://api.iconify.design/noto:smiling-face-with-heart-eyes.svg' },
    { id: 'e2', url: 'https://api.iconify.design/noto:winking-face-with-tongue.svg' },
    { id: 'e3', url: 'https://api.iconify.design/noto:grinning-face-with-star-eyes.svg' },
    { id: 'e4', url: 'https://api.iconify.design/noto:partying-face.svg' },
    { id: 'e5', url: 'https://api.iconify.design/noto:shushing-face.svg' },
  ]
};

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

const Slider: React.FC<{
  label: string; value: number; min: number; max: number; step: number;
  display?: string; onChange: (v: number) => void; onReset?: () => void;
}> = ({ label, value, min, max, step, display, onChange, onReset }) => (
  <div className="space-y-1.5 p-3 bg-white/50 backdrop-blur-sm rounded-xl border border-gray-100/50">
    <div className="flex justify-between items-center">
      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-black text-rose-600 tabular-nums">{display ?? value.toFixed(2)}</span>
        {onReset && (
          <button onClick={onReset} className="p-1 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors">
            <RotateCcw size={10} />
          </button>
        )}
      </div>
    </div>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="slider-premium w-full h-1.5 rounded-full accent-rose-500 cursor-pointer"
    />
  </div>
);

export const PhotoEditModal: React.FC<PhotoEditModalProps> = ({ isOpen, onClose }) => {
  const {
    foldType, setFrontBackgroundUrl, setBackgroundUrl,
    addImageBlock, currentDimension
  } = useEditorStore();

  // --- Dynamic Cover Area Logic ---
  const isLandscapeSpread = currentDimension?.widthMm >= currentDimension?.heightMm;
  
  // Get actual cover width/height based on fold type
  const actualCoverDim = (foldType === 'half' && currentDimension?.widthMm)
    ? (isLandscapeSpread 
        ? { w: currentDimension.widthMm / 2, h: currentDimension.heightMm } // Vertical fold -> Portrait cover
        : { w: currentDimension.widthMm, h: currentDimension.heightMm / 2 } // Horizontal fold -> Landscape cover
      )
    : { w: currentDimension?.widthMm || 100, h: currentDimension?.heightMm || 150 };

  const currentCardAspect = actualCoverDim.w / actualCoverDim.h;

  const [orientation, setOrientation] = useState<Orientation>(
    actualCoverDim.w >= actualCoverDim.h ? 'landscape' : 'portrait'
  );

  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [prevUrl, setPrevUrl] = useState<string | null>(null);
  const [transform, setTransform] = useState<TransformState>(DEFAULT_TRANSFORM);
  const [frameScale, setFrameScale] = useState(1.0);
  const [activeFrame, setActiveFrame] = useState('none');
  const [bgPhotoUrl, setBgPhotoUrl] = useState<string | null>(null);
  const [selectedBgColor, setSelectedBgColor] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('crop');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMsg, setProcessingMsg] = useState('이미지 처리 중...');
  const [isRemovingBG, setIsRemovingBG] = useState(false);
  const [bgProgress, setBgProgress] = useState(0);
  const [nukkgiDone, setNukkgiDone] = useState(false);
  const [isEraserMode, setIsEraserMode] = useState(false);
  const [eraserSize, setEraserSize] = useState(25);
  const [isMouseInPreview, setIsMouseInPreview] = useState(false);
  const [eraserPos, setEraserPos] = useState({ x: -100, y: -100 });
  const [isPortraitMode, setIsPortraitMode] = useState(false);
  const [portraitBlur, setPortraitBlur] = useState(8);
  const [isVignette, setIsVignette] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [lastEffect, setLastEffect] = useState<string | null>(null);
  const [previewSize, setPreviewSize] = useState({ w: 480, h: 360 });
  const [stickers, setStickers] = useState<StickerInstance[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [stickerCategory, setStickerCategory] = useState<string>('❤️ 사랑');
  const [cropArea, setCropArea] = useState({ x: 10, y: 10, w: 80, h: 80 });
  const [isDrawingCrop, setIsDrawingCrop] = useState(false);
  const [cropStart, setCropStart] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState<string[]>([]);
  const [aiPrompt, setAiPrompt] = useState('핑크빛 구름이 떠있는 몽환적인 저녁 노을');
  const [isGeneratingBG, setIsGeneratingBG] = useState(false);
  const [aiSceneryUrl, setAiSceneryUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const addPhotoInputRef = useRef<HTMLInputElement>(null);
  const bgPhotoInputRef = useRef<HTMLInputElement>(null);
  const previewWrapperRef = useRef<HTMLDivElement>(null);
  const eraserCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingRef = useRef(false);
  const dragLastPosRef = useRef({ x: 0, y: 0 });

  const updateDpi = useCallback((img: HTMLImageElement) => {
    // DPI 체크 로직 생략 (UI 간소화)
  }, []);

  const handleUpload = useCallback(async (file: File) => {
    if (!file?.type.startsWith('image/')) return alert('이미지 파일만 가능합니다.');
    setIsProcessing(true);
    setProcessingMsg('사진을 불러오는 중...');
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const tmpImg = new Image();
      tmpImg.onload = () => {
        setOriginalUrl(dataUrl); setCurrentUrl(dataUrl); setStickers([]);
        const imgAspect = tmpImg.naturalWidth / tmpImg.naturalHeight;
        let initialScale = 0.95;
        if (currentCardAspect && imgAspect > currentCardAspect) { initialScale = (currentCardAspect / imgAspect) * 0.95; }
        // Magic Auto-Fix on upload: subtle boost
        setTransform({ 
          ...DEFAULT_TRANSFORM, 
          scale: initialScale,
          brightness: 1.03,
          contrast: 1.05,
          saturation: 1.1 
        });
        setIsProcessing(false);
      };
      tmpImg.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, [currentCardAspect]);

  useEffect(() => {
    if (!currentUrl || isProcessing) return;
    const reFit = async () => {
      try {
        const img = await loadImage(currentUrl);
        const imgAspect = img.naturalWidth / img.naturalHeight;
        let newScale = 0.95;
        if (imgAspect > currentCardAspect) newScale = (currentCardAspect / imgAspect) * 0.95;
        setTransform(prev => ({ ...prev, scale: newScale, x: 0, y: 0 }));
      } catch (e) {}
    };
    reFit();
  }, [orientation, currentCardAspect]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const pushHistory = useCallback((url: string) => {
    setHistory(prev => [url, ...prev].slice(0, 3));
  }, []);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const [prev, ...rest] = history;
    setCurrentUrl(prev);
    setHistory(rest);
  }, [history]);

  const applyEffect = async (effectId: string) => {
    if (!currentUrl || isProcessing) return;
    const effect = FILTER_EFFECTS[effectId];
    if (!effect) return;
    if (currentUrl) pushHistory(currentUrl);
    setPrevUrl(currentUrl); 
    setIsProcessing(true); 
    setProcessingMsg('효과 적용 중...');
    setLastEffect(effectId);
    try {
      const result = await applyCanvasEffect(currentUrl, effect.fn);
      setCurrentUrl(result);
    } finally { setIsProcessing(false); }
  };

  const applyCrop = async () => {
    if (!currentUrl || isProcessing) return;
    setIsProcessing(true);
    setProcessingMsg('사진 자르는 중...');
    try {
      const img = await loadImage(currentUrl);
      const imgAspect = img.naturalWidth / img.naturalHeight;
      const containerAspect = previewSize.w / previewSize.h;

      let renderW, renderH, offsetX = 0, offsetY = 0;
      if (imgAspect > containerAspect) {
        renderW = previewSize.w;
        renderH = previewSize.w / imgAspect;
        offsetY = (previewSize.h - renderH) / 2;
      } else {
        renderH = previewSize.h;
        renderW = previewSize.h * imgAspect;
        offsetX = (previewSize.w - renderW) / 2;
      }

      const canvas = document.createElement('canvas');
      const boxX = (cropArea.x / 100) * previewSize.w;
      const boxY = (cropArea.y / 100) * previewSize.h;
      const boxW = (cropArea.w / 100) * previewSize.w;
      const boxH = (cropArea.h / 100) * previewSize.h;

      const scaleX = img.naturalWidth / renderW;
      const scaleY = img.naturalHeight / renderH;
      
      const imgX = Math.max(0, (boxX - offsetX) * scaleX);
      const imgY = Math.max(0, (boxY - offsetY) * scaleY);
      const imgW = Math.min(img.naturalWidth - imgX, boxW * scaleX);
      const imgH = Math.min(img.naturalHeight - imgY, boxH * scaleY);

      if (imgW <= 0 || imgH <= 0) throw new Error('Invalid crop area');

      canvas.width = imgW; canvas.height = imgH;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, imgX, imgY, imgW, imgH, 0, 0, imgW, imgH);
      
      const croppedDataUrl = canvas.toDataURL();
      if (currentUrl) pushHistory(currentUrl);
      setCurrentUrl(croppedDataUrl);
      setOriginalUrl(croppedDataUrl); // Sync originalUrl for background blur
      setNukkgiDone(false); // Reset nukkgi so users can re-apply portrait on new crop
      setCropArea({ x: 10, y: 10, w: 80, h: 80 }); 
    } catch(e) { 
      alert('사진 영역 안에서 드래그해주세요!');
    } finally { setIsProcessing(false); }
  };

  const handleAddPhotoLayer = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      addSticker(url);
    };
    reader.readAsDataURL(file);
  }, []);

  const addSticker = (url: string) => {
    // Start with a reasonable size (15% of card width)
    const newSticker: StickerInstance = { id: Date.now().toString(), url, x: 0, y: 0, scale: 0.15, rotation: 0 };
    setStickers(prev => [...prev, newSticker]);
    setSelectedStickerId(newSticker.id);
    setActiveTab('sticker');
  };

  const updateSticker = (id: string, updates: Partial<StickerInstance>) => {
    setStickers(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeSticker = (id: string) => {
    setStickers(prev => prev.filter(s => s.id !== id));
    setSelectedStickerId(null);
  };

  const handleNukkgi = async () => {
    if (!currentUrl) return;
    setIsProcessing(true);
    try {
      const result = await removeImageBackground(currentUrl, (p) => {
        setBgProgress(p);
        setProcessingMsg(p < 30 ? 'AI 분석 중...' : '배경 제거 중...');
      });
      setCurrentUrl(result);
      setNukkgiDone(true);
    } catch { alert('실패했습니다.'); } finally { setIsProcessing(false); }
  };

  const handleAIRemoveBG = async () => {
    if (!currentUrl || isRemovingBG) return;
    setIsEraserMode(false); 
    
    try {
      setIsRemovingBG(true);
      setIsProcessing(true); // Ensure global loading UI is shown
      setProcessingMsg('AI가 인물을 분석하고 있습니다...');
      setBgProgress(10); 
      
      const removeBG = await loadAI();
      
      setBgProgress(30); 
      
      const effectFn = typeof removeBG === 'function' ? removeBG : removeBG.removeBackground;
      if (typeof effectFn !== 'function') {
        throw new Error('AI Engine function not found');
      }

      // imgly removal normally takes blob or url
      const blob = await effectFn(currentUrl, {
        progress: (total: number, current: number) => {
          setBgProgress(Math.min(95, 30 + (current / total) * 60));
        }
      });
      
      const resultUrl = URL.createObjectURL(blob);
      setBgProgress(100);
      
      setTimeout(() => {
        pushHistory(currentUrl);
        setCurrentUrl(resultUrl);
        setIsRemovingBG(false);
        setBgProgress(0);
        setNukkgiDone(true);
        // Automatically turn on portrait mode if it was requested
        setIsPortraitMode(true);
        setIsProcessing(false); // FINALLY close the loading overlay!
      }, 500);
      
    } catch (error) {
      console.error('AI BG Removal failed:', error);
      alert('AI 배경 제거 중 오류가 발생했습니다. 다른 사진으로 시도해보세요!');
      setIsRemovingBG(false);
      setBgProgress(0);
    }
  };

  const applyPreset = (presetName: string) => {
    setActivePreset(presetName);
    pushHistory(currentUrl!);
    
    switch (presetName) {
      case 'romantic':
        setTransform(prev => ({ ...prev, brightness: 1.1, contrast: 1.05, saturation: 1.2 }));
        setLastEffect('romantic');
        break;
      case 'natural':
        setTransform(prev => ({ ...prev, brightness: 1.0, contrast: 1.1, saturation: 0.9 }));
        setLastEffect('natural');
        break;
      case 'golden':
        setTransform(prev => ({ ...prev, brightness: 1.05, contrast: 1.0, saturation: 1.5 }));
        setLastEffect('golden');
        break;
      case 'bw':
        setTransform(prev => ({ ...prev, brightness: 1.1, contrast: 1.2, saturation: 0 }));
        setLastEffect('bw');
        break;
      case 'warm':
        setTransform(prev => ({ ...prev, brightness: 1.05, contrast: 1.0, saturation: 1.1 }));
        setLastEffect('warm');
        break;
      case 'cool':
        setTransform(prev => ({ ...prev, brightness: 1.05, contrast: 1.05, saturation: 0.9 }));
        setLastEffect('cool');
        break;
      default:
        setTransform(prev => ({ ...prev, brightness: 1, contrast: 1, saturation: 1 }));
        setActivePreset(null);
    }
  };

  const handleAutoEnhance = () => {
    pushHistory(currentUrl!);
    setTransform(prev => ({ 
      ...prev, 
      brightness: 1.05, 
      contrast: 1.15, 
      saturation: 1.25 
    }));
    alert('✨ AI 자동 보정이 완료되었습니다!');
  };

  const handlePortraitBlurToggle = () => {
    if (!nukkgiDone) {
      handleAIRemoveBG();
      return;
    }
    setIsPortraitMode(!isPortraitMode);
  };

  const handleAIGenBackground = async () => {
    if (!nukkgiDone) {
      alert('배경을 합성하려면 먼저 [누끼따기]를 실행해주세요!');
      return;
    }
    
    setIsGeneratingBG(true);
    // Simulation of AI generation (Arty's Magic)
    await new Promise(res => setTimeout(res, 3000));
    
    // Using a beautiful nature placeholder for now (In real app, call DALL-E/Midjourney API)
    const mockGeneratedBg = `https://images.unsplash.com/photo-1501854140801-50d01698950b?q=80&w=1200&auto=format&fit=crop`;
    setAiSceneryUrl(mockGeneratedBg);
    setIsGeneratingBG(false);
    setIsPortraitMode(true); // Automatically enable blur for depth
    alert('✨ 아티가 당신의 사진을 위해 환상적인 배경을 그렸습니다!');
  };

  const initEraserCanvas = (imgUrl: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Internal buffer canvas
      const buffer = document.createElement('canvas');
      buffer.width = img.naturalWidth;
      buffer.height = img.naturalHeight;
      const bCtx = buffer.getContext('2d')!;
      bCtx.drawImage(img, 0, 0);
      eraserCanvasRef.current = buffer;

      // Visible preview canvas
      if (previewCanvasRef.current) {
        const pCanvas = previewCanvasRef.current;
        pCanvas.width = img.naturalWidth;
        pCanvas.height = img.naturalHeight;
        const pCtx = pCanvas.getContext('2d')!;
        pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
        pCtx.drawImage(img, 0, 0);
      }
    };
    img.src = imgUrl;
  };

  const performErase = (clientX: number, clientY: number) => {
    if (!isEraserMode || !eraserCanvasRef.current || !previewWrapperRef.current || !previewCanvasRef.current) return;
    
    // We update BOTH internal buffer and visible preview canvas for zero-lag
    const buffer = eraserCanvasRef.current;
    const preview = previewCanvasRef.current;
    const bCtx = buffer.getContext('2d')!;
    const pCtx = preview.getContext('2d')!;
    
    const rect = previewWrapperRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2 + (transform.x / 100) * rect.width;
    const centerY = rect.top + rect.height / 2 + (transform.y / 100) * rect.height;

    let dx = clientX - centerX;
    let dy = clientY - centerY;

    const rad = (-transform.rotation * Math.PI) / 180;
    const rx = dx * Math.cos(rad) - dy * Math.sin(rad);
    const ry = dx * Math.sin(rad) + dy * Math.cos(rad);

    const s = transform.scale;
    const fx = rx / (s * (transform.flipH ? -1 : 1));
    const fy = ry / (s * (transform.flipV ? -1 : 1));

    const imgAspect = buffer.width / buffer.height;
    const containerAspect = rect.width / rect.height;
    
    let renderW, renderH;
    if (imgAspect > containerAspect) {
      renderW = rect.width; renderH = rect.width / imgAspect;
    } else {
      renderH = rect.height; renderW = rect.height * imgAspect;
    }

    const pixelX = (fx / renderW) * buffer.width + buffer.width / 2;
    const pixelY = (fy / renderH) * buffer.height + buffer.height / 2;

    [bCtx, pCtx].forEach(ctx => {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      const actualEraserSize = (eraserSize / (renderW * transform.scale)) * buffer.width;
      ctx.arc(pixelX, pixelY, actualEraserSize, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  const compositeAndApply = async (mode: 'background' | 'block' = 'background') => {
    if (!currentUrl || isProcessing) return;
    setIsProcessing(true);
    setProcessingMsg('고해상도 이미지 처리 중...');
    try {
      const DPI_FACTOR = 11.811;
      
      // CRITICAL: We render ONLY the cover dimensions at high res
      const targetWidth = Math.round(actualCoverDim.w * DPI_FACTOR);
      const targetHeight = Math.round(actualCoverDim.h * DPI_FACTOR);
      
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth; canvas.height = targetHeight;
      const ctx = canvas.getContext('2d', { alpha: true })!;
      
      if (bgPhotoUrl) {
        const bgImg = await loadImage(bgPhotoUrl); ctx.drawImage(bgImg, 0, 0, targetWidth, targetHeight);
      } else if (selectedBgColor) {
        ctx.fillStyle = selectedBgColor; ctx.fillRect(0, 0, targetWidth, targetHeight);
      } else {
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, targetWidth, targetHeight);
      }

      // 1-1. Render AI Background or Blurred Background first
      if (nukkgiDone && (aiSceneryUrl || isPortraitMode)) {
        const bgImg = await loadImage(aiSceneryUrl || originalUrl!);
        const bgAspect = bgImg.naturalWidth / bgImg.naturalHeight;
        const targetAspect = targetWidth / targetHeight;
        
        let bW, bH;
        if (bgAspect > targetAspect) { bW = targetWidth; bH = targetWidth / bgAspect; }
        else { bH = targetHeight; bW = targetHeight * bgAspect; }
        
        ctx.save();
        // AI-like Professional Depth Logic:
        // Lower brightness and saturation for the background
        const bgBrightness = transform.brightness * 0.85;
        const bgSaturation = transform.saturation * 0.75;
        
        if (isPortraitMode) {
          ctx.filter = `blur(${portraitBlur}px) brightness(${bgBrightness}) contrast(${transform.contrast}) saturate(${bgSaturation})`;
        } else {
          ctx.filter = `brightness(${bgBrightness}) contrast(${transform.contrast})`;
        }
        
        ctx.translate(targetWidth / 2 + (transform.x * targetWidth / 100), targetHeight / 2 + (transform.y * targetHeight / 100));
        ctx.rotate((transform.rotation * Math.PI) / 180);
        ctx.scale(transform.scale * (transform.flipH ? -1 : 1), transform.scale * (transform.flipV ? -1 : 1));
        
        ctx.drawImage(bgImg, -bW / 2, -bH / 2, bW, bH);
        ctx.restore();
        ctx.filter = 'none'; // Reset filter
      }

      if (currentUrl) {
        const mainImg = await loadImage(currentUrl);
        const mainAspect = mainImg.naturalWidth / mainImg.naturalHeight;
        const targetAspect = targetWidth / targetHeight;

        let drawW, drawH;
        if (mainAspect > targetAspect) { drawW = targetWidth; drawH = targetWidth / mainAspect; }
        else { drawH = targetHeight; drawW = targetHeight * mainAspect; }

        ctx.save();
        ctx.translate(targetWidth / 2 + (transform.x * targetWidth / 100), targetHeight / 2 + (transform.y * targetHeight / 100));
        ctx.rotate((transform.rotation * Math.PI) / 180);
        
        const scaleX = transform.scale * (transform.flipH ? -1 : 1);
        const scaleY = transform.scale * (transform.flipV ? -1 : 1);
        ctx.scale(scaleX, scaleY);
        
        // --- Subject Pop-out Effect ---
        if (isPortraitMode) {
          ctx.shadowColor = 'rgba(0,0,0,0.3)';
          ctx.shadowBlur = 40;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 15;
        }

        ctx.filter = `brightness(${transform.brightness}) contrast(${transform.contrast}) saturate(${transform.saturation}) blur(${transform.blur}px)`;
        ctx.drawImage(mainImg, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
        ctx.filter = 'none';
        ctx.shadowBlur = 0;

        // 2-2. Render Vignette on Canvas
        if (isVignette) {
          ctx.save();
          const gradient = ctx.createRadialGradient(0, 0, drawW * 0.2, 0, 0, drawW * 0.7);
          gradient.addColorStop(0, 'transparent');
          gradient.addColorStop(1, 'rgba(0,0,0,0.6)');
          ctx.fillStyle = gradient;
          ctx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
          ctx.restore();
        }
      }

      // 3. Render Stickers
      for (const s of stickers) {
        const sImg = await loadImage(s.url);
        const sW = targetWidth * s.scale; 
        const sH = (sW / sImg.naturalWidth) * sImg.naturalHeight;
        
        ctx.save();
        ctx.translate(targetWidth / 2 + (s.x / 100) * targetWidth, targetHeight / 2 + (s.y / 100) * targetHeight);
        ctx.rotate((s.rotation * Math.PI) / 180);
        ctx.drawImage(sImg, -sW / 2, -sH / 2, sW, sH);
        ctx.restore();
      }

      // 4. Render frame LAST so it's on the very top (matches preview z-index)
      if (activeFrame !== 'none') {
        await compositeFrameOnCanvas(ctx, activeFrame, targetWidth, targetHeight);
      }

      const finalUrl = canvas.toDataURL('image/png');
      
      if (mode === 'block') {
        addImageBlock({
          url: finalUrl,
          x: currentDimension.widthMm / 2 - 25,
          y: currentDimension.heightMm / 2 - 25,
          width: 50,
          height: 50,
          isPrintable: true,
          rotation: 0,
        });
      } else {
        foldType === 'half' ? setFrontBackgroundUrl(finalUrl) : setBackgroundUrl(finalUrl);
      }
      onClose();
    } catch (err) { 
      console.error(err);
      alert('고해상도 카드 생성 중 오류가 발생했습니다.'); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const measure = () => {
      if (previewWrapperRef.current) {
        const r = previewWrapperRef.current.getBoundingClientRect();
        setPreviewSize({ w: Math.round(r.width), h: Math.round(r.height) });
      }
    };
    measure(); window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white shadow-2xl rounded-[2.5rem] flex flex-col overflow-hidden animate-in zoom-in duration-300 border border-white/20" style={{ width: 'min(98vw, 1100px)', maxHeight: '92vh' }}>
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-white shrink-0">
          <div className="flex items-center gap-6">
            <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center text-white"><Camera size={20}/></div>
            <div>
              <h2 className="text-base font-black text-gray-900 tracking-tight">아트 레이어 스튜디오</h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex bg-gray-100 p-0.5 rounded-lg w-fit">
                  <button onClick={() => setOrientation('portrait')} className={`px-2 py-0.5 rounded text-[8px] font-black transition-all ${orientation === 'portrait' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-400'}`}>세로형</button>
                  <button onClick={() => setOrientation('landscape')} className={`px-2 py-0.5 rounded text-[8px] font-black transition-all ${orientation === 'landscape' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-400'}`}>가로형</button>
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 border border-rose-100 rounded-lg text-[9px] font-black text-rose-600 hover:bg-rose-100 transition-all"
                >
                  <Upload size={12} />
                  <span>새 사진 불러오기</span>
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {history.length > 0 && (
              <button 
                onClick={handleUndo} 
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-black text-gray-600 hover:bg-gray-100 transition-all"
                title="되돌리기 (최대 3단계)"
              >
                <RotateCcw size={14} className="text-rose-500" />
                <span>되돌리기</span>
                <span className="w-5 h-5 flex items-center justify-center bg-rose-500 text-white rounded-full text-[9px]">{history.length}</span>
              </button>
            )}
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-colors"><X size={20}/></button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 bg-gray-50 flex flex-col items-center justify-center p-8 relative">
            {!currentUrl ? (
              <div className="w-full max-w-sm aspect-video border-2 border-dashed border-gray-300 rounded-3xl flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-gray-100 transition-all" onClick={() => fileInputRef.current?.click()}>
                <Upload size={32} className="text-gray-300"/>
                <p className="text-xs font-black text-gray-500">편집할 사진을 불러오세요</p>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-4 relative">
                <div 
                  ref={previewWrapperRef} 
                  className={`relative shadow-[0_40px_100px_rgba(0,0,0,0.3)] rounded-2xl overflow-hidden bg-white ring-[14px] ring-white transform-gpu ${isDrawingCrop || isDraggingRef.current ? '' : 'transition-all duration-300'} ${isEraserMode ? 'cursor-none' : ''}`} 
                  style={{ 
                    aspectRatio: `${currentCardAspect}`, 
                    width: 'auto', 
                    height: '100%', 
                    maxWidth: '100%', 
                    maxHeight: '540px',
                    minHeight: '300px'
                  }} 
                  onMouseEnter={(e) => {
                    setIsMouseInPreview(true);
                    setEraserPos({ x: e.clientX, y: e.clientY });
                  }}
                  onMouseLeave={() => {
                    setIsMouseInPreview(false);
                    isDraggingRef.current = false;
                    setIsDrawingCrop(false);
                  }}
                  onMouseDown={(e) => { 
                    const r = previewWrapperRef.current?.getBoundingClientRect();
                    if (!r) return;
                    const x = ((e.clientX - r.left) / r.width) * 100;
                    const y = ((e.clientY - r.top) / r.height) * 100;

                    if (isEraserMode) {
                      isDraggingRef.current = true; 
                      if (!eraserCanvasRef.current) initEraserCanvas(currentUrl!);
                      performErase(e.clientX, e.clientY);
                      return;
                    }

                    if (activeTab === 'crop') {
                      setIsDrawingCrop(true);
                      setCropStart({ x, y });
                      setCropArea({ x, y, w: 0, h: 0 });
                    } else {
                      isDraggingRef.current = true; 
                      dragLastPosRef.current = { x: e.clientX, y: e.clientY }; 
                    }
                  }} 
                  onMouseMove={(e) => { 
                    const r = previewWrapperRef.current?.getBoundingClientRect();
                    if (!r) return;

                    // ALWAYS track position for cursor feedback when mode is on
                    if (isEraserMode) {
                      setEraserPos({ x: e.clientX, y: e.clientY });
                      
                      if (isDraggingRef.current) {
                        performErase(e.clientX, e.clientY);
                        return;
                      }
                    }

                    if (activeTab === 'crop' && isDrawingCrop) {
                      const currentX = ((e.clientX - r.left) / r.width) * 100;
                      const currentY = ((e.clientY - r.top) / r.height) * 100;
                      setCropArea({
                        x: Math.min(cropStart.x, currentX),
                        y: Math.min(cropStart.y, currentY),
                        w: Math.abs(currentX - cropStart.x),
                        h: Math.abs(currentY - cropStart.y)
                      });
                      return;
                    }

                    if (!isDraggingRef.current) return; 
                    const dx = ((e.clientX - dragLastPosRef.current.x) / r.width) * 100;
                    const dy = ((e.clientY - dragLastPosRef.current.y) / r.height) * 100;
                    setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
                    dragLastPosRef.current = { x: e.clientX, y: e.clientY };
                  }} 
                  onMouseUp={() => {
                    if (isEraserMode && isDraggingRef.current && eraserCanvasRef.current) {
                      // Finalize erase stroke with high quality and push history
                      const finalUrl = eraserCanvasRef.current.toDataURL('image/png', 1.0);
                      setCurrentUrl(finalUrl);
                      pushHistory(finalUrl); 
                    }
                    isDraggingRef.current = false;
                    setIsDrawingCrop(false);
                  }} 
                  onWheel={(e) => {
                    const delta = e.deltaY > 0 ? -0.05 : 0.05;
                    setTransform(prev => ({ 
                      ...prev, 
                      scale: Math.max(0.1, Math.min(3, prev.scale + delta)) 
                    }));
                  }}
                >
                  <div className="absolute inset-0 bg-gray-50" style={{ background: bgPhotoUrl ? `url(${bgPhotoUrl}) center/cover` : (selectedBgColor || '#eee') }} />
                  
                  {/* Container for main photo with exact transform parity to canvas */}
                  <div 
                    className="absolute inset-0 flex items-center justify-center pointer-events-none select-none transition-transform duration-300 transform-gpu"
                    style={{ 
                      transform: `
                        translate(${transform.x}%, ${transform.y}%) 
                        scale(${transform.scale}) 
                        rotate(${transform.rotation}deg)
                      `,
                      opacity: transform.opacity
                    }}
                  >
                    {isEraserMode ? (
                      <canvas 
                        ref={previewCanvasRef}
                        className={`max-w-full max-h-full object-contain ${transform.flipH ? '-scale-x-100' : ''} ${transform.flipV ? '-scale-y-100' : ''}`}
                        style={{ 
                          filter: `brightness(${transform.brightness}) contrast(${transform.contrast}) saturate(${transform.saturation}) blur(${transform.blur}px)` 
                        }}
                      />
                    ) : (
                      <img 
                        src={currentUrl || ''} 
                        className={`max-w-full max-h-full object-contain transition-transform duration-300 ${transform.flipH ? '-scale-x-100' : ''} ${transform.flipV ? '-scale-y-100' : ''}`}
                        style={{ 
                          filter: `brightness(${transform.brightness}) contrast(${transform.contrast}) saturate(${transform.saturation}) blur(${transform.blur}px) ${isPortraitMode ? 'drop-shadow(0 20px 40px rgba(0,0,0,0.3))' : ''}`
                        }}
                        alt="Main" 
                      />
                    )}

                    {/* Vignette Overlay */}
                    {isVignette && (
                      <div 
                        className="absolute inset-0 pointer-events-none z-[10]"
                        style={{ 
                          background: 'radial-gradient(circle, transparent 40%, rgba(0,0,0,0.6) 100%)'
                        }}
                      />
                    )}

                    {/* Portrait Blur Layer (Composite) */}
                    {(isPortraitMode || aiSceneryUrl) && nukkgiDone && (
                      <>
                        <img 
                          src={aiSceneryUrl || originalUrl!} 
                          className="absolute inset-0 w-full h-full object-contain -z-10 opacity-100 transition-all duration-700"
                          style={{ 
                            filter: `blur(${isPortraitMode ? portraitBlur : 0}px) brightness(${transform.brightness * 0.85}) contrast(${transform.contrast}) saturate(${transform.saturation * 0.75})`
                          }}
                          alt="BG"
                        />
                        {/* Intelligent Vignette for Depth */}
                        <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-black/20 -z-9 pointer-events-none" />
                      </>
                    )}
                  </div>
                  
                  {activeTab === 'crop' && (
                    <div className="absolute inset-0 border-4 border-rose-500/50 bg-black/20 pointer-events-none" style={{ left: `${cropArea.x}%`, top: `${cropArea.y}%`, width: `${cropArea.w}%`, height: `${cropArea.h}%`, zIndex: 10 }}>
                      <div className="absolute inset-0 border border-white/50 flex flex-wrap">
                         {[...Array(4)].map((_, i) => <div key={i} className="w-1/2 h-1/2 border border-white/20" />)}
                      </div>
                      <div className="absolute -top-1 -left-1 w-3 h-3 bg-white border border-rose-500" />
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-white border border-rose-500" />
                      <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-white border border-rose-500" />
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border border-rose-500" />
                    </div>
                  )}

                  {/* Frame layer - Force stretch to fill the container regardless of aspect ratio */}
                  {activeFrame !== 'none' && FRAME_DEFS[activeFrame] && (
                    <div 
                      className="absolute inset-0 pointer-events-none z-[80] [&>svg]:w-full [&>svg]:h-full" 
                      dangerouslySetInnerHTML={{ 
                        __html: FRAME_DEFS[activeFrame].svgTemplate(100, 100)
                          .replace('<svg', '<svg preserveAspectRatio="none"')
                          .replace(/width="[^"]*"/, 'width="100%"')
                          .replace(/height="[^"]*"/, 'height="100%"')
                      }} 
                    />
                  )}
                  
                  {stickers.map(s => (
                    <div 
                      key={s.id} 
                      onClick={(e) => { e.stopPropagation(); setSelectedStickerId(s.id); setActiveTab('sticker'); }} 
                      className={`absolute cursor-move transition-transform duration-200 ${selectedStickerId === s.id ? 'ring-2 ring-rose-500 z-50' : 'z-40'}`} 
                      style={{ 
                        left: `${50+s.x}%`, 
                        top: `${50+s.y}%`, 
                        transform: `translate(-50%, -50%) rotate(${s.rotation}deg)`,
                        width: `${s.scale * 100}%` 
                      }} 
                      onMouseDown={(e) => {
                        if (e.button !== 0) return;
                        e.stopPropagation(); 
                        setSelectedStickerId(s.id);
                        const startX = e.clientX, startY = e.clientY, startSx = s.x, startSy = s.y;
                        const move = (me: MouseEvent) => { 
                          if (previewWrapperRef.current) {
                            const r = previewWrapperRef.current.getBoundingClientRect();
                            updateSticker(s.id, { 
                              x: startSx + ((me.clientX - startX) / r.width) * 100, 
                              y: startSy + ((me.clientY - startY) / r.height) * 100 
                            }); 
                          }
                        };
                        const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
                        window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
                      }}
                    >
                      <img src={s.url} className="w-full h-auto pointer-events-none block" alt="Sticker"/>
                      
                      {/* Selection UI & Handles */}
                      {selectedStickerId === s.id && (
                        <>
                          {/* Top Rotate Handle */}
                          <div 
                            className="absolute -top-10 left-1/2 -translate-x-1/2 w-8 h-8 flex flex-col items-center cursor-alias group/rot"
                            onMouseDown={(e) => {
                              e.stopPropagation(); e.preventDefault();
                              const r = previewWrapperRef.current?.getBoundingClientRect();
                              if (!r) return;
                              const centerX = r.left + r.width * (0.5 + s.x / 100);
                              const centerY = r.top + r.height * (0.5 + s.y / 100);
                              const move = (me: MouseEvent) => {
                                const angle = Math.atan2(me.clientY - centerY, me.clientX - centerX) * (180 / Math.PI) + 90;
                                updateSticker(s.id, { rotation: Math.round(angle) });
                              };
                              const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
                              window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
                            }}
                          >
                            <div className="w-0.5 h-4 bg-rose-500" />
                            <div className="w-6 h-6 bg-white border-2 border-rose-500 rounded-full flex items-center justify-center shadow-lg group-hover/rot:bg-rose-500 group-hover/rot:text-white transition-colors">
                              <RotateCw size={12} />
                            </div>
                          </div>

                          {/* Bottom-Right Resize Handle */}
                          <div 
                            className="absolute -bottom-2 -right-2 w-6 h-6 bg-white border-2 border-rose-500 rounded-full cursor-nwse-resize shadow-lg flex items-center justify-center hover:bg-rose-500 hover:text-white transition-colors"
                            onMouseDown={(e) => {
                              e.stopPropagation(); e.preventDefault();
                              const r = previewWrapperRef.current?.getBoundingClientRect();
                              if (!r) return;
                              const centerX = r.left + r.width * (0.5 + s.x / 100);
                              const centerY = r.top + r.height * (0.5 + s.y / 100);
                              const startDist = Math.hypot(e.clientX - centerX, e.clientY - centerY);
                              const startScale = s.scale;
                              const move = (me: MouseEvent) => {
                                const currentDist = Math.hypot(me.clientX - centerX, me.clientY - centerY);
                                const newScale = Math.max(0.02, Math.min(1.0, (currentDist / startDist) * startScale));
                                updateSticker(s.id, { scale: newScale });
                              };
                              const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
                              window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
                            }}
                          >
                            <Maximize2 size={12} />
                          </div>

                          {/* Delete Button */}
                          <div className="absolute -top-3 -right-3 w-6 h-6 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:bg-rose-700 transition-colors z-[60]" onClick={(e) => { e.stopPropagation(); removeSticker(s.id); }}>
                            <X size={14} strokeWidth={3}/>
                          </div>
                        </>
                      )}
                    </div>
                  ))}

                  {isProcessing && <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center gap-3 text-xs font-black z-[100]"><Loader2 className="animate-spin text-rose-500" size={24}/> {processingMsg}</div>}
                </div>
                <div className="mt-6 flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-md rounded-full border border-gray-100 shadow-sm pointer-events-none">
                  <Move size={12} className="text-gray-400" />
                  <span className="text-[10px] font-black text-gray-400 tracking-tight">드래그로 이동 • 휠로 확대/축소 가능</span>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="w-[320px] border-l border-gray-100 flex flex-col bg-white">
            <div className="flex bg-gray-50 border-b border-gray-100 p-1">
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 flex flex-col items-center py-2.5 rounded-lg transition-all ${activeTab === tab.id ? 'bg-white text-rose-500 shadow-sm' : 'text-gray-400'}`}>
                  {tab.icon}<span className="text-[8px] font-black mt-1 uppercase">{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
              {currentUrl && (
                <>
                  {/* --- PRESETS / ENHANCE --- */}
                  {activeTab === 'enhance' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                       <div className="grid grid-cols-2 gap-3">
                         <button 
                           onClick={handleAutoEnhance}
                           className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-rose-50 to-white border border-rose-100 rounded-3xl hover:border-rose-300 transition-all group shadow-sm"
                         >
                           <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">✨</span>
                           <span className="text-[12px] font-black text-slate-800">자동 보정</span>
                         </button>
                         <button 
                           onClick={handlePortraitBlurToggle}
                           className={`flex flex-col items-center justify-center p-4 border rounded-3xl transition-all group ${isPortraitMode ? 'bg-rose-500 border-rose-600 shadow-lg' : 'bg-white border-slate-100 hover:border-rose-200 shadow-sm'}`}
                         >
                           <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">🌸</span>
                           <span className={`text-[12px] font-black ${isPortraitMode ? 'text-white' : 'text-slate-800'}`}>인물 사진</span>
                         </button>
                       </div>

                       <div className="space-y-3">
                         <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">감성 테마 프리셋</h4>
                         <div className="grid grid-cols-2 gap-2.5">
                           {[
                             { id: 'romantic', label: '로맨틱', icon: '🌷', color: 'from-pink-50' },
                             { id: 'natural', label: '내추럴', icon: '🌿', color: 'from-green-50' },
                             { id: 'golden', label: '골든', icon: '🌟', color: 'from-amber-50' },
                             { id: 'bw', label: '흑백', icon: '⬛', color: 'from-slate-50' },
                             { id: 'warm', label: '따뜻하게', icon: '🌙', color: 'from-orange-50' },
                             { id: 'cool', label: '차갑게', icon: '❄️', color: 'from-blue-50' }
                           ].map(preset => (
                             <button
                               key={preset.id}
                               onClick={() => applyPreset(preset.id)}
                               className={`flex items-center gap-3 p-2.5 border rounded-2xl transition-all ${activePreset === preset.id ? 'border-rose-500 bg-rose-50 ring-1 ring-rose-500' : 'border-slate-100 bg-white hover:border-slate-300'}`}
                             >
                               <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${preset.color} to-white flex items-center justify-center text-lg`}>
                                 {preset.icon}
                               </div>
                               <span className="text-[12px] font-bold text-slate-700">{preset.label}</span>
                             </button>
                           ))}
                         </div>
                       </div>

                       <div className="p-4 bg-slate-900 rounded-[32px] flex items-center justify-between shadow-xl">
                         <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xl">🌘</div>
                           <div>
                             <h5 className="text-[12px] font-bold text-white">비네팅 효과</h5>
                             <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">가장자리 집중 효과</p>
                           </div>
                         </div>
                         <button 
                           onClick={() => { pushHistory(currentUrl!); setIsVignette(!isVignette); }}
                           className={`w-12 h-6 rounded-full relative transition-colors ${isVignette ? 'bg-rose-500' : 'bg-slate-700'}`}
                         >
                           <div className={`absolute top-1 w-4 h-4 rounded-full transition-all bg-white ${isVignette ? 'right-1' : 'left-1'}`} />
                         </button>
                       </div>
                    </div>
                  )}

                  {/* --- ADVANCED ADJUST --- */}
                  {activeTab === 'adjust' && (
                    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
                       <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">정밀 이미지 보정</h3>
                       
                       <div className="p-3 bg-slate-50 rounded-2xl space-y-4">
                         <Slider label="밝기" min={0.4} max={1.6} step={0.01} value={transform.brightness} onChange={v => setTransform(p=>({...p, brightness:v}))} onReset={()=>setTransform(p=>({...p, brightness:1}))} />
                         <Slider label="대비" min={0.4} max={1.6} step={0.01} value={transform.contrast} onChange={v => setTransform(p=>({...p, contrast:v}))} onReset={()=>setTransform(p=>({...p, contrast:1}))} />
                         <Slider label="채도" min={0} max={2} step={0.01} value={transform.saturation} onChange={v => setTransform(p=>({...p, saturation:v}))} onReset={()=>setTransform(p=>({...p, saturation:1}))} />
                         
                         {/* Intelligent Blur Logic: Focus on Background if separated */}
                         {nukkgiDone ? (
                           <Slider 
                             label="배경 흐림 (Portrait)" 
                             min={0} max={40} step={1} 
                             value={portraitBlur} 
                             display={`${portraitBlur}px`} 
                             onChange={v => {
                               setPortraitBlur(v);
                               if (!isPortraitMode) setIsPortraitMode(true);
                             }} 
                             onReset={()=>setPortraitBlur(8)} 
                           />
                         ) : (
                           <Slider 
                             label="전체 소프트 포커스" 
                             min={0} max={4} step={0.5} 
                             value={transform.blur} 
                             display={`${transform.blur}px`} 
                             onChange={v => setTransform(p=>({...p, blur:v}))} 
                             onReset={()=>setTransform(p=>({...p, blur:0}))} 
                           />
                         )}
                       </div>

                       <div className="space-y-3">
                         <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">배치 및 구도</h3>
                         <div className="grid grid-cols-2 gap-2">
                           <button onClick={() => setTransform(p=>({...p, flipH:!p.flipH}))} className="p-3 bg-white border border-slate-100 rounded-2xl text-[11px] font-black flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm"><FlipHorizontal size={14}/> 가로반전</button>
                           <button onClick={() => setTransform(p=>({...p, flipV:!p.flipV}))} className="p-3 bg-white border border-slate-100 rounded-2xl text-[11px] font-black flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm"><FlipVertical size={14}/> 세로반전</button>
                         </div>
                         <div className="p-3 bg-slate-50 rounded-2xl space-y-4">
                            <Slider label="줌 (Scale)" min={0.1} max={3} step={0.01} value={transform.scale} display={`${Math.round(transform.scale*100)}%`} onChange={v => setTransform(p=>({...p, scale:v}))} onReset={()=>setTransform(p=>({...p, scale:1}))} />
                            <Slider label="회전 (Angle)" min={-180} max={180} step={1} value={transform.rotation} display={`${transform.rotation}°`} onChange={v => setTransform(p=>({...p, rotation:v}))} onReset={()=>setTransform(p=>({...p, rotation:0}))} />
                         </div>
                       </div>
                    </div>
                  )}

                  {/* --- OTHER TABS --- */}
                  {activeTab === 'crop' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-left-2">
                       <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">사진 자르기 도구</h3>
                       <div className="bg-rose-50 p-5 rounded-[32px] border border-rose-100 flex items-start gap-4">
                          <div className="w-10 h-10 bg-rose-500 rounded-full flex items-center justify-center text-white shrink-0 shadow-lg shadow-rose-200"><Scissors size={18}/></div>
                          <div>
                            <p className="text-[12px] font-black text-rose-600 mb-0.5">드래그해서 선택하세요</p>
                            <p className="text-[10px] font-bold text-rose-400 leading-tight">마우스로 사진 위를 드래그하면 자를 구역이 지정됩니다.</p>
                          </div>
                       </div>
                       <button onClick={applyCrop} className="group relative w-full py-5 bg-slate-900 text-white rounded-[32px] text-sm font-black hover:bg-black transition-all shadow-xl shadow-gray-200 overflow-hidden mt-4">
                         <span className="relative z-10 flex items-center justify-center gap-2">선택 영역 자르기 적용 <Check size={18}/></span>
                         <div className="absolute inset-0 bg-gradient-to-r from-rose-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                       </button>
                    </div>
                  )}

                  {activeTab === 'sticker' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
                      <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-100 rounded-2xl">
                        {Object.keys(STICKER_CATEGORIES).map(cat => (
                          <button key={cat} onClick={() => setStickerCategory(cat)} className={`flex-1 px-2 py-2 rounded-xl text-[10px] font-black transition-all ${stickerCategory === cat ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{cat}</button>
                        ))}
                      </div>
                      <div className="grid grid-cols-4 gap-3 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                        {STICKER_CATEGORIES[stickerCategory as keyof typeof STICKER_CATEGORIES].map(s => (
                          <button key={s.id} onClick={() => addSticker(s.url)} className="p-1.5 bg-slate-50 rounded-2xl border border-transparent hover:border-rose-300 transition-all hover:scale-110 shadow-sm hover:shadow-md"><img src={s.url} className="w-full h-full" alt="S"/></button>
                        ))}
                      </div>
                      <div className="pt-2 border-t border-slate-100">
                        <button onClick={() => addPhotoInputRef.current?.click()} className="w-full py-4 bg-rose-50 text-rose-600 rounded-[28px] flex items-center justify-center gap-2 text-[11px] font-black hover:bg-rose-100 transition-all shadow-sm">
                           <ImageIcon size={16} /> 갤러리에서 사진 레이어 추가
                        </button>
                      </div>
                      
                      {selectedStickerId && (
                        <div className="p-5 bg-gradient-to-br from-rose-50 to-white rounded-[32px] space-y-4 border border-rose-100 animate-in zoom-in-95 duration-200 shadow-lg">
                          <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-2">
                             <div className="w-2 h-4 bg-rose-500 rounded-full" /> 스티커 상세 조절
                          </div>
                          <Slider 
                            label="크기" min={0.01} max={1.0} step={0.01} 
                            value={stickers.find(s=>s.id===selectedStickerId)?.scale || 0.2} 
                            display={`${Math.round((stickers.find(s=>s.id===selectedStickerId)?.scale || 0.2) * 100)}%`}
                            onChange={v => updateSticker(selectedStickerId, {scale: v})} 
                          />
                          <Slider 
                            label="회전" min={-180} max={180} step={1} 
                            value={stickers.find(s=>s.id===selectedStickerId)?.rotation || 0} 
                            display={`${stickers.find(s=>s.id===selectedStickerId)?.rotation || 0}°`}
                            onChange={v => updateSticker(selectedStickerId, {rotation: v})} 
                            onReset={() => updateSticker(selectedStickerId, {rotation: 0})}
                          />
                          <button onClick={() => removeSticker(selectedStickerId)} className="w-full py-3.5 bg-rose-500 text-white rounded-2xl text-[11px] font-black shadow-xl shadow-rose-200 hover:bg-rose-600 transition-all">이 스티커 삭제</button>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'frame' && (
                    <div className="grid grid-cols-2 gap-3 animate-in fade-in">
                       <h3 className="col-span-2 text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">프레임 및 테두리</h3>
                      {Object.keys(FRAME_DEFS).map(id => (
                        <button key={id} onClick={() => setActiveFrame(id)} className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-2 ${activeFrame === id ? 'border-rose-500 bg-rose-50 text-rose-600 shadow-inner' : 'bg-slate-50 border-transparent text-slate-400 hover:border-slate-200 hover:bg-white'}`}>
                          <span className="text-2xl">{FRAME_DEFS[id]?.emoji || '🚫'}</span>
                          <span className="text-[11px] font-black uppercase tracking-tighter">{FRAME_DEFS[id]?.label || '없음'}</span>
                        </button>
                      ))}
                    </div>
                  )}
                {/* Nuqi (BG Removal) Tab */}
                {activeTab === 'nukkgi' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-2">
                    <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100 text-center space-y-4 shadow-sm">
                      <div className="relative w-20 h-20 mx-auto">
                        <div className="absolute inset-0 bg-white rounded-full flex items-center justify-center shadow-lg text-rose-500 animate-pulse">
                          <Scissors size={40} />
                        </div>
                        {isRemovingBG && (
                          <div className="absolute inset-[-4px] border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                        )}
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-black text-slate-800">AI 마법 배경 제거</h4>
                        <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                          복잡한 배경도 AI가 클릭 한 번으로<br/>
                          깔끔하게 지워드립니다.
                        </p>
                      </div>
                      
                      {!nukkgiDone || isRemovingBG ? (
                        <button 
                          onClick={handleAIRemoveBG}
                          disabled={isRemovingBG}
                          className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-black text-sm transition-all
                            ${isRemovingBG 
                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                              : 'bg-black text-white hover:bg-gray-800 shadow-xl shadow-gray-200 active:scale-95'
                            }`}
                        >
                          {isRemovingBG ? (
                            <>
                              <Loader2 className="animate-spin" size={20} />
                              배경 분석 중.. ({Math.floor(bgProgress)}%)
                            </>
                          ) : (
                            <>
                              <Wand2 size={20} className="text-rose-400" />
                              AI 배경 제거 시작
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="space-y-3">
                           <div className="py-3 px-4 bg-white border-2 border-green-100 rounded-2xl flex items-center justify-center gap-2 text-[11px] font-black text-green-600">
                             <Check size={16} /> 배경 제거 완료!
                           </div>
                           
                           {/* Eraser Toggle */}
                           <div className={`p-4 rounded-2xl border-2 transition-all ${isEraserMode ? 'bg-rose-500 border-rose-500 shadow-lg' : 'bg-white border-rose-100'}`}>
                             <div className="flex items-center justify-between mb-3">
                               <div className="flex items-center gap-2">
                                 <Scissors className={isEraserMode ? 'text-white' : 'text-rose-500'} size={16} />
                                 <span className={`text-[12px] font-black ${isEraserMode ? 'text-white' : 'text-slate-700'}`}>수동 지우개 가동</span>
                               </div>
                               <button 
                                 onClick={() => {
                                   if (!isEraserMode && currentUrl) initEraserCanvas(currentUrl);
                                   setIsEraserMode(!isEraserMode);
                                 }}
                                 className={`w-12 h-6 rounded-full relative transition-colors ${isEraserMode ? 'bg-white' : 'bg-slate-200'}`}
                               >
                                 <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${isEraserMode ? 'right-1 bg-rose-500' : 'left-1 bg-white shadow-sm'}`} />
                               </button>
                             </div>
                             
                             {isEraserMode && (
                               <div className="space-y-2 animate-in fade-in zoom-in-95">
                                 <div className="flex justify-between text-[10px] font-bold text-white/80 uppercase">
                                   <span>지우개 크기</span>
                                   <span>{eraserSize}px</span>
                                 </div>
                                 <input 
                                   type="range" min="1" max="100" value={eraserSize}
                                   onChange={(e) => setEraserSize(Number(e.target.value))}
                                   className="w-full h-1 bg-white/30 rounded-full accent-white cursor-pointer"
                                 />
                                 <p className="text-[9px] text-white/70 leading-tight">지우고 싶은 잔여물 위를 드래그하세요.</p>
                               </div>
                             )}
                           </div>

                           <button 
                             onClick={() => { setNukkgiDone(false); handleAIRemoveBG(); }}
                             className="w-full py-3 bg-gray-50 text-gray-400 rounded-xl text-[10px] font-bold hover:bg-gray-100 transition-colors"
                           >
                             AI로 다시 분석하기
                           </button>
                        </div>
                      )}

                      {isRemovingBG && (
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-2">
                          <div 
                            className="bg-rose-500 h-full transition-all duration-300"
                            style={{ width: `${bgProgress}%` }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="p-5 bg-slate-900 rounded-[32px] space-y-4 shadow-2xl relative overflow-hidden group border border-white/5 mt-4">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full" />
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg rotate-3 group-hover:rotate-0 transition-transform">
                            <Wand2 size={22} />
                          </div>
                          <div>
                            <h4 className="text-[13px] font-black text-white">AI 마법 배경 합성</h4>
                            <p className="text-[9px] text-indigo-400 font-black uppercase tracking-widest">Arty's Special AI Scenery</p>
                          </div>
                       </div>

                       <div className="bg-white/5 rounded-2xl p-3 border border-white/10 group-focus-within:border-indigo-500/50 transition-colors">
                          <label className="text-[9px] font-black text-indigo-300 uppercase block mb-2 px-1 tracking-tighter">아티의 배경 추천 프롬프트</label>
                          <textarea 
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            className="w-full bg-transparent text-white text-[11px] font-bold outline-none resize-none h-16 leading-relaxed custom-scrollbar placeholder:text-slate-600"
                            placeholder="어떤 배경을 원하시나요?"
                          />
                       </div>

                       <button 
                         onClick={handleAIGenBackground}
                         disabled={isGeneratingBG || !nukkgiDone}
                         className={`w-full py-4 rounded-[28px] text-[13px] font-black transition-all flex items-center justify-center gap-2 shadow-2xl ${
                           nukkgiDone 
                           ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white hover:scale-[1.02] active:scale-[0.98]' 
                           : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                         }`}
                       >
                         {isGeneratingBG ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="animate-spin" size={18}/>
                              <span className="animate-pulse">아티가 배경을 그리는 중...</span>
                            </div>
                         ) : (
                            <>
                              <Sparkles size={18} className="text-amber-300" />
                              <span>새로운 AI 세계 합성 시작</span>
                            </>
                         )}
                       </button>
                       {!nukkgiDone && (
                          <p className="text-[9px] text-indigo-400/70 text-center font-bold">배경 제거 후에 새로운 배경을 만들 수 있어요!</p>
                       )}
                    </div>
                  </div>
                )}
                </>
              )}
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50/50 space-y-2">
               <button 
                onClick={() => { 
                  setTransform(DEFAULT_TRANSFORM); 
                  setStickers([]); 
                  setActiveFrame('none'); 
                  if (originalUrl) setCurrentUrl(originalUrl);
                  setHistory([]);
                  setLastEffect(null);
                }} 
                className="w-full py-2 bg-white border border-gray-200 rounded-lg text-[10px] font-bold text-gray-500 hover:bg-white flex items-center justify-center gap-2 transition-all shadow-sm"
               >
                 <Trash2 size={12} /> 전체 초기화
               </button>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => compositeAndApply('background')} 
                  disabled={!currentUrl || isProcessing} 
                  className="py-4 bg-gray-900 text-white rounded-xl text-xs font-black shadow-lg hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Maximize2 size={14} /> 배경으로 설정
                </button>
                <button 
                  onClick={() => compositeAndApply('block')} 
                  disabled={!currentUrl || isProcessing} 
                  className="py-4 bg-rose-500 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-200 hover:bg-rose-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Layers size={14} /> 이미지 레이어 추가
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cursor feedback for Eraser - Root Level to avoid Z-index/Stacking context issues */}
      {isEraserMode && isMouseInPreview && (
        <div 
          className="fixed pointer-events-none rounded-full z-[99999] -translate-x-1/2 -translate-y-1/2 shadow-[0_0_0_1px_white,0_0_0_2px_black] flex items-center justify-center transition-none bg-rose-500/20"
          style={{ 
            width: `${eraserSize * 2}px`, 
            height: `${eraserSize * 2}px`,
            left: `${eraserPos.x}px`,
            top: `${eraserPos.y}px`,
            border: '1px solid rgba(255,255,255,0.8)'
          }}
        >
           <div className="w-1 h-1 bg-white rounded-full" />
        </div>
      )}

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); }} />
      <input ref={addPhotoInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleAddPhotoLayer(f); }} />
      <input ref={bgPhotoInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = (re) => setBgPhotoUrl(re.target?.result as string); r.readAsDataURL(f); }}} />

      <style jsx global>{`
        .slider-premium { -webkit-appearance: none; background: #eee; border-radius: 10px; height: 3px; }
        .slider-premium::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; background: white; border: 2.5px solid #f43f5e; border-radius: 50%; cursor: pointer; }
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #ddd; border-radius: 10px; }
      `}</style>
    </div>
  );
};
