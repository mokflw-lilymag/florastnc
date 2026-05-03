"use client";
import { getMessages } from "@/i18n/getMessages";

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FONT_CATALOG } from "@/lib/font-catalog";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";

interface LabelGridSelectorProps {
    labelType: string;
    selectedPositions: number[];
    onPositionToggle: (position: number) => void;
    onSelectAll: () => void;
    onClearAll: () => void;
    onSelectFirst: () => void;
    messageContent: string;
    senderName: string;
    messageFont: string;
    messageFontSize: number;
    senderFont: string;
    senderFontSize: number;
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
}> = {
    'formtec-3107': {
        rows: 3, cols: 2,
        width: 99.1, height: 93.1,
        marginTop: 8.5, marginBottom: 8.5, marginLeft: 5.0, marginRight: 5.0,
        hGap: 2.0, vGap: 0
    },
    'formtec-3108': {
        rows: 4, cols: 2,
        width: 99.1, height: 67.7,
        marginTop: 13.0, marginBottom: 14.0, marginLeft: 5.0, marginRight: 5.0,
        hGap: 2.0, vGap: 0
    },
    'formtec-3109': {
        rows: 6, cols: 2,
        width: 99.1, height: 45.0,
        marginTop: 11.0, marginBottom: 16.0, marginLeft: 5.0, marginRight: 5.0,
        hGap: 2.0, vGap: 0
    },
};

export function LabelGridSelector({
    labelType,
    selectedPositions,
    onPositionToggle,
    onSelectAll,
    onClearAll,
    onSelectFirst,
    messageContent,
    senderName,
    messageFont,
    messageFontSize,
    senderFont,
    senderFontSize
}: LabelGridSelectorProps) {
    const locale = usePreferredLocale();
    const tf = getMessages(locale).tenantFlows;
    const spec = LABEL_SPECS[labelType] || LABEL_SPECS['formtec-3108'];
    const SCALE = 0.6;
    const displayWidth = 210 * SCALE;
    const displayHeight = 297 * SCALE;

    return (
        <div className="flex flex-col gap-4 w-full h-full min-h-0">
            <div className="flex justify-between items-center">
                {FONT_CATALOG.map((font, i) => (
                    <link key={i} rel="stylesheet" href={font.url} />
                ))}
                <Label className="font-semibold">{tf.f00173}</Label>
                <div className="flex gap-1">
                    <Button variant="outline" size="xs" onClick={onSelectFirst}>{tf.f00681}</Button>
                    <Button variant="outline" size="xs" onClick={onSelectAll}>{tf.f00553}</Button>
                    <Button variant="outline" size="xs" onClick={onClearAll}>{tf.f00768}</Button>
                </div>
            </div>

            <div className="flex-1 border rounded-md bg-gray-100 p-4 flex justify-center overflow-auto min-h-0">
                <div
                    className="bg-white shadow-lg relative transition-all duration-300 ease-in-out shrink-0"
                    style={{
                        width: `${displayWidth}mm`,
                        height: `${displayHeight}mm`,
                        paddingTop: `${spec.marginTop * SCALE}mm`,
                        paddingBottom: `${spec.marginBottom * SCALE}mm`,
                        paddingLeft: `${spec.marginLeft * SCALE}mm`,
                        paddingRight: `${spec.marginRight * SCALE}mm`,
                        display: 'grid',
                        gridTemplateColumns: `repeat(${spec.cols}, 1fr)`,
                        gridTemplateRows: `repeat(${spec.rows}, 1fr)`,
                        columnGap: `${spec.hGap * SCALE}mm`,
                        rowGap: `${spec.vGap * SCALE}mm`,
                    }}
                >
                    {Array.from({ length: spec.rows * spec.cols }).map((_, idx) => {
                        const position = idx + 1;
                        const isSelected = selectedPositions.includes(position);

                        return (
                            <div
                                key={position}
                                onClick={() => onPositionToggle(position)}
                                className={cn(
                                    "relative border cursor-pointer hover:border-primary transition-colors flex flex-col justify-center items-center text-center overflow-hidden select-none",
                                    isSelected ? "border-blue-500 bg-white" : "border-gray-200 bg-gray-50 opacity-40 hover:opacity-70"
                                )}
                            >
                                {isSelected ? (
                                    <div className="w-full h-full p-1 flex flex-col items-center justify-center relative">
                                        <div
                                            className="whitespace-pre-wrap flex-1 flex items-center justify-center w-full"
                                            style={{
                                                fontFamily: `'${messageFont}'`,
                                                fontSize: `${messageFontSize * SCALE}pt`,
                                                lineHeight: 1.2,
                                                wordBreak: 'break-word',
                                            }}
                                        >
                                            {messageContent || <span className="text-gray-300 italic text-[6px]">{tf.f00134}</span>}
                                        </div>
                                        {senderName && (
                                            <div
                                                className="mt-0.5"
                                                style={{
                                                    fontFamily: `'${senderFont}'`,
                                                    fontSize: `${senderFontSize * SCALE}pt`,
                                                }}
                                            >
                                                {senderName}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <span className="text-gray-300 font-bold text-sm">{position}</span>
                                )}
                                {isSelected && (
                                    <div className="absolute top-0.5 left-0.5 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center text-white text-[8px]">
                                        ✓
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
                * {tf.f00422} {Math.round(SCALE * 100)}% {tf.f00698}
            </p>
        </div>
    );
}
