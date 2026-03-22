
export const GOOGLE_FONTS = [
    { name: 'Noto Sans KR', family: 'Noto Sans KR', url: 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap' },
    { name: 'Nanum Gothic', family: 'Nanum Gothic', url: 'https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700&display=swap' },
    { name: 'Nanum Myeongjo', family: 'Nanum Myeongjo', url: 'https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700&display=swap' },
    { name: 'Nanum Pen Script', family: 'Nanum Pen Script', url: 'https://fonts.googleapis.com/css2?family=Nanum+Pen+Script&display=swap' },
    { name: 'Jua', family: 'Jua', url: 'https://fonts.googleapis.com/css2?family=Jua&display=swap' },
];

export function getGoogleFontUrl(fontFamily: string): string | undefined {
    const font = GOOGLE_FONTS.find(f => f.family === fontFamily);
    if (font) return font.url;
    return undefined;
}
