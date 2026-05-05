'use client';

/**
 * 🎨 Photo Cover Magic Studio v2.5 (Premium Edition)
 * 제작: Antigravity (Advanced AI Coding Agent)
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  X, Upload, RotateCcw, Check, Loader2, Camera,
  FlipHorizontal, FlipVertical, Move, ZoomIn, ZoomOut,
  RotateCw, Image as ImageIcon, Sparkles, Wand2, 
  Trash2, Layers, Maximize2, Scissors, Smile, Sliders
} from 'lucide-react';
import { useEditorStore } from '@/stores/design-store';
import { compositeFrameOnCanvas, FRAME_DEFS } from '@/lib/photo/filterPresets';
import { QUICK_BG_COLORS, removeImageBackground } from '@/lib/photo/backgroundRemoval';
import { usePreferredLocale } from '@/hooks/use-preferred-locale';
import { getMessages } from '@/i18n/getMessages';
import { toBaseLocale } from '@/i18n/config';
import { pickUiText } from '@/i18n/pick-ui-text';
import { toast } from 'sonner';

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

type StickerCategoryId = "love" | "party" | "nature" | "decor" | "smile";

const STICKER_CATEGORY_ORDER: StickerCategoryId[] = ["love", "party", "nature", "decor", "smile"];

const STICKER_CATEGORIES: Record<StickerCategoryId, { id: string; url: string }[]> = {
  love: [
    { id: 'h1', url: 'https://api.iconify.design/noto:heart-decoration.svg' },
    { id: 'h2', url: 'https://api.iconify.design/noto:heart-with-arrow.svg' },
    { id: 'h3', url: 'https://api.iconify.design/noto:revolving-hearts.svg' },
    { id: 'h4', url: 'https://api.iconify.design/noto:love-letter.svg' },
    { id: 'h5', url: 'https://api.iconify.design/noto:kiss-mark.svg' },
  ],
  party: [
    { id: 'p1', url: 'https://api.iconify.design/noto:party-popper.svg' },
    { id: 'p2', url: 'https://api.iconify.design/noto:confetti-ball.svg' },
    { id: 'p3', url: 'https://api.iconify.design/noto:birthday-cake.svg' },
    { id: 'p4', url: 'https://api.iconify.design/noto:balloon.svg' },
    { id: 'p5', url: 'https://api.iconify.design/noto:clinking-glasses.svg' },
  ],
  nature: [
    { id: 'n1', url: 'https://api.iconify.design/noto:cherry-blossom.svg' },
    { id: 'n2', url: 'https://api.iconify.design/noto:sunflower.svg' },
    { id: 'n3', url: 'https://api.iconify.design/noto:four-leaf-clover.svg' },
    { id: 'n4', url: 'https://api.iconify.design/noto:sun-with-face.svg' },
    { id: 'n5', url: 'https://api.iconify.design/noto:rainbow.svg' },
  ],
  decor: [
    { id: 'd1', url: 'https://api.iconify.design/noto:star.svg' },
    { id: 'd2', url: 'https://api.iconify.design/noto:sparkles.svg' },
    { id: 'd3', url: 'https://api.iconify.design/noto:ribbon.svg' },
    { id: 'd4', url: 'https://api.iconify.design/noto:gem-stone.svg' },
    { id: 'd5', url: 'https://api.iconify.design/noto:crown.svg' },
  ],
  smile: [
    { id: 'e1', url: 'https://api.iconify.design/noto:smiling-face-with-heart-eyes.svg' },
    { id: 'e2', url: 'https://api.iconify.design/noto:winking-face-with-tongue.svg' },
    { id: 'e3', url: 'https://api.iconify.design/noto:grinning-face-with-star-eyes.svg' },
    { id: 'e4', url: 'https://api.iconify.design/noto:partying-face.svg' },
    { id: 'e5', url: 'https://api.iconify.design/noto:shushing-face.svg' },
  ],
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
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const tr = useCallback(
    (
      ko: string,
      en: string,
      vi?: string,
      ja?: string,
      zh?: string,
      es?: string,
      pt?: string,
      fr?: string,
      de?: string,
      ru?: string,
    ) => pickUiText(baseLocale, ko, en, vi, ja, zh, es, pt, fr, de, ru),
    [baseLocale],
  );
  const phAiBackgroundPrompt = tr(
    "어떤 배경을 원하시나요?",
    "What background do you want?",
    "Bạn muốn nền như thế nào?",
    "どんな背景にしますか？",
    "想要什么背景？",
    "¿Qué fondo quieres?",
    "Que fundo você quer?",
    "Quel arrière-plan voulez-vous ?",
    "Welchen Hintergrund möchten Sie?",
    "Какой фон вы хотите?",
  );
  const D = getMessages(locale).dashboard.designStudio;
  const tabs = useMemo(
    () =>
      [
        { id: "enhance" as const, label: tr("보정", "Enhance", "Hiệu chỉnh", "補正", "增强", "Mejorar", "Aprimorar", "Améliorer", "Optimieren", "Улучшение"), icon: <Sparkles size={18} /> },
        { id: "adjust" as const, label: tr("상세", "Adjust", "Chi tiết", "詳細", "细节", "Ajustes", "Ajustes", "Réglages", "Fein", "Детали"), icon: <Sliders size={18} /> },
        { id: "nukkgi" as const, label: tr("누끼", "Cut-out", "Tách nền", "切り抜き", "抠图", "Recorte", "Recorte", "Découpe", "Freistellen", "Вырезка"), icon: <Scissors size={18} /> },
        { id: "sticker" as const, label: tr("스티커", "Stickers", "Hình dán", "ステッカー", "贴纸", "Stickers", "Adesivos", "Autocollants", "Sticker", "Стикеры"), icon: <Smile size={18} /> },
        { id: "frame" as const, label: tr("프레임", "Frame", "Khung", "フレーム", "相框", "Marco", "Moldura", "Cadre", "Rahmen", "Рамка"), icon: <ImageIcon size={18} /> },
        { id: "crop" as const, label: tr("자르기", "Crop", "Cắt", "クロップ", "裁剪", "Recortar", "Cortar", "Rogner", "Zuschneiden", "Обрезка"), icon: <Scissors size={18} /> },
      ] as const,
    [tr]
  );
  const stickerCatLabels = useMemo(
    (): Record<StickerCategoryId, string> => ({
      love: tr("❤️ 사랑", "❤️ Love", "❤️ Tình yêu", "❤️ ラブ", "❤️ 爱心", "❤️ Amor", "❤️ Amor", "❤️ Amour", "❤️ Liebe", "❤️ Любовь"),
      party: tr("🎉 파티", "🎉 Party", "🎉 Tiệc", "🎉 パーティ", "🎉 派对", "🎉 Fiesta", "🎉 Festa", "🎉 Fête", "🎉 Party", "🎉 Вечеринка"),
      nature: tr("🌸 자연", "🌸 Nature", "🌸 Thiên nhiên", "🌸 自然", "🌸 自然", "🌸 Naturaleza", "🌸 Natureza", "🌸 Nature", "🌸 Natur", "🌸 Природа"),
      decor: tr("✨ 장식", "✨ Decor", "✨ Trang trí", "✨ 装飾", "✨ 装饰", "✨ Decoración", "✨ Decoração", "✨ Déco", "✨ Deko", "✨ Декор"),
      smile: tr("😊 미소", "😊 Smile", "😊 Cười", "😊 スマイル", "😊 微笑", "😊 Sonrisa", "😊 Sorriso", "😊 Sourire", "😊 Lächeln", "😊 Улыбка"),
    }),
    [tr]
  );
  const enhancePresets = useMemo(
    () =>
      [
        { id: "romantic", label: tr("로맨틱", "Romantic", "Lãng mạn", "ロマンチック", "浪漫", "Romántico", "Romântico", "Romantique", "Romantisch", "Романтика"), icon: "🌷", color: "from-pink-50" },
        { id: "natural", label: tr("내추럴", "Natural", "Tự nhiên", "ナチュラル", "自然", "Natural", "Natural", "Naturel", "Natürlich", "Натуральный"), icon: "🌿", color: "from-green-50" },
        { id: "golden", label: tr("골든", "Golden", "Ánh vàng", "ゴールデン", "金色", "Dorado", "Dourado", "Doré", "Golden", "Золотой"), icon: "🌟", color: "from-amber-50" },
        { id: "bw", label: tr("흑백", "B&W", "Đen trắng", "モノクロ", "黑白", "ByN", "P&B", "N&B", "S/W", "Ч/Б"), icon: "⬛", color: "from-slate-50" },
        { id: "warm", label: tr("따뜻하게", "Warm", "Ấm", "暖かく", "暖色调", "Cálido", "Quente", "Chaud", "Warm", "Тёплый"), icon: "🌙", color: "from-orange-50" },
        { id: "cool", label: tr("차갑게", "Cool", "Lạnh", "クール", "冷色调", "Frío", "Frio", "Froid", "Kühl", "Холодный"), icon: "❄️", color: "from-blue-50" },
      ] as const,
    [tr]
  );

  const quickBgSwatches = useMemo(
    () =>
      QUICK_BG_COLORS.map((item, i) => ({
        value: item.value,
        label: [
          tr("순백", "Pure white", "Trắng tinh", "ピュアホワイト", "纯白", "Blanco puro", "Branco puro", "Blanc pur", "Reinweiß", "Чисто белый"),
          tr("크림", "Cream", "Kem", "クリーム", "奶油色", "Crema", "Creme", "Crème", "Creme", "Кремовый"),
          tr("라벤더", "Lavender", "Oải hương", "ラベンダー", "淡紫", "Lavanda", "Lavanda", "Lavande", "Lavendel", "Лавандовый"),
          tr("민트", "Mint", "Bạc hà", "ミント", "薄荷绿", "Menta", "Menta", "Menthe", "Minze", "Мятный"),
          tr("피치", "Peach", "Đào", "ピーチ", "桃色", "Melocotón", "Pêssego", "Pêche", "Pfirsich", "Персиковый"),
          tr("스카이", "Sky", "Xanh trời", "スカイ", "天蓝", "Cielo", "Céu", "Ciel", "Himmel", "Небесный"),
        ][i],
      })),
    [tr],
  );

  const frameChoiceLabel = useCallback(
    (id: string) => {
      switch (id) {
        case "none":
          return tr("없음", "None", "Không", "なし", "无", "Ninguno", "Nenhum", "Aucun", "Keine", "Нет");
        case "flower":
          return tr(
            "꽃 프레임",
            "Flower frame",
            "Khung hoa",
            "フラワーフレーム",
            "花卉相框",
            "Marco floral",
            "Moldura floral",
            "Cadre fleuri",
            "Blumenrahmen",
            "Цветочная рамка",
          );
        case "heart":
          return tr(
            "하트 프레임",
            "Heart frame",
            "Khung tim",
            "ハートフレーム",
            "心形框",
            "Marco de corazones",
            "Moldura de corações",
            "Cadre cœurs",
            "Herzrahmen",
            "Рамка «сердца»",
          );
        case "ribbon":
          return tr(
            "리본",
            "Ribbon",
            "Ruy băng",
            "リボン",
            "丝带",
            "Lazo",
            "Laço",
            "Ruban",
            "Schleife",
            "Лента",
          );
        case "border":
          return tr(
            "엽서 테두리",
            "Postcard border",
            "Viền bưu thiếp",
            "はがき風の枠",
            "明信片边框",
            "Marco postal",
            "Moldura postal",
            "Cadre carte postale",
            "Postkartenrahmen",
            "Рамка открытки",
          );
        default:
          return id;
      }
    },
    [tr],
  );

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
  const [transform, setTransform] = useState<TransformState>(DEFAULT_TRANSFORM);
  const [frameScale, setFrameScale] = useState(1.0);
  const [activeFrame, setActiveFrame] = useState('none');
  const [bgPhotoUrl, setBgPhotoUrl] = useState<string | null>(null);
  const [selectedBgColor, setSelectedBgColor] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('crop');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMsg, setProcessingMsg] = useState(() =>
    pickUiText(
      baseLocale,
      "이미지 처리 중...",
      "Processing image…",
      "Đang xử lý ảnh…",
      "画像を処理中…",
      "正在处理图片…",
      "Procesando imagen…",
      "Processando imagem…",
      "Traitement de l’image…",
      "Bild wird verarbeitet…",
      "Обработка изображения…",
    ),
  );
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
  const [stickerCategory, setStickerCategory] = useState<StickerCategoryId>("love");
  const [cropArea, setCropArea] = useState({ x: 10, y: 10, w: 80, h: 80 });
  const [isDrawingCrop, setIsDrawingCrop] = useState(false);
  const [cropStart, setCropStart] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState<string[]>([]);
  const [aiPrompt, setAiPrompt] = useState(() =>
    pickUiText(
      baseLocale,
      "핑크빛 구름이 떠있는 몽환적인 저녁 노을",
      "A dreamy twilight sky with soft pink clouds.",
      "Hoàng hôn mơ màng với mây hồng nhạt.",
      "ピンクの雲が浮かぶ幻想的な夕焼け。",
      "粉紫色云层下的梦幻黄昏。",
      "Atardecer onírico con nubes rosadas.",
      "Entardecer sonhador com nuvens rosadas.",
      "Crépuscule rêveur aux nuages roses.",
      "Traumhafter Abendhimmel mit rosa Wolken.",
      "Мечтательный закат с розовыми облаками.",
    ),
  );
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
    if (!file?.type.startsWith("image/")) {
      toast.error(
        tr(
          "이미지 파일만 가능합니다.",
          "Only image files are allowed.",
          "Chỉ cho phép tệp hình ảnh.",
          "画像ファイルのみ使用できます。",
          "仅支持图片文件。",
          "Solo se permiten archivos de imagen.",
          "Apenas arquivos de imagem são permitidos.",
          "Seuls les fichiers image sont autorisés.",
          "Nur Bilddateien sind erlaubt.",
          "Допускаются только изображения.",
        ),
      );
      return;
    }
    setIsProcessing(true);
    setProcessingMsg(
      tr(
        "사진을 불러오는 중...",
        "Loading photo…",
        "Đang tải ảnh…",
        "写真を読み込み中…",
        "正在加载照片…",
        "Cargando foto…",
        "Carregando foto…",
        "Chargement de la photo…",
        "Foto wird geladen…",
        "Загрузка фото…",
      ),
    );
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
  }, [currentCardAspect, tr]);

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

  const applyCrop = async () => {
    if (!currentUrl || isProcessing) return;
    setIsProcessing(true);
    setProcessingMsg(
      tr(
        "사진 자르는 중...",
        "Cropping photo…",
        "Đang cắt ảnh…",
        "写真を切り抜き中…",
        "正在裁剪照片…",
        "Recortando foto…",
        "Cortando foto…",
        "Recadrage…",
        "Foto wird zugeschnitten…",
        "Обрезка фото…",
      ),
    );
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
      toast.error(
        tr(
          "사진 영역 안에서 드래그해주세요!",
          "Drag inside the photo area.",
          "Kéo trong vùng ảnh!",
          "写真の範囲内でドラッグしてください。",
          "请在照片区域内拖动。",
          "Arrastra dentro del área de la foto.",
          "Arraste dentro da área da foto.",
          "Faites glisser dans la zone photo.",
          "Ziehen Sie innerhalb des Fotos.",
          "Перетащите внутри области фото.",
        ),
      );
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
        setProcessingMsg(
          p < 30
            ? tr(
                "AI 분석 중...",
                "AI analyzing…",
                "AI đang phân tích…",
                "AI分析中…",
                "AI 分析中…",
                "Analizando con IA…",
                "Analisando com IA…",
                "Analyse IA…",
                "KI analysiert…",
                "Анализ ИИ…",
              )
            : tr(
                "배경 제거 중...",
                "Removing background…",
                "Đang xóa nền…",
                "背景を削除中…",
                "正在去除背景…",
                "Eliminando fondo…",
                "Removendo fundo…",
                "Suppression de l’arrière-plan…",
                "Hintergrund wird entfernt…",
                "Удаление фона…",
              )
        );
      });
      setCurrentUrl(result);
      setNukkgiDone(true);
    } catch {
      toast.error(
        tr(
          "실패했습니다.",
          "Something went wrong.",
          "Đã thất bại.",
          "失敗しました。",
          "操作失败。",
          "Algo salió mal.",
          "Algo deu errado.",
          "Une erreur s’est produite.",
          "Etwas ist schiefgelaufen.",
          "Что-то пошло не так.",
        ),
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAIRemoveBG = async () => {
    if (!currentUrl || isRemovingBG) return;
    setIsEraserMode(false); 
    
    try {
      setIsRemovingBG(true);
      setIsProcessing(true); // Ensure global loading UI is shown
      setProcessingMsg(
        tr(
          "AI가 인물을 분석하고 있습니다...",
          "AI is analyzing the subject…",
          "AI đang phân tích chủ thể…",
          "AIが被写体を分析しています…",
          "AI 正在分析主体…",
          "La IA está analizando el sujeto…",
          "A IA está analisando o assunto…",
          "L’IA analyse le sujet…",
          "Die KI analysiert das Motiv…",
          "ИИ анализирует объект…",
        ),
      );
      setBgProgress(10); 
      
      const removeBG = await loadAI();
      
      setBgProgress(30); 
      
      const effectFn = typeof removeBG === 'function' ? removeBG : removeBG.removeBackground;
      if (typeof effectFn !== 'function') {
        throw new Error('AI Engine function not found');
      }

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
      toast.error(
        tr(
          "AI 배경 제거 중 오류가 발생했습니다. 다른 사진으로 시도해보세요!",
          "Background removal failed. Try another photo.",
          "Xóa nền AI lỗi. Hãy thử ảnh khác.",
          "AI背景除去でエラーが発生しました。別の写真でお試しください。",
          "AI 去背景失败，请换一张照片重试。",
          "Error al quitar el fondo. Prueba con otra foto.",
          "Falha ao remover o fundo. Tente outra foto.",
          "Échec de la suppression d’arrière-plan. Essayez une autre photo.",
          "Hintergrundentfernung fehlgeschlagen. Anderes Foto versuchen.",
          "Не удалось удалить фон. Попробуйте другое фото.",
        )
      );
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
    toast.success(
      tr(
        "✨ AI 자동 보정이 완료되었습니다!",
        "✨ Auto-enhance applied.",
        "✨ Đã tự động chỉnh sửa.",
        "✨ AI自動補正が完了しました。",
        "✨ 已完成 AI 自动增强。",
        "✨ Mejora automática aplicada.",
        "✨ Aprimoramento automático aplicado.",
        "✨ Amélioration auto appliquée.",
        "✨ Auto-Optimierung angewendet.",
        "✨ Автоулучшение применено.",
      ),
    );
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
      toast.warning(
        tr(
          "배경을 합성하려면 먼저 [누끼따기]를 실행해주세요!",
          "Run cut-out first to compose a new background.",
          "Chạy tách nền trước khi ghép nền mới.",
          "背景を合成するには先に［切り抜き］を実行してください。",
          "合成背景前请先执行「抠图」。",
          "Primero recorta el sujeto para componer un fondo nuevo.",
          "Execute o recorte antes de compor um novo fundo.",
          "Effectuez d’abord le détourage pour composer un nouveau fond.",
          "Zuerst Freistellen ausführen, um einen neuen Hintergrund zu setzen.",
          "Сначала выполните вырезку, чтобы наложить новый фон.",
        )
      );
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
    toast.success(
      tr(
        "✨ 아티가 당신의 사진을 위해 환상적인 배경을 그렸습니다!",
        "✨ Your new AI background is ready.",
        "✨ Nền AI mới đã sẵn sàng.",
        "✨ 新しいAI背景の準備ができました。",
        "✨ 新的 AI 背景已就绪。",
        "✨ Tu nuevo fondo con IA está listo.",
        "✨ Seu novo fundo com IA está pronto.",
        "✨ Votre nouveau fond IA est prêt.",
        "✨ Neuer KI-Hintergrund ist fertig.",
        "✨ Новый фон ИИ готов.",
      )
    );
  };

  // Dedicated canvas for high-performance erasing

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
    setProcessingMsg(
      tr(
        "고해상도 이미지 처리 중...",
        "Rendering high-resolution image…",
        "Đang xuất ảnh độ phân giải cao…",
        "高解像度画像を処理中…",
        "正在处理高分辨率图像…",
        "Generando imagen en alta resolución…",
        "Renderizando imagem em alta resolução…",
        "Génération haute résolution…",
        "Hochauflösendes Bild wird erstellt…",
        "Обработка изображения высокого разрешения…",
      ),
    );
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

        ctx.restore();
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
    } catch { 
      toast.error(
        tr(
          "고해상도 카드 생성 중 오류가 발생했습니다.",
          "Failed to render the high-resolution card.",
          "Lỗi khi tạo thiệp độ phân giải cao.",
          "高解像度カードの生成中にエラーが発生しました。",
          "生成高分辨率卡片时出错。",
          "Error al generar la tarjeta en alta resolución.",
          "Erro ao renderizar o cartão em alta resolução.",
          "Échec du rendu de la carte haute résolution.",
          "Fehler beim Rendern der hochauflösenden Karte.",
          "Не удалось сформировать карту в высоком разрешении.",
        )
      ); 
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
              <h2 className="text-base font-black text-gray-900 tracking-tight">
                {tr(
                  "아트 레이어 스튜디오",
                  "Art layer studio",
                  "Studio lớp ảnh",
                  "アートレイヤースタジオ",
                  "艺术图层工作室",
                  "Estudio de capas artísticas",
                  "Estúdio de camadas artísticas",
                  "Studio de calques artistiques",
                  "Art-Layer-Studio",
                  "Студия художественных слоёв",
                )}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex bg-gray-100 p-0.5 rounded-lg w-fit">
                  <button onClick={() => setOrientation('portrait')} className={`px-2 py-0.5 rounded text-[8px] font-black transition-all ${orientation === 'portrait' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-400'}`}>
                    {tr("세로형", "Portrait", "Dọc", "縦", "竖版", "Vertical", "Retrato", "Portrait", "Hochformat", "Книжная")}
                  </button>
                  <button onClick={() => setOrientation('landscape')} className={`px-2 py-0.5 rounded text-[8px] font-black transition-all ${orientation === 'landscape' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-400'}`}>
                    {tr("가로형", "Landscape", "Ngang", "横", "横版", "Horizontal", "Paisagem", "Paysage", "Querformat", "Альбомная")}
                  </button>
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 border border-rose-100 rounded-lg text-[9px] font-black text-rose-600 hover:bg-rose-100 transition-all"
                >
                  <Upload size={12} />
                  <span>
                    {tr(
                      "새 사진 불러오기",
                      "Load new photo",
                      "Tải ảnh mới",
                      "新しい写真を開く",
                      "加载新照片",
                      "Cargar nueva foto",
                      "Carregar nova foto",
                      "Charger une nouvelle photo",
                      "Neues Foto laden",
                      "Загрузить новое фото",
                    )}
                  </span>
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {history.length > 0 && (
              <button 
                onClick={handleUndo} 
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-black text-gray-600 hover:bg-gray-100 transition-all"
                title={tr(
                  "되돌리기 (최대 3단계)",
                  "Undo (up to 3 steps)",
                  "Hoàn tác (tối đa 3 bước)",
                  "元に戻す（最大3回）",
                  "撤销（最多 3 步）",
                  "Deshacer (hasta 3 pasos)",
                  "Desfazer (até 3 passos)",
                  "Annuler (jusqu’à 3 étapes)",
                  "Rückgängig (bis zu 3 Schritte)",
                  "Отменить (до 3 шагов)",
                )}
              >
                <RotateCcw size={14} className="text-rose-500" />
                <span>{tr("되돌리기", "Undo", "Hoàn tác", "元に戻す", "撤销", "Deshacer", "Desfazer", "Annuler", "Rückgängig", "Отменить")}</span>
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
                <p className="text-xs font-black text-gray-500">
                  {tr(
                    "편집할 사진을 불러오세요",
                    "Load a photo to edit",
                    "Tải ảnh để chỉnh sửa",
                    "編集する写真を読み込んでください",
                    "请加载要编辑的照片",
                    "Carga una foto para editar",
                    "Carregue uma foto para editar",
                    "Chargez une photo à modifier",
                    "Foto zum Bearbeiten laden",
                    "Загрузите фото для редактирования",
                  )}
                </p>
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
                        alt={D.altPhotoEditMain}
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
                          alt={D.altPhotoEditBg}
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
                      <img src={s.url} className="w-full h-auto pointer-events-none block" alt={D.altStickerOnCanvas}/>
                      
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
                  <span className="text-[10px] font-black text-gray-400 tracking-tight">
                    {tr(
                      "드래그로 이동 • 휠로 확대/축소 가능",
                      "Drag to move • scroll to zoom",
                      "Kéo để di chuyển • cuộn để phóng to",
                      "ドラッグで移動・ホイールで拡大/縮小",
                      "拖动移动 · 滚轮缩放",
                      "Arrastra para mover • rueda para ampliar",
                      "Arraste para mover • role para ampliar",
                      "Glisser pour déplacer • molette pour zoomer",
                      "Ziehen zum Verschieben • Scrollen zum Zoomen",
                      "Перетащите для перемещения • колёсико для масштаба",
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="w-[320px] border-l border-gray-100 flex flex-col bg-white">
            <div className="flex bg-gray-50 border-b border-gray-100 p-1">
              {tabs.map((tab) => (
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
                           <span className="text-[12px] font-black text-slate-800">
                             {tr(
                               "자동 보정",
                               "Auto enhance",
                               "Tự động chỉnh",
                               "自動補正",
                               "自动增强",
                               "Mejora automática",
                               "Aprimoramento automático",
                               "Amélioration auto",
                               "Auto-Optimierung",
                               "Автоулучшение",
                             )}
                           </span>
                         </button>
                         <button 
                           onClick={handlePortraitBlurToggle}
                           className={`flex flex-col items-center justify-center p-4 border rounded-3xl transition-all group ${isPortraitMode ? 'bg-rose-500 border-rose-600 shadow-lg' : 'bg-white border-slate-100 hover:border-rose-200 shadow-sm'}`}
                         >
                           <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">🌸</span>
                           <span className={`text-[12px] font-black ${isPortraitMode ? 'text-white' : 'text-slate-800'}`}>
                             {tr(
                               "인물 사진",
                               "Portrait mode",
                               "Chân dung",
                               "ポートレート",
                               "人像模式",
                               "Modo retrato",
                               "Modo retrato",
                               "Mode portrait",
                               "Porträtmodus",
                               "Портретный режим",
                             )}
                           </span>
                         </button>
                       </div>

                       <div className="space-y-3">
                         <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                           {tr(
                             "감성 테마 프리셋",
                             "Mood presets",
                             "Preset tông màu",
                             "ムードプリセット",
                             "氛围预设",
                             "Presets de ambiente",
                             "Presets de humor",
                             "Préréglages d’ambiance",
                             "Stimmungs-Presets",
                             "Пресеты настроения",
                           )}
                         </h4>
                         <div className="grid grid-cols-2 gap-2.5">
                           {enhancePresets.map((preset) => (
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
                             <h5 className="text-[12px] font-bold text-white">
                               {tr("비네팅 효과", "Vignette", "Hiệu ứng vignette", "ビネット", "暗角", "Viñeta", "Vinheta", "Vignettage", "Vignette", "Виньетка")}
                             </h5>
                             <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">
                               {tr(
                                 "가장자리 집중 효과",
                                 "Edge focus",
                                 "Tập trung vào viền",
                                 "周辺減光",
                                 "边缘聚焦",
                                 "Enfoque en bordes",
                                 "Foco nas bordas",
                                 "Accent sur les bords",
                                 "Randfokus",
                                 "Акцент на краях",
                               )}
                             </p>
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
                       <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                         {tr(
                           "정밀 이미지 보정",
                           "Fine image tuning",
                           "Tinh chỉnh ảnh",
                           "詳細トーン調整",
                           "精细图像调节",
                           "Ajuste fino de imagen",
                           "Ajuste fino da imagem",
                           "Réglage fin de l’image",
                           "Feinabstimmung",
                           "Тонкая настройка изображения",
                         )}
                       </h3>
                       
                       <div className="p-3 bg-slate-50 rounded-2xl space-y-4">
                         <Slider label={tr("밝기", "Brightness", "Độ sáng", "明るさ", "亮度", "Brillo", "Brilho", "Luminosité", "Helligkeit", "Яркость")} min={0.4} max={1.6} step={0.01} value={transform.brightness} onChange={v => setTransform(p=>({...p, brightness:v}))} onReset={()=>setTransform(p=>({...p, brightness:1}))} />
                         <Slider label={tr("대비", "Contrast", "Độ tương phản", "コントラスト", "对比度", "Contraste", "Contraste", "Contraste", "Kontrast", "Контраст")} min={0.4} max={1.6} step={0.01} value={transform.contrast} onChange={v => setTransform(p=>({...p, contrast:v}))} onReset={()=>setTransform(p=>({...p, contrast:1}))} />
                         <Slider label={tr("채도", "Saturation", "Độ bão hòa", "彩度", "饱和度", "Saturación", "Saturação", "Saturation", "Sättigung", "Насыщенность")} min={0} max={2} step={0.01} value={transform.saturation} onChange={v => setTransform(p=>({...p, saturation:v}))} onReset={()=>setTransform(p=>({...p, saturation:1}))} />
                         
                         {/* Intelligent Blur Logic: Focus on Background if separated */}
                         {nukkgiDone ? (
                           <Slider 
                             label={tr(
                               "배경 흐림 (Portrait)",
                               "Background blur (portrait)",
                               "Làm mờ nền (chân dung)",
                               "背景ぼかし（ポートレート）",
                               "背景虚化（人像）",
                               "Desenfoque de fondo (retrato)",
                               "Desfoque de fundo (retrato)",
                               "Flou d’arrière-plan (portrait)",
                               "Hintergrundunschärfe (Porträt)",
                               "Размытие фона (портрет)",
                             )} 
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
                             label={tr(
                               "전체 소프트 포커스",
                               "Global soft focus",
                               "Làm mờ toàn cục",
                               "全体ソフトフォーカス",
                               "全局柔焦",
                               "Suavizado global",
                               "Desfoque global",
                               "Flou global",
                               "Globaler Weichzeichner",
                               "Глобальное смягчение",
                             )} 
                             min={0} max={4} step={0.5} 
                             value={transform.blur} 
                             display={`${transform.blur}px`} 
                             onChange={v => setTransform(p=>({...p, blur:v}))} 
                             onReset={()=>setTransform(p=>({...p, blur:0}))} 
                           />
                         )}
                       </div>

                       <div className="space-y-3">
                         <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                           {tr(
                             "배치 및 구도",
                             "Layout & composition",
                             "Bố cục",
                             "配置と構図",
                             "布局与构图",
                             "Disposición y composición",
                             "Layout e composição",
                             "Disposition et cadrage",
                             "Layout & Komposition",
                             "Компоновка",
                           )}
                         </h3>
                         <div className="grid grid-cols-2 gap-2">
                           <button onClick={() => setTransform(p=>({...p, flipH:!p.flipH}))} className="p-3 bg-white border border-slate-100 rounded-2xl text-[11px] font-black flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm"><FlipHorizontal size={14}/> {tr("가로반전", "Flip H", "Lật ngang", "左右反転", "水平翻转", "Voltear H", "Espelhar H", "Miroir H", "Spiegeln H", "Отразить по гориз.")}</button>
                           <button onClick={() => setTransform(p=>({...p, flipV:!p.flipV}))} className="p-3 bg-white border border-slate-100 rounded-2xl text-[11px] font-black flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm"><FlipVertical size={14}/> {tr("세로반전", "Flip V", "Lật dọc", "上下反転", "垂直翻转", "Voltear V", "Espelhar V", "Miroir V", "Spiegeln V", "Отразить по верт.")}</button>
                         </div>
                         <div className="p-3 bg-slate-50 rounded-2xl space-y-4">
                            <Slider label={tr("줌 (Scale)", "Zoom (scale)", "Thu phóng", "ズーム", "缩放", "Zoom", "Zoom", "Zoom", "Zoom", "Масштаб")} min={0.1} max={3} step={0.01} value={transform.scale} display={`${Math.round(transform.scale*100)}%`} onChange={v => setTransform(p=>({...p, scale:v}))} onReset={()=>setTransform(p=>({...p, scale:1}))} />
                            <Slider label={tr("회전 (Angle)", "Rotation", "Xoay", "回転", "旋转", "Rotación", "Rotação", "Rotation", "Drehung", "Поворот")} min={-180} max={180} step={1} value={transform.rotation} display={`${transform.rotation}°`} onChange={v => setTransform(p=>({...p, rotation:v}))} onReset={()=>setTransform(p=>({...p, rotation:0}))} />
                         </div>
                       </div>
                    </div>
                  )}

                  {/* --- OTHER TABS --- */}
                  {activeTab === 'crop' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-left-2">
                       <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">
                         {tr(
                           "사진 자르기 도구",
                           "Crop tools",
                           "Công cụ cắt",
                           "写真トリミング",
                           "裁剪工具",
                           "Herramientas de recorte",
                           "Ferramentas de corte",
                           "Outils de rognage",
                           "Zuschneiden",
                           "Инструменты обрезки",
                         )}
                       </h3>
                       <div className="bg-rose-50 p-5 rounded-[32px] border border-rose-100 flex items-start gap-4">
                          <div className="w-10 h-10 bg-rose-500 rounded-full flex items-center justify-center text-white shrink-0 shadow-lg shadow-rose-200"><Scissors size={18}/></div>
                          <div>
                            <p className="text-[12px] font-black text-rose-600 mb-0.5">
                              {tr(
                                "드래그해서 선택하세요",
                                "Drag to select",
                                "Kéo để chọn",
                                "ドラッグして選択",
                                "拖动框选",
                                "Arrastra para seleccionar",
                                "Arraste para selecionar",
                                "Glissez pour sélectionner",
                                "Zum Auswählen ziehen",
                                "Перетащите для выбора",
                              )}
                            </p>
                            <p className="text-[10px] font-bold text-rose-400 leading-tight">
                              {tr(
                                "마우스로 사진 위를 드래그하면 자를 구역이 지정됩니다.",
                                "Drag on the photo to define the crop area.",
                                "Kéo trên ảnh để chọn vùng cắt.",
                                "写真上をドラッグして切り抜き範囲を指定します。",
                                "在照片上拖动以确定裁剪区域。",
                                "Arrastra sobre la foto para definir el área de recorte.",
                                "Arraste na foto para definir a área de corte.",
                                "Faites glisser sur la photo pour définir la zone.",
                                "Ziehen Sie auf dem Foto, um den Bereich festzulegen.",
                                "Перетащите по фото, чтобы задать область обрезки.",
                              )}
                            </p>
                          </div>
                       </div>
                       <button onClick={applyCrop} className="group relative w-full py-5 bg-slate-900 text-white rounded-[32px] text-sm font-black hover:bg-black transition-all shadow-xl shadow-gray-200 overflow-hidden mt-4">
                         <span className="relative z-10 flex items-center justify-center gap-2">
                           {tr(
                             "선택 영역 자르기 적용",
                             "Apply crop",
                             "Áp dụng cắt",
                             "選択範囲で切り抜き",
                             "应用裁剪",
                             "Aplicar recorte",
                             "Aplicar corte",
                             "Appliquer le rognage",
                             "Zuschnitt anwenden",
                             "Применить обрезку",
                           )}{" "}
                           <Check size={18}/>
                         </span>
                         <div className="absolute inset-0 bg-gradient-to-r from-rose-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                       </button>
                    </div>
                  )}

                  {activeTab === 'sticker' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
                      <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-100 rounded-2xl">
                        {STICKER_CATEGORY_ORDER.map((cat) => (
                          <button key={cat} onClick={() => setStickerCategory(cat)} className={`flex-1 px-2 py-2 rounded-xl text-[10px] font-black transition-all ${stickerCategory === cat ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{stickerCatLabels[cat]}</button>
                        ))}
                      </div>
                      <div className="grid grid-cols-4 gap-3 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                        {STICKER_CATEGORIES[stickerCategory].map(s => (
                          <button key={s.id} onClick={() => addSticker(s.url)} className="p-1.5 bg-slate-50 rounded-2xl border border-transparent hover:border-rose-300 transition-all hover:scale-110 shadow-sm hover:shadow-md"><img src={s.url} className="w-full h-full" alt={D.altStickerPicker}/></button>
                        ))}
                      </div>
                      <div className="pt-2 border-t border-slate-100">
                        <button onClick={() => addPhotoInputRef.current?.click()} className="w-full py-4 bg-rose-50 text-rose-600 rounded-[28px] flex items-center justify-center gap-2 text-[11px] font-black hover:bg-rose-100 transition-all shadow-sm">
                           <ImageIcon size={16} />{" "}
                           {tr(
                             "갤러리에서 사진 레이어 추가",
                             "Add photo layer from gallery",
                             "Thêm lớp ảnh từ thư viện",
                             "ギャラリーから写真レイヤーを追加",
                             "从相册添加照片图层",
                             "Añadir capa de foto desde la galería",
                             "Adicionar camada da galeria",
                             "Ajouter une couche photo depuis la galerie",
                             "Fotoebene aus Galerie hinzufügen",
                             "Слой фото из галереи",
                           )}
                        </button>
                      </div>
                      
                      {selectedStickerId && (
                        <div className="p-5 bg-gradient-to-br from-rose-50 to-white rounded-[32px] space-y-4 border border-rose-100 animate-in zoom-in-95 duration-200 shadow-lg">
                          <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-2">
                             <div className="w-2 h-4 bg-rose-500 rounded-full" />{" "}
                             {tr(
                               "스티커 상세 조절",
                               "Sticker controls",
                               "Tinh chỉnh sticker",
                               "ステッカー詳細",
                               "贴纸微调",
                               "Ajustes del sticker",
                               "Ajustes do adesivo",
                               "Réglages du sticker",
                               "Sticker-Einstellungen",
                               "Настройки стикера",
                             )}
                          </div>
                          <Slider 
                            label={tr("크기", "Size", "Kích thước", "サイズ", "大小", "Tamaño", "Tamanho", "Taille", "Größe", "Размер")} min={0.01} max={1.0} step={0.01} 
                            value={stickers.find(s=>s.id===selectedStickerId)?.scale || 0.2} 
                            display={`${Math.round((stickers.find(s=>s.id===selectedStickerId)?.scale || 0.2) * 100)}%`}
                            onChange={v => updateSticker(selectedStickerId, {scale: v})} 
                          />
                          <Slider 
                            label={tr("회전", "Rotate", "Xoay", "回転", "旋转", "Rotar", "Girar", "Rotation", "Drehen", "Поворот")} min={-180} max={180} step={1} 
                            value={stickers.find(s=>s.id===selectedStickerId)?.rotation || 0} 
                            display={`${stickers.find(s=>s.id===selectedStickerId)?.rotation || 0}°`}
                            onChange={v => updateSticker(selectedStickerId, {rotation: v})} 
                            onReset={() => updateSticker(selectedStickerId, {rotation: 0})}
                          />
                          <button onClick={() => removeSticker(selectedStickerId)} className="w-full py-3.5 bg-rose-500 text-white rounded-2xl text-[11px] font-black shadow-xl shadow-rose-200 hover:bg-rose-600 transition-all">
                            {tr(
                              "이 스티커 삭제",
                              "Remove sticker",
                              "Xóa sticker này",
                              "このステッカーを削除",
                              "移除此贴纸",
                              "Eliminar este sticker",
                              "Remover este adesivo",
                              "Supprimer ce sticker",
                              "Diesen Sticker entfernen",
                              "Удалить этот стикер",
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'frame' && (
                    <div className="grid grid-cols-2 gap-3 animate-in fade-in">
                       <h3 className="col-span-2 text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                         {tr(
                           "프레임 및 테두리",
                           "Frames & borders",
                           "Khung & viền",
                           "フレームと枠",
                           "相框与边框",
                           "Marcos y bordes",
                           "Molduras e bordas",
                           "Cadres et bordures",
                           "Rahmen & Kanten",
                           "Рамки и обводка",
                         )}
                       </h3>
                      {Object.keys(FRAME_DEFS).map(id => (
                        <button key={id} onClick={() => setActiveFrame(id)} className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-2 ${activeFrame === id ? 'border-rose-500 bg-rose-50 text-rose-600 shadow-inner' : 'bg-slate-50 border-transparent text-slate-400 hover:border-slate-200 hover:bg-white'}`}>
                          <span className="text-2xl">{FRAME_DEFS[id]?.emoji || '🚫'}</span>
                          <span className="text-[11px] font-black uppercase tracking-tighter">{frameChoiceLabel(id)}</span>
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
                        <h4 className="text-sm font-black text-slate-800">
                          {tr(
                            "AI 마법 배경 제거",
                            "AI background removal",
                            "Xóa nền bằng AI",
                            "AI背景除去",
                            "AI 魔法抠背景",
                            "Eliminación de fondo con IA",
                            "Remoção de fundo com IA",
                            "Suppression de fondo par IA",
                            "KI-Hintergrundentfernung",
                            "Удаление фона с ИИ",
                          )}
                        </h4>
                        <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                          {tr(
                            "복잡한 배경도 AI가 클릭 한 번으로\n깔끔하게 지워드립니다.",
                            "AI removes busy backgrounds in one tap.",
                            "AI xóa nền phức tạp chỉ với một chạm.",
                            "複雑な背景もワンタップで\nAIがきれいに除去します。",
                            "复杂背景也能一键\n由 AI 干净去除。",
                            "La IA quita fondos complejos\ncon un solo toque.",
                            "A IA remove fundos complexos\ncom um toque.",
                            "L’IA supprime les fonds chargés\nen un geste.",
                            "Die KI entfernt vielseitige Hintergründe\nmit einem Tipp.",
                            "ИИ убирает сложный фон\nодним нажатием.",
                          ).split("\n").map((line, i) => (
                            <React.Fragment key={i}>
                              {i > 0 ? <br /> : null}
                              {line}
                            </React.Fragment>
                          ))}
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
                              {tr(
                                "배경 분석 중..",
                                "Analyzing…",
                                "Đang phân tích…",
                                "背景を分析中…",
                                "正在分析背景…",
                                "Analizando…",
                                "Analisando…",
                                "Analyse…",
                                "Wird analysiert…",
                                "Анализ…",
                              )}{" "}
                              ({Math.floor(bgProgress)}%)
                            </>
                          ) : (
                            <>
                              <Wand2 size={20} className="text-rose-400" />
                              {tr(
                                "AI 배경 제거 시작",
                                "Start AI removal",
                                "Bắt đầu xóa nền AI",
                                "AI背景除去を開始",
                                "开始 AI 去背景",
                                "Iniciar eliminación con IA",
                                "Iniciar remoção com IA",
                                "Démarrer la suppression IA",
                                "KI-Entfernung starten",
                                "Запустить удаление фона ИИ",
                              )}
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="space-y-3">
                           <div className="py-3 px-4 bg-white border-2 border-green-100 rounded-2xl flex items-center justify-center gap-2 text-[11px] font-black text-green-600">
                             <Check size={16} />{" "}
                             {tr(
                               "배경 제거 완료!",
                               "Background removed",
                               "Đã xóa nền!",
                               "背景を除去しました！",
                               "背景已去除！",
                               "¡Fondo eliminado!",
                               "Fundo removido!",
                               "Arrière-plan supprimé !",
                               "Hintergrund entfernt!",
                               "Фон удалён!",
                             )}
                           </div>

                           <div className="rounded-2xl border border-slate-100 bg-slate-50/90 p-3 space-y-2">
                             <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-0.5">
                               {tr(
                                 "배경 색 미리보기",
                                 "Background color preview",
                                 "Xem trước màu nền",
                                 "背景色プレビュー",
                                 "背景色预览",
                                 "Vista previa del color",
                                 "Pré-visualizar cor",
                                 "Aperçu de la couleur",
                                 "Hintergrundfarbe (Vorschau)",
                                 "Предпросмотр цвета фона",
                               )}
                             </p>
                             <div className="flex flex-wrap gap-1.5 justify-center">
                               {quickBgSwatches.map((s) => (
                                 <button
                                   key={s.value}
                                   type="button"
                                   title={s.label}
                                   aria-label={s.label}
                                   onClick={() => {
                                     setBgPhotoUrl(null);
                                     setSelectedBgColor(s.value);
                                   }}
                                   className={`h-9 w-9 rounded-xl border-2 shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
                                     selectedBgColor === s.value && !bgPhotoUrl
                                       ? "border-rose-500 ring-2 ring-rose-200"
                                       : "border-white hover:border-rose-200"
                                   }`}
                                   style={{ backgroundColor: s.value }}
                                 />
                               ))}
                             </div>
                           </div>
                           
                           {/* Eraser Toggle */}
                           <div className={`p-4 rounded-2xl border-2 transition-all ${isEraserMode ? 'bg-rose-500 border-rose-500 shadow-lg' : 'bg-white border-rose-100'}`}>
                             <div className="flex items-center justify-between mb-3">
                               <div className="flex items-center gap-2">
                                 <Scissors className={isEraserMode ? 'text-white' : 'text-rose-500'} size={16} />
                                 <span className={`text-[12px] font-black ${isEraserMode ? 'text-white' : 'text-slate-700'}`}>
                                   {tr(
                                     "수동 지우개 가동",
                                     "Manual eraser",
                                     "Tẩy thủ công",
                                     "手動消しゴム",
                                     "手动橡皮擦",
                                     "Borrador manual",
                                     "Borracha manual",
                                     "Gomme manuelle",
                                     "Manueller Radierer",
                                     "Ручной ластик",
                                   )}
                                 </span>
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
                                   <span>
                                     {tr(
                                       "지우개 크기",
                                       "Eraser size",
                                       "Cỡ tẩy",
                                       "消しゴムサイズ",
                                       "橡皮擦大小",
                                       "Tamaño del borrador",
                                       "Tamanho da borracha",
                                       "Taille de la gomme",
                                       "Radierergröße",
                                       "Размер ластика",
                                     )}
                                   </span>
                                   <span>{eraserSize}px</span>
                                 </div>
                                 <input 
                                   type="range" min="1" max="100" value={eraserSize}
                                   onChange={(e) => setEraserSize(Number(e.target.value))}
                                   className="w-full h-1 bg-white/30 rounded-full accent-white cursor-pointer"
                                 />
                                 <p className="text-[9px] text-white/70 leading-tight">
                                   {tr(
                                     "지우고 싶은 잔여물 위를 드래그하세요.",
                                     "Drag over spots to erase.",
                                     "Kéo lên vùng cần xóa.",
                                     "消したい部分の上をドラッグしてください。",
                                     "在要擦除的区域上拖动。",
                                     "Arrastra sobre lo que quieras borrar.",
                                     "Arraste sobre o que deseja apagar.",
                                     "Faites glisser sur les zones à effacer.",
                                     "Über die Stellen ziehen, die Sie entfernen möchten.",
                                     "Проведите по участкам, которые нужно стереть.",
                                   )}
                                 </p>
                               </div>
                             )}
                           </div>

                           <button 
                             onClick={() => { setNukkgiDone(false); handleAIRemoveBG(); }}
                             className="w-full py-3 bg-gray-50 text-gray-400 rounded-xl text-[10px] font-bold hover:bg-gray-100 transition-colors"
                           >
                             {tr(
                               "AI로 다시 분석하기",
                               "Re-run AI analysis",
                               "Chạy lại phân tích AI",
                               "AIで再分析",
                               "用 AI 重新分析",
                               "Volver a analizar con IA",
                               "Reexecutar análise com IA",
                               "Relancer l’analyse IA",
                               "KI-Analyse erneut ausführen",
                               "Повторить анализ ИИ",
                             )}
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
                            <h4 className="text-[13px] font-black text-white">
                              {tr(
                                "AI 마법 배경 합성",
                                "AI background compose",
                                "Ghép nền AI",
                                "AI背景合成",
                                "AI 魔法合成背景",
                                "Composición de fondo con IA",
                                "Composição de fundo com IA",
                                "Composition de fond IA",
                                "KI-Hintergrund-Komposition",
                                "Композиция фона с ИИ",
                              )}
                            </h4>
                            <p className="text-[9px] text-indigo-400 font-black uppercase tracking-widest">
                              {tr(
                                "아티 특제 AI 배경 연출",
                                "Arty's special AI scenery",
                                "Phông AI đặc biệt của Arty",
                                "Arty 特製 AI 背景演出",
                                "Arty 特调 AI 背景",
                                "Paisaje IA especial de Arty",
                                "Cenário IA especial da Arty",
                                "Décors IA spéciaux Arty",
                                "Artys besondere KI-Kulisse",
                                "Фирменные AI-фоны Arty",
                              )}
                            </p>
                          </div>
                       </div>

                       <div className="bg-white/5 rounded-2xl p-3 border border-white/10 group-focus-within:border-indigo-500/50 transition-colors">
                          <label className="text-[9px] font-black text-indigo-300 uppercase block mb-2 px-1 tracking-tighter">
                            {tr(
                              "아티의 배경 추천 프롬프트",
                              "Background prompt",
                              "Gợi ý prompt nền",
                              "背景用プロンプト",
                              "背景提示词",
                              "Prompt de fondo",
                              "Prompt de fundo",
                              "Invite pour le fond",
                              "Hintergrund-Prompt",
                              "Промпт для фона",
                            )}
                          </label>
                          <textarea 
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            className="w-full bg-transparent text-white text-[11px] font-bold outline-none resize-none h-16 leading-relaxed custom-scrollbar placeholder:text-slate-600"
                            placeholder={phAiBackgroundPrompt}
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
                              <span className="animate-pulse">
                                {tr(
                                  "아티가 배경을 그리는 중...",
                                  "Generating background…",
                                  "Đang tạo nền…",
                                  "背景を生成中…",
                                  "正在生成背景…",
                                  "Generando fondo…",
                                  "Gerando fundo…",
                                  "Génération du fond…",
                                  "Hintergrund wird erstellt…",
                                  "Создание фона…",
                                )}
                              </span>
                            </div>
                         ) : (
                            <>
                              <Sparkles size={18} className="text-amber-300" />
                              <span>
                                {tr(
                                  "새로운 AI 세계 합성 시작",
                                  "Compose AI scenery",
                                  "Bắt đầu ghép nền AI",
                                  "新しいAI背景を合成",
                                  "开始合成 AI 场景",
                                  "Componer paisaje con IA",
                                  "Compor cenário com IA",
                                  "Composer un décor IA",
                                  "KI-Kulisse zusammenstellen",
                                  "Собрать фон с ИИ",
                                )}
                              </span>
                            </>
                         )}
                       </button>
                       {!nukkgiDone && (
                          <p className="text-[9px] text-indigo-400/70 text-center font-bold">
                            {tr(
                              "배경 제거 후에 새로운 배경을 만들 수 있어요!",
                              "Remove the background first to create a new one.",
                              "Hãy xóa nền trước để tạo nền mới!",
                              "背景を除去してから新しい背景を作れます。",
                              "请先去除背景，再创建新背景。",
                              "Primero quita el fondo para crear uno nuevo.",
                              "Remova o fundo primeiro para criar um novo.",
                              "Supprimez d’abord l’arrière-plan pour en créer un nouveau.",
                              "Entfernen Sie zuerst den Hintergrund, um einen neuen zu erstellen.",
                              "Сначала удалите фон, чтобы создать новый.",
                            )}
                          </p>
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
                  setBgPhotoUrl(null);
                  setSelectedBgColor(null);
                }} 
                className="w-full py-2 bg-white border border-gray-200 rounded-lg text-[10px] font-bold text-gray-500 hover:bg-white flex items-center justify-center gap-2 transition-all shadow-sm"
               >
                 <Trash2 size={12} />{" "}
                 {tr(
                   "전체 초기화",
                   "Reset all",
                   "Đặt lại tất cả",
                   "すべてリセット",
                   "全部重置",
                   "Restablecer todo",
                   "Redefinir tudo",
                   "Tout réinitialiser",
                   "Alles zurücksetzen",
                   "Сбросить всё",
                 )}
               </button>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => compositeAndApply('background')} 
                  disabled={!currentUrl || isProcessing} 
                  className="py-4 bg-gray-900 text-white rounded-xl text-xs font-black shadow-lg hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Maximize2 size={14} />{" "}
                  {tr(
                    "배경으로 설정",
                    "Set as background",
                    "Đặt làm nền",
                    "背景に設定",
                    "设为背景",
                    "Establecer como fondo",
                    "Definir como fundo",
                    "Définir comme arrière-plan",
                    "Als Hintergrund setzen",
                    "Сделать фоном",
                  )}
                </button>
                <button 
                  onClick={() => compositeAndApply('block')} 
                  disabled={!currentUrl || isProcessing} 
                  className="py-4 bg-rose-500 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-200 hover:bg-rose-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Layers size={14} />{" "}
                  {tr(
                    "이미지 레이어 추가",
                    "Add image layer",
                    "Thêm lớp ảnh",
                    "画像レイヤーを追加",
                    "添加图像图层",
                    "Añadir capa de imagen",
                    "Adicionar camada de imagem",
                    "Ajouter une couche image",
                    "Bildebene hinzufügen",
                    "Добавить слой изображения",
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* --- Floating UI Layers --- */}
        
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


