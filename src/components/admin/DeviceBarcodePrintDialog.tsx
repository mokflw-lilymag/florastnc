"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Printer, ChevronLeft, ChevronRight } from "lucide-react";
import { getLabelSheetConfig, LABEL_SHEET_CONFIGS, A4_WIDTH_MM, A4_HEIGHT_MM } from "@/lib/label-sheet-config";
import JsBarcode from "jsbarcode";

// ─── 용지 옵션 ───────────────────────────────────────────────
const PAPER_OPTIONS = [
  { value: "formtec-3105", label: "폼텍 LS-3105 (21칸 · 63.5×38mm)" },
  { value: "formtec-3106", label: "폼텍 LS-3106 (24칸 · 48.5×25mm)" },
  { value: "formtec-3213", label: "폼텍 LS-3213 (27칸 · 63.5×30mm)" },
  { value: "formtec-3109", label: "폼텍 LS-3212 (12칸 · 100×45mm)" },
  { value: "formtec-3108", label: "폼텍 LS-3114  (8칸 · 99×68mm)" },
  { value: "label-50x80",  label: "감열 라벨 50×80mm" },
  { value: "label-60x70",  label: "감열 라벨 60×70mm" },
  { value: "label-50x30",  label: "감열 라벨 50×30mm" },
  { value: "label-60x30",  label: "감열 라벨 60×30mm" },
] as const;

type PaperValue = typeof PAPER_OPTIONS[number]["value"];

interface DeviceBarcodeLabelProps {
  serial: string;
  modelName: string;
  deviceType: "pos" | "label";
  /** 라벨 가로 mm */
  widthMm: number;
  /** 라벨 세로 mm */
  heightMm: number;
}

// ─── 단일 라벨 셀 ─────────────────────────────────────────────
function DeviceBarcodeLabel({ serial, modelName, deviceType, widthMm, heightMm }: DeviceBarcodeLabelProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const isSmall = heightMm <= 30;
  const isTiny = widthMm <= 50 && heightMm <= 30;

  useEffect(() => {
    if (!svgRef.current) return;
    try {
      JsBarcode(svgRef.current, serial, {
        format: "CODE128",
        displayValue: false,
        margin: 0,
        width: isSmall ? 1 : 1.5,
        height: isSmall ? 18 : heightMm >= 60 ? 32 : 24,
        background: "transparent",
      });
    } catch (e) {
      console.warn("JsBarcode error:", e);
    }
  }, [serial, isSmall, heightMm]);

  // 폰트 크기 계산
  const titleSize  = isTiny ? "4.5px" : isSmall ? "5px"  : heightMm >= 60 ? "8px"  : "6px";
  const serialSize = isTiny ? "4px"   : isSmall ? "4.5px": heightMm >= 60 ? "7px"  : "5.5px";
  const noteSize   = isTiny ? "3px"   : isSmall ? "3.5px": heightMm >= 60 ? "5.5px": "4.5px";
  const modelSize  = isTiny ? "3.5px" : isSmall ? "4px"  : heightMm >= 60 ? "6px"  : "5px";

  return (
    <div
      style={{ width: `${widthMm}mm`, height: `${heightMm}mm` }}
      className="flex flex-col items-center justify-between overflow-hidden bg-white"
      // 인쇄 시 테두리 없음, 미리보기에서는 점선
    >
      <div className="w-full flex flex-col items-center" style={{ paddingTop: isTiny ? "1mm" : "1.5mm", paddingLeft: "1.5mm", paddingRight: "1.5mm" }}>
        {/* 브랜드명 */}
        <p style={{ fontSize: titleSize, fontWeight: 900, letterSpacing: "0.05em", lineHeight: 1.1, color: "#111" }} className="text-center">
          FLOXYNC.COM
        </p>
        {!isTiny && (
          <p style={{ fontSize: modelSize, color: "#555", lineHeight: 1.1, marginTop: "0.3mm" }} className="text-center truncate w-full">
            {deviceType === "pos" ? "POS" : "LABEL"} · {modelName}
          </p>
        )}

        {/* 바코드 SVG */}
        <svg
          ref={svgRef}
          style={{
            maxWidth: "100%",
            height: isSmall ? "18mm" : heightMm >= 60 ? "32mm" : "24mm",
            marginTop: isTiny ? "0.3mm" : "0.5mm",
          }}
        />

        {/* 시리얼 번호 텍스트 */}
        <p style={{ fontSize: serialSize, fontFamily: "monospace", fontWeight: 700, lineHeight: 1, color: "#111", marginTop: "0.3mm" }} className="text-center">
          {serial}
        </p>
      </div>

      {/* 하단 안내 문구 */}
      {!isTiny && (
        <div
          style={{
            fontSize: noteSize,
            color: "#444",
            textAlign: "center",
            lineHeight: 1.3,
            borderTop: "0.3pt solid #ccc",
            paddingTop: "0.5mm",
            paddingBottom: "1mm",
            paddingLeft: "1mm",
            paddingRight: "1mm",
            width: "100%",
          }}
        >
          <span style={{ fontWeight: 700, color: "#c00" }}>본사 자산입니다</span>
          {heightMm >= 40 && (
            <>
              <br />분실·파손·고장 시 즉시 신고하여 주십시오
              <br /><span style={{ color: "#888" }}>Tel. 010-2908-5459</span>
            </>
          )}
        </div>
      )}
      {isTiny && (
        <p style={{ fontSize: "3px", color: "#c00", fontWeight: 700, paddingBottom: "0.5mm" }} className="text-center">
          본사자산 · 분실신고
        </p>
      )}
    </div>
  );
}

// ─── 메인 다이얼로그 ──────────────────────────────────────────
interface DeviceBarcodePrintDialogProps {
  open: boolean;
  onClose: () => void;
  devices: { id: string; serial_number: string; model_name: string; device_type: "pos" | "label" }[];
}

export function DeviceBarcodePrintDialog({ open, onClose, devices }: DeviceBarcodePrintDialogProps) {
  const [paperType, setPaperType] = useState<PaperValue>("formtec-3108");
  const [startCell, setStartCell] = useState(1);
  const printRef = useRef<HTMLDivElement>(null);

  const config = getLabelSheetConfig(paperType);
  const isThermal = config.isThermal ?? false;
  const totalCells = config.cells;

  // 인쇄할 기기 목록 (페이지 처리)
  const filledCells: (typeof devices[0] | null)[] = [];
  if (isThermal) {
    devices.forEach(d => filledCells.push(d));
  } else {
    // A4: startCell-1 만큼 빈칸 앞에 채우고 나머지 기기
    for (let i = 0; i < startCell - 1; i++) filledCells.push(null);
    devices.forEach(d => filledCells.push(d));
    // 마지막 페이지 나머지 빈칸
    while (filledCells.length % totalCells !== 0) filledCells.push(null);
  }

  const handlePrint = () => {
    if (!printRef.current) return;
    const html = printRef.current.innerHTML;
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;

    const pageStyle = isThermal
      ? `@page { size: ${config.pageWidthMm}mm ${config.pageHeightMm}mm; margin: 0; }`
      : `@page { size: A4; margin: 0; }`;

    w.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          ${pageStyle}
          * { box-sizing: border-box; }
          html, body { margin: 0; padding: 0; background: white; }
          .print-sheet {
            width: ${config.pageWidthMm}mm;
            height: ${config.pageHeightMm}mm;
            padding-top: ${config.marginTopMm}mm;
            padding-bottom: ${config.marginBottomMm}mm;
            padding-left: ${config.marginLeftMm}mm;
            padding-right: ${config.marginRightMm}mm;
            display: grid;
            grid-template-columns: repeat(${config.cols}, ${config.labelWidthMm}mm);
            grid-template-rows: repeat(${config.rows}, ${config.labelHeightMm}mm);
            column-gap: ${config.hGapMm}mm;
            row-gap: ${config.vGapMm}mm;
            page-break-after: always;
          }
          .label-cell {
            width: ${config.labelWidthMm}mm;
            height: ${config.labelHeightMm}mm;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
          }
          @media print {
            .no-print { display: none !important; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>${html}</body>
      </html>
    `);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 600);
  };

  // 미리보기 스케일 계산
  const previewScale = isThermal ? 2.5 : 0.55;
  const sheetW = isThermal ? config.pageWidthMm : A4_WIDTH_MM;
  const sheetH = isThermal ? config.pageHeightMm : A4_HEIGHT_MM;

  // 페이지 나누기
  const pages: (typeof devices[0] | null)[][] = [];
  if (isThermal) {
    filledCells.forEach(cell => pages.push([cell]));
  } else {
    for (let i = 0; i < filledCells.length; i += totalCells) {
      pages.push(filledCells.slice(i, i + totalCells));
    }
  }
  if (pages.length === 0) pages.push([]);

  const [previewPage, setPreviewPage] = useState(0);
  const currentPage = pages[previewPage] ?? [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-600" />
            바코드 라벨 출력 — {devices.length}대
          </DialogTitle>
        </DialogHeader>

        {/* 옵션 행 */}
        <div className="flex flex-wrap gap-4 items-end py-2 border-b border-slate-100">
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">용지 선택</Label>
            <Select value={paperType} onValueChange={v => { setPaperType(v as PaperValue); setStartCell(1); setPreviewPage(0); }}>
              <SelectTrigger className="w-64 h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAPER_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isThermal && (
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">시작 위치 (칸 번호)</Label>
              <Select value={String(startCell)} onValueChange={v => { setStartCell(Number(v)); setPreviewPage(0); }}>
                <SelectTrigger className="w-24 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: totalCells }, (_, i) => i + 1).map(n => (
                    <SelectItem key={n} value={String(n)} className="text-xs">{n}번째 칸</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            {pages.length > 1 && (
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <button onClick={() => setPreviewPage(p => Math.max(0, p - 1))} disabled={previewPage === 0}
                  className="p-1 hover:bg-slate-100 rounded disabled:opacity-30">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {previewPage + 1} / {pages.length}
                <button onClick={() => setPreviewPage(p => Math.min(pages.length - 1, p + 1))} disabled={previewPage === pages.length - 1}
                  className="p-1 hover:bg-slate-100 rounded disabled:opacity-30">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
            <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white h-9 text-xs">
              <Printer className="w-4 h-4 mr-1.5" />인쇄
            </Button>
          </div>
        </div>

        {/* ── 미리보기 ── */}
        <div className="flex justify-center overflow-auto py-2 bg-slate-100 rounded-lg min-h-[300px]">
          <div
            style={{
              transform: `scale(${previewScale})`,
              transformOrigin: "top center",
              width: `${sheetW}mm`,
              height: isThermal ? undefined : `${sheetH}mm`,
              marginBottom: isThermal ? `${-sheetH * previewScale * 0.3}mm` : undefined,
            }}
          >
            {isThermal ? (
              // 감열: 기기당 1장씩
              <div
                style={{
                  width: `${config.pageWidthMm}mm`,
                  height: `${config.pageHeightMm}mm`,
                  outline: "1px dashed #ccc",
                  background: "white",
                }}
              >
                {currentPage[0] && (
                  <DeviceBarcodeLabel
                    serial={currentPage[0].serial_number}
                    modelName={currentPage[0].model_name}
                    deviceType={currentPage[0].device_type}
                    widthMm={config.labelWidthMm}
                    heightMm={config.labelHeightMm}
                  />
                )}
              </div>
            ) : (
              // A4 그리드
              <div
                style={{
                  width: `${A4_WIDTH_MM}mm`,
                  height: `${A4_HEIGHT_MM}mm`,
                  paddingTop: `${config.marginTopMm}mm`,
                  paddingBottom: `${config.marginBottomMm}mm`,
                  paddingLeft: `${config.marginLeftMm}mm`,
                  paddingRight: `${config.marginRightMm}mm`,
                  display: "grid",
                  gridTemplateColumns: `repeat(${config.cols}, ${config.labelWidthMm}mm)`,
                  gridTemplateRows: `repeat(${config.rows}, ${config.labelHeightMm}mm)`,
                  columnGap: `${config.hGapMm}mm`,
                  rowGap: `${config.vGapMm}mm`,
                  background: "white",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                }}
              >
                {currentPage.map((cell, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: `${config.labelWidthMm}mm`,
                      height: `${config.labelHeightMm}mm`,
                      border: "0.5px dashed #d0d0d0",
                      overflow: "hidden",
                    }}
                  >
                    {cell && (
                      <DeviceBarcodeLabel
                        serial={cell.serial_number}
                        modelName={cell.model_name}
                        deviceType={cell.device_type}
                        widthMm={config.labelWidthMm}
                        heightMm={config.labelHeightMm}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 인쇄용 숨김 DOM */}
        <div className="hidden">
          <div ref={printRef}>
            {pages.map((page, pi) => (
              isThermal ? (
                page.map((cell, ci) => cell && (
                  <div key={`${pi}-${ci}`} className="label-cell" style={{ width: `${config.labelWidthMm}mm`, height: `${config.labelHeightMm}mm` }}>
                    <DeviceBarcodeLabel
                      serial={cell.serial_number}
                      modelName={cell.model_name}
                      deviceType={cell.device_type}
                      widthMm={config.labelWidthMm}
                      heightMm={config.labelHeightMm}
                    />
                  </div>
                ))
              ) : (
                <div key={pi} className="print-sheet">
                  {page.map((cell, ci) => (
                    <div key={ci} className="label-cell">
                      {cell && (
                        <DeviceBarcodeLabel
                          serial={cell.serial_number}
                          modelName={cell.model_name}
                          deviceType={cell.device_type}
                          widthMm={config.labelWidthMm}
                          heightMm={config.labelHeightMm}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
