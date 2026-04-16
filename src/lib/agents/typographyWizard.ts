/**
 * Typography Wizard (폰트김)
 * 전문 분야: 글자 수 기반 포매팅, 줄바꿈(Word Wrap), 크기 최적화(Auto Scaling)
 */

export class TypographyWizard {
  /**
   * 폰트별 대략적인 너비 비율 (기본 폰트 크기 대비)
   */
  private static getWidthRatio(fontFamily?: string): number {
    if (fontFamily?.includes('Jua')) return 0.7;
    if (fontFamily?.includes('Gugi')) return 0.85;
    if (fontFamily?.includes('Pen')) return 0.5;
    return 0.55; // Noto Sans KR / sans-serif default
  }

  /**
   * 지정된 최대 가로 너비(Pixel)를 넘지 않도록 문장을 줄바꿈 처리합니다.
   */
  static applyWordWrap(text: string, maxWidthPx: number, fontSize: number, fontFamily?: string): string[] {
    const ratio = this.getWidthRatio(fontFamily);
    const avgCharWidth = fontSize * ratio;
    const maxCharsPerLine = Math.floor(maxWidthPx / avgCharWidth);

    const resultLines: string[] = [];
    const sourceLines = text.split('\n');

    sourceLines.forEach(line => {
      if (!line) {
        resultLines.push('');
        return;
      }

      const words = line.split(' ');
      let currentLine = '';

      words.forEach((word) => {
        const potentialLine = currentLine ? `${currentLine} ${word}` : word;
        if (potentialLine.length > maxCharsPerLine) {
          if (currentLine) resultLines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = potentialLine;
        }
      });
      
      if (currentLine) resultLines.push(currentLine);
    });

    return resultLines;
  }

  /**
   * 텍스트 양이 많을 경우 Bounding Box에 안전하게 들어가도록 폰트 사이즈를 동적으로 스케일다운합니다.
   */
  static getOptimalFontSize(text: string, boxWidth: number, boxHeight: number, currentFontSize: number, fontFamily?: string): number {
    const ratio = this.getWidthRatio(fontFamily);
    const charCount = text.length;
    
    // 박스 면적 대비 필요한 면적 계산
    const estimatedWidth = charCount * (currentFontSize * ratio);
    
    // 선형적으로 크기 조절 (박스 너비를 대략적으로 맞춤)
    if (estimatedWidth > boxWidth * 1.2) {
      const scaleFactor = boxWidth / estimatedWidth;
      return Math.max(12, Math.floor(currentFontSize * scaleFactor));
    }

    return currentFontSize;
  }
}
