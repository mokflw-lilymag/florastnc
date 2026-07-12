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
import { getLabelSheetConfig, A4_WIDTH_MM, A4_HEIGHT_MM } from "@/lib/label-sheet-config";
import JsBarcode from "jsbarcode";

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

// ─────────────────────────────────────────────────
//  단일 라벨 셀
// ─────────────────────────────────────────────────
interface LabelProps {
  serial: string;
  modelName: string;
  deviceType: "pos" | "label";
  widthMm: number;
  heightMm: number;
  /** 외곽 테두리 (미리보기용) */
  border?: boolean;
}

function DeviceBarcodeLabel({ serial, modelName, deviceType, widthMm, heightMm, border }: LabelProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  // 세로로 긴 라벨 → 90° 회전하여 가로로 배치
  const isPortrait = heightMm > widthMm;
  // 콘텐츠 실제 작업 영역 (회전 후 기준)
  const cW = isPortrait ? heightMm : widthMm;   // 콘텐츠 가로(mm)
  const cH = isPortrait ? widthMm  : heightMm;  // 콘텐츠 세로(mm)

  // 크기 티어
  const tier = cH <= 26 ? "xs" : cH <= 32 ? "sm" : cH <= 42 ? "md" : cH <= 52 ? "lg" : "xl";

  const FS = {
    xs: { brand: "5.5px", site: "4px",  model: "3.5px", serial: "4px",  note: "3px",  bh: 10 },
    sm: { brand: "6.5px", site: "4.5px",model: "4px",   serial: "4.5px",note: "3.5px",bh: 14 },
    md: { brand: "8px",   site: "5.5px",model: "4.5px", serial: "5.5px",note: "4px",  bh: 18 },
    lg: { brand: "10px",  site: "7px",  model: "5.5px", serial: "7px",  note: "5px",  bh: 24 },
    xl: { brand: "13px",  site: "9px",  model: "7px",   serial: "9px",  note: "6.5px",bh: 32 },
  }[tier];

  const pad = tier === "xs" ? "0.6mm" : tier === "sm" ? "0.8mm" : "1.2mm";

  useEffect(() => {
    if (!svgRef.current) return;
    try {
      JsBarcode(svgRef.current, serial, {
        format: "CODE128",
        displayValue: false,
        margin: 0,
        width: tier === "xs" ? 1 : tier === "sm" ? 1 : 1.2,
        height: FS.bh * 3.78, // mm → approx px (96dpi)
        background: "transparent",
      });
      // 너비를 100% 채우도록 강제
      svgRef.current.removeAttribute("width");
      svgRef.current.style.width = "100%";
      svgRef.current.style.display = "block";
    } catch (e) {
      console.warn("JsBarcode:", e);
    }
  }, [serial, tier, FS.bh]);

  const outerStyle: React.CSSProperties = {
    width: `${widthMm}mm`,
    height: `${heightMm}mm`,
    overflow: "hidden",
    position: "relative",
    background: "white",
    border: border ? "0.5px dashed #ccc" : "none",
    boxSizing: "border-box",
  };

  const innerStyle: React.CSSProperties = {
    width: `${cW}mm`,
    height: `${cH}mm`,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: pad,
    boxSizing: "border-box",
    background: "white",
    ...(isPortrait
      ? {
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%) rotate(90deg)",
        }
      : {}),
  };

  return (
    <div style={outerStyle}>
      <div style={innerStyle}>
        {/* ① 헤더: 브랜드명(크게) + 회사명(작게) */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", lineHeight: 1 }}>
          <span style={{ fontSize: FS.brand, fontWeight: 900, letterSpacing: "0.04em", color: "#000" }}>
            FLOXYNC.COM
          </span>
          <span style={{ fontSize: FS.site, fontWeight: 600, color: "#666", letterSpacing: "0.02em" }}>
            LILYMAG LAB
          </span>
        </div>

        {/* ② 기종 (xs 제외) */}
        {tier !== "xs" && (
          <p style={{ fontSize: FS.model, color: "#555", lineHeight: 1, margin: 0 }}>
            {deviceType === "pos" ? "POS" : "LABEL"} · {modelName}
          </p>
        )}

        {/* ③ 바코드 + 시리얼 (바로 붙여서) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <svg ref={svgRef} />
          <p style={{
            fontSize: FS.serial,
            fontFamily: "monospace",
            fontWeight: 700,
            textAlign: "center",
            lineHeight: 1,
            margin: 0,
            color: "#111",
          }}>
            {serial}
          </p>
        </div>

        {/* ④ 하단 안내 */}
        <p style={{
          fontSize: FS.note,
          color: "#cc0000",
          fontWeight: 700,
          lineHeight: 1.3,
          margin: 0,
          borderTop: "0.3pt solid #ddd",
          paddingTop: "0.4mm",
        }}>
          LILYMAG LAB 의 자산입니다. 분실, 파손 고장시 연락주세요.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
//  인쇄용 HTML 문자열 생성 헬퍼
// ─────────────────────────────────────────────────
function buildPrintHtml(
  pages: (DeviceItem | null)[][],
  config: ReturnType<typeof getLabelSheetConfig>,
  isThermal: boolean,
): string {
  const { labelWidthMm: lw, labelHeightMm: lh } = config;
  const isPortrait = lh > lw;
  const cW = isPortrait ? lh : lw;
  const cH = isPortrait ? lw : lh;
  const tier = cH <= 26 ? "xs" : cH <= 32 ? "sm" : cH <= 42 ? "md" : cH <= 52 ? "lg" : "xl";
  const FS = {
    xs: { brand: "5.5px", site: "4px",  model: "3.5px", serial: "4px",  note: "3px",  bh: 10 },
    sm: { brand: "6.5px", site: "4.5px",model: "4px",   serial: "4.5px",note: "3.5px",bh: 14 },
    md: { brand: "8px",   site: "5.5px",model: "4.5px", serial: "5.5px",note: "4px",  bh: 18 },
    lg: { brand: "10px",  site: "7px",  model: "5.5px", serial: "7px",  note: "5px",  bh: 24 },
    xl: { brand: "13px",  site: "9px",  model: "7px",   serial: "9px",  note: "6.5px",bh: 32 },
  }[tier];
  const pad = tier === "xs" ? "0.6mm" : tier === "sm" ? "0.8mm" : "1.2mm";

  const pageStyle = isThermal
    ? `@page { size: ${config.pageWidthMm}mm ${config.pageHeightMm}mm; margin:0; }`
    : `@page { size: A4 portrait; margin:0; }`;

  const sheets = pages.map(page => {
    const cells = isThermal
      ? page.filter(Boolean).map(cell => cell ? singleLabelHtml(cell, lw, lh, isPortrait, cW, cH, pad, FS) : "").join("")
      : `<div class="sheet">
          ${page.map(cell => cell
            ? `<div class="cell">${singleLabelHtml(cell, lw, lh, isPortrait, cW, cH, pad, FS)}</div>`
            : `<div class="cell"></div>`
          ).join("")}
        </div>`;
    return cells;
  }).join("");

  const sheetCss = isThermal ? "" : `
    .sheet {
      width: ${A4_WIDTH_MM}mm; height: ${A4_HEIGHT_MM}mm;
      padding: ${config.marginTopMm}mm ${config.marginRightMm}mm ${config.marginBottomMm}mm ${config.marginLeftMm}mm;
      display: grid;
      grid-template-columns: repeat(${config.cols}, ${lw}mm);
      grid-template-rows: repeat(${config.rows}, ${lh}mm);
      column-gap: ${config.hGapMm}mm;
      row-gap: ${config.vGapMm}mm;
      box-sizing: border-box;
      page-break-after: always;
    }
    .cell { width:${lw}mm; height:${lh}mm; overflow:hidden; box-sizing:border-box; }
  `;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3/dist/JsBarcode.all.min.js"></script>
    <style>
      ${pageStyle}
      * { box-sizing:border-box; margin:0; padding:0; }
      html,body { background:white; }
      .label-outer { width:${lw}mm; height:${lh}mm; overflow:hidden; position:relative; background:white; }
      .label-inner {
        width:${cW}mm; height:${cH}mm;
        display:flex; flex-direction:column; justify-content:space-between;
        padding:${pad};
        ${isPortrait ? `position:absolute; top:50%; left:50%; transform:translate(-50%,-50%) rotate(90deg);` : ""}
      }
      .hdr { display:flex; justify-content:space-between; align-items:baseline; line-height:1; }
      .brand { font-size:${FS.brand}; font-weight:900; letter-spacing:0.04em; }
      .site  { font-size:${FS.site};  font-weight:600; color:#666; }
      .model { font-size:${FS.model}; color:#555; line-height:1; ${tier === "xs" ? "display:none;" : ""} }
      .bc-wrap { display:flex; flex-direction:column; gap:0; }
      .bc-wrap svg { width:100%; display:block; }
      .serial { font-size:${FS.serial}; font-family:monospace; font-weight:700; text-align:center; line-height:1; }
      .note { font-size:${FS.note}; color:#cc0000; font-weight:700; line-height:1.3; border-top:0.3pt solid #ddd; padding-top:0.4mm; }
      @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
      ${sheetCss}
    </style>
  </head>
  <body>
    ${sheets}
    <script>
      window.addEventListener('load', function() {
        document.querySelectorAll('svg[data-serial]').forEach(function(el) {
          try {
            JsBarcode(el, el.getAttribute('data-serial'), {
              format:'CODE128', displayValue:false, margin:0,
              width:${tier === "xs" ? 1 : tier === "sm" ? 1 : 1.2},
              height:${FS.bh * 3.78},
              background:'transparent'
            });
            el.removeAttribute('width');
            el.style.width='100%';
            el.style.display='block';
          } catch(e) {}
        });
        setTimeout(function(){ window.print(); }, 800);
      });
    </script>
  </body></html>`;
}

interface DeviceItem {
  id: string;
  serial_number: string;
  model_name: string;
  device_type: "pos" | "label";
}

function singleLabelHtml(
  cell: DeviceItem,
  lw: number, lh: number,
  isPortrait: boolean, cW: number, cH: number,
  pad: string,
  FS: { brand:string; site:string; model:string; serial:string; note:string; bh:number },
): string {
  const tier = cH <= 26 ? "xs" : "?";
  const hideModel = cH <= 26;
  return `
    <div class="label-outer">
      <div class="label-inner">
        <div class="hdr">
          <span class="brand">FLOXYNC.COM</span>
          <span class="site">LILYMAG LAB</span>
        </div>
        ${hideModel ? "" : `<p class="model">${cell.device_type === "pos" ? "POS" : "LABEL"} · ${cell.model_name}</p>`}
        <div class="bc-wrap">
          <svg data-serial="${cell.serial_number}"></svg>
          <p class="serial">${cell.serial_number}</p>
        </div>
        <p class="note">LILYMAG LAB 의 자산입니다. 분실, 파손 고장시 연락주세요.</p>
      </div>
    </div>`;
}

// ─────────────────────────────────────────────────
//  메인 다이얼로그
// ─────────────────────────────────────────────────
interface Props {
  open: boolean;
  onClose: () => void;
  devices: DeviceItem[];
}

export function DeviceBarcodePrintDialog({ open, onClose, devices }: Props) {
  const [paperType, setPaperType] = useState<PaperValue>("formtec-3108");
  const [startCell, setStartCell] = useState(1);
  const [previewPage, setPreviewPage] = useState(0);

  const config = getLabelSheetConfig(paperType);
  const isThermal = config.isThermal ?? false;
  const totalCells = config.cells;

  // 페이지 배열 계산
  const filledCells: (DeviceItem | null)[] = [];
  if (isThermal) {
    devices.forEach(d => filledCells.push(d));
  } else {
    for (let i = 0; i < startCell - 1; i++) filledCells.push(null);
    devices.forEach(d => filledCells.push(d));
    while (filledCells.length % totalCells !== 0) filledCells.push(null);
  }

  const pages: (DeviceItem | null)[][] = [];
  if (isThermal) {
    filledCells.forEach(c => pages.push([c]));
  } else {
    for (let i = 0; i < filledCells.length; i += totalCells) {
      pages.push(filledCells.slice(i, i + totalCells));
    }
  }
  if (pages.length === 0) pages.push([null]);

  const currentPage = pages[Math.min(previewPage, pages.length - 1)] ?? [];

  const handlePrint = () => {
    const html = buildPrintHtml(pages, config, isThermal);
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    w.document.write(html);
    w.document.close();
  };

  const lw = config.labelWidthMm;
  const lh = config.labelHeightMm;
  const previewScale = isThermal
    ? Math.min(200 / lw, 250 / lh)
    : 0.52;

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
              <SelectTrigger className="w-64 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAPER_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isThermal && (
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">시작 칸 번호</Label>
              <Select value={String(startCell)} onValueChange={v => { setStartCell(Number(v)); setPreviewPage(0); }}>
                <SelectTrigger className="w-24 h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: totalCells }, (_, i) => i + 1).map(n => (
                    <SelectItem key={n} value={String(n)} className="text-xs">{n}번째</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            {pages.length > 1 && (
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <button onClick={() => setPreviewPage(p => Math.max(0, p - 1))} disabled={previewPage === 0}
                  className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                {previewPage + 1} / {pages.length}
                <button onClick={() => setPreviewPage(p => Math.min(pages.length - 1, p + 1))} disabled={previewPage === pages.length - 1}
                  className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
              </div>
            )}
            <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white h-9 text-xs">
              <Printer className="w-4 h-4 mr-1.5" />인쇄
            </Button>
          </div>
        </div>

        {/* 미리보기 */}
        <div className="flex justify-center overflow-auto py-4 bg-slate-100 rounded-lg min-h-[320px]">
          <div style={{
            transform: `scale(${previewScale})`,
            transformOrigin: "top center",
            width: isThermal ? `${lw}mm` : `${A4_WIDTH_MM}mm`,
            marginBottom: isThermal ? `-${lh * previewScale * 0.4}mm` : undefined,
          }}>
            {isThermal ? (
              <div style={{ width: `${lw}mm`, height: `${lh}mm`, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
                {currentPage[0] && (
                  <DeviceBarcodeLabel
                    serial={currentPage[0].serial_number}
                    modelName={currentPage[0].model_name}
                    deviceType={currentPage[0].device_type}
                    widthMm={lw} heightMm={lh} border
                  />
                )}
              </div>
            ) : (
              <div style={{
                width: `${A4_WIDTH_MM}mm`, height: `${A4_HEIGHT_MM}mm`,
                paddingTop: `${config.marginTopMm}mm`,
                paddingBottom: `${config.marginBottomMm}mm`,
                paddingLeft: `${config.marginLeftMm}mm`,
                paddingRight: `${config.marginRightMm}mm`,
                display: "grid",
                gridTemplateColumns: `repeat(${config.cols}, ${lw}mm)`,
                gridTemplateRows: `repeat(${config.rows}, ${lh}mm)`,
                columnGap: `${config.hGapMm}mm`,
                rowGap: `${config.vGapMm}mm`,
                background: "white",
                boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
              }}>
                {currentPage.map((cell, idx) => (
                  <div key={idx} style={{ width: `${lw}mm`, height: `${lh}mm`, overflow: "hidden" }}>
                    {cell && (
                      <DeviceBarcodeLabel
                        serial={cell.serial_number}
                        modelName={cell.model_name}
                        deviceType={cell.device_type}
                        widthMm={lw} heightMm={lh} border
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
