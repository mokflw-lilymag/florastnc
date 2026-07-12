"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getLabelSheetConfig } from "@/lib/label-sheet-config";
import { LabelSheet } from "./label-sheet";

interface LabelGridSelectorProps {
  labelType: string;
  selectedPositions: number[];
  onPositionToggle: (position: number) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onSelectFirst: () => void;
  messageContent: string;
}

const PREVIEW_SCALE = 0.6;

export function LabelGridSelector({
  labelType,
  selectedPositions,
  onPositionToggle,
  onSelectAll,
  onClearAll,
  onSelectFirst,
  messageContent,
}: LabelGridSelectorProps) {
  const config = getLabelSheetConfig(labelType);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Label>
          {config.isThermal ? "라벨 미리보기 (단일 출력)" : "라벨 미리보기 (A4 용지)"}
        </Label>
        {!config.isThermal && (
          <div className="flex gap-2 text-xs">
            <Button variant="outline" size="sm" onClick={onSelectFirst}>첫장만</Button>
            <Button variant="outline" size="sm" onClick={onSelectAll}>전체</Button>
            <Button variant="outline" size="sm" onClick={onClearAll}>해제</Button>
          </div>
        )}
      </div>

      <div className="flex min-h-[300px] items-center justify-center overflow-auto rounded-md border bg-gray-100 p-4">
        <LabelSheet
          labelType={labelType}
          messageContent={messageContent}
          selectedPositions={selectedPositions}
          displayScale={config.isThermal ? 1 : PREVIEW_SCALE}
          interactive={!config.isThermal}
          showCellNumbers
          onCellClick={onPositionToggle}
          className={config.isThermal ? "shadow-md" : "shadow-lg"}
        />
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {config.isThermal
          ? "* 화면에 보이는 크기는 인쇄될 실제 크기와 1:1 비율(100%)입니다."
          : `* 미리보기는 인쇄 레이아웃과 동일하며, 화면에서는 ${Math.round(PREVIEW_SCALE * 100)}% 축소되어 표시됩니다.`}
      </p>
    </div>
  );
}
