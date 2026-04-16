/**
 * The Layout Architect (각도기)
 * 전문 분야: 인쇄 규격 변환 및 접선(Folding) 좌표 설계 전문가
 */

export interface DimensionOptions {
  widthMm: number;
  heightMm: number;
  dpi?: number;
}

export class LayoutArchitect {
  private static MM_IN_INCH = 25.4;

  /**
   * mm 단위를 지정된 DPI 기반의 Pixel 단위로 변환합니다.
   * @param mm 밀리미터 물리적 길이
   * @param dpi 해상도 (기본 300)
   */
  static mmToPx(mm: number, dpi: number = 300): number {
    return (mm * dpi) / this.MM_IN_INCH;
  }

  /**
   * 주어진 용지 크기에 맞추어, 접었을 때 특정 영역이 중앙/우측에 오도록 좌표를 산출합니다.
   * @param dimension 용지 전체 규격
   * @param isFolded 반으로 접는 형태의 카드인지 여부
   */
  static calculateCoordinates(dimension: DimensionOptions, isFolded: boolean) {
    const dpi = dimension.dpi || 300;
    const fullWidthPx = this.mmToPx(dimension.widthMm, dpi);
    const fullHeightPx = this.mmToPx(dimension.heightMm, dpi);

    if (isFolded) {
      // 예를 들어 가로로 긴 형태를 반으로 접는 경우
      return {
        safeZoneX: fullWidthPx / 2, // 접은 후 우측면 시작점
        safeZoneY: 0,
        safeWidth: fullWidthPx / 2,
        safeHeight: fullHeightPx,
        foldingLineX: fullWidthPx / 2,
      };
    }

    return {
      safeZoneX: 0,
      safeZoneY: 0,
      safeWidth: fullWidthPx,
      safeHeight: fullHeightPx,
      foldingLineX: null,
    };
  }

  /**
   * 다중 배치(모아찍기/N-up) 용 레이아웃을 계산합니다. (예: A4에 A5 2장, A6 4장)
   * 원본 카드 규격과 출력될 용지 규격을 비교하여 최적의 행/열 및 회전 여부를 결정합니다.
   * @param cardDim 작업한 카드의 규격 (예: A5)
   * @param paperDim 출력할 용지의 규격 (기본 A4 등)
   * @returns 다중 배치가 불가능하거나 1장만 들어갈 경우 null 반환
   */
  static getNUpLayout(cardDim: DimensionOptions, paperDim: DimensionOptions) {
    const paperW = paperDim.widthMm;
    const paperH = paperDim.heightMm;
    const cardW = cardDim.widthMm;
    const cardH = cardDim.heightMm;

    // 회전하지 않았을 때 들어가는 개수
    const normalCols = Math.floor(paperW / cardW);
    const normalRows = Math.floor(paperH / cardH);
    const normalFit = normalCols * normalRows;

    // 90도 회전 시 들어가는 개수
    const rotatedCols = Math.floor(paperW / cardH);
    const rotatedRows = Math.floor(paperH / cardW);
    const rotatedFit = rotatedCols * rotatedRows;

    // 만약 둘 다 1장이면 모아찍기 의미가 없음
    if (normalFit <= 1 && rotatedFit <= 1) return null;

    let cols, rows, cellW, cellH, rotate90;

    // 더 많이/효율적으로 들어가는 방향 선택 (개수가 같다면 정방향 선호)
    if (rotatedFit > normalFit) {
      cols = rotatedCols;
      rows = rotatedRows;
      cellW = cardH;
      cellH = cardW;
      rotate90 = true;
    } else {
      cols = normalCols;
      rows = normalRows;
      cellW = cardW;
      cellH = cardH;
      rotate90 = false;
    }

    const usedWidth = cols * cellW;
    const usedHeight = rows * cellH;

    // 남는 여백의 중앙에 정렬되도록 Margin 계산
    const marginLeftMm = (paperW - usedWidth) / 2;
    const marginTopMm = (paperH - usedHeight) / 2;

    return {
      cols,
      rows,
      cells: cols * rows,
      cellWidthMm: cellW,
      cellHeightMm: cellH,
      marginLeftMm,
      marginTopMm,
      hGapMm: 0,
      vGapMm: 0,
      rotate90,
    };
  }
}
