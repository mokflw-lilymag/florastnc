"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FONT_CATALOG } from "@/lib/font-catalog";

interface LabelGridSelectorProps {
    labelType: string;
    selectedPositions: number[];
    onPositionToggle: (position: number) => void;
    onSelectAll: () => void;
    onClearAll: () => void;
    onSelectFirst: () => void;
    messageContent: string;
}

const LABEL_SPECS: Record<string, {
    rows: number;
    cols: number;
    width: number;
    height: number;
    marginTop: number;
    marginBottom: number;
    marginLeft: number;
    marginRight: number;
    hGap: number;
    vGap: number;
    isThermal?: boolean;
}> = {
    'formtec-3107': {
        rows: 3, cols: 2,
        width: 99.1, height: 93.1,
        marginTop: 8.5, marginBottom: 8.5, marginLeft: 4.9, marginRight: 4.9,
        hGap: 2.0, vGap: 0
    },
    'formtec-3108': {
        rows: 4, cols: 2,
        width: 99.1, height: 67.7,
        marginTop: 14.0, marginBottom: 12.2, marginLeft: 4.95, marginRight: 4.95,
        hGap: 2.0, vGap: 0
    },
    'formtec-3109': {
        rows: 6, cols: 2,
        width: 99.1, height: 45.0,
        marginTop: 13.5, marginBottom: 13.5, marginLeft: 4.9, marginRight: 4.9,
        hGap: 2.0, vGap: 0
    },
    'formtec-3105': {
        rows: 5, cols: 3,
        width: 63.5, height: 38.1,
        marginTop: 14.5, marginBottom: 14.5, marginLeft: 7.2, marginRight: 7.2,
        hGap: 0, vGap: 0
    },
    'label-90x60': {
        rows: 1, cols: 1,
        width: 90, height: 60,
        marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0,
        hGap: 0, vGap: 0,
        isThermal: true
    },
    'label-90x90': {
        rows: 1, cols: 1,
        width: 90, height: 90,
        marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0,
        hGap: 0, vGap: 0,
        isThermal: true
    },
};

export function LabelGridSelector({
    labelType,
    selectedPositions,
    onPositionToggle,
    onSelectAll,
    onClearAll,
    onSelectFirst,
    messageContent
}: LabelGridSelectorProps) {

    const spec = LABEL_SPECS[labelType] || LABEL_SPECS['formtec-3108'];

    const SCALE = 0.6;
    const displayWidth = 210 * SCALE;
    const displayHeight = 297 * SCALE;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
                {FONT_CATALOG.map((font, i) => {
                    const isCss = font.url.includes('.css') || font.url.includes('fonts.googleapis.com');
                    if (isCss) {
                        return <link key={i} rel="stylesheet" href={font.url} />;
                    }
                    return (
                        <style key={i} dangerouslySetInnerHTML={{
                            __html: `
                                @font-face {
                                    font-family: '${font.family}';
                                    src: url('${font.url}') format('${font.url.endsWith('woff2') ? 'woff2' : 'woff'}');
                                    font-display: swap;
                                }
                            `
                        }} />
                    );
                })}

                <Label>{spec.isThermal ? '라벨 미리보기 (단일 출력)' : '라벨 미리보기 (A4 용지)'}</Label>
                {!spec.isThermal && (
                    <div className="flex gap-2 text-xs">
                        <Button variant="outline" size="sm" onClick={onSelectFirst}>첫장만</Button>
                        <Button variant="outline" size="sm" onClick={onSelectAll}>전체</Button>
                        <Button variant="outline" size="sm" onClick={onClearAll}>해제</Button>
                    </div>
                )}
            </div>

            <div className="border rounded-md bg-gray-100 p-4 flex justify-center overflow-auto items-center min-h-[300px]">
                <div
                    className={cn(
                        "bg-white relative transition-all duration-300 ease-in-out",
                        spec.isThermal ? "shadow-md" : "shadow-lg"
                    )}
                    style={{
                        width: spec.isThermal ? `${spec.width}mm` : `${displayWidth}mm`,
                        height: spec.isThermal ? `${spec.height}mm` : `${displayHeight}mm`,
                        paddingTop: spec.isThermal ? 0 : `${spec.marginTop * SCALE}mm`,
                        paddingBottom: spec.isThermal ? 0 : `${spec.marginBottom * SCALE}mm`,
                        paddingLeft: spec.isThermal ? 0 : `${spec.marginLeft * SCALE}mm`,
                        paddingRight: spec.isThermal ? 0 : `${spec.marginRight * SCALE}mm`,
                        display: 'grid',
                        gridTemplateColumns: `repeat(${spec.cols}, 1fr)`,
                        gridTemplateRows: `repeat(${spec.rows}, 1fr)`,
                        columnGap: spec.isThermal ? 0 : `${spec.hGap * SCALE}mm`,
                        rowGap: spec.isThermal ? 0 : `${spec.vGap * SCALE}mm`,
                        border: spec.isThermal ? '1px solid #ccc' : 'none',
                    }}
                >
                    {Array.from({ length: spec.rows * spec.cols }).map((_, idx) => {
                        const position = idx + 1;
                        const isSelected = selectedPositions.includes(position) || spec.isThermal;

                        return (
                            <div
                                key={position}
                                onClick={() => onPositionToggle(position)}
                                className={cn(
                                    "relative flex flex-col justify-center items-center text-center overflow-hidden select-none",
                                    spec.isThermal ? "cursor-default border-none" : "border cursor-pointer hover:border-primary transition-colors",
                                    (isSelected || spec.isThermal) ? (spec.isThermal ? "bg-white" : "border-blue-500 bg-white") : "border-gray-200 bg-gray-50 opacity-40 hover:opacity-70"
                                )}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                }}
                            >
                                {isSelected ? (
                                    <div className="w-full h-full p-2 flex flex-col items-center justify-center relative">
                                        <div
                                            className="whitespace-pre-wrap flex-1 flex flex-col items-center justify-center w-full"
                                            style={{
                                                lineHeight: 1.4,
                                                wordBreak: 'break-word',
                                                transform: spec.isThermal ? 'none' : `scale(${SCALE})`,
                                                transformOrigin: 'center center'
                                            }}
                                            dangerouslySetInnerHTML={{
                                                __html: (messageContent.includes('<p>') ? messageContent : messageContent.split('\n').map(line => `<p style="text-align: center">${line}</p>`).join(''))
                                                    .replace(/<p><\/p>/g, '<p><br></p>')
                                                    .replace(/<p([^>]*)><\/p>/g, '<p$1><br></p>')
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <span className="text-gray-300 font-bold text-xl">{position}</span>
                                )}

                                {isSelected && !spec.isThermal && (
                                    <div className="absolute top-1 left-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-[10px]">
                                        ✓
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
                {spec.isThermal 
                    ? "* 화면에 보이는 크기는 인쇄될 실제 크기와 1:1 비율(100%)입니다." 
                    : `* 화면에 보이는 크기는 실제 A4 용지의 약 ${Math.round(SCALE * 100)}% 축소 비율입니다.`}
            </p>
        </div>
    );
}
