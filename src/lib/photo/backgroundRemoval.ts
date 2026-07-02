'use client';

/**
 * 🖼️ Template Curator (샘플리) 역할:
 * @imgly/background-removal 래퍼
 * WASM 기반 클라이언트 사이드 처리 (서버 불필요)
 */

import { toast } from 'sonner';

let isInitialized = false;

/**
 * 이미지에서 배경 자동 제거
 * 첫 실행 시 AI 모델 (~50MB) 다운로드, 이후 캐시됨
 */
export async function removeImageBackground(
  imageUrl: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  // Background removal has been disabled and library removed
  toast.error("배경 제거 기능이 비활성화되었습니다.");
  return imageUrl;
}

/**
 * 누끼 후 특정 배경색/이미지와 합성
 */
export async function compositeWithBackground(
  foregroundUrl: string, // transparent PNG from removeBackground
  backgroundUrl: string  // background image or color
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return reject(new Error('No canvas context'));

    const fgImg = new Image();
    fgImg.crossOrigin = 'anonymous';
    fgImg.onload = () => {
      canvas.width = fgImg.naturalWidth;
      canvas.height = fgImg.naturalHeight;

      if (backgroundUrl.startsWith('#') || backgroundUrl.startsWith('rgb')) {
        // Solid color background
        ctx.fillStyle = backgroundUrl;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(fgImg, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      } else {
        // Image background
        const bgImg = new Image();
        bgImg.crossOrigin = 'anonymous';
        bgImg.onload = () => {
          ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
          ctx.drawImage(fgImg, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.95));
        };
        bgImg.onerror = reject;
        bgImg.src = backgroundUrl;
      }
    };
    fgImg.onerror = reject;
    fgImg.src = foregroundUrl;
  });
}

/**
 * 기본 배경 색상 팔레트 (누끼 후 자동 합성용)
 */
/** `label`은 디버그·로그용; UI 라벨은 PhotoEditModal에서 `tr`로 표시합니다. */
export const QUICK_BG_COLORS = [
  { label: "Pure white", value: "#FFFFFF" },
  { label: "Cream", value: "#FFF8F0" },
  { label: "Lavender", value: "#F0E8FF" },
  { label: "Mint", value: "#E8FFF4" },
  { label: "Peach", value: "#FFE8E8" },
  { label: "Sky", value: "#E8F4FF" },
];
