"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import {
  formatMessageHtml,
  getLabelSheetConfig,
} from "@/lib/label-sheet-config";
import { getActiveFontItems } from "@/lib/font-catalog";

interface LabelSheetProps {
  labelType: string;
  messageContent: string;
  selectedPositions: number[];
  /** 화면 미리보기용 축소 비율. 인쇄는 1 */
  displayScale?: number;
  interactive?: boolean;
  showCellNumbers?: boolean;
  onCellClick?: (position: number) => void;
  className?: string;
  id?: string;
}

function LabelFontLinks() {
  const fonts = typeof window !== 'undefined' ? getActiveFontItems() : [];

  return (
    <>
      {fonts.map((font) => {
        if (!font.url) return null;
        const isCss = font.url.includes('.css') || font.url.includes('fonts.googleapis.com');
        if (isCss) {
          return <link key={font.family} rel="stylesheet" href={font.url} />;
        }
        return (
          <style
            key={font.family}
            dangerouslySetInnerHTML={{
              __html: `
                @font-face {
                  font-family: '${font.family}';
                  src: url('${font.url}') format('${font.url.endsWith('woff2') ? 'woff2' : 'woff'}');
                  font-display: swap;
                }
              `,
            }}
          />
        );
      })}
    </>
  );
}

export function LabelSheet({
  labelType,
  messageContent,
  selectedPositions,
  displayScale = 1,
  interactive = false,
  showCellNumbers = false,
  onCellClick,
  className,
  id = "label-sheet-print-root",
}: LabelSheetProps) {
  const config = getLabelSheetConfig(labelType);
  const formattedHtml = formatMessageHtml(messageContent);
  const scale = config.isThermal ? 1 : displayScale;

  const sheetStyle: CSSProperties = {
    width: `${config.pageWidthMm}mm`,
    height: `${config.pageHeightMm}mm`,
    paddingTop: `${config.marginTopMm}mm`,
    paddingBottom: `${config.marginBottomMm}mm`,
    paddingLeft: `${config.marginLeftMm}mm`,
    paddingRight: `${config.marginRightMm}mm`,
    display: 'grid',
    gridTemplateColumns: `repeat(${config.cols}, ${config.labelWidthMm}mm)`,
    gridTemplateRows: `repeat(${config.rows}, ${config.labelHeightMm}mm)`,
    columnGap: `${config.hGapMm}mm`,
    rowGap: `${config.vGapMm}mm`,
    boxSizing: 'border-box',
    backgroundColor: 'white',
  };

  const cells = Array.from({ length: config.cells }, (_, index) => {
    const position = index + 1;
    const isSelected = selectedPositions.includes(position) || config.isThermal;
    const showContent = isSelected && formattedHtml;

    return (
      <div
        key={position}
        role={interactive ? "button" : "gridcell"}
        tabIndex={interactive ? 0 : undefined}
        onClick={interactive && onCellClick ? () => onCellClick(position) : undefined}
        onKeyDown={
          interactive && onCellClick
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onCellClick(position);
                }
              }
            : undefined
        }
        className={cn(
          "label-sheet-cell relative flex flex-col items-center justify-center overflow-hidden text-center",
          interactive && !config.isThermal && "cursor-pointer transition-colors",
          interactive && !config.isThermal && (isSelected
            ? "is-selected bg-white opacity-100"
            : "bg-white opacity-75 hover:opacity-90"),
        )}
        style={{
          width: `${config.labelWidthMm}mm`,
          height: `${config.labelHeightMm}mm`,
        }}
      >
        {showContent ? (
          <div
            className="label-cell-content w-full h-full flex flex-col items-center justify-center"
            style={{
              padding: '2mm',
              boxSizing: 'border-box',
              lineHeight: 1.4,
              wordBreak: 'break-word',
              overflow: 'hidden',
            }}
            dangerouslySetInnerHTML={{ __html: formattedHtml }}
          />
        ) : showCellNumbers ? (
          <span className="text-slate-400 font-bold text-xl">{position}</span>
        ) : null}

        {interactive && isSelected && !config.isThermal && (
          <div className="absolute top-1 left-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] text-white">
            ✓
          </div>
        )}
      </div>
    );
  });

  const sheet = (
    <div
      id={id}
      className={cn(
        "label-sheet-print-root bg-white",
        interactive && !config.isThermal && "label-sheet-preview",
        className,
      )}
      style={sheetStyle}
      role="grid"
    >
      {cells}
    </div>
  );

  const previewGuideCss = `
    .label-cell-content p { margin: 0; }
    .label-cell-content strong { font-weight: 700; }
    .label-cell-content em { font-style: italic; }
    .label-cell-content u { text-decoration: underline; }

    /* 화면 미리보기: 칸 사이 간격·용지 외곽 가이드 (인쇄 제외) */
    .label-sheet-preview {
      outline: 2px solid #64748b;
      outline-offset: 0;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
      background-color: #94a3b8 !important;
    }
    .label-sheet-preview .label-sheet-cell {
      box-shadow: inset 0 0 0 1px #475569;
    }
    .label-sheet-preview .label-sheet-cell.is-selected {
      box-shadow: inset 0 0 0 2px #2563eb;
    }

    @media print {
      .label-sheet-preview {
        outline: none !important;
        box-shadow: none !important;
        background-color: white !important;
      }
      .label-sheet-preview .label-sheet-cell,
      .label-sheet-cell {
        border: none !important;
        box-shadow: none !important;
        opacity: 1 !important;
      }
    }
  `;

  if (scale === 1) {
    return (
      <>
        <LabelFontLinks />
        <style dangerouslySetInnerHTML={{ __html: previewGuideCss }} />
        {sheet}
      </>
    );
  }

  return (
    <>
      <LabelFontLinks />
      <style dangerouslySetInnerHTML={{ __html: previewGuideCss }} />
      <div
        style={{
          width: `${config.pageWidthMm * scale}mm`,
          height: `${config.pageHeightMm * scale}mm`,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width: `${config.pageWidthMm}mm`,
            height: `${config.pageHeightMm}mm`,
          }}
        >
          {sheet}
        </div>
      </div>
    </>
  );
}
