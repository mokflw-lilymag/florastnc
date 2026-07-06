export interface PaperPreset {
  id: string;
  name: string;
  type: 'formtec' | 'roll';
  columns: number;
  rows: number;
  totalLabels: number;
  width: string;
  height: string;
  padding: string;    // CSS shorthand: "top/bottom left/right" 또는 "top right bottom left"
  paddingTop: string;
  paddingRight: string;
  paddingBottom: string;
  paddingLeft: string;
  itemHeight: string;
  gapX: string;
  gapY: string;
}

export const PAPER_PRESETS: PaperPreset[] = [
  {
    // 폼텍 LQ-3108: 64×33.9mm × 3열 8행
    // A4(210×297mm), 좌우여백 6.5mm, 상단 13.5mm, 하단 13.2mm
    id: "3108",
    name: "폼텍 3108 (3열 8행, 24칸)",
    type: "formtec",
    columns: 3,
    rows: 8,
    totalLabels: 24,
    width: "210mm",
    height: "297mm",
    padding: "13.5mm 6.5mm 13.2mm 6.5mm",
    paddingTop: "13.5mm",
    paddingRight: "6.5mm",
    paddingBottom: "13.2mm",
    paddingLeft: "6.5mm",
    itemHeight: "33.9mm",
    gapX: "2.5mm",
    gapY: "0mm"
  },
  {
    // 폼텍 LQ-3105: 64×38.1mm × 3열 7행
    // A4, 좌우여백 6.5mm, 상단 12.7mm, 하단 12.6mm
    id: "3105",
    name: "폼텍 3105 (3열 7행, 21칸)",
    type: "formtec",
    columns: 3,
    rows: 7,
    totalLabels: 21,
    width: "210mm",
    height: "297mm",
    padding: "12.7mm 6.5mm 12.6mm 6.5mm",
    paddingTop: "12.7mm",
    paddingRight: "6.5mm",
    paddingBottom: "12.6mm",
    paddingLeft: "6.5mm",
    itemHeight: "38.1mm",
    gapX: "2.5mm",
    gapY: "0mm"
  },
  {
    // 폼텍 LQ-3107: 99×38.1mm × 2열 7행 (실제 규격)
    // A4, 좌우여백 6.5mm, 상단 12.7mm
    id: "3107",
    name: "폼텍 3107 (2열 7행, 14칸)",
    type: "formtec",
    columns: 2,
    rows: 7,
    totalLabels: 14,
    width: "210mm",
    height: "297mm",
    padding: "12.7mm 6.5mm 12.6mm 6.5mm",
    paddingTop: "12.7mm",
    paddingRight: "6.5mm",
    paddingBottom: "12.6mm",
    paddingLeft: "6.5mm",
    itemHeight: "38.1mm",
    gapX: "3mm",
    gapY: "0mm"
  },
  {
    // 폼텍 LQ-3110: 70×42.3mm × 3열 7행 (대형 라벨)
    id: "3110",
    name: "폼텍 3110 (3열 7행, 21칸 — 대형)",
    type: "formtec",
    columns: 3,
    rows: 7,
    totalLabels: 21,
    width: "210mm",
    height: "297mm",
    padding: "8.5mm 4.5mm 8.5mm 4.5mm",
    paddingTop: "8.5mm",
    paddingRight: "4.5mm",
    paddingBottom: "8.5mm",
    paddingLeft: "4.5mm",
    itemHeight: "42.3mm",
    gapX: "2.5mm",
    gapY: "0mm"
  },
  {
    id: "roll4020",
    name: "롤 라벨 (40mm × 20mm)",
    type: "roll",
    columns: 1,
    rows: 1,
    totalLabels: 1,
    width: "40mm",
    height: "20mm",
    padding: "1mm",
    paddingTop: "1mm",
    paddingRight: "1mm",
    paddingBottom: "1mm",
    paddingLeft: "1mm",
    itemHeight: "18mm",
    gapX: "0px",
    gapY: "0px"
  },
  {
    id: "roll5030",
    name: "롤 라벨 (50mm × 30mm)",
    type: "roll",
    columns: 1,
    rows: 1,
    totalLabels: 1,
    width: "50mm",
    height: "30mm",
    padding: "2mm",
    paddingTop: "2mm",
    paddingRight: "2mm",
    paddingBottom: "2mm",
    paddingLeft: "2mm",
    itemHeight: "26mm",
    gapX: "0px",
    gapY: "0px"
  }
];
