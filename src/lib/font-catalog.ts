
export interface FontCatalogItem {
    name: string;         // 표시 이름 (한글)
    family: string;       // CSS font-family
    url: string;          // CSS URL
    source: 'google' | 'naver' | 'noonnu';  // 출처
    category: string;     // 분류
    preview: string;      // 미리보기 텍스트
}

export const FONT_CATEGORIES = [
    { id: 'gothic', label: '고딕체', icon: '🔤' },
    { id: 'myeongjo', label: '명조체', icon: '📜' },
    { id: 'handwriting', label: '손글씨', icon: '✏️' },
    { id: 'design', label: '디자인체', icon: '🎨' },
    { id: 'round', label: '둥근체', icon: '⭕' },
    { id: 'coding', label: '코딩체', icon: '💻' },
] as const;

export const FONT_CATALOG: FontCatalogItem[] = [
    { name: 'Noto Sans KR', family: 'Noto Sans KR', url: 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap', source: 'google', category: 'gothic', preview: '구글 기본 한글 고딕' },
    { name: 'Nanum Gothic', family: 'Nanum Gothic', url: 'https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700;800&display=swap', source: 'google', category: 'gothic', preview: '부드러운 나눔 고딕' },
    { name: 'Gothic A1', family: 'Gothic A1', url: 'https://fonts.googleapis.com/css2?family=Gothic+A1:wght@400;500;700&display=swap', source: 'google', category: 'gothic', preview: '모던한 고딕 A1' },
    { name: 'Pretendard', family: 'Pretendard', url: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css', source: 'noonnu', category: 'gothic', preview: '프리텐다드 모던 고딕' },
    { name: 'Noto Serif KR', family: 'Noto Serif KR', url: 'https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;700&display=swap', source: 'google', category: 'myeongjo', preview: '우아한 노토 세리프' },
    { name: 'Nanum Myeongjo', family: 'Nanum Myeongjo', url: 'https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700;800&display=swap', source: 'google', category: 'myeongjo', preview: '전통적인 나눔명조' },
    { name: 'Nanum Pen Script', family: 'Nanum Pen Script', url: 'https://fonts.googleapis.com/css2?family=Nanum+Pen+Script&display=swap', source: 'google', category: 'handwriting', preview: '편안한 나눔펜체' },
    { name: 'Nanum Brush Script', family: 'Nanum Brush Script', url: 'https://fonts.googleapis.com/css2?family=Nanum+Brush+Script&display=swap', source: 'google', category: 'handwriting', preview: '붓으로 쓴 나눔체' },
    { name: 'Jua', family: 'Jua', url: 'https://fonts.googleapis.com/css2?family=Jua&display=swap', source: 'google', category: 'design', preview: '귀여운 주아체' },
    { name: 'NanumSquare', family: 'NanumSquare', url: 'https://hangeul.pstatic.net/hangeul_static/css/nanum-square.css', source: 'naver', category: 'gothic', preview: '깔끔한 나눔스퀘어' },
];

const ACTIVE_FONTS_KEY = 'floxync_active_fonts';

const DEFAULT_ACTIVE_FONTS = [
    'Noto Sans KR', 'Nanum Gothic', 'Pretendard',
    'Noto Serif KR', 'Nanum Myeongjo',
    'Nanum Pen Script', 'Nanum Brush Script',
    'Jua', 'NanumSquare'
];

export function getActiveFonts(): string[] {
    if (typeof window === 'undefined') return DEFAULT_ACTIVE_FONTS;
    const stored = localStorage.getItem(ACTIVE_FONTS_KEY);
    if (stored) {
        try { return JSON.parse(stored); } catch { return DEFAULT_ACTIVE_FONTS; }
    }
    return DEFAULT_ACTIVE_FONTS;
}

export function setActiveFonts(fonts: string[]) {
    if (typeof window !== 'undefined') {
        localStorage.setItem(ACTIVE_FONTS_KEY, JSON.stringify(fonts));
    }
}

export function getActiveFontItems(): FontCatalogItem[] {
    const active = getActiveFonts();
    return active
        .map(family => FONT_CATALOG.find(f => f.family === family))
        .filter((f): f is FontCatalogItem => !!f);
}
