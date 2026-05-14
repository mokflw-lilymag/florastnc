/**
 * 디자인 갤러리 이미지 압축 — 가로·세로·정사각 자동 처리.
 *
 * "긴 변(longer side) 기준 리사이즈" 로 원본 비율을 100% 보존.
 *  - 인쇄용 원본: 긴 변 2400px / JPEG 92% (A5/A6/엽서 300DPI 충족)
 *  - 목록 썸네일: 긴 변 600px / WebP 80% (페이지 로딩 가볍게)
 *
 * 결과 Blob 은 메인 스레드 Canvas 로 생성 — Off-the-main-thread 가 필요할 만큼
 * 큰 파일은 사용자가 한 번에 1~5장 정도 업로드한다는 가정 하에 단순 구현.
 */

export type CompressedImage = {
  original: Blob;
  thumb: Blob;
  originalExt: 'jpg' | 'png';
  originalMime: 'image/jpeg' | 'image/png';
  thumbExt: 'webp';
  thumbMime: 'image/webp';
  width: number;
  height: number;
};

const ORIGINAL_LONG_EDGE = 2400;
const THUMB_LONG_EDGE = 600;
const ORIGINAL_QUALITY = 0.92;
const THUMB_QUALITY = 0.8;

/** File → HTMLImageElement (objectURL 사용, 처리 후 해제) */
function loadImageElement(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/** 비율 유지하며 긴 변을 maxLongEdge 로 맞추는 새 크기 (원본이 더 작으면 그대로) */
function computeTargetSize(srcW: number, srcH: number, maxLongEdge: number) {
  const longEdge = Math.max(srcW, srcH);
  if (longEdge <= maxLongEdge) return { w: srcW, h: srcH };
  const scale = maxLongEdge / longEdge;
  return {
    w: Math.round(srcW * scale),
    h: Math.round(srcH * scale),
  };
}

/** 캔버스에 그려서 지정 포맷·품질로 Blob 생성 */
function drawToBlob(
  img: HTMLImageElement,
  targetW: number,
  targetH: number,
  mime: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas 2D context unavailable'));
      return;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetW, targetH);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('toBlob returned null'));
          return;
        }
        resolve(blob);
      },
      mime,
      quality,
    );
  });
}

/**
 * 갤러리용 원본 + 썸네일 두 개 동시 생성.
 *
 * - 알파(투명도)가 있는 PNG 는 원본을 PNG 로 보존, 그 외는 JPEG.
 *   (디자인 작업물 중에는 투명 배경 PNG 가 있을 수 있어 한 단계 더 보수적으로 처리.)
 * - 썸네일은 작아도 무방하므로 항상 WebP.
 */
export async function compressGalleryImage(file: File): Promise<CompressedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('이미지 파일만 업로드할 수 있습니다.');
  }
  const img = await loadImageElement(file);
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  if (!srcW || !srcH) {
    throw new Error('이미지 크기를 읽지 못했습니다.');
  }

  const keepPng = file.type === 'image/png';
  const originalMime = keepPng ? 'image/png' : 'image/jpeg';
  const originalExt = keepPng ? 'png' : 'jpg';

  const originalSize = computeTargetSize(srcW, srcH, ORIGINAL_LONG_EDGE);
  const thumbSize = computeTargetSize(srcW, srcH, THUMB_LONG_EDGE);

  const [original, thumb] = await Promise.all([
    drawToBlob(img, originalSize.w, originalSize.h, originalMime, ORIGINAL_QUALITY),
    drawToBlob(img, thumbSize.w, thumbSize.h, 'image/webp', THUMB_QUALITY),
  ]);

  return {
    original,
    thumb,
    originalExt,
    originalMime,
    thumbExt: 'webp',
    thumbMime: 'image/webp',
    width: originalSize.w,
    height: originalSize.h,
  };
}

export const IMAGE_COMPRESS_LIMITS = {
  ORIGINAL_LONG_EDGE,
  THUMB_LONG_EDGE,
  ORIGINAL_QUALITY,
  THUMB_QUALITY,
} as const;
