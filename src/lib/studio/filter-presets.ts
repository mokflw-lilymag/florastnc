/**
 * 📐 Layout Architect (각도기) 역할:
 * Canvas API 기반 1-버튼 이미지 편집 필터 프리셋
 * 모든 값은 자연스러운 결과를 위한 최적값으로 내장되어 있음
 */

export type CanvasEffectFn = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  width: number,
  height: number
) => void;

/**
 * 이미지 URL에 Canvas 효과를 적용하고 새 dataURL 반환
 */
export function applyCanvasEffect(
  imageUrl: string,
  effectFn: CanvasEffectFn
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context unavailable'));
      effectFn(ctx, img, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.onerror = reject;
    img.src = imageUrl;
  });
}

/**
 * 🎨 Arty 역할: 감성별 필터 프리셋 정의
 * 각 효과는 누적 적용 방식 (이전 상태에 추가)
 */
export const FILTER_EFFECTS: Record<string, {
  label: string;
  emoji: string;
  description: string;
  fn: CanvasEffectFn;
}> = {
  // === 자동 보정 도구 ===
  auto_enhance: {
    label: '자동보정',
    emoji: '✨',
    description: '전체 밝기·대비·색상 자동 최적화',
    fn: (ctx, img, w, h) => {
      ctx.filter = 'brightness(1.05) contrast(1.15) saturate(1.15)';
      ctx.drawImage(img, 0, 0, w, h);
      ctx.filter = 'none';
    }
  },

  brighten: {
    label: '밝게',
    emoji: '☀️',
    description: '노출 자연스럽게 증가',
    fn: (ctx, img, w, h) => {
      ctx.filter = 'brightness(1.22)';
      ctx.drawImage(img, 0, 0, w, h);
      ctx.filter = 'none';
    }
  },

  sharpen: {
    label: '선명하게',
    emoji: '🔍',
    description: '윤곽 강조 및 디테일 살리기',
    fn: (ctx, img, w, h) => {
      ctx.filter = 'contrast(1.25) brightness(1.01)';
      ctx.drawImage(img, 0, 0, w, h);
      ctx.filter = 'none';
    }
  },

  warm: {
    label: '따뜻하게',
    emoji: '🌙',
    description: '황금시간대 따뜻한 색감',
    fn: (ctx, img, w, h) => {
      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, data[i] + 22);     // R +
        data[i + 1] = Math.min(255, data[i + 1] + 8); // G +
        data[i + 2] = Math.max(0, data[i + 2] - 18);  // B -
      }
      ctx.putImageData(imageData, 0, 0);
    }
  },

  cool: {
    label: '차갑게',
    emoji: '❄️',
    description: '블루톤 쿨한 감성',
    fn: (ctx, img, w, h) => {
      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.max(0, data[i] - 18);           // R -
        data[i + 1] = Math.max(0, data[i + 1] - 5);   // G -
        data[i + 2] = Math.min(255, data[i + 2] + 22); // B +
      }
      ctx.putImageData(imageData, 0, 0);
    }
  },

  vignette: {
    label: '비네팅',
    emoji: '🌸',
    description: '가장자리 자연스럽게 어둡게',
    fn: (ctx, img, w, h) => {
      ctx.drawImage(img, 0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      const innerR = Math.min(w, h) * 0.28;
      const outerR = Math.max(w, h) * 0.78;
      const gradient = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(0.6, 'rgba(0,0,0,0.15)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.48)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
    }
  },

  // === Instagram 스타일 필터 ===
  romantic: {
    label: '로맨틱',
    emoji: '🌷',
    description: '핑크빛 감성 따뜻한 포근함',
    fn: (ctx, img, w, h) => {
      ctx.filter = 'saturate(1.25) brightness(1.06)';
      ctx.drawImage(img, 0, 0, w, h);
      ctx.filter = 'none';
      ctx.fillStyle = 'rgba(255, 182, 193, 0.14)';
      ctx.fillRect(0, 0, w, h);
      // Soft vignette
      const gradient = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.4, w / 2, h / 2, Math.max(w, h) * 0.75);
      gradient.addColorStop(0, 'rgba(255,180,180,0)');
      gradient.addColorStop(1, 'rgba(200,80,100,0.18)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
    }
  },

  natural: {
    label: '내추럴',
    emoji: '🌿',
    description: '자연스러운 그린 라이프',
    fn: (ctx, img, w, h) => {
      ctx.filter = 'saturate(0.88) brightness(1.03) contrast(1.04)';
      ctx.drawImage(img, 0, 0, w, h);
      ctx.filter = 'none';
      // Slight green tint
      ctx.fillStyle = 'rgba(200, 230, 200, 0.06)';
      ctx.fillRect(0, 0, w, h);
    }
  },

  bw: {
    label: '흑백',
    emoji: '⬛',
    description: '세련된 모노크롬 감성',
    fn: (ctx, img, w, h) => {
      ctx.filter = 'grayscale(1) contrast(1.12) brightness(1.02)';
      ctx.drawImage(img, 0, 0, w, h);
      ctx.filter = 'none';
    }
  },

  golden: {
    label: '골든',
    emoji: '🌟',
    description: '황금빛 빈티지 고급감',
    fn: (ctx, img, w, h) => {
      ctx.filter = 'brightness(1.1) saturate(1.35) sepia(0.28)';
      ctx.drawImage(img, 0, 0, w, h);
      ctx.filter = 'none';
      ctx.fillStyle = 'rgba(255, 215, 100, 0.08)';
      ctx.fillRect(0, 0, w, h);
    }
  },
};

/**
 * 프레임 SVG 정의 (각 프레임은 모서리/테두리에 오버레이)
 */
export const FRAME_DEFS: Record<string, {
  label: string;
  emoji: string;
  svgTemplate: (w: number, h: number) => string;
}> = {
  none: {
    label: '없음',
    emoji: '🚫',
    svgTemplate: () => '',
  },

  flower: {
    label: '꽃 프레임',
    emoji: '🌸',
    svgTemplate: (w, h) => {
      const margin = Math.min(w, h) * 0.08;
      const fSize = Math.min(w, h) * 0.035; // flower dot size
      const cSize = fSize * 0.7; // center size
      return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        <!-- Corner flowers (top-left) -->
        <g transform="translate(${margin},${margin})">
          <circle cx="0" cy="${-fSize*1.8}" r="${fSize}" fill="rgba(255,182,193,0.85)"/>
          <circle cx="${fSize*1.7}" cy="${-fSize*0.5}" r="${fSize}" fill="rgba(255,182,193,0.85)"/>
          <circle cx="${fSize*1.0}" cy="${fSize*1.5}" r="${fSize}" fill="rgba(255,182,193,0.85)"/>
          <circle cx="${-fSize*1.0}" cy="${fSize*1.5}" r="${fSize}" fill="rgba(255,182,193,0.85)"/>
          <circle cx="${-fSize*1.7}" cy="${-fSize*0.5}" r="${fSize}" fill="rgba(255,182,193,0.85)"/>
          <circle cx="0" cy="0" r="${cSize}" fill="rgba(255,220,100,0.9)"/>
        </g>
        <!-- Corner flowers (top-right) -->
        <g transform="translate(${w - margin},${margin}) rotate(90)">
          <circle cx="0" cy="${-fSize*1.8}" r="${fSize}" fill="rgba(255,182,193,0.85)"/>
          <circle cx="${fSize*1.7}" cy="${-fSize*0.5}" r="${fSize}" fill="rgba(255,182,193,0.85)"/>
          <circle cx="${fSize*1.0}" cy="${fSize*1.5}" r="${fSize}" fill="rgba(255,182,193,0.85)"/>
          <circle cx="${-fSize*1.0}" cy="${fSize*1.5}" r="${fSize}" fill="rgba(255,182,193,0.85)"/>
          <circle cx="${-fSize*1.7}" cy="${-fSize*0.5}" r="${fSize}" fill="rgba(255,182,193,0.85)"/>
          <circle cx="0" cy="0" r="${cSize}" fill="rgba(255,220,100,0.9)"/>
        </g>
        <!-- Corner flowers (bottom-left) -->
        <g transform="translate(${margin},${h - margin}) rotate(-90)">
          <circle cx="0" cy="${-fSize*1.8}" r="${fSize}" fill="rgba(255,182,193,0.85)"/>
          <circle cx="${fSize*1.7}" cy="${-fSize*0.5}" r="${fSize}" fill="rgba(255,182,193,0.85)"/>
          <circle cx="${fSize*1.0}" cy="${fSize*1.5}" r="${fSize}" fill="rgba(255,182,193,0.85)"/>
          <circle cx="${-fSize*1.0}" cy="${fSize*1.5}" r="${fSize}" fill="rgba(255,182,193,0.85)"/>
          <circle cx="${-fSize*1.7}" cy="${-fSize*0.5}" r="${fSize}" fill="rgba(255,182,193,0.85)"/>
          <circle cx="0" cy="0" r="${cSize}" fill="rgba(255,220,100,0.9)"/>
        </g>
        <!-- Corner flowers (bottom-right) -->
        <g transform="translate(${w - margin},${h - margin}) rotate(180)">
          <circle cx="0" cy="${-fSize*1.8}" r="${fSize}" fill="rgba(255,182,193,0.85)"/>
          <circle cx="${fSize*1.7}" cy="${-fSize*0.5}" r="${fSize}" fill="rgba(255,182,193,0.85)"/>
          <circle cx="${fSize*1.0}" cy="${fSize*1.5}" r="${fSize}" fill="rgba(255,182,193,0.85)"/>
          <circle cx="${-fSize*1.0}" cy="${fSize*1.5}" r="${fSize}" fill="rgba(255,182,193,0.85)"/>
          <circle cx="${-fSize*1.7}" cy="${-fSize*0.5}" r="${fSize}" fill="rgba(255,182,193,0.85)"/>
          <circle cx="0" cy="0" r="${cSize}" fill="rgba(255,220,100,0.9)"/>
        </g>
        <!-- Decorative border line -->
        <rect x="${margin/3}" y="${margin/3}" width="${w - (margin*2/3)}" height="${h - (margin*2/3)}" 
              fill="none" stroke="rgba(255,182,193,0.45)" stroke-width="${Math.min(w,h)*0.005}" rx="4"/>
      </svg>
    `;
    }
  },

  heart: {
    label: '하트 프레임',
    emoji: '💕',
    svgTemplate: (w, h) => {
      const marginX = w * 0.1;
      const marginY = h * 0.1;
      const hScale = Math.min(w, h) / 360;
      return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        <!-- Top-left hearts -->
        <g transform="translate(${marginX},${marginY}) scale(${hScale})">
          <path d="M0,-10 C0,-20 -20,-20 -20,-5 C-20,5 0,20 0,20 C0,20 20,5 20,-5 C20,-20 0,-20 0,-10Z" fill="rgba(255,100,120,0.8)"/>
        </g>
        <g transform="translate(${marginX * 1.8}, ${marginY * 0.6}) scale(${hScale*0.7})">
          <path d="M0,-10 C0,-20 -20,-20 -20,-5 C-20,5 0,20 0,20 C0,20 20,5 20,-5 C20,-20 0,-20 0,-10Z" fill="rgba(255,150,160,0.7)"/>
        </g>
        <g transform="translate(${marginX * 0.6}, ${marginY * 2.2}) scale(${hScale*0.7})">
          <path d="M0,-10 C0,-20 -20,-20 -20,-5 C-20,5 0,20 0,20 C0,20 20,5 20,-5 C20,-20 0,-20 0,-10Z" fill="rgba(255,150,160,0.7)"/>
        </g>
        <!-- Top-right hearts -->
        <g transform="translate(${w - marginX},${marginY}) scale(${hScale})">
          <path d="M0,-10 C0,-20 -20,-20 -20,-5 C-20,5 0,20 0,20 C0,20 20,5 20,-5 C20,-20 0,-20 0,-10Z" fill="rgba(255,100,120,0.8)"/>
        </g>
        <g transform="translate(${w - marginX * 1.8}, ${marginY * 0.6}) scale(${hScale*0.7})">
          <path d="M0,-10 C0,-20 -20,-20 -20,-5 C-20,5 0,20 0,20 C0,20 20,5 20,-5 C20,-20 0,-20 0,-10Z" fill="rgba(255,150,160,0.7)"/>
        </g>
        <!-- Bottom-left hearts -->
        <g transform="translate(${marginX},${h - marginY}) scale(${hScale})">
          <path d="M0,-10 C0,-20 -20,-20 -20,-5 C-20,5 0,20 0,20 C0,20 20,5 20,-5 C20,-20 0,-20 0,-10Z" fill="rgba(255,100,120,0.8)"/>
        </g>
        <!-- Bottom-right hearts -->
        <g transform="translate(${w - marginX},${h - marginY}) scale(${hScale})">
          <path d="M0,-10 C0,-20 -20,-20 -20,-5 C-20,5 0,20 0,20 C0,20 20,5 20,-5 C20,-20 0,-20 0,-10Z" fill="rgba(255,100,120,0.8)"/>
        </g>
        <!-- Thin border -->
        <rect x="${marginX/4}" y="${marginY/4}" width="${w - (marginX/2)}" height="${h - (marginY/2)}"
              fill="none" stroke="rgba(255,120,140,0.35)" stroke-width="${Math.min(w,h)*0.005}" rx="3"/>
      </svg>
    `;
    }
  },

  ribbon: {
    label: '리본',
    emoji: '🎀',
    svgTemplate: (w, h) => {
      const ribH = h * 0.08;
      const bowS = Math.min(w, h) * 0.15;
      return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        <!-- Top ribbon banner -->
        <rect x="0" y="0" width="${w}" height="${ribH}" fill="rgba(255,105,135,0.88)"/>
        <rect x="0" y="${ribH - 2}" width="${w}" height="${ribH * 0.1}" fill="rgba(200,50,80,0.6)"/>
        <!-- Ribbon tails -->
        <polygon points="0,0 ${ribH*0.7},0 ${ribH*0.7},${ribH} 0,${ribH*0.7}" fill="rgba(230,70,100,0.75)"/>
        <polygon points="${w},0 ${w - ribH*0.7},0 ${w - ribH*0.7},${ribH} ${w},${ribH*0.7}" fill="rgba(230,70,100,0.75)"/>
        <!-- Center bow -->
        <g transform="translate(${w / 2}, ${ribH / 2}) scale(${bowS / 50})">
          <!-- Left bow loop -->
          <ellipse cx="-22" cy="0" rx="18" ry="11" fill="rgba(255,160,180,0.9)" transform="rotate(-15,-22,0)"/>
          <!-- Right bow loop -->
          <ellipse cx="22" cy="0" rx="18" ry="11" fill="rgba(255,160,180,0.9)" transform="rotate(15,22,0)"/>
          <!-- Center knot -->
          <ellipse cx="0" cy="0" rx="9" ry="7" fill="rgba(255,50,100,0.95)"/>
        </g>
        <!-- Bottom thin accent -->
        <rect x="0" y="${h - (ribH * 0.1)}" width="${w}" height="${ribH * 0.1}" fill="rgba(255,105,135,0.5)"/>
      </svg>
    `;
    }
  },

  border: {
    label: '엽서 테두리',
    emoji: '🖼️',
    svgTemplate: (w, h) => {
      const thick = Math.min(w, h) * 0.01;
      const margin = Math.min(w, h) * 0.05;
      return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        <!-- Outer border -->
        <rect x="${thick}" y="${thick}" width="${w - thick*2}" height="${h - thick*2}"
              fill="none" stroke="rgba(180,140,100,0.8)" stroke-width="${thick}" rx="${thick}"/>
        <!-- Inner border -->
        <rect x="${margin}" y="${margin}" width="${w - margin*2}" height="${h - margin*2}"
              fill="none" stroke="rgba(180,140,100,0.5)" stroke-width="${thick/2}" rx="${thick/2}"/>
        <!-- Corner ornaments -->
        <g transform="translate(${margin*1.2},${margin*1.2})">
          <line x1="0" y1="${margin*0.5}" x2="0" y2="0" stroke="rgba(180,140,100,0.7)" stroke-width="${thick*0.6}"/>
          <line x1="0" y1="0" x2="${margin*0.5}" y2="0" stroke="rgba(180,140,100,0.7)" stroke-width="${thick*0.6}"/>
          <circle cx="0" cy="0" r="${thick*0.8}" fill="rgba(180,140,100,0.8)"/>
        </g>
        <g transform="translate(${w - margin*1.2},${margin*1.2}) scale(-1,1)">
          <line x1="0" y1="${margin*0.5}" x2="0" y2="0" stroke="rgba(180,140,100,0.7)" stroke-width="${thick*0.6}"/>
          <line x1="0" y1="0" x2="${margin*0.5}" y2="0" stroke="rgba(180,140,100,0.7)" stroke-width="${thick*0.6}"/>
          <circle cx="0" cy="0" r="${thick*0.8}" fill="rgba(180,140,100,0.8)"/>
        </g>
        <g transform="translate(${margin*1.2},${h - margin*1.2}) scale(1,-1)">
          <line x1="0" y1="${margin*0.5}" x2="0" y2="0" stroke="rgba(180,140,100,0.7)" stroke-width="${thick*0.6}"/>
          <line x1="0" y1="0" x2="${margin*0.5}" y2="0" stroke="rgba(180,140,100,0.7)" stroke-width="${thick*0.6}"/>
          <circle cx="0" cy="0" r="${thick*0.8}" fill="rgba(180,140,100,0.8)"/>
        </g>
        <g transform="translate(${w - margin*1.2},${h - margin*1.2}) scale(-1,-1)">
          <line x1="0" y1="${margin*0.5}" x2="0" y2="0" stroke="rgba(180,140,100,0.7)" stroke-width="${thick*0.6}"/>
          <line x1="0" y1="0" x2="${margin*0.5}" y2="0" stroke="rgba(180,140,100,0.7)" stroke-width="${thick*0.6}"/>
          <circle cx="0" cy="0" r="${thick*0.8}" fill="rgba(180,140,100,0.8)"/>
        </g>
      </svg>
    `;
    }
  },
};

/**
 * SVG 프레임을 Canvas에 합성
 */
export function compositeFrameOnCanvas(
  ctx: CanvasRenderingContext2D,
  frameId: string,
  width: number,
  height: number
): Promise<void> {
  return new Promise((resolve) => {
    const frameDef = FRAME_DEFS[frameId];
    if (!frameDef || frameId === 'none') return resolve();

    const svgString = frameDef.svgTemplate(width, height);
    if (!svgString.trim()) return resolve();

    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve();
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(); };
    img.src = url;
  });
}
