/**
 * 폼텍 / 감열 라벨 용지 규격 (mm)
 *
 * 메시지 인쇄 다이얼로그의 formtec-3107/3108/3109는 업계 통칭명이며,
 * 실제 한국폼텍 제품 코드는 아래와 같습니다.
 *
 * | 앱 코드          | 실제 제품   | 칸수 | 라벨 크기 (mm)   |
 * |------------------|------------|------|------------------|
 * | formtec-3107     | LS-3116    | 6    | 99.1 × 93.1      |
 * | formtec-3108     | LS-3114    | 8    | 99.1 × 67.7      |
 * | formtec-3109     | LS-3212    | 12   | 100.0 × 45.0     |
 *
 * 여백·간격은 MS Word 폼텍 라벨 템플릿 및 A4(210×297mm) 합산 검증값입니다.
 * @see https://ragisamton.tistory.com/189 (FORMTEC 3114/3116/3212 워드 규격)
 */

export interface LabelSheetConfig {
  /** 한국폼텍 실제 제품 코드 (참고용) */
  formtecProductCode?: string;
  cells: number;
  cols: number;
  rows: number;
  labelWidthMm: number;
  labelHeightMm: number;
  pageWidthMm: number;
  pageHeightMm: number;
  marginTopMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  marginRightMm: number;
  hGapMm: number;
  vGapMm: number;
  isThermal?: boolean;
}

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

export const LABEL_SHEET_CONFIGS: Record<string, LabelSheetConfig> = {
  // LS-3116 — 세로: 워드 템플릿, 가로: A4 210mm 합산 보정(좌우 4.9 + 간격 2)
  'formtec-3107': {
    formtecProductCode: 'LS-3116',
    cells: 6,
    cols: 2,
    rows: 3,
    labelWidthMm: 99.1,
    labelHeightMm: 93.1,
    pageWidthMm: A4_WIDTH_MM,
    pageHeightMm: A4_HEIGHT_MM,
    marginTopMm: 7,
    marginBottomMm: 10.7,
    marginLeftMm: 4.9,
    marginRightMm: 4.9,
    hGapMm: 2,
    vGapMm: 0,
  },
  // LS-3114 — 세로: 워드(상13/하13.2), 가로: A4 합산 보정(좌우 4.95 + 간격 2)
  'formtec-3108': {
    formtecProductCode: 'LS-3114',
    cells: 8,
    cols: 2,
    rows: 4,
    labelWidthMm: 99.1,
    labelHeightMm: 67.7,
    pageWidthMm: A4_WIDTH_MM,
    pageHeightMm: A4_HEIGHT_MM,
    marginTopMm: 13,
    marginBottomMm: 13.2,
    marginLeftMm: 4.95,
    marginRightMm: 4.95,
    hGapMm: 2,
    vGapMm: 0,
  },
  // LS-3212 — 워드 템플릿(라벨폭 100mm, 상10/하17, 좌우3.7, 간격2.5)
  'formtec-3109': {
    formtecProductCode: 'LS-3212',
    cells: 12,
    cols: 2,
    rows: 6,
    labelWidthMm: 100,
    labelHeightMm: 45,
    pageWidthMm: A4_WIDTH_MM,
    pageHeightMm: A4_HEIGHT_MM,
    marginTopMm: 10,
    marginBottomMm: 17,
    marginLeftMm: 3.7,
    marginRightMm: 3.7,
    hGapMm: 2.5,
    vGapMm: 0,
  },
  // LS-3105 — 3열×7행=21칸
  'formtec-3105': {
    formtecProductCode: 'LS-3105',
    cells: 21,
    cols: 3,
    rows: 7,
    labelWidthMm: 63.5,
    labelHeightMm: 38.1,
    pageWidthMm: A4_WIDTH_MM,
    pageHeightMm: A4_HEIGHT_MM,
    marginTopMm: 15.8,
    marginBottomMm: 14.5,
    marginLeftMm: 7.2,
    marginRightMm: 7.2,
    hGapMm: 2.5,
    vGapMm: 0,
  },
  // LS-3106 — 4열×6행=24칸 (48.5×45mm) · A4 완전충전 검증: 13.5+6×45+13.5=297mm ✓
  'formtec-3106': {
    formtecProductCode: 'LS-3106',
    cells: 24,
    cols: 4,
    rows: 6,
    labelWidthMm: 48.5,
    labelHeightMm: 45,
    pageWidthMm: A4_WIDTH_MM,
    pageHeightMm: A4_HEIGHT_MM,
    marginTopMm: 13.5,
    marginBottomMm: 13.5,
    marginLeftMm: 5.0,
    marginRightMm: 5.0,
    hGapMm: 2.0,
    vGapMm: 0,
  },
  // LS-3213 — 3열×9행=27칸 (63.5×30.5mm)
  'formtec-3213': {
    formtecProductCode: 'LS-3213',
    cells: 27,
    cols: 3,
    rows: 9,
    labelWidthMm: 63.5,
    labelHeightMm: 30.5,
    pageWidthMm: A4_WIDTH_MM,
    pageHeightMm: A4_HEIGHT_MM,
    marginTopMm: 13.5,
    marginBottomMm: 13.0,
    marginLeftMm: 7.2,
    marginRightMm: 7.2,
    hGapMm: 2.5,
    vGapMm: 0,
  },
  // 감열 라벨 50×80mm
  'label-50x80': {
    cells: 1,
    cols: 1,
    rows: 1,
    labelWidthMm: 50,
    labelHeightMm: 80,
    pageWidthMm: 50,
    pageHeightMm: 80,
    marginTopMm: 0,
    marginBottomMm: 0,
    marginLeftMm: 0,
    marginRightMm: 0,
    hGapMm: 0,
    vGapMm: 0,
    isThermal: true,
  },
  // 감열 라벨 60×70mm
  'label-60x70': {
    cells: 1,
    cols: 1,
    rows: 1,
    labelWidthMm: 60,
    labelHeightMm: 70,
    pageWidthMm: 60,
    pageHeightMm: 70,
    marginTopMm: 0,
    marginBottomMm: 0,
    marginLeftMm: 0,
    marginRightMm: 0,
    hGapMm: 0,
    vGapMm: 0,
    isThermal: true,
  },
  // 감열 라벨 50×30mm
  'label-50x30': {
    cells: 1,
    cols: 1,
    rows: 1,
    labelWidthMm: 50,
    labelHeightMm: 30,
    pageWidthMm: 50,
    pageHeightMm: 30,
    marginTopMm: 0,
    marginBottomMm: 0,
    marginLeftMm: 0,
    marginRightMm: 0,
    hGapMm: 0,
    vGapMm: 0,
    isThermal: true,
  },
  // 감열 라벨 60×30mm
  'label-60x30': {
    cells: 1,
    cols: 1,
    rows: 1,
    labelWidthMm: 60,
    labelHeightMm: 30,
    pageWidthMm: 60,
    pageHeightMm: 30,
    marginTopMm: 0,
    marginBottomMm: 0,
    marginLeftMm: 0,
    marginRightMm: 0,
    hGapMm: 0,
    vGapMm: 0,
    isThermal: true,
  },
  'label-90x60': {
    cells: 1,
    cols: 1,
    rows: 1,
    labelWidthMm: 90,
    labelHeightMm: 60,
    pageWidthMm: 90,
    pageHeightMm: 60,
    marginTopMm: 0,
    marginBottomMm: 0,
    marginLeftMm: 0,
    marginRightMm: 0,
    hGapMm: 0,
    vGapMm: 0,
    isThermal: true,
  },
  'label-90x90': {
    cells: 1,
    cols: 1,
    rows: 1,
    labelWidthMm: 90,
    labelHeightMm: 90,
    pageWidthMm: 90,
    pageHeightMm: 90,
    marginTopMm: 0,
    marginBottomMm: 0,
    marginLeftMm: 0,
    marginRightMm: 0,
    hGapMm: 0,
    vGapMm: 0,
    isThermal: true,
  },
};

/** A4 레이아웃 합산 검증 (210×297mm 안에 들어가는지) */
export function validateLabelSheetLayout(spec: LabelSheetConfig): {
  ok: boolean;
  widthTotalMm: number;
  heightTotalMm: number;
} {
  const widthTotalMm =
    spec.marginLeftMm +
    spec.cols * spec.labelWidthMm +
    (spec.cols - 1) * spec.hGapMm +
    spec.marginRightMm;

  const heightTotalMm =
    spec.marginTopMm +
    spec.rows * spec.labelHeightMm +
    (spec.rows - 1) * spec.vGapMm +
    spec.marginBottomMm;

  const pageW = spec.isThermal ? spec.pageWidthMm : A4_WIDTH_MM;
  const pageH = spec.isThermal ? spec.pageHeightMm : A4_HEIGHT_MM;

  return {
    ok: Math.abs(widthTotalMm - pageW) < 0.15 && Math.abs(heightTotalMm - pageH) < 0.15,
    widthTotalMm,
    heightTotalMm,
  };
}

export function getLabelSheetConfig(labelType: string): LabelSheetConfig {
  return LABEL_SHEET_CONFIGS[labelType] ?? LABEL_SHEET_CONFIGS['formtec-3108'];
}

export function formatMessageHtml(content: string): string {
  if (!content?.trim()) return '';

  const html = content.includes('<p>') || content.includes('<div>')
    ? content
    : content.split('\n').map((line) => `<p style="text-align: center">${line}</p>`).join('');

  return html
    .replace(/<p><\/p>/g, '<p><br></p>')
    .replace(/<p([^>]*)><\/p>/g, '<p$1><br></p>');
}

export const LABEL_SHEET_PRINT_CSS = `
  @page {
    size: A4;
    margin: 0;
  }
  @media print {
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 210mm !important;
      height: 297mm !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .no-print {
      display: none !important;
    }
    .label-sheet-print-root {
      margin: 0 !important;
      /* padding은 LabelSheet inline style(상·하·좌·우 여백) — 인쇄 시에도 유지 */
      box-sizing: border-box !important;
      box-shadow: none !important;
      outline: none !important;
      background-color: white !important;
      width: 210mm !important;
      height: 297mm !important;
      page-break-after: avoid;
      break-after: avoid-page;
    }
    .label-sheet-cell {
      border: none !important;
      box-shadow: none !important;
      opacity: 1 !important;
    }
  }
`;
