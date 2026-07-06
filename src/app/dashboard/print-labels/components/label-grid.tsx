"use client";
import { LabelItem, LabelItemData } from "./label-item";
import { PaperPreset } from "./paper-presets";

interface LabelGridProps {
  items: (LabelItemData | null)[];
  preset: PaperPreset;
}

export function LabelGrid({ items, preset }: LabelGridProps) {
  const isRoll = preset.type === 'roll';
  
  if (isRoll) {
    return (
      <div id="label-grid-container" className="flex flex-col w-full">
        {items.map((item, index) =>
          item ? (
            <div key={index} className="roll-page-break bg-white" style={{ height: preset.height, width: preset.width }}>
              <LabelItem item={item} preset={preset} />
            </div>
          ) : null
        )}
      </div>
    );
  }

  return (
    <div 
      id="label-grid-container" 
      className="grid h-full"
      style={{
        gridTemplateColumns: `repeat(${preset.columns}, minmax(0, 1fr))`,
        columnGap: preset.gapX,
        rowGap: preset.gapY
      }}
    >
      {items.map((item, index) =>
        item ? (
          <LabelItem key={index} item={item} preset={preset} />
        ) : (
          <div 
            key={index} 
            className="bg-transparent border border-dashed border-gray-200 print:border-transparent"
            style={{ height: preset.itemHeight }}
          ></div>
        )
      )}
    </div>
  );
}
