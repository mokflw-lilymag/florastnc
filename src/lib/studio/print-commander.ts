import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

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
  paperSizeMm: { width: number, height: number };
  pages?: PrintPageData[];
  backgroundUrl?: string | null;
  textBlocks?: PrintPageData['textBlocks'];
  labelType?: string;
  selectedCells?: number[];
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
    outputPaperSizeMm: { width: number, height: number };
  };
}

export const LABEL_CONFIGS: Record<string, {
  cells: number;
  cols: number;
  widthMm: number;
  heightMm: number;
  marginTopMm: number;
  marginLeftMm: number;
  hGapMm: number;
  vGapMm: number;
}> = {
  'formtec-1':  { cells: 1,  cols: 1, widthMm: 210.0, heightMm: 297.0, marginTopMm: 0, marginLeftMm: 0, hGapMm: 0, vGapMm: 0 },
  'formtec-2':  { cells: 2,  cols: 1, widthMm: 199.6, heightMm: 143.5, marginTopMm: 5.0, marginLeftMm: 5.2, hGapMm: 0, vGapMm: 0 },
  'formtec-6':  { cells: 6,  cols: 2, widthMm: 105.0, heightMm: 99.0,  marginTopMm: 0, marginLeftMm: 0, hGapMm: 0, vGapMm: 0 },
  'formtec-8':  { cells: 8,  cols: 2, widthMm: 99.1,  heightMm: 67.7,  marginTopMm: 13.1, marginLeftMm: 4.7, hGapMm: 2.0, vGapMm: 0 },
  'formtec-12': { cells: 12, cols: 3, widthMm: 63.5,  heightMm: 70.0,  marginTopMm: 8.5, marginLeftMm: 9.5, hGapMm: 0, vGapMm: 0 }
};

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
      
      const standardFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      const embeddedFonts: Record<string, any> = {};
      const getFont = (family?: string) => {
        if (!family) return standardFont;
        return embeddedFonts[family] || standardFont;
      };

      const pagesToRender = jobData.pages || [{
        backgroundUrl: jobData.backgroundUrl || null,
        textBlocks: jobData.textBlocks || []
      }];

      const isGrid = !!jobData.labelType;
      const config = isGrid ? LABEL_CONFIGS[jobData.labelType!] : null;

      for (const renderData of pagesToRender) {
        const outputWidthMm = isGrid ? 210 : (jobData.paperSizeMm.width || 210);
        const outputHeightMm = isGrid ? 297 : (jobData.paperSizeMm.height || 297);

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
            offsetY = (297 - (config.marginTopMm + (row + 1) * config.heightMm + row * config.vGapMm)) * MM_TO_PT;
            
            cellWidth = config.widthMm * MM_TO_PT;
            cellHeight = config.heightMm * MM_TO_PT;
          }

          if (renderData.backgroundUrl) {
            try {
              const bgBytes = await fetch(renderData.backgroundUrl).then(res => res.arrayBuffer());
              const isPng = renderData.backgroundUrl.toLowerCase().includes('image/png') || renderData.backgroundUrl.toLowerCase().endsWith('.png');
              const bgImg = isPng 
                ? await pdfDoc.embedPng(bgBytes)
                : await pdfDoc.embedJpg(bgBytes);
              
              page.drawImage(bgImg, {
                x: offsetX,
                y: offsetY,
                width: cellWidth,
                height: cellHeight
              });
            } catch (e) {
              console.warn('Background image embedding failed', e);
            }
          }

          if (renderData.imageBlocks) {
            for (const imgBlock of renderData.imageBlocks) {
              if (imgBlock.url && imgBlock.isPrintable) {
                try {
                  const imgBytes = await fetch(imgBlock.url).then(res => res.arrayBuffer());
                  const isPng = imgBlock.url.toLowerCase().includes('image/png') || imgBlock.url.toLowerCase().endsWith('.png');
                  const img = isPng
                    ? await pdfDoc.embedPng(imgBytes)
                    : await pdfDoc.embedJpg(imgBytes);
                  
                  const imgX = offsetX + (imgBlock.x / (jobData.paperSizeMm.width || 210)) * cellWidth;
                  const imgY = offsetY + (imgBlock.y / (jobData.paperSizeMm.height || 297)) * cellHeight;
                  const imgW = (imgBlock.width / (jobData.paperSizeMm.width || 210)) * cellWidth;
                  const imgH = (imgBlock.height / (jobData.paperSizeMm.height || 297)) * cellHeight;

                  page.drawImage(img, {
                    x: imgX,
                    y: imgY,
                    width: imgW,
                    height: imgH,
                    rotate: imgBlock.rotation ? degrees(imgBlock.rotation) : undefined
                  });
                } catch (e) {
                  console.warn('Image block embedding failed', e);
                }
              }
            }
          }

          for (const block of renderData.textBlocks) {
            const color = this.hexToRgb(block.colorHex);
            const font = getFont(block.fontFamily);
            const pdfFontSize = block.size * MM_TO_PT * 0.35;
            const strokeWidth = block.strokeWidth || 0;
            const strokeColor = this.hexToRgb(block.strokeColor || '#000000');

            let textLines = [block.text];
            // Word wrap logic skipped for brevity in this initial port, but can be added back if typographyWizard is ported

            const lineHeight = pdfFontSize * 1.2;
            const totalTextHeight = textLines.length * lineHeight;

            textLines.forEach((line, index) => {
              let pdfX = offsetX + ((block.x / (jobData.paperSizeMm.width || 210)) * cellWidth);
              let pdfY = offsetY + cellHeight - ((block.y / (jobData.paperSizeMm.height || 297)) * cellHeight);
              
              pdfY = pdfY + (totalTextHeight / 2) - (index * lineHeight) - (pdfFontSize * 0.8);

              if (block.textAlign && block.textAlign !== 'left') {
                try {
                  const textWidth = font.widthOfTextAtSize(line, pdfFontSize);
                  if (block.textAlign === 'center') {
                    pdfX -= (textWidth / 2);
                  } else if (block.textAlign === 'right') {
                    pdfX -= textWidth;
                  }
                } catch { }
              }

              if (strokeWidth > 0) {
                const step = strokeWidth * 0.5;
                const directions = [
                  { dx: -step, dy: 0 }, { dx: step, dy: 0 },
                  { dx: 0, dy: -step }, { dx: 0, dy: step },
                  { dx: -step, dy: -step }, { dx: -step, dy: step },
                  { dx: step, dy: -step }, { dx: step, dy: step }
                ];
                
                directions.forEach(dir => {
                  page.drawText(line || '', {
                    x: pdfX + dir.dx,
                    y: pdfY + dir.dy,
                    size: pdfFontSize,
                    font: font,
                    color: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
                    opacity: block.opacity ?? 1,
                    rotate: block.rotation ? degrees(block.rotation) : undefined
                  });
                });
              }

              page.drawText(line || '', {
                x: pdfX,
                y: pdfY,
                size: pdfFontSize,
                font: font,
                color: rgb(color.r, color.g, color.b),
                opacity: block.opacity ?? 1,
                rotate: block.rotation ? degrees(block.rotation) : undefined
              });
            });
          }
        }
        if (isGrid) break;
      }

      return await pdfDoc.save();
    } catch (e) {
      console.error('PDF Generation Failed:', e);
      return null;
    }
  }

  static triggerPrintPopup(pdfBytes: Uint8Array) {
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);
    
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.src = blobUrl;
    
    document.body.appendChild(iframe);
    
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(blobUrl);
        }, 1000);
      }, 500);
    };
  }
}
