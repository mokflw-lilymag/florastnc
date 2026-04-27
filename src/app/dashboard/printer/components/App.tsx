import { useState, useEffect, useRef, useMemo } from 'react';
import { usePreferredLocale } from '@/hooks/use-preferred-locale';
import { getMessages } from '@/i18n/getMessages';
import { toBaseLocale } from '@/i18n/config';
import RIBBON_PHRASE_DESC_EN from '@/i18n/messages/ribbon-phrase-desc-en.json';
import { toPng } from 'html-to-image';
import { 
  Printer, 
  Type,
  Maximize2,
  Minimize2,
  RotateCw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Check,
  Eye,
  Shield,
  Menu,
  X,
  Upload,
  Settings,
  BookOpen,
  FolderOpen,
  LogOut,
  ShieldAlert,
  RefreshCw,
  Download
} from 'lucide-react';
import { FontManagerDialog } from './FontManagerDialog';
import { TemplateManagerDialog } from './TemplateManagerDialog';
import { PhraseManagerDialog } from './PhraseManagerDialog';
import { ManualDialog } from './ManualDialog';
import { supabase } from './lib/supabase';
import { type CustomFontInfo, getAllCustomFonts, getHiddenFonts } from './lib/font-store';

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function fillDashboardTemplate(template: string, vars: Record<string, string | number>): string {
  let s = template;
  for (const [key, val] of Object.entries(vars)) {
    s = s.split(`{{${key}}}`).join(String(val));
  }
  return s;
}

const getRemainingDays = (expiresAt: string | null) => {
  if (!expiresAt) return 0;
  const diffTime = new Date(expiresAt).getTime() - new Date().getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};

// ─── On-Demand Font Caching System ───
const fontCacheMap = new Map<string, string>(); // url -> dataUri

async function getFontDataUri(url: string): Promise<string | null> {
  if (fontCacheMap.has(url)) return fontCacheMap.get(url)!;
  console.log(`[FontCache] Initial download: ${url}`);
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        fontCacheMap.set(url, base64);
        resolve(base64);
      };
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn(`[FontCache] Failed to fetch font: ${url}`, e);
    return null;
  }
}

async function embedActiveFontsIntoElement(element: HTMLElement) {
  // Get all font families used in this element (nested)
  const usedFonts = new Set<string>();
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT);
  let node = walker.currentNode as HTMLElement;
  while (node) {
    const style = window.getComputedStyle(node);
    const family = style.fontFamily?.replace(/['"]/g, '').split(',')[0].trim();
    if (family) usedFonts.add(family);
    node = walker.nextNode() as HTMLElement;
  }

  const activeFontFaces: string[] = [];
  
  // Find only the relevant @font-face rules
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      if (!sheet.cssRules) continue;
      for (const rule of Array.from(sheet.cssRules)) {
        if (rule instanceof CSSFontFaceRule) {
          const family = rule.style.fontFamily?.replace(/['"]/g, '').trim();
          if (family && usedFonts.has(family)) {
            const cssText = rule.cssText;
            // WOFF/WOFF2/TTF URL 파싱 정규식 (따옴표 포함 URL 오파싱 방지)
            const urlMatch = cssText.match(/url\(["']?([^"')]+)["']?\)/);
            if (urlMatch) {
              const fontUrl = urlMatch[1];
              // Completely ignore Next.js internal/layout fonts to prevent 404s and console clutter
              if (fontUrl.includes('/media/') || fontUrl.includes('_next/static')) {
                continue;
              }

              if (fontUrl.startsWith('http')) {
                const dataUri = await getFontDataUri(fontUrl);
                if (dataUri) {
                  activeFontFaces.push(cssText.replace(fontUrl, dataUri));
                }
              } else {
                activeFontFaces.push(cssText);
              }
            }
          }
        }
      }
    } catch (e) { /* ignore cross-origin errors */ }
  }

  if (activeFontFaces.length > 0) {
    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-injected-fonts', 'true');
    styleEl.textContent = activeFontFaces.join('\n');
    element.prepend(styleEl);
    return styleEl;
  }
  return null;
}

// ==========================================
// Constants & Config
// ==========================================
export type FontLang = 'ko' | 'en' | 'hj' | 'sym';

export interface FontItem {
  value: string;
  name: string;
  langs: FontLang[];
  preview: string;
}

const FONTS: FontItem[] = [
  // 커스텀 한자 폰트 (유저 직접 지정)
  { value: 'font-hj-uoq', name: 'UoqMunThenKhung', langs: ['hj'], preview: '祝發展 謹弔' },
  { value: 'font-hj-lxgw', name: 'LXGW WenKai TC', langs: ['hj'], preview: '祝發展 謹弔' },
  { value: 'font-hj-klee', name: 'Klee One (Bold 600)', langs: ['hj'], preview: '祝發展 謹弔' },
  { value: 'font-hj-iansui', name: 'Iansui', langs: ['hj'], preview: '祝發展 謹弔' },
  { value: 'font-hj-syuku', name: 'Yuji Syuku', langs: ['hj'], preview: '祝發展 謹弔' },
  { value: 'font-hj-boku', name: 'Yuji Boku', langs: ['hj'], preview: '祝發展 謹弔' },
  { value: 'font-hj-mai', name: 'Yuji Mai', langs: ['hj'], preview: '祝發展 謹弔' },
  { value: 'font-hj-kaisei', name: 'Kaisei HarunoUmi', langs: ['hj'], preview: '祝發展 謹弔' },
  { value: 'font-hj-zen', name: 'Zen Antique Soft', langs: ['hj'], preview: '祝發展 謹弔' },

  // 붓글씨/서예
  { value: 'font-brush', name: '나눔 붓글씨', langs: ['ko', 'hj', 'en', 'sym'], preview: '아름다운 붓글씨' },
  { value: 'font-dokdo', name: '독도체', langs: ['ko', 'en', 'sym'], preview: '동해물과 백두산이' },
  { value: 'font-gungsuh', name: '궁서체 (기본)', langs: ['ko', 'hj', 'en', 'sym'], preview: '궁서체 기본' },
  { value: 'font-chosun', name: '조선 궁서체', langs: ['ko', 'hj', 'en', 'sym'], preview: '祝發展 謹弔 (조선궁서)' },
  
  // 명조/세리프
  { value: 'font-noto-serif', name: 'Noto Serif (명조)', langs: ['ko', 'hj', 'en', 'sym'], preview: '단정한 명조체' },
  { value: 'font-nanum-myeongjo', name: '나눔명조', langs: ['ko', 'hj', 'en', 'sym'], preview: '나눔명조체' },
  { value: 'font-song', name: '송명체', langs: ['ko', 'hj', 'en', 'sym'], preview: '송명체 테스트' },
  { value: 'font-gowun', name: '고운바탕', langs: ['ko', 'hj', 'en', 'sym'], preview: '고운바탕체' },
  
  // 고딕/산세리프
  { value: 'font-noto-sans', name: 'Noto Sans (고딕)', langs: ['ko', 'hj', 'en', 'sym'], preview: '깔끔한 고딕체' },
  { value: 'font-nanum-gothic', name: '나눔고딕', langs: ['ko', 'hj', 'en', 'sym'], preview: '나눔고딕체' },
  { value: 'font-bold', name: '블랙한산스 (굵음)', langs: ['ko', 'en', 'sym'], preview: '강렬한 굵은 글씨' },
];

function FontSelector({
  value,
  onChange,
  mode,
  fonts,
  ui,
}: {
  value: string;
  onChange: (v: string) => void;
  mode: FontLang;
  fonts: FontItem[];
  ui: { fontSearch: string; fontNotFound: string };
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [hoveredFont, setHoveredFont] = useState<string | null>(null);
  
  const filteredFonts = useMemo(() => {
    return fonts.filter(f => 
      f.langs.includes(mode) && 
      (f.name.toLowerCase().includes(search.toLowerCase()) || 
       f.value.toLowerCase().includes(search.toLowerCase()))
    );
  }, [fonts, mode, search]);

  const selectedFont = fonts.find(f => f.value === value) || fonts[0] || FONTS[0];

  return (
    <div className="relative w-full text-left font-sans">
      <button 
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between bg-white text-slate-900 rounded-lg p-2.5 text-sm border border-slate-200 outline-none hover:bg-slate-50 hover:border-slate-300 transition shadow-sm"
      >
        <span className={cn(selectedFont.value, "text-[15px] text-slate-900")}>{selectedFont.name}</span>
        <ChevronDown className="w-4 h-4 text-slate-500" />
      </button>
      
      {open && (
        <div className="absolute z-[100] top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden flex flex-col">
          <div className="flex items-center px-3 border-b border-slate-100 bg-slate-50/80">
             <Search className="w-4 h-4 text-slate-500 shrink-0" />
             <input 
               type="text" 
               className="w-full bg-transparent border-none outline-none p-2.5 text-sm text-slate-900 placeholder:text-slate-400 font-sans" 
               placeholder={ui.fontSearch}
               value={search}
               onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto p-1.5 flex flex-col gap-1">
             {filteredFonts.length === 0 && <div className="py-6 text-center text-sm text-slate-500 font-sans">{ui.fontNotFound}</div>}
             {filteredFonts.map(f => (
               <button
                 key={f.value}
                 onMouseEnter={() => setHoveredFont(f.value)}
                 onMouseLeave={() => setHoveredFont(null)}
                 onClick={() => { onChange(f.value); setOpen(false); setSearch(""); setHoveredFont(null); }}
                 className={cn(
                   "flex flex-col text-left px-3 py-3 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer w-full group border-b border-slate-100 last:border-0",
                   f.value === value ? "bg-slate-100 ring-1 ring-slate-200/80" : ""
                 )}
               >
                 <div className="flex w-full items-center justify-between">
                   <div className="flex flex-col w-full pr-2">
                     <span className={cn(
                       (f.value === value || hoveredFont === f.value) ? f.value : "font-sans", 
                       "text-[26px] text-slate-900 leading-tight mb-1 group-hover:text-slate-800 transition-colors"
                     )}>
                       {f.preview}
                     </span>
                     <span className="text-[12px] text-slate-600 font-sans">{f.name}</span>
                   </div>
                   {f.value === value && <Check className="w-5 h-5 text-blue-600 shrink-0" />}
                 </div>
               </button>
             ))}
          </div>
        </div>
      )}
      
      {open && <div className="fixed inset-0 z-[90]" onClick={() => setOpen(false)} />}
    </div>
  );
}

const RIBBON_SPECS = [
  { id: 'bouquet', width: 38, lace: 5, length: 400, marginTop: 80, marginBottom: 50, fontSize: 30, marginOffset: 53 },
  { id: 'oriental_45', width: 45, lace: 7, length: 450, marginTop: 100, marginBottom: 50, fontSize: 35, marginOffset: 57 },
  { id: 'oriental_50', width: 50, lace: 10, length: 500, marginTop: 120, marginBottom: 80, fontSize: 40, marginOffset: 60 },
  { id: 'orchid_55', width: 55, lace: 10, length: 500, marginTop: 120, marginBottom: 80, fontSize: 42, marginOffset: 62 },
  { id: 'western_60', width: 60, lace: 10, length: 700, marginTop: 150, marginBottom: 100, fontSize: 45, marginOffset: 65 },
  { id: 'movie_70', width: 70, lace: 10, length: 750, marginTop: 150, marginBottom: 100, fontSize: 55, marginOffset: 70 },
  { id: 'ribbon_85', width: 85, lace: 10, length: 850, marginTop: 160, marginBottom: 120, fontSize: 65, marginOffset: 76 },
  { id: 'basket_95', width: 95, lace: 10, length: 1000, marginTop: 180, marginBottom: 130, fontSize: 75, marginOffset: 82 },
  { id: 'pot_small', width: 105, lace: 23, length: 1100, marginTop: 200, marginBottom: 150, fontSize: 80, marginOffset: 87 },
  { id: 'pot_medium', width: 135, lace: 23, length: 1500, marginTop: 300, marginBottom: 200, fontSize: 100, marginOffset: 102 },
  { id: 'pot_large', width: 150, lace: 23, length: 1800, marginTop: 350, marginBottom: 350, fontSize: 110, marginOffset: 110 },
  { id: 'wreath_1', width: 115, lace: 23, length: 1200, marginTop: 250, marginBottom: 150, fontSize: 90, marginOffset: 92 },
  { id: 'wreath_2', width: 135, lace: 23, length: 1700, marginTop: 300, marginBottom: 200, fontSize: 100, marginOffset: 102 },
  { id: 'wreath_3', width: 165, lace: 23, length: 2200, marginTop: 400, marginBottom: 300, fontSize: 130, marginOffset: 117 },
  { id: 'celebration_3', width: 165, lace: 23, length: 2200, marginTop: 400, marginBottom: 300, fontSize: 130, marginOffset: 117 },
] as const;

const DEFAULT_PHRASE_CATEGORIES = [
  {
    name: '🎉 환갑/칠순/팔순/행사',
    phrases: [
      { text: '祝生日', desc: '축생일' }, { text: '祝생辰', desc: '축생신' }, { text: '祝華甲', desc: '축화갑(60)' },
      { text: '祝壽宴', desc: '축수연(60)' }, { text: '祝回甲', desc: '축회갑(60)' }, { text: '祝古稀', desc: '축고희(70)' },
      { text: '祝七旬', desc: '축칠순(70)' }, { text: '祝喜壽', desc: '축희수(77)' }, { text: '祝八旬', desc: '축팔순(80)' },
      { text: '祝傘壽', desc: '축산수(80)' }, { text: '祝米壽', desc: '축미수(88)' }, { text: '祝白壽', desc: '축백수(99)' },
      { text: 'Happy Birthday!', desc: '생일축하' }
    ]
  },
  {
    name: '🚀 승진/취임/영전',
    phrases: [
      { text: '祝昇進', desc: '축승진' }, { text: '祝榮轉', desc: '축영전' }, { text: '祝就任', desc: '축취임' },
      { text: '祝轉任', desc: '축전임' }, { text: '祝移任', desc: '축이임' }, { text: '祝遷任', desc: '축천임' },
      { text: '祝轉役', desc: '축전역' }, { text: '祝榮進', desc: '축영진' }, { text: '祝選任', desc: '축선임' },
      { text: '祝重任', desc: '축중임' }, { text: '祝連任', desc: '축연임' }, { text: 'Congratulations on your promotion', desc: '승진축하' }
    ]
  },
  {
    name: '🏢 개업/창립/이전',
    phrases: [
      { text: '祝發展', desc: '축발전' }, { text: '祝開業', desc: '축개업' }, { text: '祝盛業', desc: '축성업' },
      { text: '祝繁榮', desc: '축번영' }, { text: '祝創立', desc: '축창립' }, { text: '祝設立', desc: '축설립' },
      { text: '祝創設', desc: '축창설' }, { text: '祝創刊', desc: '축창간' }, { text: '祝移轉', desc: '축이전' },
      { text: '祝開院', desc: '축개원' }, { text: '祝開館', desc: '축개관' }, { text: '祝開場', desc: '축개장' },
      { text: '祝開店', desc: '축개점' }, { text: 'Congratulations on your new business', desc: '개업축하' }
    ]
  },
  {
    name: '💍 결혼/기념일',
    phrases: [
      { text: '祝約婚', desc: '축약혼' }, { text: '祝結婚', desc: '축결혼(男)' }, { text: '祝華婚', desc: '축화혼(女)' },
      { text: '祝成婚', desc: '축성혼' }, { text: '紙婚式', desc: '지혼식(1)' }, { text: '常婚式', desc: '상혼식(2)' },
      { text: '菓婚式', desc: '과혼식(3)' }, { text: '革婚式', desc: '혁혼식(4)' }, { text: '木婚式', desc: '목혼식(5)' },
      { text: '花婚式', desc: '화혼식(7)' }, { text: '祝錫婚式', desc: '축석혼(10)' }, { text: '痲婚式', desc: '마혼식(12)' },
      { text: '祝銅婚式', desc: '축동혼(15)' }, { text: '祝陶婚式', desc: '축도혼(20)' }, { text: '祝銀婚式', desc: '축은혼식(25)' },
      { text: '祝眞珠婚式', desc: '축진주혼식' }, { text: '祝珊瑚婚식', desc: '축산호혼식' }, { text: '祝錄玉婚式', desc: '축녹옥혼식' },
      { text: '祝紅玉婚式', desc: '축홍옥혼식' }, { text: '祝金婚式', desc: '축금혼식(50)' }, { text: '祝金剛婚式', desc: '축금강혼식(60)' },
      { text: 'A Happy Marriage', desc: '행복한결혼' }
    ]
  },
  {
    name: '🖤 죽음/애도',
    phrases: [
      { text: '謹弔', desc: '근조' }, { text: '追慕', desc: '추모' }, { text: '追悼', desc: '추도' },
      { text: '哀悼', desc: '애도' }, { text: '弔意', desc: '조의' }, { text: '尉靈', desc: '위령' },
      { text: '謹悼', desc: '근도' }, { text: '賻儀', desc: '부의' }, { text: '冥福', desc: '명복' },
      { text: '故人의 冥福을 빕니다', desc: '고인의 명복' }, { text: '삼가 故人의 冥福을 빕니다', desc: '삼가 명복' },
      { text: 'You have my condolences', desc: '애도' }, { text: 'Please accept my deepest condolences', desc: '깊은애도' }
    ]
  },
  {
    name: '🏢 준공/기공/개통',
    phrases: [
      { text: '祝起工', desc: '축기공' }, { text: '祝上樑', desc: '축상량' }, { text: '祝竣工', desc: '축준공' },
      { text: '祝開通', desc: '축개통' }, { text: '祝落成', desc: '축낙성' }
    ]
  },
  {
    name: '👶 출산/탄생',
    phrases: [
      { text: '祝順産', desc: '축순산' }, { text: '祝出産', desc: '축출산' }, { text: '祝誕生', desc: '축탄생' },
      { text: '祝得男', desc: '축득남' }, { text: '祝得女', desc: '축득녀' }, { text: '祝公主誕生', desc: '축공주탄생' },
      { text: '祝王子誕生', desc: '축왕자탄생' }, { text: 'Congratulations on your new baby', desc: '출산축하' }
    ]
  },
  {
    name: '📚 창간/출판',
    phrases: [
      { text: '祝創刊', desc: '축창간' }, { text: '祝發刊', desc: '축발간' }, { text: '祝出版紀念', desc: '축출판기념' },
      { text: '出版紀念會', desc: '출판기념회' }
    ]
  },
  {
    name: '🎨 전시/연주',
    phrases: [
      { text: '祝展覽會', desc: '축전람회' }, { text: '祝展示會', desc: '축전시회' }, { text: '祝品評會', desc: '축품평회' },
      { text: '祝博覽會', desc: '축박람회' }, { text: '祝蓮奏會', desc: '축연주회' }, { text: '祝獨奏會', desc: '축독주회' },
      { text: '祝個人展', desc: '축개인전' }
    ]
  },
  {
    name: '🎓 입학/졸업/합격',
    phrases: [
      { text: '祝入學', desc: '축입학' }, { text: '祝卒業', desc: '축졸업' }, { text: '祝合格', desc: '축합격' },
      { text: '祝博士學位記授與', desc: '축박사학위' }, { text: '祝開校', desc: '축개교' }, { text: '頌功', desc: '송공' },
      { text: '祝停年退任', desc: '축정년퇴임' }
    ]
  },
  {
    name: '🏆 우승/당선',
    phrases: [
      { text: '祝優勝', desc: '축우승' }, { text: '祝入選', desc: '축입선' }, { text: '祝必勝', desc: '축필승' },
      { text: '祝健勝', desc: '축건승' }, { text: '祝當選', desc: '축당선' }, { text: '祝被選', desc: '축피선' }
    ]
  },
  {
    name: '⛪ 교회/종교',
    phrases: [
      { text: '獻堂', desc: '헌당' }, { text: '祝長老長立', desc: '축장로장립' }, { text: '牧師按手', desc: '목사안수' },
      { text: '靈名祝日', desc: '영명축일' }, { text: '祝勸士就任', desc: '축권사취임' }, { text: '祝牧師委任', desc: '축목사위임' }
    ]
  },
  {
    name: '🎍 연말연시/시즌',
    phrases: [
      { text: '謹賀新年', desc: '근하신년' }, { text: '送舊迎新', desc: '송구영신' }, { text: '仲秋佳節', desc: '중추가절' },
      { text: 'Happy New Year!', desc: '새해복' }, { text: 'Merry Christmas!', desc: '메리크리스마스' }
    ]
  }
];

const SYMBOL_BANK = ['★', '☆', '(주)', '(유)', '♥', '♡', '♣', '♧', '♠', '♤', '◆', '◇', '▶', '▷', '◀', '◁', '※', '✝', '卍'];

// ==========================================
// Parsing & Types
// ==========================================
interface CharNode {
  type: 'char' | 'bracket' | 'split' | 'fullwidth' | 'space';
  content: string;
  leftContent?: string;
  rightContent?: string;
  isRotated?: boolean;
  id: string; // for stable state tracking
}

const parseRibbonLine = (text: string, baseId: string, rotatedIds: Set<string>): CharNode[] => {
  const nodes: CharNode[] = [];
  const regex = /\[([^/\]]+)\/([^\]]+)\]|\[([^\]]+)\]|\((주|유)\)|( )|./gu;
  let match;
  let charIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    const id = `${baseId}-${charIndex++}`;
    const raw = match[0];

    if (match[1] && match[2]) {
      // [left/right]
      const isRotated = rotatedIds.has(id);
      nodes.push({ type: 'split', content: raw, leftContent: match[1], rightContent: match[2], id, isRotated });
    } else if (match[3]) {
      // [bracket]
      const isRotated = rotatedIds.has(id);
      nodes.push({ type: 'bracket', content: match[3], id, isRotated });
    } else if (match[4]) {
      // (주)
      const isRotated = rotatedIds.has(id);
      nodes.push({ type: 'fullwidth', content: raw, id, isRotated });
    } else if (match[5]) {
      // space
      nodes.push({ type: 'space', content: raw, id });
    } else {
      // default all to standing (false), rotate only if user clicked (id exists in rotatedIds)
      const isRotated = rotatedIds.has(id);
      
      nodes.push({ type: 'char', content: raw, id, isRotated });
    }
  }
  return nodes;
};

interface FontConfig {
  ko: string; // Hangeul
  en: string; // Alphanumeric
  hj: string; // Hanja
  sym: string; // Symbols
}

/** 
 * Smart detection of character type
 */
const getCharType = (raw: string): keyof FontConfig => {
  if (/[가-힣]/.test(raw)) return 'ko';  // Any Hangeul inside (like (주)) uses Ko font
  if (/[\u4E00-\u9FFF]/.test(raw)) return 'hj';
  if (/[A-Za-z0-9]/.test(raw)) return 'en';
  return 'sym';
};

// ==========================================
// Ribbon Canvas Component
// ==========================================
interface RibbonCanvasProps {
  text: string;
  fontConfig: FontConfig;
  ratioX: number;    // horizontal percentage scale
  ratioY: number;    // vertical percentage scale
  width: number;
  lace: number;
  length: number;
  marginTop: number;
  marginBottom: number;
  rotatedIds: Set<string>;
  onCharClick: (id: string) => void;
  scaleRatio: number; // rendering scale
  zoom: number;      // current zoom level to compensate UI scale
  spacing: number;   // manual gap percentage (0 = auto/spread)
  side?: 'left' | 'right'; 
  isActive?: boolean;
  onClick?: () => void;
  isPrintMode?: boolean;
  marginOffset?: number;
  shopLogo?: string | null;
  printLogo?: boolean;
  isBold?: boolean;
  marginLabelTop?: string;
  marginLabelBottom?: string;
}

const RibbonCanvas = ({ 
  text, fontConfig, ratioX, ratioY, width, lace, length, marginTop, marginBottom, 
  rotatedIds, onCharClick, scaleRatio, zoom, spacing, side = 'left', isActive, onClick, isPrintMode = false, marginOffset: _marginOffset = 0,
  shopLogo = null, printLogo = false, isBold = true,
  marginLabelTop = 'Top margin',
  marginLabelBottom = 'Bottom margin'
}: RibbonCanvasProps) => {
  // Parse lines
  const lines = text.split('\n').filter(l => l.trim() !== '');

  // Base font size exactly matches the ribbon printable width in pixels
  const printableWidthPX = Math.max(10, width - (lace * 2)) * scaleRatio;
  const baseFontSizePX = printableWidthPX * 1.15; // Visual 100% Fill (accounts for font margins)

  const scaleXObj = ratioX / 100;
  const scaleYObj = ratioY / 100;

  // Actual block dimensions
  const actualFontSize = baseFontSizePX * scaleYObj;
  const fontScaleX = scaleYObj === 0 ? 1 : scaleXObj / scaleYObj;

  return (
    <div 
      onClick={onClick}
      translate="no"
      className={cn(
        "relative flex justify-center transition-all duration-300 notranslate",
        isActive ? "ring-4 ring-blue-600/90 shadow-[0_0_28px_rgba(37,99,235,0.22)] z-10" : "hover:scale-[1.01] cursor-pointer"
      )}
      style={{
        width: `${width * scaleRatio}px`,
        height: `${length * scaleRatio}px`,
        backgroundColor: 'white'
      }}
    >
      {/* Visual Ruler Outside the Ribbon */}
      {!isPrintMode && (
        <>
          <div 
            className={cn(
              "absolute top-0 bottom-0 flex flex-col justify-between font-mono py-1 z-10 pointer-events-none",
              side === 'left' ? "items-end pr-2" : "items-start pl-2"
            )}
            style={{
              width: `${60 / zoom}px`,
              [side === 'left' ? 'right' : 'left']: '100%',
              [side === 'left' ? 'marginRight' : 'marginLeft']: `${20 / zoom}px`
            }}
          >
            <span style={{ transform: `scale(${1/zoom})`, transformOrigin: side === 'left' ? 'right top' : 'left top', fontSize: '14px', color: '#475569', fontWeight: '600' }}>0</span>
            <div style={{ width: `${1/zoom}px` }} className={cn("h-full bg-slate-400/40 absolute top-0 bottom-0", side === 'left' ? "right-0" : "left-0")}></div>
            <span style={{ transform: `scale(${1/zoom})`, transformOrigin: side === 'left' ? 'right bottom' : 'left bottom', fontSize: '14px', color: '#475569', fontWeight: '600' }}>{length}</span>
          </div>

          {/* Margins Indicators Outside the Ribbon */}
          <div 
            className={cn("absolute border-red-500/70 z-20 pointer-events-none", side === 'left' ? "right-full" : "left-full")}
            style={{ 
              top: `${marginTop * scaleRatio}px`,
              borderTopWidth: `${1/zoom}px`,
              borderTopStyle: 'dashed',
              width: `${120 / zoom}px`, // Constant line length on screen
              [side === 'left' ? 'marginRight' : 'marginLeft']: '0px'
            }}
          >
            <span 
              className={cn("absolute text-[13px] text-red-700 font-semibold bg-white/95 ring-1 ring-red-200/80 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap", side === 'left' ? "left-0" : "right-0")}
              style={{ 
                transform: `scale(${1/zoom})`, 
                transformOrigin: side === 'left' ? 'left bottom' : 'right bottom',
                bottom: `${0.3/zoom}rem`
              }}
            >
              {marginLabelTop} {marginTop}
            </span>
          </div>

          <div 
            className={cn("absolute border-red-500/70 z-20 pointer-events-none", side === 'left' ? "right-full" : "left-full")}
            style={{ 
              bottom: `${marginBottom * scaleRatio}px`,
              borderBottomWidth: `${1/zoom}px`,
              borderBottomStyle: 'dashed',
              width: `${120 / zoom}px`, // Constant line length on screen
              [side === 'left' ? 'marginRight' : 'marginLeft']: '0px'
            }}
          >
            <span 
              className={cn("absolute text-[13px] text-red-700 font-semibold bg-white/95 ring-1 ring-red-200/80 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap", side === 'left' ? "left-0" : "right-0")}
              style={{ 
                transform: `scale(${1/zoom})`, 
                transformOrigin: side === 'left' ? 'left top' : 'right top',
                top: `${0.3/zoom}rem`
              }}
            >
              {marginLabelBottom} {marginBottom}
            </span>
          </div>
        </>
      )}

      {/* Ribbon Body */}
      <div
        className={cn(
          "relative overflow-hidden flex flex-col items-center",
          !isPrintMode
            ? "ribbon-texture shadow-xl ring-1 ring-slate-200/90"
            : "bg-white"
        )}
        style={{ width: "100%", height: "100%" }}
      >
        
        {/* Lace Effects */}
        {!isPrintMode && lace > 0 && (
          <>
            <div className="absolute left-0 top-0 bottom-0 border-r border-slate-200/50 flex flex-col overflow-hidden" style={{ width: `${lace * scaleRatio}px` }}>
               <div className="flex-1 w-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-300/12 to-transparent" style={{ backgroundSize: '4px 4px' }} />
            </div>
            <div className="absolute right-0 top-0 bottom-0 border-l border-slate-200/50 flex flex-col overflow-hidden" style={{ width: `${lace * scaleRatio}px` }}>
               <div className="flex-1 w-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-300/12 to-transparent" style={{ backgroundSize: '4px 4px' }} />
            </div>
          </>
        )}

        {/* Text Container boundaries = exact margins */}
        <div 
          className="absolute left-0 right-0 flex flex-row-reverse justify-center gap-4"
          style={{
            top: `${marginTop * scaleRatio}px`,
            bottom: `${marginBottom * scaleRatio}px`,
            transform: 'none', 
          }}
        >
          {lines.map((line, lIdx) => {
            const nodes = parseRibbonLine(line, `L${lIdx}`, rotatedIds);
            
            // Mathematically calculate required height (Full Fit logic)
            const requiredHeight = nodes.reduce((sum, n) => {
               if (n.type === 'space') return sum + (actualFontSize * 0.7);

               // Buffer and scaling factor for multi-line nodes
               const nodePadding = (actualFontSize * 0.6); // Increased safety margin

               if (n.type === 'split') {
                 const leftL = n.leftContent?.length || 0;
                 const rightL = n.rightContent?.length || 0;
                 if (n.isRotated) {
                    // Rotated split: single column + 1 space gap + safety margin
                    return sum + ((leftL + rightL + 1) * actualFontSize * 0.7) + nodePadding;
                 }
                 return sum + (Math.max(leftL, rightL) * actualFontSize * 0.7) + nodePadding;
               }
               if (n.type === 'bracket') {
                 return sum + (n.content.length * actualFontSize * 0.7) + nodePadding;
               }
               if (n.type === 'fullwidth') {
                 if (n.isRotated) {
                   const contentL = n.content.length;
                   return sum + (contentL * actualFontSize * 0.8) + (actualFontSize * 0.5);
                 }
                 return sum + actualFontSize;
               }
               return sum + actualFontSize;
            }, 0);
            
            const gapPX = spacing > 0 ? (actualFontSize * spacing / 100) : 0;
            const totalRequiredHeight = requiredHeight + (nodes.length > 1 ? (nodes.length - 1) * gapPX : 0);
            
            const availableHeight = Math.max(0, (length - marginTop - marginBottom) * scaleRatio);
            let squashRatio = 1;
            if (totalRequiredHeight > availableHeight && availableHeight > 0) {
              squashRatio = availableHeight / totalRequiredHeight;
            }

            return (
              <div 
                key={lIdx} 
                className={cn(
                  "flex flex-col items-center shrink-0 w-max whitespace-nowrap antialiased",
                  isBold && "font-semibold",
                  isPrintMode ? "text-black" : "text-slate-950 [text-shadow:_0_1px_0_rgb(255_255_255_/_0.75)]"
                )}
                style={{
                  height: squashRatio < 1 ? `${totalRequiredHeight}px` : (spacing === 0 ? '100%' : 'auto'),
                  transform: squashRatio < 1 ? `scaleY(${squashRatio})` : 'none',
                  transformOrigin: 'top center',
                  justifyContent: nodes.length === 1 ? 'center' : (spacing === 0 ? 'space-between' : 'flex-start'),
                  gap: spacing > 0 ? `${gapPX}px` : undefined
                }}
              >
                {nodes.map(node => {
                  const nodeH = actualFontSize;
                  const nodeW = baseFontSizePX * scaleXObj;

                  // Law 5: Space 65% Height
                  if (node.type === 'space') {
                    return <div key={node.id} style={{ height: `${nodeH * 0.65}px`, width: nodeW }} />;
                  }

                  // Law 4: Fullwidth
                  if (node.type === 'fullwidth') {
                    const charFont = fontConfig[getCharType(node.content)];
                    const chars = node.content.split('');
                    
                    // Rotated: single column like bracket
                    if (node.isRotated) {
                       const blockHeight = chars.length * actualFontSize * 0.8;
                       return (
                         <div 
                           key={node.id} 
                           className={cn("flex flex-col items-center justify-between shrink-0 py-1 cursor-pointer hover:text-blue-800 transition-colors", charFont)} 
                           style={{ height: blockHeight + (actualFontSize * 0.5), width: nodeW }}
                           onClick={() => onCharClick(node.id)}
                         >
                           {chars.map((c, i) => (
                              <span key={i} className={fontConfig[getCharType(c)]} style={{ 
                                fontSize: `${actualFontSize * 0.80}px`, 
                                display: 'inline-block',
                                fontWeight: isBold ? 'bold' : 'normal',
                                lineHeight: 1,
                                transform: `scaleX(${fontScaleX}) rotate(90deg)`
                              }}>{c}</span>
                           ))}
                         </div>
                       );
                    }

                    // Normal: upright
                    return (
                      <div 
                        key={node.id} 
                        className={cn("flex justify-center items-center shrink-0 cursor-pointer hover:text-blue-800 transition-colors", charFont)} 
                        style={{ height: actualFontSize, width: nodeW }}
                        onClick={() => onCharClick(node.id)}
                      >
                         <div className="flex items-center justify-center" style={{ transform: `scaleX(${fontScaleX})` }}>
                           {chars.map((c, i) => (
                             <span key={i} className={fontConfig[getCharType(c)]} style={{ 
                               fontSize: `${actualFontSize * 0.80}px`, 
                               display: 'inline-block',
                               marginLeft: i > 0 ? '-0.20em' : '0',
                               fontWeight: isBold ? 'bold' : 'normal',
                               lineHeight: 1
                             }}>{c}</span>
                           ))}
                         </div>
                      </div>
                    );
                  }

                  // Law 2: Special Bracket Multi-line (e.g. [HongGilDong])
                  if (node.type === 'bracket') {
                    const chars = node.content.split('');
                    const blockHeight = chars.length * actualFontSize * 0.7; // increased from 0.65
                    
                    return (
                      <div 
                        key={node.id} 
                        className={cn("flex flex-col items-center shrink-0 leading-none py-1 cursor-pointer hover:text-blue-800 transition-colors", chars.length > 1 ? "justify-between" : "justify-center")} 
                        style={{ 
                          height: blockHeight + (actualFontSize * 0.6), 
                          width: nodeW
                        }}
                        onClick={() => onCharClick(node.id)}
                      >
                        {chars.map((c, i) => (
                           <span key={i} className={fontConfig[getCharType(c)]} style={{ 
                             fontSize: `${actualFontSize * 0.7 * (1 + (fontScaleX - 1) * 0.5)}px`, 
                             lineHeight: 1,
                             display: 'inline-block',
                             fontWeight: isBold ? 'bold' : 'normal',
                             transform: `scaleX(${fontScaleX}) ${node.isRotated ? 'rotate(90deg)' : ''}`
                           }}>{c}</span>
                        ))}
                      </div>
                    );
                  }

                  // Law 3: Split Columns (Parallel vertical stacks)
                  if (node.type === 'split') {
                    const leftChars = node.leftContent?.split('') || [];
                    const rightChars = node.rightContent?.split('') || [];
                    const maxLen = Math.max(leftChars.length, rightChars.length);

                    // Rotated: single column like bracket, [] size (70%), with space between left/right
                    if (node.isRotated) {
                      const totalChars = leftChars.length + rightChars.length;
                      const blockHeight = (totalChars + 1) * actualFontSize * 0.7; // +1 space
                      return (
                        <div 
                          key={node.id} 
                          className="flex flex-col items-center shrink-0 leading-none py-1 cursor-pointer hover:text-blue-800 transition-colors justify-between" 
                          style={{ height: blockHeight + (actualFontSize * 0.6), width: nodeW }}
                          onClick={() => onCharClick(node.id)}
                        >
                          {leftChars.map((c, i) => (
                            <span key={`l${i}`} className={fontConfig[getCharType(c)]} style={{ 
                              fontSize: `${actualFontSize * 0.7 * (1 + (fontScaleX - 1) * 0.5)}px`, 
                              lineHeight: 1,
                              display: 'inline-block',
                              fontWeight: isBold ? 'bold' : 'normal',
                              transform: `scaleX(${fontScaleX}) rotate(90deg)`
                            }}>{c}</span>
                          ))}
                          {/* / → space gap */}
                          <div style={{ height: `${actualFontSize * 0.7}px` }} />
                          {rightChars.map((c, i) => (
                            <span key={`r${i}`} className={fontConfig[getCharType(c)]} style={{ 
                              fontSize: `${actualFontSize * 0.7 * (1 + (fontScaleX - 1) * 0.5)}px`, 
                              lineHeight: 1,
                              display: 'inline-block',
                              fontWeight: isBold ? 'bold' : 'normal',
                              transform: `scaleX(${fontScaleX}) rotate(90deg)`
                            }}>{c}</span>
                          ))}
                        </div>
                      );
                    }

                    // Normal: two parallel columns
                    const blockHeight = maxLen * actualFontSize * 0.7; // increased
                    return (
                      <div 
                        key={node.id} 
                        className="flex flex-row items-center justify-center shrink-0 py-1 cursor-pointer hover:text-blue-800 transition-colors" 
                        style={{ height: blockHeight + (actualFontSize * 0.6), width: nodeW }}
                        onClick={() => onCharClick(node.id)}
                      >
                         <div className={cn("flex flex-col items-center h-full flex-1", leftChars.length > 1 ? "justify-between" : "justify-center")}>
                           {leftChars.map((char, i) => (
                             <div key={i} className={cn("flex items-center justify-center shrink-0", fontConfig[getCharType(char)])} style={{ height: blockHeight / maxLen, width: '100%' }}>
                               <span className={fontConfig[getCharType(char)]} style={{ 
                                 fontSize: `${actualFontSize * 0.45 * (1 + (fontScaleX - 1) * 0.5)}px`, 
                                 display: 'inline-block',
                                 lineHeight: 1,
                                 fontWeight: isBold ? 'bold' : 'normal',
                                 transform: `scaleX(${fontScaleX})`
                               }}>{char}</span>
                             </div>
                           ))}
                         </div>
                         <div className={cn("flex flex-col items-center h-full flex-1", rightChars.length > 1 ? "justify-between" : "justify-center")}>
                           {rightChars.map((char, i) => (
                             <div key={i} className={cn("flex items-center justify-center shrink-0", fontConfig[getCharType(char)])} style={{ height: blockHeight / maxLen, width: '100%' }}>
                               <span className={fontConfig[getCharType(char)]} style={{ 
                                 fontSize: `${actualFontSize * 0.45 * (1 + (fontScaleX - 1) * 0.5)}px`, 
                                 display: 'inline-block',
                                 lineHeight: 1,
                                 fontWeight: isBold ? 'bold' : 'normal',
                                 transform: `scaleX(${fontScaleX})`
                               }}>{char}</span>
                             </div>
                           ))}
                         </div>
                      </div>
                    );
                  }

                  // Law 1: Normal / 90-degree Rotation
                  const charFont = fontConfig[getCharType(node.content)];
                  return (
                    <div 
                      key={node.id} 
                      className="cursor-pointer hover:text-blue-800 transition-colors flex justify-center items-center shrink-0 leading-none"
                      style={{ height: nodeH, width: nodeW }}
                      onClick={() => onCharClick(node.id)}
                    >
                      <span className={charFont} style={{ 
                        fontSize: nodeH,
                        transform: `scaleX(${fontScaleX}) ${node.isRotated ? 'rotate(90deg)' : ''}`,
                        display: 'inline-block',
                        fontWeight: isBold ? 'bold' : 'normal'
                      }}>
                        {node.content}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* --- SHOP LOGO INJECTION --- */}
        {printLogo && shopLogo && (
            <div 
              className="absolute left-0 right-0 flex justify-center items-center pointer-events-none"
              style={{
                top: `${(length - marginBottom) * scaleRatio}px`,
                transform: 'none',
                height: `${marginBottom * scaleRatio}px`,
                paddingLeft: `${lace * scaleRatio}px`,
                paddingRight: `${lace * scaleRatio}px`
              }}
            >
               <img 
                 src={shopLogo} 
                 crossOrigin="anonymous"
                 alt="Logo" 
                 style={{ width: '70%', maxWidth: '100%', maxHeight: '80%', objectFit: 'contain', opacity: 1 }} 
               />
            </div>
        )}
      </div>
    </div>
  );
};


// ==========================================
// Main Application
// ==========================================
import type { Session } from '@supabase/supabase-js';

const REQUIRED_BRIDGE_VERSION = '25.0';

function fontRibbonSlug(fontValue: string) {
  return fontValue.replace(/^font-/, '').replace(/-/g, '_');
}

export default function App({ session, isAdmin, onShowAdmin, initialLeftText, initialRightText, userPlan, tenantLogo }: { session?: any; isAdmin?: boolean; onShowAdmin?: () => void, initialLeftText?: string, initialRightText?: string, userPlan?: string, tenantLogo?: string | null }) {
  const locale = usePreferredLocale();
  const baseLocaleUi = toBaseLocale(locale);
  const R = getMessages(locale).dashboard.ribbon;
  const ribbonTypesLocalized = useMemo(
    () =>
      RIBBON_SPECS.map((s) => ({
        ...s,
        name: R[`preset_${s.id}`] ?? s.id,
      })),
    [R]
  );
  const phraseCategoryLabel = (catName: string) => {
    const idx = DEFAULT_PHRASE_CATEGORIES.findIndex((c) => c.name === catName);
    if (idx >= 0) return R[`phraseCat_${idx}`] ?? catName;
    return catName;
  };
  const fontUi = useMemo(() => ({ fontSearch: R.fontSearch, fontNotFound: R.fontNotFound }), [R.fontSearch, R.fontNotFound]);

  const localizedBaseFonts = useMemo(() => {
    const RM = R as Record<string, string>;
    return FONTS.map((f) => {
      const slug = fontRibbonSlug(f.value);
      const preview =
        baseLocaleUi === 'ko' ? f.preview : RM[`fontItem_${slug}_preview`] ?? f.preview;
      return {
        ...f,
        name: RM[`fontItem_${slug}_name`] ?? f.name,
        preview,
      };
    });
  }, [R, baseLocaleUi]);

  const fontWizardLangLabel = (type: FontLang) =>
    type === 'ko'
      ? R.ribbonLangKo
      : type === 'hj'
        ? R.ribbonLangHan
        : type === 'en'
          ? R.ribbonLangLatn
          : R.ribbonLangSym;

  const phraseDescForUi = (catIndex: number, phraseIndex: number, fallback: string) => {
    if (baseLocaleUi === 'ko') return fallback;
    const arr = RIBBON_PHRASE_DESC_EN[String(catIndex) as keyof typeof RIBBON_PHRASE_DESC_EN];
    return (arr && arr[phraseIndex]) || fallback;
  };

  const mainRef = useRef<HTMLElement>(null);
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Subscription State
  const hasAccess = isAdmin || ['pro', 'ribbon_only'].includes(userPlan || 'free');
  const [showPaywall, setShowPaywall] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  // ─── Bridge Connection Status (Live Polling) ───
  const [bridgeConnected, setBridgeConnected] = useState(false);
  const [bridgeVersion, setBridgeVersion] = useState('');
  const [showQueue, setShowQueue] = useState(false);
  const bridgeCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadPrinters = () => {
    fetch('http://127.0.0.1:8002/api/printers', { signal: AbortSignal.timeout(5000) })
      .then(res => res.json())
      .then(res => {
        if (res.status === 'success' && Array.isArray(res.data)) {
          setPrinters(res.data);
          
          setSelectedPrinter(current => {
            const saved = localStorage.getItem('ribbon_selected_printer');
            const prev = saved || current;
            const found = prev && res.data.find((p: any) => p.name === prev);
            return found ? prev : (res.data.length > 0 ? res.data[0].name : '');
          });
        }
      })
      .catch(() => {});
  };


  const isVersionOk = (v: string) => {
    if (!v) return false;
    const parse = (s: string) => s.split('.').map(Number);
    const cur = parse(v);
    const req = parse(REQUIRED_BRIDGE_VERSION);
    for (let i = 0; i < Math.max(cur.length, req.length); i++) {
      const c = cur[i] || 0;
      const r = req[i] || 0;
      if (c > r) return true;
      if (c < r) return false;
    }
    return true; // equal
  };

  const checkSubscriptionAction = async (action: () => void) => {
    if (session?.user?.email === 'test@test.com') {
      alert(R.signupRequired);
      await supabase.auth.signOut();
      return;
    }
    if (hasAccess) {
      action();
    } else {
      setShowPaywall(true);
    }
  };

  // Printer State
  const [printers, setPrinters] = useState<any[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState(() => localStorage.getItem('ribbon_selected_printer') || '');
  // Fix 3: L시리즈 타입 추가 (epson_l_series는 M105와 동일 GDI 엔진 사용)
  const [selectedPrinterType, setSelectedPrinterType] = useState<'epson_m105' | 'epson_l_series' | 'xprinter' | 'generic'>('epson_m105');
  const [isPrinting, setIsPrinting] = useState(false);

  const lastPrinterRetryRef = useRef<number>(0);
  useEffect(() => {
    let wasConnected = false;
    const checkBridge = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8002/', { signal: AbortSignal.timeout(5000) });
        const data = await res.json();
        if (data.status === 'ok' || data.status === 'success') {
          setBridgeConnected(true);
          const currentVer = data.version || '';
          setBridgeVersion(currentVer);
          
          const isDismissed = localStorage.getItem('bridge_update_dismissed') === 'true';
          if (!isVersionOk(currentVer) && !isDismissed) {
            setIsUpdateModalOpen(true);
          }

          // On first connect or reconnect, refresh printer list
          if (!wasConnected) {
            wasConnected = true;
            loadPrinters();
          } else if (printers.length === 0) {
            // If connected but no printers, retry every 10s
            const now = Date.now();
            if (now - lastPrinterRetryRef.current > 10000) {
              lastPrinterRetryRef.current = now;
              loadPrinters();
            }
          }
        } else {
          setBridgeConnected(true); // Treat success as connected even if status isn't 'ok'
          wasConnected = true;
        }
      } catch {
        setBridgeConnected(false);
        wasConnected = false;
      }
    };
    checkBridge();
    bridgeCheckRef.current = setInterval(checkBridge, 5000);
    return () => { if (bridgeCheckRef.current) clearInterval(bridgeCheckRef.current); };
  }, [printers.length]); 


  // User Print Settings
  const [printTarget, setPrintTarget] = useState<'both' | 'left' | 'right'>('both');
  const [printLayout, setPrintLayout] = useState<'connected' | 'separate'>('connected');
  const previewHeadingText = useMemo(() => {
    const target =
      printTarget === "both"
        ? printLayout === "connected"
          ? R.previewConnected
          : R.previewSeparate
        : printTarget === "left"
          ? R.congratText
          : R.senderLabel;
    return fillDashboardTemplate(R.previewHeading, { target });
  }, [R, printTarget, printLayout]);
  const [mediaType, setMediaType] = useState<'roll' | 'cut'>('cut');
  const [cuttingMargin, setCuttingMargin] = useState(50); // 커팅 여유분 (mm), 기본 5cm = 50mm
  const [printQuality, setPrintQuality] = useState<'fast' | 'high'>('fast');

  const connectedPrintRef = useRef<HTMLDivElement>(null);
  const separateLeftRef = useRef<HTMLDivElement>(null);
  const separateRightRef = useRef<HTMLDivElement>(null);

  // Specs State
  const [ribbonType, setRibbonType] = useState<string>(RIBBON_SPECS[0].id);
  const [length, setLength] = useState<number>(RIBBON_SPECS[0].length);
  const [width, setWidth] = useState<number>(RIBBON_SPECS[0].width);
  const [lace, setLace] = useState<number>(RIBBON_SPECS[0].lace);
  const [marginTop, setMarginTop] = useState<number>(RIBBON_SPECS[0].marginTop);
  const [marginBottom, setMarginBottom] = useState<number>(RIBBON_SPECS[0].marginBottom);
  const [marginOffset, setMarginOffset] = useState(0); // 사용자 수동 보정값 (기본 0)

  // ─── Sync Printer Type & Invariants ───
  useEffect(() => {
    const p = printers.find(p => p.name === selectedPrinter);
    if (p) {
      const newType = p.type || 'generic';
      setSelectedPrinterType(newType as any);
    }
  }, [selectedPrinter, printers]);

  useEffect(() => {
    if (selectedPrinterType === 'xprinter') {
      const currentPreset = RIBBON_SPECS.find(t => t.id === ribbonType);
      if (currentPreset && currentPreset.width > 105) {
        const first = RIBBON_SPECS.filter(t => t.width <= 105)[0];
        if (first) {
          setRibbonType(first.id);
          setWidth(first.width);
          setLength(first.length);
          setLace(first.lace || 0);
          setMarginTop(first.marginTop || 0);
          setMarginBottom(first.marginBottom || 0);
        }
      }
    }
  }, [selectedPrinterType, ribbonType]);

  // Xprinter: 최대 인쇄폭 108mm → width ≤ 105mm 프리셋만 표시
  const availablePresets = selectedPrinterType === 'xprinter'
    ? ribbonTypesLocalized.filter(t => t.width <= 105)
    : ribbonTypesLocalized;

  // Left Ribbon State
  const [leftText, setLeftText] = useState(initialLeftText || '祝發展');
  const [leftFontConfig, setLeftFontConfig] = useState<FontConfig>({
    ko: 'font-chosun',
    en: 'font-chosun',
    hj: 'font-chosun',
    sym: 'font-noto-sans'
  });
  const [leftRatioX, setLeftRatioX] = useState(90);
  const [leftRatioY, setLeftRatioY] = useState(100);
  const [leftRotated, setLeftRotated] = useState<Set<string>>(new Set());
  const [leftIsBold, setLeftIsBold] = useState(true);
  const [leftSpacing, setLeftSpacing] = useState(0); // 0 = auto

  // Right Ribbon State
  const [rightText, setRightText] = useState(initialRightText || R.defaultRightText);
  const [rightFontConfig, setRightFontConfig] = useState<FontConfig>({
    ko: 'font-chosun',
    en: 'font-chosun',
    hj: 'font-chosun',
    sym: 'font-noto-sans'
  });
  const [rightRatioX, setRightRatioX] = useState(90);
  const [rightRatioY, setRightRatioY] = useState(100);
  const [rightRotated, setRightRotated] = useState<Set<string>>(new Set());
  const [rightIsBold, setRightIsBold] = useState(true);
  const [rightSpacing, setRightSpacing] = useState(0); // 0 = auto

  // UI State
  const [activeSide, setActiveSide] = useState<'left'|'right'>('left');
  const [zoom, setZoom] = useState(0.4);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [phraseCategory, setPhraseCategory] = useState(0);
  const [fontWizardMode, setFontWizardMode] = useState<keyof FontConfig>('ko');
  const [fontWizardModeRight, setFontWizardModeRight] = useState<keyof FontConfig>('ko');

  // Font Manager State
  const [customFontItems, setCustomFontItems] = useState<CustomFontInfo[]>([]);
  const [hiddenFonts, setHiddenFonts] = useState<string[]>([]);
  const [customStyles, setCustomStyles] = useState<{id: string, css: string}[]>([]);
  const [isFontManagerOpen, setIsFontManagerOpen] = useState(false);
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);
  const [isPhraseManagerOpen, setIsPhraseManagerOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isLoadDialogOpen, setIsLoadDialogOpen] = useState(false);
  const [isBridgeModalOpen, setIsBridgeModalOpen] = useState(false);
  const [isTroubleshootModalOpen, setIsTroubleshootModalOpen] = useState(false);
  const [phraseCategories, setPhraseCategories] = useState(DEFAULT_PHRASE_CATEGORIES);

  // Shop Logo State
  const [shopLogo, setShopLogo] = useState<string | null>(null);
  const [printLogo, setPrintLogo] = useState<boolean>(false);

  // Panning State
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag if clicking the background main area or canvas holder (not buttons/inputs)
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.closest('button')) return;

    if (!mainRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - mainRef.current.offsetLeft);
    setStartY(e.pageY - mainRef.current.offsetTop);
    setScrollLeft(mainRef.current.scrollLeft);
    setScrollTop(mainRef.current.scrollTop);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !mainRef.current) return;
    e.preventDefault();
    const x = e.pageX - mainRef.current.offsetLeft;
    const y = e.pageY - mainRef.current.offsetTop;
    const walkX = (x - startX);
    const walkY = (y - startY);
    mainRef.current.scrollLeft = scrollLeft - walkX;
    mainRef.current.scrollTop = scrollTop - walkY;
  };

  const stopDragging = () => setIsDragging(false);

  const loadCustomPhrases = async () => {
    try {
      const { data, error } = await supabase.from('custom_phrases').select('*');
      if (error) throw error;
      
      if (!data || data.length === 0) {
        setPhraseCategories(DEFAULT_PHRASE_CATEGORIES);
        return;
      }

      // Merge defaults with custom phrases
      const grouped = new Map();
      DEFAULT_PHRASE_CATEGORIES.forEach(cat => grouped.set(cat.name, [...cat.phrases]));

      data.forEach((p: any) => {
        const catName = p.category;
        if (!grouped.has(catName)) {
          grouped.set(catName, []);
        }
        grouped.get(catName).push({ text: p.text, desc: p.description || '' });
      });

      const merged = Array.from(grouped.entries()).map(([name, phrases]) => ({ name, phrases }));
      setPhraseCategories(merged);

      // Adjust selection if the current category index is out of bounds
      setPhraseCategory(prev => prev >= merged.length ? 0 : prev);

    } catch (err) {
      console.error('Error loading custom phrases:', err);
      setPhraseCategories(DEFAULT_PHRASE_CATEGORIES);
    }
  };

  useEffect(() => {
    loadCustomPhrases();
  }, []);

  const loadFontSettings = async () => {
    const hidden = getHiddenFonts();
    setHiddenFonts(hidden || []);
    
    try {
      const custom = await getAllCustomFonts();
      setCustomFontItems(custom);
      
      const styles: {id: string, css: string}[] = [];
      for (const font of custom) {
         if (font.source === 'local' && font.blob) {
           const url = URL.createObjectURL(font.blob);
           styles.push({
             id: font.id,
             css: `
               @font-face {
                 font-family: '${font.fontFamily}';
                 src: url('${url}');
               }
               .${font.id} { font-family: '${font.fontFamily}', sans-serif !important; }
             `
           });
         } else if (font.source === 'web' && font.webUrl) {
           styles.push({
             id: font.id,
             css: `
               @import url('${font.webUrl}');
               .${font.id} { font-family: ${font.fontFamily} !important; }
             `
           });
         }
      }
      setCustomStyles(styles);
    } catch (e) {
      console.error("Failed to load custom fonts", e);
    }
  };

  useEffect(() => {
    loadFontSettings();
    // Printers are loaded automatically by bridge polling (on first connect)

    // Auto-Pair Cloud Print Agent with Local Bridge
    if (session?.user?.id) {
       // Priority: 1. Global Tenant Logo, 2. Legacy metadata logo
       const metaLogo = tenantLogo || (session.user as any)?.user_metadata?.shop_logo;
       setShopLogo(metaLogo || null);
       if (metaLogo) setPrintLogo(true);
       
       fetch('http://127.0.0.1:8002/api/pair', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         mode: 'cors',
         body: JSON.stringify({ user_id: session.user.id })
       }).catch(() => {});
    }
  }, [session?.user?.id]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.user) return;

    try {
      // 1. Supabase Storage에 업로드 (logos 버킷 사용 - 통합 규정)
      const fileExt = file.name.split('.').pop();
      const filePath = `shop_logos/${session.user.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('logos') // Updated to 'logos' bucket for consistency
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 2. 퍼블릭 URL 가져오기
      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath);

      // 3. 사용자 메타데이터 및 가맹점 로고 업데이트 (통합 동기화)
      setShopLogo(publicUrl);
      setPrintLogo(true);
      
      const tenantId = (session.user as any)?.app_metadata?.tenant_id || (session.user as any)?.user_metadata?.tenant_id;
      
      const updatePromises: Promise<any>[] = [
        supabase.auth.updateUser({
          data: { shop_logo: publicUrl }
        })
      ];

      if (tenantId) {
        updatePromises.push(
          Promise.resolve(supabase.from('tenants').update({ logo_url: publicUrl }).eq('id', tenantId))
        );
      }

      await Promise.all(updatePromises);
      
      alert(R.logoUpdated);
    } catch (err: any) {
      console.error('Logo upload error:', err);
      alert(fillDashboardTemplate(R.logoUploadErr, { msg: err.message }));
    }
  };

  // ─── 프린트 헬퍼: 이미지 180도 회전 ───
  const rotateImage180 = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(Math.PI);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = dataUrl;
    });
  };

  const handlePrint = async () => {
    if (!hasAccess) {
       setShowPaywall(true);
       return;
    }

    try {
      setIsPrinting(true);
      
      // 1. Bridge 연결 상태 사전 확인
      let bridgeOnline = false;
      let bridgeVersion = "";
      try {
        const healthCheck = await fetch('http://127.0.0.1:8002/', { 
          signal: AbortSignal.timeout(3000),
          mode: 'cors'
        });
        const health = await healthCheck.json();
        bridgeOnline = health.status === 'ok';
        bridgeVersion = health.version || 'unknown';
        console.log(`[Print] Bridge status: ${health.status}, version: ${bridgeVersion}`);
      } catch {
        console.log('[Print] Local bridge not available');
      }

      if (!bridgeOnline) {
        setIsBridgeModalOpen(true);
        setIsPrinting(false);
        return;
      }
      
      const isDismissedNow = sessionStorage.getItem('bridge_update_dismissed') === 'true';
      if (!isVersionOk(bridgeVersion) && !isDismissedNow) {
        setIsUpdateModalOpen(true);
        setIsPrinting(false);
        return;
      }
      
      // Helper to process a single ref into a rotated base64 image
      const captureRef = async (ref: React.RefObject<HTMLDivElement | null>, label: string, rotate: boolean = true) => {
        if (!ref.current) throw new Error(fillDashboardTemplate(R.captureMissing, { label }));
        console.log(`[Print] Capturing ${label} (rotate=${rotate})...`);
        const captureStart = Date.now();

        // Fix 1: 폰트 <style> 주입 후 반환값(styleEl) 저장 (나중에 정리용)
        const injectedStyle = await embedActiveFontsIntoElement(ref.current);

        // Fix 1: 폰트가 DOM에 주입된 후 렌더링 안정화 대기
        // L210 등 첫 세션에서 CDN 폰트 응답 타이밍 문제 방지
        await new Promise(r => setTimeout(r, 150));

        const dataUrl = await toPng(ref.current, {
          pixelRatio: 2.0, 
          backgroundColor: '#ffffff',
          cacheBust: true,   // Fix 1: 첫 세션 캐시 문제 방지 (false → true)
          skipAutoScale: true,
          skipFonts: false,  // Fix 1: 라이브러리 자체 폰트 임베딩도 활성화 (이중 보호)
          style: { transform: 'none' }
        });

        // Fix 1: 캡처 완료 후 주입된 스타일 정리 (DOM 메모리 관리)
        if (injectedStyle) injectedStyle.remove();
        
        let processedUrl = dataUrl;
        if (rotate) {
          processedUrl = await rotateImage180(dataUrl);
        }
        
        const captureTime = Date.now() - captureStart;
        console.log(`[Print] ${label} Capture & Process: ${captureTime}ms`);
        return processedUrl;
      };
      
      const sendJob = async (refs: {ref: React.RefObject<HTMLDivElement | null>, label: string, rotate?: boolean}[], w: number, h: number, jobLabel: string) => {
        const images = [];
        for (const target of refs) {
          images.push(await captureRef(target.ref, target.label, target.rotate ?? true));
        }

        console.log(`[Print] 🚀 Sending ${jobLabel}: printer=${selectedPrinter}, segments=${images.length}, margin=${marginOffset}mm, width=${w}mm, length=${h}mm`);

        // 로컬 브릿지 인쇄 시도
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout
          
          const response = await fetch('http://127.0.0.1:8002/api/print_image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            mode: 'cors',
            body: JSON.stringify({
              printer_name: selectedPrinter,
              images: images,
              width_mm: w,
              length_mm: h,
              media_type: mediaType,
              cutting_margin_mm: selectedPrinterType === 'xprinter' ? cuttingMargin : (mediaType === 'roll' ? cuttingMargin : 0),
              print_quality: printQuality,
              // 모든 프린터(M105, Xprinter) 상관없이 사용자 보정치 값 전달
              margin_offset_mm: (RIBBON_SPECS.find(r => r.id === ribbonType)?.marginOffset || 0) + marginOffset
            }),
            signal: controller.signal
          });

          clearTimeout(timeout);

          if (response.ok) {
            const result = await response.json();
            if (result.status === 'success') {
              console.log(`[Print] ✅ Local print success (${result.method || 'native'})`);
              return; // 성공!
            }
            throw new Error(result.message || R.printFail);
          } else {
            throw new Error(`Bridge HTTP ${response.status}`);
          }
        } catch (err: any) {
          if (err.name === 'AbortError') throw new Error(R.printTimeout);
          console.error(`[Print] Local bridge error: ${err.message}`);
          throw err;
        }
      };

      if (printTarget === 'left') {
        await sendJob([{ref: separateLeftRef, label: R.congratText}], width, length, R.congratText);
        alert(R.printDoneLeft);
      } else if (printTarget === 'right') {
        await sendJob([{ref: separateRightRef, label: R.senderLabel}], width, length, R.senderLabel);
      } else {
        // 양쪽 모두 (UI 레이아웃 설정과 무관하게 항상 개별 캡처 후 브릿지에서 병합)
        // [수정] 인쇄 순서 및 회전 반전: 
        // 1. 오른쪽 리본 (경조사어): 가장 먼저 출력, 180도 회전 (뒤집힘)
        // 2. 왼쪽 리본 (보내는이): 그 다음 출력, 회전 없음 (정방향)
        // [최종 교정] 인쇄 순서 및 참조(Ref) 매핑 정상화
        await sendJob([
          {ref: separateLeftRef, label: R.congratText, rotate: true},
          {ref: separateRightRef, label: R.senderLabel, rotate: false}
        ], width, length, 'both');
        
        // 작업 추가 후 대기열 열기
        if (typeof setShowQueue === 'function') setShowQueue(true);
        alert(R.printQueueAdded);
      }
    } catch (error: any) {
       console.error("[Print] Error:", error);
       
       // 사용자 친화적 에러 메시지
       let userMessage = error.message || R.printFail;
       if (userMessage.includes('fetch') || userMessage.includes('network')) {
         userMessage = R.printBridgeHint;
       }
       
       alert("❌ " + userMessage);
    } finally {
       setIsPrinting(false);

       // 인쇄 이력 저장 (실패해도 무시)
       try {
         const { data: { user } } = await supabase.auth.getUser();
         if (user) {
           await supabase.from('print_history').insert([{
             user_id: user.id,
             ribbon_type: ribbonType,
             width,
             length,
             left_text: leftText,
             right_text: rightText,
             printer_name: selectedPrinter,
           }]);
         }
       } catch (_) { /* 이력 저장 실패는 무시 */ }
    }
  };

  const handleResetBridge = () => {
    if (confirm(R.resetBridgeConfirm)) {
      // 1. Clear LocalStorage keys
      localStorage.removeItem('bridge_update_dismissed');
      localStorage.removeItem('ribbon_bridge_ignore_version');
      localStorage.removeItem('last_connected_bridge_version');
      localStorage.removeItem('saved_ribbon_configs');
      
      // 2. Clear SessionStorage (for quick reset during session)
      sessionStorage.removeItem('bridge_update_dismissed');
      
      // 3. UI Update
      setIsUpdateModalOpen(false);
      setIsTroubleshootModalOpen(false);
      
      // 4. Force Reload Printer List
      loadPrinters();
      
      alert(R.resetBridgeDone);
      window.location.reload();
    }
  };

  const extendedFonts = useMemo(() => {
    const custom: FontItem[] = customFontItems.map(f => ({
      value: f.id,
      name: f.name,
      langs: ['ko', 'hj', 'en', 'sym'],
      preview: '祝發展 謹弔'
    }));
    return [...custom, ...localizedBaseFonts];
  }, [customFontItems, localizedBaseFonts]);

  const availableFonts = useMemo(() => {
    return extendedFonts.filter(f => !hiddenFonts.includes(f.value));
  }, [extendedFonts, hiddenFonts]);

  // Auto-Zoom Calculation (Runs on major layout changes only)
  useEffect(() => {
    if (mainRef.current && length > 0) {
      const padX = 20;
      const padY = 40;
      const availableH = mainRef.current.clientHeight - padY * 2;
      const availableW = mainRef.current.clientWidth - padX * 2;
      
      const targetH = length * 2;
      const targetW = width * 2;
      
      if (targetH > 0 && targetW > 0 && availableH > 0 && availableW > 0) {
        const zoomH = availableH / targetH;
        const zoomW = availableW / targetW;
        setZoom(Math.min(1.5, zoomH, zoomW));
      }
    }
  }, [isSidebarOpen]); // Re-fit when side panel toggles

  useEffect(() => {
    const checkBridge = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8002/api/version', { mode: 'cors' });
        if (res.ok) {
           const data = await res.json();
           if (data.status === 'success' && data.version !== REQUIRED_BRIDGE_VERSION) {
              console.log("[Bridge] Version mismatch:", data.version, "!==", REQUIRED_BRIDGE_VERSION);
           }
        }
      } catch (e) {
        console.log("[Bridge] Could not check version. Might be offline or very old.");
      }
    };
    
    const timer = setTimeout(checkBridge, 2000); // 2초 후 체크
    return () => clearTimeout(timer);
  }, []);

  const insertSymbol = (sym: string) => {
    if (activeSide === 'left') setLeftText(prev => prev + sym);
    else setRightText(prev => prev + sym);
  };

  const toggleRotation = (id: string, side: 'left'|'right') => {
    const toggleSet = (prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    };
    if (side === 'left') setLeftRotated(toggleSet);
    else setRightRotated(toggleSet);
  };

  const handleRotateAll = (side: 'left'|'right') => {
    // [Toggle Logic] If there are any rotated characters, clear all and return to normal
    const currentRotated = side === 'left' ? leftRotated : rightRotated;
    if (currentRotated.size > 0) {
      if (side === 'left') setLeftRotated(new Set());
      else setRightRotated(new Set());
      return;
    }

    const text = side === 'left' ? leftText : rightText;
    const lines = text.split('\n').filter(l => l.trim() !== '');
    const newRotated = new Set<string>();
    lines.forEach((line, lIdx) => {
      // Must match RibbonCanvas baseId pattern: 'L' + index
      const nodes = parseRibbonLine(line, `L${lIdx}`, new Set());
      nodes.forEach(n => {
        if (n.type === 'char' || n.type === 'fullwidth' || n.type === 'bracket' || n.type === 'split') newRotated.add(n.id);
      });
    });
    if (side === 'left') setLeftRotated(newRotated);
    else setRightRotated(newRotated);
  };


  const currentConfig = {
    ribbonType, length, width, lace, marginTop, marginBottom,
    leftText, leftFontConfig, leftRatioX, leftRatioY, leftRotated: Array.from(leftRotated), leftSpacing,
    rightText, rightFontConfig, rightRatioX, rightRatioY, rightRotated: Array.from(rightRotated), rightSpacing,
    printTarget, printLayout, mediaType, cuttingMargin, printQuality
  };

  const onLoadConfig = (c: any) => {
    if (!c) return;
    if (c.ribbonType) setRibbonType(c.ribbonType);
    if (c.length) setLength(c.length);
    if (c.width) setWidth(c.width);
    if (c.lace !== undefined) setLace(c.lace);
    if (c.marginTop !== undefined) setMarginTop(c.marginTop);
    if (c.marginBottom !== undefined) setMarginBottom(c.marginBottom);
    
    if (c.leftText !== undefined) setLeftText(c.leftText);
    if (c.leftFontConfig) setLeftFontConfig(c.leftFontConfig);
    if (c.leftRatioX) setLeftRatioX(c.leftRatioX);
    if (c.leftRatioY) setLeftRatioY(c.leftRatioY);
    if (c.leftRotated) setLeftRotated(new Set(c.leftRotated));
    if (c.leftSpacing !== undefined) setLeftSpacing(c.leftSpacing);

    if (c.rightText !== undefined) setRightText(c.rightText);
    if (c.rightFontConfig) setRightFontConfig(c.rightFontConfig);
    if (c.rightRatioX) setRightRatioX(c.rightRatioX);
    if (c.rightRatioY) setRightRatioY(c.rightRatioY);
    if (c.rightRotated) setRightRotated(new Set(c.rightRotated));
    if (c.rightSpacing !== undefined) setRightSpacing(c.rightSpacing);

    if (c.printTarget) setPrintTarget(c.printTarget);
    if (c.printLayout) setPrintLayout(c.printLayout);
    if (c.mediaType) setMediaType(c.mediaType);
    if (c.cuttingMargin !== undefined) setCuttingMargin(c.cuttingMargin);
    if (c.printQuality) setPrintQuality(c.printQuality);
  };

  return (
    <div className="flex bg-slate-900 text-slate-200 h-screen w-screen overflow-hidden text-sm">
      
      {/* 1. Left Panel: Config Sidebar (Mobile/Desktop Sync) */}
      <aside className={cn(
        "relative lg:sticky top-0 left-0 bottom-0 h-full shrink-0 z-40 p-4 lg:p-5 overflow-y-auto border-r border-slate-200/90 transition-all duration-300 transform-gpu bg-white/98 backdrop-blur-md shadow-[4px_0_32px_-12px_rgba(15,23,42,0.1)]",
        isSidebarOpen 
          ? "w-[260px] sm:w-72 lg:w-80 translate-x-0" 
          : "w-0 p-0 overflow-hidden border-none -translate-x-10 lg:absolute lg:opacity-0"
      )}>
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <img src="/logo.png" alt="Floxync" className="w-6 h-6 object-contain" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-600">Floxync</span>
              </h1>
              <span className="text-[8px] text-slate-500 uppercase tracking-widest ml-8 font-medium">{R.floristTagline}</span>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition"
              title={R.closeMenu}
            >
              <ChevronLeft size={18} />
            </button>
          </div>
            <div className="flex items-center gap-1.5">
              <button 
                className="lg:hidden p-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200"
                onClick={() => setIsSidebarOpen(false)}
              >
                <X size={20} />
              </button>
            {isAdmin && (
              <button
                onClick={onShowAdmin}
                className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-600 hover:text-amber-800 border border-transparent hover:border-amber-200/80 transition" 
                title={R.adminDashboard}
              >
                <Shield size={18} />
              </button>
            )}
            <button
              onClick={async () => {
                try { await fetch('http://127.0.0.1:8002/api/queue/clear', { method: 'POST', signal: AbortSignal.timeout(1000) }); } catch(e){}
                await supabase.auth.signOut();
              }}
              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-600 hover:text-red-700 border border-transparent hover:border-red-100 transition" title={R.logout}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 font-mono">{R.buildLabel}</p>
          {session?.user?.email && (
            <p className="text-[10px] text-blue-700 mt-1 truncate font-medium" title={session.user.email}>👤 {session.user.email}</p>
          )}


          <div 
            className="mt-1 px-2 py-1 rounded-lg text-[9px] font-bold text-center border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer"
            onClick={() => setIsTroubleshootModalOpen(true)}
          >
            ⚙️ {R.bridgeTroubleshoot}
          </div>

          {/* Subscription Badge */}
          {true && (
            <div className={`mt-2 px-2 py-1.5 rounded-lg text-[10px] font-medium text-center border tracking-wide ${
              isAdmin
                ? 'bg-amber-50 text-amber-900 border-amber-200'
                : hasAccess 
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
                  : 'bg-red-50 text-red-800 border-red-200'
            }`}>
              {isAdmin
                ? `🛡️ ${R.adminAllFeatures}`
                : hasAccess 
                  ? `✅ ${fillDashboardTemplate(R.accessOkPlan, { plan: userPlan || 'basic' })}`
                  : `🔓 ${R.freeTrialPrintLimited}`}
            </div>
          )}
        </div>

        {/* 1. 출력 프린터 / 브릿지 상태 (최상단) */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-slate-700 font-bold uppercase tracking-wider">{R.outputPrinter}</label>
            <div className="flex items-center gap-1.5">
              <div className={cn("w-2 h-2 rounded-full animate-pulse", printers.length > 0 ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500")} />
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">
                {fillDashboardTemplate(R.bridgeEngineVersion, { version: bridgeVersion || '?.?' })}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <select 
              value={selectedPrinter} 
              onChange={e => {
                const newName = e.target.value;
                setSelectedPrinter(newName);
                localStorage.setItem('ribbon_selected_printer', newName);
              }}
              className="flex-1 p-2 rounded-lg text-sm bg-white border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              {printers.length === 0 && <option value="">☁️ {R.remoteDefaultPrinter}</option>}
              {printers.map((p: any) => (
                <option key={p.name} value={p.name}>
                  {p.type === 'xprinter' ? '🏷️' : p.brand === 'epson' ? '🟢' : p.brand === 'hp' ? '🔵' : '⚪'} {p.name} {p.status === 'Ready' ? '✅' : '⚠️'}
                </option>
              ))}
            </select>
            <button 
              onClick={() => {
                fetch('http://127.0.0.1:8002/api/printers', { signal: AbortSignal.timeout(2000) })
                  .then(res => res.json())
                  .then(res => res.status === 'success' && setPrinters(res.data))
                  .catch(() => setPrinters([])); // Clear on failure
              }}
              title={R.refreshPrintersTitle}
              className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 transition"
            >
              <RotateCw size={14} className={isPrinting ? "animate-spin" : ""} />
            </button>
          </div>
          {printers.length > 0 && (() => {
            const selected = printers.find((p: any) => p.name === selectedPrinter);
            if (!selected) return null;
            const engineColor = selected.brand === 'epson' ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : selected.brand === 'hp' ? 'bg-blue-50 text-blue-900 border-blue-200'
              : 'bg-slate-100 text-slate-700 border-slate-200';
            return (
              <div className={`mt-1.5 px-2 py-1 rounded text-[10px] font-medium text-center border ${engineColor}`}>
                🔧 {selected.engine || 'GDI Variable Height Engine'}
              </div>
            );
          })()}
        </div>

        <div className="h-px bg-slate-200 my-2" />

        {/* 2. 하드웨어 규격 (프리셋, 폭, 길이) */}
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-700 block mb-1 font-bold">
              {R.ribbonPreset} {selectedPrinterType === 'xprinter' && <span className="text-amber-800 text-[10px] ml-1 font-semibold">🏷️ {R.xprinterBadge105}</span>}
            </label>
            <select 
              value={ribbonType} 
              onChange={e => {
                const presets = selectedPrinterType === 'xprinter' ? availablePresets : ribbonTypesLocalized;
                const selected = presets.find(t => t.id === e.target.value);
                if (selected) {
                  setRibbonType(selected.id);
                  setWidth(selected.width);
                  setLength(selected.length);
                  setLace(selected.lace || 0);
                  setMarginTop(selected.marginTop || 0);
                  setMarginBottom(selected.marginBottom || 0);
                }
              }}
              className="w-full p-2 rounded-lg text-sm bg-white border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              {availablePresets.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-600 block mb-1 uppercase tracking-tighter font-medium">{R.widthMm}</label>
              <input type="number" value={width} onChange={e => setWidth(Number(e.target.value))} className="w-full p-2.5 rounded-lg text-sm text-center font-bold font-mono bg-white border border-slate-200 text-slate-900" />
            </div>
            <div>
              <label className="text-[10px] text-slate-600 block mb-1 uppercase tracking-tighter font-medium">{R.lengthMm}</label>
              <input type="number" value={length} onChange={e => setLength(Number(e.target.value))} className="w-full p-2.5 rounded-lg text-sm text-center font-bold font-mono bg-white border border-slate-200 text-slate-900" />
            </div>
          </div>
        </div>

        <div className="h-px bg-slate-200 my-2" />

        {/* 3. 상단 하단 레이스 */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] text-slate-600 block mb-1 font-bold">{R.topMargin}</label>
            <input type="number" value={marginTop} onChange={e => setMarginTop(Number(e.target.value))} className="w-full p-2 rounded-lg text-sm text-center font-mono bg-white border border-slate-200 text-slate-900" title={R.topMarginTitle} />
          </div>
          <div>
            <label className="text-[10px] text-slate-600 block mb-1 font-bold">{R.bottomMargin}</label>
            <input type="number" value={marginBottom} onChange={e => setMarginBottom(Number(e.target.value))} className="w-full p-2 rounded-lg text-sm text-center font-mono bg-white border border-slate-200 text-slate-900" title={R.bottomMarginTitle} />
          </div>
          <div>
            <label className="text-[10px] text-slate-600 block mb-1 font-bold">{R.sideLace}</label>
            <input type="number" value={lace} onChange={e => setLace(Number(e.target.value))} className="w-full p-2 rounded-lg text-sm text-center font-mono bg-white border border-slate-200 text-slate-900" title={R.sideLaceTitle} />
          </div>
        </div>

        {/* 4. 양쪽 보정 (M) */}
        <div className="pt-1">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-slate-700 font-bold flex items-center gap-1">
              ↔️ {R.horizAdjust} <span className="text-[10px] text-slate-500 uppercase font-normal">{R.microAdjust}</span>
            </label>
            <span className={cn("text-xs font-mono font-bold", marginOffset === 0 ? "text-slate-500" : "text-blue-700")}>
              {marginOffset > 0 ? `+${marginOffset}` : marginOffset}mm
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500">{R.leftShort}</span>
            <input 
              type="range" 
              min="-2" max="2" step="0.5" 
              value={marginOffset}
              onChange={e => setMarginOffset(Number(e.target.value))}
              className="flex-1 accent-blue-500"
            />
            <span className="text-[10px] text-slate-500">{R.rightShort}</span>
          </div>
        </div>

        <div className="h-px bg-slate-200 my-2" />

        {/* 5. 인쇄 대상 & 용지 옵션 (커팅, 롤리본, 고속) */}
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-700 block mb-2 font-bold uppercase">{R.printTarget}</label>
            <div className="grid grid-cols-3 gap-2">
               <button 
                onClick={() => setPrintTarget('both')}
                className={cn("p-2 rounded-lg text-xs font-bold transition border", printTarget === 'both' ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20" : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/80")}
               >{R.bothSides}</button>
               <button 
                onClick={() => setPrintTarget('left')}
                className={cn("p-2 rounded-lg text-xs font-bold transition border", printTarget === 'left' ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20" : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/80")}
               >{R.congratText}</button>
               <button 
                onClick={() => setPrintTarget('right')}
                className={cn("p-2 rounded-lg text-xs font-bold transition border", printTarget === 'right' ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20" : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/80")}
               >{R.senderLabel}</button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
             <select 
               value={mediaType} 
               onChange={e => {
                 const v = e.target.value as 'roll' | 'cut';
                 if (v === 'roll') {
                   alert(`🔧 ${R.rollRibbonAlert}`);
                   setMediaType('cut');
                 } else {
                   setMediaType(v);
                 }
               }}
               className="p-2 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/30"
             >
               <option value="cut">📄 {R.cutRibbon}</option>
               <option value="roll">🔄 {R.rollRibbonDev}</option>
             </select>
             <select 
               value={printQuality} 
               onChange={e => setPrintQuality(e.target.value as any)}
               className="p-2 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/30"
             >
               <option value="fast">⚡ {R.fastPrint}</option>
               <option value="high">💎 {R.highQuality}</option>
             </select>
             {mediaType === 'roll' ? (
               <select 
                 value={cuttingMargin} 
                 onChange={e => setCuttingMargin(Number(e.target.value))}
                 className="p-2 rounded-lg text-xs font-bold bg-white border border-slate-200 text-blue-800 outline-none focus:ring-2 focus:ring-blue-500/30"
               >
                 {[1,2,3,4,5,6,7,8,9,10].map(cm => (
                   <option key={cm} value={cm * 10}>{fillDashboardTemplate(R.cuttingCm, { n: cm })}</option>
                 ))}
               </select>
             ) : (
               <div className="p-2 rounded-lg text-xs bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center italic">{R.cuttingNo}</div>
             )}
          </div>
        </div>

        <div className="h-px bg-slate-200 my-2" />

        {/* 6. 좌측 리본 (경조사) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-slate-800 font-semibold mb-1 border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2"><Type size={16} className="text-blue-600" /> {R.leftRibbon}</div>
            <div className="flex items-center gap-1">
              <button onClick={() => handleRotateAll('left')} className="hover:bg-slate-100 p-1 rounded text-slate-600 hover:text-slate-900 border border-transparent hover:border-slate-200" title={R.rotate90}><RotateCw size={14} /></button>
              <button onClick={() => setActiveSide('left')} className={cn("text-[10px] px-2 py-0.5 rounded font-bold ml-1 border", activeSide === 'left' ? "bg-blue-600 text-white border-blue-600" : "bg-slate-100 text-slate-600 border-slate-200")}>{R.activeLabel}</button>
            </div>
          </div>
          <input 
            type="text" value={leftText} 
            onChange={e => setLeftText(e.target.value)} onFocus={() => setActiveSide('left')}
            translate="no"
            className="w-full p-2.5 rounded-xl text-sm font-semibold bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/35 outline-none notranslate" placeholder={R.contentPlaceholder}
          />
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-800">{R.fontWizard}</span>
              <div className="flex gap-1 items-center">
                <button onClick={() => setLeftIsBold(!leftIsBold)} className={cn("text-[10px] px-2 py-0.5 rounded font-bold mr-1 border", leftIsBold ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200")} title={R.boldTitle}>
                  B
                </button>
                {(['ko', 'hj', 'en', 'sym'] as const).map(type => (
                  <button key={type} onClick={() => setFontWizardMode(type)} className={cn("text-[10px] px-1.5 py-0.5 rounded border", fontWizardMode === type ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200")}>
                    {fontWizardLangLabel(type)}
                  </button>
                ))}
              </div>
            </div>
            <FontSelector value={leftFontConfig[fontWizardMode]} onChange={val => setLeftFontConfig(prev => ({ ...prev, [fontWizardMode]: val }))} mode={fontWizardMode} fonts={availableFonts} ui={fontUi} />
            <div className="grid grid-cols-2 gap-2">
               <div className="flex bg-white rounded-lg overflow-hidden border border-slate-200">
                  <span className="bg-slate-100 text-[9px] text-slate-600 px-1.5 flex items-center font-medium">{R.ratioW}</span>
                  <input type="number" value={leftRatioX} onChange={e => setLeftRatioX(Number(e.target.value))} className="w-full p-1.5 text-xs text-center font-mono bg-transparent text-slate-900" />
               </div>
               <div className="flex bg-white rounded-lg overflow-hidden border border-slate-200">
                  <span className="bg-slate-100 text-[9px] text-slate-600 px-1.5 flex items-center font-medium">{R.ratioH}</span>
                  <input type="number" value={leftRatioY} onChange={e => setLeftRatioY(Number(e.target.value))} className="w-full p-1.5 text-xs text-center font-mono bg-transparent text-slate-900" />
               </div>
            </div>
          </div>
        </div>

        {/* 7. 우측 리본 (보내는이) */}
        <div className="space-y-2 mt-4">
          <div className="flex items-center justify-between text-slate-800 font-semibold mb-1 border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2"><Type size={16} className="text-emerald-600" /> {R.rightRibbon}</div>
            <div className="flex items-center gap-1">
              <button onClick={() => handleRotateAll('right')} className="hover:bg-slate-100 p-1 rounded text-slate-600 hover:text-slate-900 border border-transparent hover:border-slate-200" title={R.rotate90}><RotateCw size={14} /></button>
              <button onClick={() => setActiveSide('right')} className={cn("text-[10px] px-2 py-0.5 rounded font-bold ml-1 border", activeSide === 'right' ? "bg-emerald-600 text-white border-emerald-600" : "bg-slate-100 text-slate-600 border-slate-200")}>{R.activeLabel}</button>
            </div>
          </div>
          <input 
            type="text" value={rightText} 
            onChange={e => setRightText(e.target.value)} onFocus={() => setActiveSide('right')}
            translate="no"
            className="w-full p-2.5 rounded-xl text-sm font-semibold bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500/35 outline-none notranslate" placeholder={R.contentPlaceholder}
          />
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col gap-3">
             <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-800">{R.fontWizard}</span>
              <div className="flex gap-1 items-center">
                <button onClick={() => setRightIsBold(!rightIsBold)} className={cn("text-[10px] px-2 py-0.5 rounded font-bold mr-1 border", rightIsBold ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-600 border-slate-200")} title={R.boldTitle}>
                  B
                </button>
                {(['ko', 'hj', 'en', 'sym'] as const).map(type => (
                  <button key={type} onClick={() => setFontWizardModeRight(type)} className={cn("text-[10px] px-1.5 py-0.5 rounded border", fontWizardModeRight === type ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-600 border-slate-200")}>
                    {fontWizardLangLabel(type)}
                  </button>
                ))}
              </div>
            </div>
            <FontSelector value={rightFontConfig[fontWizardModeRight]} onChange={val => setRightFontConfig(prev => ({ ...prev, [fontWizardModeRight]: val }))} mode={fontWizardModeRight} fonts={availableFonts} ui={fontUi} />
            <div className="grid grid-cols-2 gap-2">
               <div className="flex bg-white rounded-lg overflow-hidden border border-slate-200">
                  <span className="bg-slate-100 text-[9px] text-slate-600 px-1.5 flex items-center font-medium">{R.ratioW}</span>
                  <input type="number" value={rightRatioX} onChange={e => setRightRatioX(Number(e.target.value))} className="w-full p-1.5 text-xs text-center font-mono bg-transparent text-slate-900" />
               </div>
               <div className="flex bg-white rounded-lg overflow-hidden border border-slate-200">
                  <span className="bg-slate-100 text-[9px] text-slate-600 px-1.5 flex items-center font-medium">{R.ratioH}</span>
                  <input type="number" value={rightRatioY} onChange={e => setRightRatioY(Number(e.target.value))} className="w-full p-1.5 text-xs text-center font-mono bg-transparent text-slate-900" />
               </div>
            </div>
          </div>
        </div>

        <div className="h-px bg-slate-200 my-2" />

        {/* 9. 자주 쓰는 문구 */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200">
             <div className="flex items-center gap-2">
               <h3 className="text-xs font-bold text-slate-800">{R.frequentPhrases}</h3>
               <button onClick={() => setIsPhraseManagerOpen(true)} className="p-1 hover:bg-white rounded text-slate-600 border border-transparent hover:border-slate-200"><Settings size={14} /></button>
             </div>
             <select value={phraseCategory} onChange={e => setPhraseCategory(Number(e.target.value))} className="bg-white border border-slate-200 text-[10px] rounded px-2 py-1 text-slate-800 outline-none">
               {phraseCategories.map((cat, idx) => <option key={idx} value={idx}>{phraseCategoryLabel(cat.name)}</option>)}
             </select>
          </div>
          <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1 notranslate" translate="no">
            {phraseCategories[phraseCategory]?.phrases.map((item, idx) => (
               <button key={idx} onClick={() => { if (activeSide === 'left') setLeftText(item.text); else setRightText(item.text); }} className="bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg p-2 text-center transition-all group">
                 <span className="text-[11px] font-semibold text-slate-900 block truncate group-hover:text-blue-900">{item.text}</span>
                 <span className="text-[9px] text-slate-600 truncate">{phraseDescForUi(phraseCategory, idx, item.desc)}</span>
               </button>
            ))}
          </div>
        </div>

        {/* 10. 특수 기호 */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mt-4">
          <h3 className="text-xs font-bold text-slate-800 mb-2">{R.specialSymbols}</h3>
          <div className="grid grid-cols-6 gap-1 notranslate" translate="no">
            {SYMBOL_BANK.map(sym => (
               <button key={sym} onClick={() => insertSymbol(sym)} className="bg-white hover:bg-slate-900 border border-slate-200 hover:border-slate-900 rounded py-1.5 text-xs text-slate-800 hover:text-white transition-colors font-medium">
                 {sym}
               </button>
            ))}
          </div>
        </div>

        {/* 10. 매장 로고 (Final Section) */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mt-4 mb-20">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-slate-800 font-bold flex items-center gap-1.5">🏪 {R.shopLogo}</label>
            <div className="flex items-center gap-2">
              {shopLogo && <button 
                   onClick={async () => {
                     setShopLogo(null);
                     setPrintLogo(false);
                     await supabase.auth.updateUser({ data: { shop_logo: "" } });
                     alert(R.logoDeletedFromServer);
                   }} 
                   className="text-[10px] text-red-500 font-bold hover:text-red-400"
                 >
                   {R.deleteLogo}
                 </button>}
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={printLogo} onChange={e => setPrintLogo(e.target.checked)} disabled={!shopLogo} />
                <div className="w-7 h-4 bg-slate-300 peer-checked:bg-blue-600 rounded-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-full"></div>
              </label>
            </div>
          </div>
          {!shopLogo ? (
            <label className="flex items-center justify-center w-full p-3 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-white transition text-slate-600 hover:text-slate-900">
              <span className="text-xs flex flex-col items-center gap-1"><Upload size={18}/> {R.registerLogo}</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </label>
          ) : (
             <div className="p-2 bg-white rounded-lg flex justify-center">
               <img src={shopLogo} alt="Shop Logo" className="h-8 object-contain" />
             </div>
          )}
        </div>

        {/* Tip / Manual Button */}
        <div className="mt-4 mb-2 w-full select-none">
          <button
            onClick={() => setIsManualOpen(true)}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl shadow-md border border-slate-700 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <BookOpen size={18} />
            {R.beginnerManual}
          </button>
        </div>

        {/* Customer Support / QA */}
        <div className="mb-10 w-full select-none">
          <div className="bg-white border border-slate-200 p-3.5 rounded-xl border-l-4 border-l-blue-600 flex flex-col gap-1 shadow-sm">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1">
              🎧 {R.supportTitle}
            </h3>
            <p className="text-[10px] text-slate-600">{R.supportBody}</p>
            <div className="flex flex-col gap-1 mt-1 text-[11px] font-mono text-slate-800 bg-slate-50 border border-slate-100 p-2 rounded-lg">
              <div className="flex justify-between items-center">
                <span>📞 {R.phoneLabel}:</span>
                <span className="text-blue-700 font-bold">1588-0000</span>
              </div>
              <div className="flex justify-between items-center">
                <span>💬 {R.kakaoLabel}:</span>
                <span className="text-amber-800 font-bold cursor-pointer hover:underline">@ribbonprint</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. Center Panel: Canvas */}
      <main 
        ref={mainRef} 
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDragging}
        onMouseLeave={stopDragging}
        className={cn(
          "flex-1 relative overflow-auto p-4 sm:p-12 bg-slate-100 min-w-0 transition-all duration-300",
          isSidebarOpen ? "lg:ml-0" : "ml-0",
          "mr-0",
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
      >
        {/* Ribbon Layout Management Buttons (Panel Toggles) */}
        {!isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="fixed top-1/2 left-0 -translate-y-1/2 z-[45] p-2.5 bg-slate-900 text-white rounded-r-xl shadow-lg border-y border-r border-slate-700 hover:bg-slate-800 transition-all active:scale-95 group"
            title={R.openSettingsMenu}
          >
            <ChevronRight size={24} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}


        {/* Mobile Menu Toggle Floating Button (Legacy, keep but adjust) */}
        {!isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden fixed top-4 left-4 z-30 p-2.5 bg-slate-900 text-white rounded-xl shadow-lg border border-slate-700 backdrop-blur hover:bg-slate-800 transition active:scale-95"
            title={R.openMenu}
          >
            <Menu size={24} />
          </button>
        )}

        <div className="inline-flex min-w-full min-h-full items-start justify-center py-8 lg:py-12 select-none">
        {/* Design Canvas Area Wrapper to handle Scroll with Zoom */}
        <div 
          className="relative transition-all duration-300 transform-gpu"
          style={{ 
            transform: `scale(${zoom})`, 
            transformOrigin: 'top center',
            // Accurate sizing to fix scrollbars:
            // We need to set the parent's layout size to the SCALED size.
            // But we do it via padding/margins to the inner relative container.
            width: isPreviewMode ? `${(width * 2) * zoom}px` : `${((width * 4) + 100) * zoom}px`, // approximate for double ribbon
            height: `${(length * 2) * zoom}px`,
            marginBottom: '100px'
          }}
        >
          <div className={cn(
            "flex absolute top-0 left-1/2 -translate-x-1/2 transition-all duration-300",
            isPreviewMode ? "gap-4 flex-col items-center" : "flex-col lg:flex-row gap-12 lg:gap-24 items-center",
            isPreviewMode && "bg-white/90 p-10 rounded-3xl border border-slate-200 shadow-sm backdrop-blur-sm"
          )}>
          {isPreviewMode ? (
            // ================= PREVIEW MODE =================
            <div className="flex flex-col items-center">
              <div className="text-slate-800 font-semibold mb-8 text-2xl uppercase tracking-widest border-b border-slate-200 pb-2">
                {previewHeadingText}
              </div>
              
              <div className="flex flex-col items-center bg-white shadow-xl p-4 border-[8px] border-slate-200 rounded-md ring-1 ring-slate-100">
                {printTarget === 'left' && (
                  <div style={{ transform: 'rotate(180deg)', transformOrigin: 'center center' }}>
                      <RibbonCanvas 
                        text={leftText} fontConfig={leftFontConfig} ratioX={leftRatioX} ratioY={leftRatioY} lace={lace}
                        width={width} length={length} marginTop={marginTop} marginBottom={marginBottom}
                        marginLabelTop={R.topMarginCanvas} marginLabelBottom={R.bottomMarginCanvas}
                        rotatedIds={leftRotated} onCharClick={() => {}}
                        scaleRatio={2} zoom={1} spacing={leftSpacing} side="left" 
                        marginOffset={(RIBBON_SPECS.find(r => r.id === ribbonType)?.marginOffset || 0) + marginOffset} 
                        shopLogo={shopLogo} printLogo={printLogo} isBold={leftIsBold}
                      />
                  </div>
                )}
                {printTarget === 'right' && (
                  <div style={{ transform: 'rotate(180deg)', transformOrigin: 'center center' }}>
                    <RibbonCanvas 
                      text={rightText} fontConfig={rightFontConfig} ratioX={rightRatioX} ratioY={rightRatioY} lace={lace}
                      width={width} length={length} marginTop={marginTop} marginBottom={marginBottom}
                      marginLabelTop={R.topMarginCanvas} marginLabelBottom={R.bottomMarginCanvas}
                      rotatedIds={rightRotated} onCharClick={() => {}}
                      scaleRatio={2} zoom={1} spacing={rightSpacing} side="right" 
                      marginOffset={(RIBBON_SPECS.find(r => r.id === ribbonType)?.marginOffset || 0) + marginOffset} 
                      shopLogo={shopLogo} printLogo={printLogo} isBold={rightIsBold}
                    />
                  </div>
                )}
                {printTarget === 'both' && printLayout === 'connected' && (
                  <div className="flex flex-col items-center">
                    <div style={{ transform: 'rotate(180deg)', transformOrigin: 'center center' }}>
                      <RibbonCanvas 
                        text={leftText} fontConfig={leftFontConfig} ratioX={leftRatioX} ratioY={leftRatioY} lace={lace}
                        width={width} length={length} marginTop={marginTop} marginBottom={marginBottom}
                        marginLabelTop={R.topMarginCanvas} marginLabelBottom={R.bottomMarginCanvas}
                        rotatedIds={leftRotated} onCharClick={() => {}}
                        scaleRatio={2} zoom={1} spacing={leftSpacing} side="left" 
                        marginOffset={(RIBBON_SPECS.find(r => r.id === ribbonType)?.marginOffset || 0) + marginOffset} 
                        shopLogo={shopLogo} printLogo={printLogo} isBold={leftIsBold}
                      />
                    </div>
                    {/* Middle Connection Line */}
                    <div style={{ width: `${(width - lace*2) * 2}px`, height: '4px', backgroundColor: 'black' }} />
                    <RibbonCanvas 
                      text={rightText} fontConfig={rightFontConfig} ratioX={rightRatioX} ratioY={rightRatioY} lace={lace}
                      width={width} length={length} marginTop={marginTop} marginBottom={marginBottom}
                      marginLabelTop={R.topMarginCanvas} marginLabelBottom={R.bottomMarginCanvas}
                      rotatedIds={rightRotated} onCharClick={() => {}}
                      scaleRatio={2} zoom={1} spacing={rightSpacing} side="right" 
                      marginOffset={(RIBBON_SPECS.find(r => r.id === ribbonType)?.marginOffset || 0) + marginOffset} 
                      shopLogo={shopLogo} printLogo={printLogo} isBold={rightIsBold}
                    />
                  </div>
                )}
                {printTarget === 'both' && printLayout === 'separate' && (
                  <div className="flex gap-12">
                    <div style={{ transform: 'rotate(180deg)', transformOrigin: 'center center' }}>
                      <RibbonCanvas 
                        text={leftText} fontConfig={leftFontConfig} ratioX={leftRatioX} ratioY={leftRatioY} lace={lace}
                        width={width} length={length} marginTop={marginTop} marginBottom={marginBottom}
                        marginLabelTop={R.topMarginCanvas} marginLabelBottom={R.bottomMarginCanvas}
                        rotatedIds={leftRotated} onCharClick={() => {}}
                        scaleRatio={2} zoom={1} spacing={leftSpacing} side="left" 
                        marginOffset={(RIBBON_SPECS.find(r => r.id === ribbonType)?.marginOffset || 0) + marginOffset} 
                        shopLogo={shopLogo} printLogo={printLogo} isBold={leftIsBold}
                      />
                    </div>
                    <div style={{ transform: 'rotate(180deg)', transformOrigin: 'center center' }}>
                      <RibbonCanvas 
                        text={rightText} fontConfig={rightFontConfig} ratioX={rightRatioX} ratioY={rightRatioY} lace={lace}
                        width={width} length={length} marginTop={marginTop} marginBottom={marginBottom}
                        marginLabelTop={R.topMarginCanvas} marginLabelBottom={R.bottomMarginCanvas}
                        rotatedIds={rightRotated} onCharClick={() => {}}
                        scaleRatio={2} zoom={1} spacing={rightSpacing} side="right" 
                        marginOffset={(RIBBON_SPECS.find(r => r.id === ribbonType)?.marginOffset || 0) + marginOffset} 
                        shopLogo={shopLogo} printLogo={printLogo} isBold={rightIsBold}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // ================= DESIGN MODE =================
            <div 
              ref={printAreaRef}
              className="flex gap-24 transition-transform duration-300 bg-slate-100" 
              style={{ transformOrigin: 'top center' }}
            >
              <RibbonCanvas 
                text={leftText} fontConfig={leftFontConfig} ratioX={leftRatioX} ratioY={leftRatioY} lace={lace}
                width={width} length={length} marginTop={marginTop} marginBottom={marginBottom}
                marginLabelTop={R.topMarginCanvas} marginLabelBottom={R.bottomMarginCanvas}
                rotatedIds={leftRotated} onCharClick={(id) => toggleRotation(id, 'left')}
                scaleRatio={2} zoom={zoom} spacing={leftSpacing} isActive={activeSide === 'left'} 
                marginOffset={(RIBBON_SPECS.find(r => r.id === ribbonType)?.marginOffset || 0) + marginOffset} 
                shopLogo={shopLogo} printLogo={printLogo} isBold={leftIsBold}
                onClick={() => setActiveSide('left')} side="left"
              />
              <RibbonCanvas 
                text={rightText} fontConfig={rightFontConfig} ratioX={rightRatioX} ratioY={rightRatioY} lace={lace}
                width={width} length={length} marginTop={marginTop} marginBottom={marginBottom}
                marginLabelTop={R.topMarginCanvas} marginLabelBottom={R.bottomMarginCanvas}
                rotatedIds={rightRotated} onCharClick={(id) => toggleRotation(id, 'right')}
                scaleRatio={2} zoom={zoom} spacing={rightSpacing} isActive={activeSide === 'right'} 
                marginOffset={(RIBBON_SPECS.find(r => r.id === ribbonType)?.marginOffset || 0) + marginOffset} 
                shopLogo={shopLogo} printLogo={printLogo} isBold={rightIsBold}
                onClick={() => setActiveSide('right')} side="right"
              />
            </div>
          )}
        </div>
      </div>
    </div>

      {/* Floating Actions Toolbar */}
        <div className={cn(
          "fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-xl p-2 rounded-full border border-slate-200 flex gap-1 sm:gap-2 shadow-[0_12px_40px_-8px_rgba(15,23,42,0.18)] z-[60] transition-all duration-300"
        )}>
          <button 
            onClick={() => checkSubscriptionAction(() => setIsTemplateManagerOpen(true))} 
            className="p-2 rounded-full hover:bg-amber-50 text-amber-900 border border-transparent hover:border-amber-200 transition-colors flex items-center gap-2 px-4 whitespace-nowrap"
          >
            <FolderOpen size={18} />
            <span className="text-xs font-semibold uppercase">{R.templatesBtn}</span>
          </button>
          <div className="w-px h-6 bg-slate-200 my-auto mx-1"></div>
          <button 
            onClick={() => setIsPreviewMode(!isPreviewMode)} 
            className={cn(
              "p-2 rounded-full transition-colors flex items-center gap-2 px-4 whitespace-nowrap border", 
              isPreviewMode ? "bg-blue-600 text-white border-blue-600" : "hover:bg-slate-100 text-slate-700 border-transparent"
            )}
          >
            {isPreviewMode ? <Maximize2 size={18} /> : <Eye size={18} />}
            <span className="text-xs font-semibold uppercase">{isPreviewMode ? R.designMode : R.previewMode}</span>
          </button>
          <div className="w-px h-6 bg-slate-200 my-auto"></div>
          <button onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-700"><Minimize2 size={18} /></button>
          <div className="px-3 flex items-center justify-center font-mono text-xs text-slate-800 font-medium">{Math.round(zoom * 100)}%</div>
          <button onClick={() => setZoom(z => Math.min(2.0, z + 0.1))} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-700"><Maximize2 size={18} /></button>
          <div className="w-px h-6 bg-slate-200 my-auto mx-1"></div>
          <button 
            onClick={() => checkSubscriptionAction(handlePrint)}
            disabled={isPrinting}
            className={cn(
              "flex items-center gap-2 px-6 py-2 rounded-full font-bold transition-all shadow-md border",
              isPrinting ? "bg-slate-300 cursor-not-allowed text-slate-600 border-slate-300" : "bg-slate-900 hover:bg-slate-800 text-white border-slate-900"
            )}
          >
            {isPrinting ? (
              <RotateCw className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Printer size={16} />
            )}
            {isPrinting ? R.printSendingUpper : R.printBtn}
          </button>
        </div>
      </main>



      {/* Inject custom font styles */}
      <style>
        {`
          input::selection {
            background-color: #3b82f6 !important;
            color: white !important;
          }
          input::-moz-selection {
            background-color: #3b82f6 !important;
            color: white !important;
          }
        `}
        {customStyles.map(s => s.css).join('\n')}
      </style>

      {/* Font Manager Dialog */}
      <FontManagerDialog 
        isOpen={isFontManagerOpen} 
        onClose={() => {
          setIsFontManagerOpen(false);
          loadFontSettings();
        }} 
        baseFonts={localizedBaseFonts}
        onSettingsChanged={loadFontSettings}
      />

      {/* Phrase Manager Dialog */}
      <PhraseManagerDialog
        isOpen={isPhraseManagerOpen}
        onClose={() => setIsPhraseManagerOpen(false)}
        onChanged={loadCustomPhrases}
      />

      {/* Manual Dialog */}
      <ManualDialog
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)}
      />

      {/* Template Manager Dialog */}
      <TemplateManagerDialog
        isOpen={isTemplateManagerOpen}
        onClose={() => setIsTemplateManagerOpen(false)}
        currentConfig={currentConfig}
        onLoad={onLoadConfig}
      />

      {/* Hidden Professional Capture Areas (Not visible to user) */}
      {/* IMPORTANT: No CSS transforms on ref elements! toPng cannot reliably capture CSS transforms.
          Rotation is handled post-capture via Canvas API in handlePrint. */}
      <div style={{ position: 'fixed', left: -9999, top: -9999, pointerEvents: 'none', opacity: 0 }}>
        
        {/* 1. Connected Strip Mode [L + Line + R] - printed as continuous strip */}
        <div 
          ref={connectedPrintRef} 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            backgroundColor: 'white',
            width: `${width * 3}px`
          }}
        >
          {/* Left ribbon (경조사) - reversed order via column-reverse */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column-reverse', 
            width: `${width * 3}px`,
            backgroundColor: 'white'
          }}>
            <RibbonCanvas
              text={leftText} fontConfig={leftFontConfig} ratioX={leftRatioX} ratioY={leftRatioY} lace={lace}
              width={width} length={length} marginTop={marginTop} marginBottom={marginBottom}
              marginLabelTop={R.topMarginCanvas} marginLabelBottom={R.bottomMarginCanvas}
              rotatedIds={leftRotated} onCharClick={() => {}}
              scaleRatio={3} zoom={1} spacing={leftSpacing} side="left" isPrintMode={true}
              shopLogo={shopLogo} printLogo={printLogo} isBold={leftIsBold}
            />
          </div>
          {/* Middle Connection Line */}
          <div style={{ width: `${(width - lace*2) * 3}px`, height: '6px', backgroundColor: 'black' }} />
          <RibbonCanvas
            text={rightText} fontConfig={rightFontConfig} ratioX={rightRatioX} ratioY={rightRatioY} lace={lace}
            width={width} length={length} marginTop={marginTop} marginBottom={marginBottom}
            marginLabelTop={R.topMarginCanvas} marginLabelBottom={R.bottomMarginCanvas}
            rotatedIds={rightRotated} onCharClick={() => {}}
            scaleRatio={3} zoom={1} spacing={rightSpacing} side="right" isPrintMode={true}
            shopLogo={shopLogo} printLogo={printLogo} isBold={rightIsBold}
          />
        </div>

        {/* 2. Separate Mode - NO CSS transform, clean capture */}
        <div ref={separateLeftRef} style={{ backgroundColor: 'white' }}>
          <RibbonCanvas
            text={leftText} fontConfig={leftFontConfig} ratioX={leftRatioX} ratioY={leftRatioY} lace={lace}
            width={width} length={length} marginTop={marginTop} marginBottom={marginBottom}
            marginLabelTop={R.topMarginCanvas} marginLabelBottom={R.bottomMarginCanvas}
            rotatedIds={leftRotated} onCharClick={() => {}}
            scaleRatio={3} zoom={1} spacing={leftSpacing} side="left" isPrintMode={true}
            shopLogo={shopLogo} printLogo={printLogo} isBold={leftIsBold}
          />
        </div>
        <div ref={separateRightRef} style={{ backgroundColor: 'white' }}>
          <RibbonCanvas 
            text={rightText} fontConfig={rightFontConfig} ratioX={rightRatioX} ratioY={rightRatioY} lace={lace}
            width={width} length={length} marginTop={marginTop} marginBottom={marginBottom}
            marginLabelTop={R.topMarginCanvas} marginLabelBottom={R.bottomMarginCanvas}
            rotatedIds={rightRotated} onCharClick={() => {}}
            scaleRatio={3} zoom={1} spacing={rightSpacing} side="right" isPrintMode={true}
            shopLogo={shopLogo} printLogo={printLogo} isBold={rightIsBold}
          />
        </div>

      </div>

      {/* Update Notification Modal */}
      {isUpdateModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[300] animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-amber-500/50 rounded-3xl p-8 max-w-lg w-full mx-4 shadow-[0_0_50px_rgba(245,158,11,0.2)] text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500"></div>
            
            <div className="text-5xl mb-6">🚀</div>
            <h2 className="text-2xl font-bold text-white mb-2">{fillDashboardTemplate(R.updateModalTitle, { ver: REQUIRED_BRIDGE_VERSION })}</h2>
            <p className="text-amber-400 font-medium mb-4">{fillDashboardTemplate(R.updateModalSubtitle, { ver: REQUIRED_BRIDGE_VERSION })}</p>
            
            <div className="bg-slate-800/50 rounded-2xl p-4 text-left mb-6 border border-slate-700">
              <ul className="text-sm text-slate-300 space-y-2">
                <li className="flex items-start gap-2">✅ <span className="text-white font-semibold">{R.updateBullet1}</span></li>
                <li className="flex items-start gap-2">✅ <span className="text-white font-semibold">{R.updateBullet2}</span></li>
                <li className="flex items-start gap-2">✅ <span className="text-white font-semibold">{R.updateBullet3}</span></li>
              </ul>
            </div>

            <p className="text-slate-400 text-xs mb-8 whitespace-pre-line">{R.updateFooter}</p>

            <div className="flex flex-col gap-3">
              <a 
                href={`/RibbonBridge_Setup_v${REQUIRED_BRIDGE_VERSION.replace('.', '_')}.exe`} 
                download
                className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-2xl transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98]"
              >
                📥 {fillDashboardTemplate(R.updateDownload, { ver: REQUIRED_BRIDGE_VERSION })}
              </a>
              <button 
                onClick={() => {
                  setIsUpdateModalOpen(false);
                  localStorage.setItem('bridge_update_dismissed', 'true');
                }}
                className="text-slate-500 hover:text-slate-300 text-sm py-2"
              >
                {R.updateDismiss}
              </button>
            </div>
          </div>
        </div>
      )}
      {showPaywall && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200]">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-md p-8 text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-semibold text-white mb-2">{R.paywallTitle}</h2>
            <p className="text-slate-400 mb-6 whitespace-pre-line">{R.paywallBody}</p>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600 hover:border-blue-500 cursor-pointer transition">
                <p className="text-lg font-semibold text-white">{R.paywallMonthly}</p>
                <p className="text-blue-400 font-semibold text-xl mt-1">₩29,900</p>
                <p className="text-slate-500 text-xs mt-1">{R.paywallPerMonth}</p>
              </div>
              <div className="bg-blue-600/20 rounded-xl p-4 border-2 border-blue-500 cursor-pointer transition relative">
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">{R.paywallPopular}</div>
                <p className="text-lg font-semibold text-white">{R.paywallQuarter}</p>
                <p className="text-blue-400 font-semibold text-xl mt-1">₩79,900</p>
                <p className="text-slate-500 text-xs mt-1">{R.paywallDisc11}</p>
              </div>
              <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600 hover:border-blue-500 cursor-pointer transition">
                <p className="text-lg font-semibold text-white">{R.paywallYear}</p>
                <p className="text-blue-400 font-semibold text-xl mt-1">₩269,900</p>
                <p className="text-slate-500 text-xs mt-1">{R.paywallDisc25}</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-4">{R.paywallBillingNote}</p>
            <button
              onClick={() => setShowPaywall(false)}
              className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition"
            >
              {R.paywallClose}
            </button>
          </div>
        </div>
      )}

      <SaveConfigDialog 
        isOpen={isSaveDialogOpen}
        onClose={() => setIsSaveDialogOpen(false)}
        onSave={async (name: string) => {
          const { error } = await supabase.from('saved_configs').insert({
            user_id: session?.user.id,
            name,
            config: currentConfig
          });
          if (error) alert(fillDashboardTemplate(R.saveFailed, { msg: error.message }));
          else {
            alert(R.saveOk);
            setIsSaveDialogOpen(false);
          }
        }}
      />

      <LoadConfigDialog 
        isOpen={isLoadDialogOpen}
        onClose={() => setIsLoadDialogOpen(false)}
        onLoad={onLoadConfig}
        userId={session?.user?.id}
      />

      {/* Bridge Download Modal */}
      {isBridgeModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200]">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-md p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-emerald-400"></div>
            <div className="text-6xl mb-4">🖨️</div>
            <h2 className="text-2xl font-semibold text-white mb-2">{R.bridgeInstallTitle}</h2>
            <p className="text-slate-400 mb-6 text-sm whitespace-pre-line">
              {R.bridgeInstallBody}
            </p>
            <div className="bg-blue-900/30 border border-blue-500/20 rounded-xl p-5 mb-8 text-left space-y-4">
              <div>
                <p className="text-blue-300 text-xs font-bold mb-1.5 flex items-center gap-2">
                  <span className="bg-blue-400/20 px-2 py-0.5 rounded text-[10px]">{R.bridgeGuideBadge}</span>
                  {R.bridgeSmartScreenTitle}
                </p>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {R.bridgeSmartScreenBody}
                </p>
              </div>
              <div className="pt-3 border-t border-blue-500/10 flex items-center justify-between">
                <p className="text-emerald-400 text-[10px] font-bold flex items-center gap-1.5">
                  🛡️ {R.bridgeCertLine}
                </p>
                <span className="text-[9px] text-slate-500 font-mono tracking-tighter">CERTIFIED v{REQUIRED_BRIDGE_VERSION}</span>
              </div>
            </div>

            <div className="flex gap-4 items-stretch">
              <button 
                onClick={() => setIsBridgeModalOpen(false)}
                className="flex-1 px-4 py-4 rounded-xl font-bold bg-slate-700/50 hover:bg-slate-700 text-slate-300 transition-all text-sm"
              >
                {R.bridgeLater}
              </button>
              <a 
                href={`/RibbonBridge_Setup_v${REQUIRED_BRIDGE_VERSION.replace('.', '_')}.exe`}
                download
                onClick={() => setIsBridgeModalOpen(false)}
                className="flex-[2] flex flex-col items-center justify-center px-6 py-4 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-lg shadow-blue-900/40 hover:scale-[1.02] active:scale-95 group"
              >
                <span className="text-base">{R.bridgeDownloadPkg}</span>
                <span className="text-[10px] opacity-70 group-hover:opacity-100 transition-opacity font-normal">{R.bridgeDownloadSub}</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Bridge Troubleshooting & Reset Modal */}
      {isTroubleshootModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-[500] animate-in fade-in zoom-in duration-300">
          <div className="bg-slate-900 border border-slate-700/50 rounded-[32px] p-10 max-w-xl w-full mx-6 shadow-[0_0_80px_rgba(30,58,138,0.3)] relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full"></div>
            
            <div className="flex justify-between items-start mb-8 relative z-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-2xl">
                  <ShieldAlert className="text-blue-400 w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">{R.troubleshootTitle}</h2>
                  <p className="text-slate-400 text-sm mt-1">{R.troubleshootSubtitle}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsTroubleshootModalOpen(false)}
                className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6 relative z-10">
              {/* Step 1: Check Execution */}
              <div className="flex gap-4 p-5 bg-slate-800/40 rounded-3xl border border-slate-700/50 group hover:border-blue-500/30 transition-all">
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all shrink-0">1</div>
                <div>
                  <h3 className="font-bold text-slate-200">{R.troubleshootStep1Title}</h3>
                  <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                    {R.troubleshootStep1Body}
                  </p>
                </div>
              </div>

              {/* Step 2: Clear Browser Cache */}
              <div className="flex gap-4 p-5 bg-slate-800/40 rounded-3xl border border-slate-700/50 group hover:border-blue-500/30 transition-all">
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all shrink-0">2</div>
                <div>
                  <h3 className="font-bold text-slate-200">{R.troubleshootStep2Title}</h3>
                  <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                    {R.troubleshootStep2Body}
                  </p>
                </div>
              </div>

              {/* Step 3: Firewall */}
              <div className="flex gap-4 p-5 bg-slate-800/40 rounded-3xl border border-slate-700/50 group hover:border-blue-500/30 transition-all">
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all shrink-0">3</div>
                <div>
                  <h3 className="font-bold text-slate-200">{R.troubleshootStep3Title}</h3>
                  <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                    {R.troubleshootStep3Body}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row gap-3 relative z-10">
              <a 
                href={`/RibbonBridge_Setup_v${REQUIRED_BRIDGE_VERSION.replace('.', '_')}.exe`} 
                download
                className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-2xl transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Download size={18} />
                {R.troubleshootReinstall}
              </a>
              <button 
                onClick={handleResetBridge}
                className="flex-1 py-4 bg-slate-100 hover:bg-white text-slate-900 font-extrabold rounded-2xl transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <RefreshCw size={18} />
                {R.troubleshootReset}
              </button>
            </div>
            
            <button 
                onClick={() => setIsTroubleshootModalOpen(false)}
                className="w-full mt-3 py-3 bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white font-bold rounded-2xl transition-all border border-slate-700/50"
              >
                {R.paywallClose}
            </button>
            
            <div className="mt-6 text-center">
              <p className="text-[10px] text-slate-500">
                {R.troubleshootFooterContact}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Print Queue Monitor Widget */}
      <PrintQueueMonitor isOpen={showQueue} onClose={() => setShowQueue(false)} />
      <MonitorToggle onClick={() => setShowQueue(!showQueue)} hasJobs={false} />
    </div>
  );
}


// Internal Components that were lost:

function SaveConfigDialog({ isOpen, onClose, onSave }: { isOpen: boolean, onClose: () => void, onSave: (name: string) => void }) {
  const [name, setName] = useState('');
  const locale = usePreferredLocale();
  const R = getMessages(locale).dashboard.ribbon;
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[300]">
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 w-full max-w-sm">
        <h3 className="text-lg font-bold text-white mb-4">{R.saveWorkTitle}</h3>
        <input 
          type="text" 
          value={name} 
          onChange={e => setName(e.target.value)}
          placeholder={R.templateNamePlaceholder}
          className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white mb-4 outline-none focus:ring-1 ring-blue-500"
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded">{R.cancel}</button>
          <button onClick={() => { onSave(name); setName(''); }} className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded">{R.saveAction}</button>
        </div>
      </div>
    </div>
  );
}

function LoadConfigDialog({ isOpen, onClose, onLoad, userId }: { isOpen: boolean, onClose: () => void, onLoad: (config: any) => void, userId?: string }) {
  const [configs, setConfigs] = useState<any[]>([]);
  const locale = usePreferredLocale();
  const R = getMessages(locale).dashboard.ribbon;
  useEffect(() => {
    if (isOpen && userId) {
      supabase.from('saved_configs').select('*').eq('user_id', userId).order('created_at', { ascending: false })
        .then(({ data }) => setConfigs(data || []));
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[300]">
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 w-full max-w-sm">
        <h3 className="text-lg font-bold text-white mb-4">{R.savedTemplatesTitle}</h3>
        <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
          {configs.map(c => (
            <button 
              key={c.id} 
              onClick={() => { onLoad(c.config); onClose(); }}
              className="w-full p-3 bg-slate-900 hover:bg-blue-900/20 border border-slate-700 hover:border-blue-500 rounded text-left transition-all"
            >
              <div className="text-sm font-semibold text-white">{c.name}</div>
              <div className="text-[10px] text-slate-500">{new Date(c.created_at).toLocaleString()}</div>
            </button>
          ))}
          {configs.length === 0 && <div className="text-center py-4 text-slate-500">{R.noSavedTemplates}</div>}
        </div>
        <button onClick={onClose} className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded">{R.paywallClose}</button>
      </div>
    </div>
  );
}
function PrintQueueMonitor({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const locale = usePreferredLocale();
  const Rq = getMessages(locale).dashboard.ribbon;
  const [queue, setQueue] = useState<any[]>([]); // Restored
  const pollRef = useRef<any>(null); // Restored

  const fetchQueue = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8002/api/queue');
      const data = await res.json();
      if (data.status === 'success') setQueue(data.data);
    } catch {}
  };

  useEffect(() => {
    if (isOpen) {
      fetchQueue();
      pollRef.current = setInterval(fetchQueue, 3000);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }
  }, [isOpen]);

  const handleRetry = async (id: string) => {
    try {
      await fetch(`http://127.0.0.1:8002/api/queue/retry/${id}`, { method: 'POST' });
      fetchQueue();
    } catch (e) { alert(Rq.retryFailed); }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`http://127.0.0.1:8002/api/queue/${id}`, { method: 'DELETE' });
      fetchQueue();
    } catch (e) { alert(Rq.deleteFailed); }
  };

  if (!isOpen) return (
    <button 
      onClick={() => onClose()} // this state logic should be inverted but for simplicity:
      style={{ position: 'fixed', bottom: '20px', right: '20px' }}
      onMouseEnter={() => onClose()} // reuse trigger
      className="hidden" // hide default, logic handled below
    />
  );

  // Manual toggle for easy access
  const hasActiveJob = queue.some(q => q.status === 'printing');

  return (
    <div className={cn(
      "fixed bottom-4 right-4 z-[400] transition-all duration-300",
      isOpen ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0 pointer-events-none"
    )}>
      <div className="bg-slate-800/95 backdrop-blur-md border border-slate-700 rounded-2xl shadow-2xl w-80 overflow-hidden">
        <div className="p-4 bg-slate-700/50 border-b border-slate-600 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", hasActiveJob ? "bg-green-500 animate-pulse" : "bg-slate-500")} />
            <h3 className="text-sm font-bold text-white">{Rq.queueMonitorTitle}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>
        
        <div className="max-h-96 overflow-y-auto p-2 space-y-2">
          {queue.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs text-pretty">
              {Rq.queueEmpty}
            </div>
          ) : (
            queue.map(job => {
              // Calculate remaining time (120 seconds total)
              const createdTime = new Date(job.timestamp).getTime();
              const now = Date.now();
              const elapsed = Math.floor((now - createdTime) / 1000);
              const timeLeft = Math.max(0, 120 - elapsed);
              
              // Auto-delete when time's up
              if (timeLeft <= 0 && job.status !== 'printing') {
                handleDelete(job.id);
              }

              return (
                <div key={job.id} className="bg-slate-900/50 border border-slate-700 rounded-lg p-3 relative overflow-hidden group">
                  {/* Progress bar background for timer */}
                  <div 
                    className="absolute bottom-0 left-0 h-0.5 bg-blue-500/30 transition-all duration-1000" 
                    style={{ width: `${(timeLeft / 120) * 100}%` }}
                  />

                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <div className="text-[11px] font-bold text-slate-300">{job.printer}</div>
                      <div className="text-[10px] text-slate-500">{job.width}mm x {job.length}mm ({fillDashboardTemplate(Rq.queueSegments, { n: job.segments })})</div>
                    </div>
                    <div className={cn(
                      "px-2 py-0.5 rounded text-[9px] font-bold",
                      job.status === 'printing' ? "bg-blue-900/40 text-blue-400" :
                      job.status === 'completed' ? "bg-emerald-900/40 text-emerald-400" :
                      "bg-red-900/40 text-red-400"
                    )}>
                      {job.status === 'printing' ? Rq.queueStatusPrinting : job.status === 'completed' ? Rq.queueStatusDone : Rq.queueStatusErr}
                    </div>
                  </div>

                  {/* Auto-delete Timer Text */}
                  <div className="flex items-center gap-1.5 mb-2 mt-1">
                    <div className={cn(
                      "text-[9px] py-0.5 px-1.5 rounded-full font-mono font-bold",
                      timeLeft < 10 ? "bg-red-500/20 text-red-400 animate-pulse" : "bg-slate-800 text-slate-400"
                    )}>
                      {timeLeft}s
                    </div>
                    <span className="text-[9px] text-slate-500">{Rq.queueAutoRemoveHint}</span>
                  </div>
                  
                  <div className="flex gap-1">
                    {job.status !== 'printing' && (
                      <button 
                        onClick={() => handleRetry(job.id)}
                        className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] rounded transition-colors"
                      >
                        🔄 {Rq.queueRetry}
                      </button>
                    )}
                    <button 
                      onClick={() => handleDelete(job.id)}
                      className="flex-1 py-1.5 bg-slate-700 hover:bg-red-900/40 text-slate-300 text-[10px] rounded transition-colors"
                    >
                      🗑️ {Rq.queueDeleteNow}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// Logic to show monitor automatically:
// In App, add a button to reopen if closed manually
function MonitorToggle({ onClick, hasJobs }: { onClick: () => void, hasJobs: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "fixed bottom-6 right-6 p-3 rounded-full shadow-lg z-[399] transition-all",
        "bg-slate-800 border border-slate-700 text-white hover:bg-slate-700",
        hasJobs && "ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900"
      )}
    >
      <span className="text-lg">🖨️</span>
    </button>
  );
}
