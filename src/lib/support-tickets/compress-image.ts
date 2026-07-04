const MAX_EDGE = 1200;
const TARGET_MAX_BYTES = 400_000;
const INITIAL_QUALITY = 0.72;
const MIN_QUALITY = 0.5;

export type CompressedImage = {
  blob: Blob;
  width: number;
  height: number;
  mime: string;
};

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지를 불러올 수 없습니다."));
    };
    img.src = url;
  });
}

function scaleSize(w: number, h: number): { width: number; height: number } {
  const max = Math.max(w, h);
  if (max <= MAX_EDGE) return { width: w, height: h };
  const ratio = MAX_EDGE / max;
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}

async function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), mime, quality);
  });
}

/** 브라우저에서 문의 첨부용 이미지 압축 (WebP 우선) */
export async function compressSupportImage(file: File): Promise<CompressedImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("이미지 파일만 첨부할 수 있습니다.");
  }

  const img = await loadImage(file);
  const { width, height } = scaleSize(img.naturalWidth, img.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas를 사용할 수 없습니다.");
  ctx.drawImage(img, 0, 0, width, height);

  const preferWebp = typeof canvas.toDataURL("image/webp") === "string";
  const mime = preferWebp ? "image/webp" : "image/jpeg";

  let quality = INITIAL_QUALITY;
  let blob = await canvasToBlob(canvas, mime, quality);
  if (!blob) throw new Error("이미지 압축에 실패했습니다.");

  while (blob.size > TARGET_MAX_BYTES && quality > MIN_QUALITY) {
    quality -= 0.08;
    const next = await canvasToBlob(canvas, mime, quality);
    if (!next) break;
    blob = next;
  }

  return { blob, width, height, mime };
}

export async function fileToDataUrl(file: File): Promise<string> {
  const compressed = await compressSupportImage(file);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("파일 읽기 실패"));
    reader.readAsDataURL(compressed.blob);
  });
}
