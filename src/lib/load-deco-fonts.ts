"use client";

/**
 * 데코 폰트 lazy loader
 * 리본/메시지 프린터 등 데코 폰트가 필요한 컴포넌트에서만 호출합니다.
 * 한 번 로드되면 이후 호출은 무시됩니다.
 */

let loaded = false;

const DECO_FONT_URLS = [
  // 한글 서예/데코 폰트
  'https://fonts.googleapis.com/css2?family=Nanum+Brush+Script&family=Black+Han+Sans&family=East+Sea+Dokdo&family=Song+Myung&family=Gowun+Batang:wght@400;700&family=Nanum+Gothic:wght@400;700;800&family=Nanum+Myeongjo:wght@400;700;800&family=Noto+Serif+KR:wght@400;500;700;900&display=swap',
  // 중일 서예체
  'https://fonts.googleapis.com/css2?family=LXGW+WenKai+TC:wght@400;700&family=LXGW+WenKai+Mono+TC:wght@400;700&family=Klee+One:wght@400;600&family=Yuji+Syuku&family=Yuji+Boku&family=Yuji+Mai&display=swap',
  // 추가 서예체
  'https://fonts.googleapis.com/css2?family=UoqMunThenKhung&family=Iansui&family=Kaisei+HarunoUmi:wght@400;700&family=Zen+Antique+Soft&display=swap',
];

export function loadDecoFonts() {
  if (loaded || typeof document === 'undefined') return;
  loaded = true;

  DECO_FONT_URLS.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.media = 'print'; // 비차단: print 미디어 먼저 → onload 시 all로 전환
    link.onload = () => { link.media = 'all'; };
    document.head.appendChild(link);
  });
}
