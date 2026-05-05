/**
 * 프레임 SVG 오버레이 및 Canvas 합성 (디자인 스튜디오).
 * 톤·필터 조정은 PhotoEditModal의 transform 상태로 처리합니다.
 */

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
