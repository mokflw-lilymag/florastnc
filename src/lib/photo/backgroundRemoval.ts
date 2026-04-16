'use client';

/**
 * 🖼️ Template Curator (샘플리) 역할:
 * @imgly/background-removal 래퍼
 * WASM 기반 클라이언트 사이드 처리 (서버 불필요)
 */

let isInitialized = false;

/**
 * 이미지에서 배경 자동 제거
 * 첫 실행 시 AI 모델 (~50MB) 다운로드, 이후 캐시됨
 */
export async function removeImageBackground(
  imageUrl: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  // Dynamic import to prevent SSR issues
  const { removeBackground } = await import('@imgly/background-removal');

  onProgress?.(10);

  // Convert URL to blob if needed
  let inputSource: string | Blob = imageUrl;
  if (imageUrl.startsWith('data:')) {
    const res = await fetch(imageUrl);
    inputSource = await res.blob();
  }

  onProgress?.(30);

  const resultBlob = await removeBackground(inputSource, {
    debug: false,
    model: 'isnet_quint8', // Fastest model, good quality
    // CDN으로 WASM 파일 서빙 (Turbopack 번들 호환성 문제 해결)
    publicPath: 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/dist/',
    output: {
      format: 'image/png', // PNG to preserve transparency
      quality: 0.95,
    },
  });

  onProgress?.(90);

  // Convert blob to data URL
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      onProgress?.(100);
      resolve(e.target?.result as string);
    };
    reader.readAsDataURL(resultBlob);
  });
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
export const QUICK_BG_COLORS = [
  { label: '순백', value: '#FFFFFF' },
  { label: '크림', value: '#FFF8F0' },
  { label: '라벤더', value: '#F0E8FF' },
  { label: '민트', value: '#E8FFF4' },
  { label: '피치', value: '#FFE8E8' },
  { label: '스카이', value: '#E8F4FF' },
];
