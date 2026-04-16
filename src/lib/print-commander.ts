import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { LABEL_CONFIGS } from './constants/templates';

export interface PrintPageData {
  backgroundUrl: string | null;
  frontBackgroundUrl?: string | null;
  backBackgroundUrl?: string | null;
  textBlocks: { 
    text: string, 
    x: number, 
    y: number, 
    size: number, 
    colorHex: string, 
    fontFamily?: string,
    textAlign?: 'left' | 'center' | 'right',
    rotation?: number,
    textShadow?: string,
    opacity?: number,
    strokeWidth?: number,
    strokeColor?: string
  }[];
  imageBlocks?: {
    url: string | null,
    x: number,
    y: number,
    width: number,
    height: number,
    isPrintable: boolean,
    rotation?: number
  }[];
}

export interface PrintJobData {
  paperSizeMm: { widthMm: number, heightMm: number };
  pages?: PrintPageData[];
  backgroundUrl?: string | null;
  textBlocks?: PrintPageData['textBlocks'];
  labelType?: string;
  selectedCells?: number[];
  margins?: { top: number; right: number; bottom: number; left: number };
  nUpConfig?: {
    cols: number;
    rows: number;
    cells: number;
    cellWidthMm: number;
    cellHeightMm: number;
    marginLeftMm: number;
    marginTopMm: number;
    hGapMm: number;
    vGapMm: number;
    rotate90: boolean;
    outputPaperSizeMm: { widthMm: number, heightMm: number };
  };
}

const MM_TO_PT = 2.83465;

export class PrintCommander {
  
  static hexToRgb(hex: string) {
    const defaultColor = { r: 0, g: 0, b: 0 };
    if (!hex) return defaultColor;
    const cleanHex = hex.replace('#', '');
    if (cleanHex.length !== 6) return defaultColor;
    return {
      r: parseInt(cleanHex.substring(0, 2), 16) / 255,
      g: parseInt(cleanHex.substring(2, 4), 16) / 255,
      b: parseInt(cleanHex.substring(4, 6), 16) / 255
    };
  }

  static async generatePdf(jobData: PrintJobData): Promise<Uint8Array | null> {
    try {
      const pdfDoc = await PDFDocument.create();
      pdfDoc.registerFontkit(fontkit);
      
      // 디자인 스튜디오의 모든 폰트 매합 (CORS 해결을 위해 jsDelivr CDN 사용)
      const FONT_URLS: Record<string, string> = {
        "'GmarketSansBold', sans-serif": "https://fastly.jsdelivr.net/gh/fonts-archive/GmarketSans@main/GmarketSansBold.ttf",
        "'Bagel Fat One', cursive": "https://fastly.jsdelivr.net/gh/google/fonts@main/ofl/bagelfatone/BagelFatOne-Regular.ttf",
        "'Black Han Sans', sans-serif": "https://fastly.jsdelivr.net/gh/google/fonts@main/ofl/blackhansans/BlackHanSans-Regular.ttf",
        "'Do Hyeon', sans-serif": "https://fastly.jsdelivr.net/gh/google/fonts@main/ofl/dohyeon/DoHyeon-Regular.ttf",
        "'Jua', sans-serif": "https://fastly.jsdelivr.net/gh/google/fonts@main/ofl/jua/Jua-Regular.ttf",
        "'Gowun Batang', serif": "https://fastly.jsdelivr.net/gh/google/fonts@main/ofl/gowunbatang/GowunBatang-Regular.ttf",
        "'Nanum Pen Script', cursive": "https://fastly.jsdelivr.net/gh/google/fonts@main/ofl/nanumpenscript/NanumPenScript-Regular.ttf",
        "'Gaegu', cursive": "https://fastly.jsdelivr.net/gh/google/fonts@main/ofl/gaegu/Gaegu-Regular.ttf",
        "'Gamja Flower', cursive": "https://fastly.jsdelivr.net/gh/google/fonts@main/ofl/gamjaflower/GamjaFlower-Regular.ttf",
        "'Single Day', cursive": "https://fastly.jsdelivr.net/gh/google/fonts@main/ofl/singleday/SingleDay-Regular.ttf",
        "sans-serif": "https://fastly.jsdelivr.net/gh/sun-typeface/SUIT@main/fonts/static/ttf/SUIT-Regular.ttf"
      };

      const embeddedFonts: Record<string, any> = {};
      const standardFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // 1. [초강력 폴백] 기본 한글 폰트 로드 (CORS 대응 및 다중 CDN 시도)
      let primaryCJKFont: any;
      const cjkFallbacks = [
        FONT_URLS["sans-serif"],
        "https://fastly.jsdelivr.net/gh/google/fonts@main/ofl/nanumgothic/NanumGothic-Regular.ttf", // 나눔고딕 (2순위 보루)
        "https://fastly.jsdelivr.net/gh/google/fonts@main/ofl/notosanskr/NotoSansKR-Regular.ttf"    // 노토산스 (3순위 보루)
      ];

      for (const url of cjkFallbacks) {
        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          const bytes = await res.arrayBuffer();
          primaryCJKFont = await pdfDoc.embedFont(bytes);
          embeddedFonts["sans-serif"] = primaryCJKFont;
          break; // 성공 시 루프 탈출
        } catch (e) {
          console.warn(`CJK Fallback failed for: ${url}`, e);
        }
      }

      if (!primaryCJKFont) {
        console.error("Critical: All CJK fonts failed to load. CJK characters will be broken.");
        primaryCJKFont = standardFont;
      }

      // 2. [디자인 폰트 로드] 
      const uniqueFonts = new Set<string>();
      jobData.pages?.forEach(p => p.textBlocks.forEach(b => b.fontFamily && uniqueFonts.add(b.fontFamily)));
      jobData.textBlocks?.forEach(b => b.fontFamily && uniqueFonts.add(b.fontFamily));

      for (const family of Array.from(uniqueFonts)) {
        const url = FONT_URLS[family];
        if (!url || family === "sans-serif") continue;
        
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const fontBytes = await res.arrayBuffer();
          embeddedFonts[family] = await pdfDoc.embedFont(fontBytes);
        } catch (e) {
          console.warn(`Font load failed for ${family}. Falling back to default CJK font.`, e);
          embeddedFonts[family] = primaryCJKFont;
        }
      }
      
      const getFont = (family?: string) => {
        if (!family) return primaryCJKFont;
        const cleanFamily = family.replace(/['"]/g, '').trim(); 
        // 폰트명 정규화 매칭 시도
        const matched = embeddedFonts[family] || embeddedFonts[Object.keys(embeddedFonts).find(k => k.includes(cleanFamily)) || ""] || primaryCJKFont;
        return matched;
      };

      const pagesToRender = jobData.pages || [{
        backgroundUrl: jobData.backgroundUrl || null,
        textBlocks: jobData.textBlocks || []
      }];

      const isGrid = !!jobData.labelType;
      const config = isGrid ? LABEL_CONFIGS[jobData.labelType!] : null;

      for (const renderData of pagesToRender) {
        // 폼텍 라벨 인쇄 시 출력 용지는 항상 A4(210x297)로 고정
        const outputWidthMm = isGrid ? 210 : (jobData.paperSizeMm.widthMm || 210);
        const outputHeightMm = isGrid ? 297 : (jobData.paperSizeMm.heightMm || 148);

        const page = pdfDoc.addPage([
          outputWidthMm * MM_TO_PT,
          outputHeightMm * MM_TO_PT
        ]);

        const cellsToRender = isGrid 
          ? (jobData.selectedCells?.length ? jobData.selectedCells : Array.from({length: config!.cells}, (_, i) => i))
          : [0];

        for (const cellIndex of cellsToRender) {
          let offsetX = 0;
          let offsetY = 0;
          let cellWidth = page.getWidth();
          let cellHeight = page.getHeight();

          if (isGrid && config) {
            const row = Math.floor(cellIndex / config.cols);
            const col = cellIndex % config.cols;
            
            offsetX = (config.marginLeftMm + col * (config.widthMm + config.hGapMm)) * MM_TO_PT;
            // PDF 좌표는 아래서 위로 증가하므로, 실제 용지 높이를 기준으로 위에서부터 마진을 뺌
            offsetY = (outputHeightMm - (config.marginTopMm + (row + 1) * config.heightMm + row * config.vGapMm)) * MM_TO_PT;
            
            cellWidth = config.widthMm * MM_TO_PT;
            cellHeight = config.heightMm * MM_TO_PT;
          }

          // [정밀 보정] 배경 이미지 렌더링 (해당 페이지에 명시된 데이터만 사용)
          const bgUrls = [];
          
          // 1. 표지용 분할 배경 (front/back 전용)
          if (renderData.backBackgroundUrl) bgUrls.push({ url: renderData.backBackgroundUrl, side: 'left' });
          if (renderData.frontBackgroundUrl) bgUrls.push({ url: renderData.frontBackgroundUrl, side: 'right' });
          
          // 2. 단일 배경 (분할 배경이 없는 경우에만 사용)
          if (bgUrls.length === 0 && renderData.backgroundUrl) {
            bgUrls.push({ url: renderData.backgroundUrl, side: 'full' });
          }

          for (const bg of bgUrls) {
            try {
              if (!bg.url) continue;
              const bgBytes = await fetch(bg.url).then(res => res.arrayBuffer());
              const isPng = bg.url.toLowerCase().includes('image/png') || bg.url.toLowerCase().endsWith('.png');
              const bgImg = isPng ? await pdfDoc.embedPng(bgBytes) : await pdfDoc.embedJpg(bgBytes);
              
              let bgW = cellWidth;
              let bgX = offsetX;
              
              if (bg.side === 'left') {
                bgW = cellWidth / 2;
              } else if (bg.side === 'right') {
                bgW = cellWidth / 2;
                bgX = offsetX + (cellWidth / 2);
              }
              
              page.drawImage(bgImg, { x: bgX, y: offsetY, width: bgW, height: cellHeight });
            } catch (e) {
              console.warn('Background skip:', bg.url);
            }
          }

          // 이미지 블록 렌더링
          if (renderData.imageBlocks) {
            for (const imgBlock of renderData.imageBlocks) {
              if (imgBlock.url && imgBlock.isPrintable) {
                try {
                  const imgBytes = await fetch(imgBlock.url).then(res => res.arrayBuffer());
                  const isPng = imgBlock.url.toLowerCase().includes('image/png') || imgBlock.url.toLowerCase().endsWith('.png');
                  const img = isPng ? await pdfDoc.embedPng(imgBytes) : await pdfDoc.embedJpg(imgBytes);
                  
                  const imgDims = img.size();
                  const imgAspect = imgDims.width / imgDims.height;
                  
                  // 물리적 크기 환산
                  let drawW = (imgBlock.width / 210) * cellWidth;
                  let drawH = (imgBlock.height / 148) * cellHeight;
                  const containerAspect = drawW / drawH;

                  if (imgAspect > containerAspect) drawH = drawW / imgAspect;
                  else drawW = drawH * imgAspect;
                  
                  const pdfCenterX = offsetX + (imgBlock.x / outputWidthMm) * cellWidth;
                  const pdfCenterY = offsetY + cellHeight - ((imgBlock.y / outputHeightMm) * cellHeight);
                  
                  page.drawImage(img, {
                    x: pdfCenterX - (drawW / 2),
                    y: pdfCenterY - (drawH / 2),
                    width: drawW, height: drawH,
                    rotate: imgBlock.rotation ? degrees(-imgBlock.rotation) : undefined
                  });
                } catch (e) { }
              }
            }
          }

          // [최종 병기] 텍스트 블록 렌더링 - 구역 가두기 및 자동 줄바꿈 적용
          for (const block of renderData.textBlocks) {
            const font = getFont(block.fontFamily);
            // [정밀 보정] 브라우저(96dpi) px 단위를 PDF(72dpi) pt 단위로 1:1 매칭 (0.75배)
            const pdfFontSize = block.size * 0.75; 
            const color = this.hexToRgb(block.colorHex);
            const lineHeight = pdfFontSize * 1.1; // 줄 간격을 더 타이트하게 조정

            // [구역 감지 및 가로폭 제한]
            const isLeftSegment = block.x < 105;
            const horizontalMarginMm = jobData.margins?.left || 10;
            const marginPt = horizontalMarginMm * MM_TO_PT; 
            const segmentWidthPt = (cellWidth / 2);
            const maxContentWidthPt = segmentWidthPt - (marginPt * 2); // 여백(좌/우)을 제외한 가용 폭

            // [전문가형 자동 줄바꿈 로직]
            const words = block.text.split(/(\s+)/);
            let lines: string[] = [];
            let currentLine = '';

            // 강제 줄바꿈(\n) 처리 포함
            block.text.split('\n').forEach(paragraph => {
                const pWords = paragraph.split(' ');
                let pLine = '';
                for (const word of pWords) {
                    const testLine = pLine ? pLine + ' ' + word : word;
                    const testWidth = font.widthOfTextAtSize(testLine, pdfFontSize);
                    if (testWidth > maxContentWidthPt && pLine) {
                        lines.push(pLine);
                        pLine = word;
                    } else {
                        pLine = testLine;
                    }
                }
                lines.push(pLine);
            });

            const totalHeight = lines.length * lineHeight;

            lines.forEach((line, index) => {
              const textWidth = font.widthOfTextAtSize(line, pdfFontSize);
              
              // [전문가 로직] 기하학적 절대 좌표 산출 (여백에 휘둘리지 않는 1:1 매칭)
              const pX = (block.x / outputWidthMm) * cellWidth;
              const pY = (block.y / outputHeightMm) * cellHeight;

              let drawX = offsetX + pX;
              // 텍스트 블록의 x/y는 블록의 '중앙' 기준이므로, 정렬 방식에 따라 오프셋 조정
              if (block.textAlign === 'center') drawX -= (textWidth / 2);
              else if (block.textAlign === 'right') drawX -= textWidth;

              let drawY = offsetY + cellHeight - pY;
              // 수직 중앙 정렬 보정: 텍스트 줄 수에 따른 높이 보정치를 수학적으로 산출
              const verticalOffset = (totalHeight / 2) - (index * lineHeight) - (pdfFontSize * 0.35);
              drawY += verticalOffset;

              // 테두리 렌더링 (인쇄소 퀄리티용 8방향 셰도우)
              if (block.strokeWidth && block.strokeWidth > 0) {
                const sColor = this.hexToRgb(block.strokeColor || '#000000');
                const sWidth = block.strokeWidth * 0.5;
                for (let i = 0; i < 8; i++) {
                   const ang = (i / 8) * Math.PI * 2;
                   page.drawText(line, {
                     x: drawX + Math.cos(ang) * sWidth,
                     y: drawY + Math.sin(ang) * sWidth,
                     size: pdfFontSize, font, color: rgb(sColor.r, sColor.g, sColor.b),
                   });
                }
              }

              page.drawText(line, {
                x: drawX, y: drawY, size: pdfFontSize, font,
                color: rgb(color.r, color.g, color.b),
                opacity: block.opacity ?? 1,
                rotate: block.rotation ? degrees(-block.rotation) : undefined
              });
            });
          }
        }
        if (isGrid) break; 
      }

      return await pdfDoc.save();
    } catch (e) {
      console.error('PDF Error:', e);
      return null;
    }
  }

  static triggerPrintPopup(pdfBytes: Uint8Array) {
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => { document.body.removeChild(iframe); URL.revokeObjectURL(url); }, 2000);
      }, 500);
    };
  }
}
