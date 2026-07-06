"use client";
import { Barcode } from "@/components/barcode";
import { PaperPreset } from "./paper-presets";

export interface LabelItemData {
  id: string;
  name: string;
  barcode: string; // UUID 대신 짧은 바코드 코드 (material_code 또는 M+8자리)
}

interface LabelItemProps {
  item: LabelItemData;
  preset: PaperPreset;
}

export function LabelItem({ item, preset }: LabelItemProps) {
  const isRoll = preset.type === 'roll';

  return (
    <div
      className="bg-white flex flex-col items-center justify-center text-center overflow-hidden"
      style={{ height: preset.itemHeight, padding: isRoll ? '1px' : '4px' }}
    >
      <div className="flex justify-center w-full max-w-full overflow-hidden">
        <Barcode
          value={item.barcode}
          options={{
            format: "CODE128",
            displayValue: false,
            width: isRoll ? 1.5 : 2,
            height: isRoll ? 28 : 50,
            margin: 2
          }}
        />
      </div>
      <p className="text-[10px] font-bold mt-0.5 leading-none tracking-wider">{item.barcode}</p>
      <p className="text-xs font-bold leading-tight line-clamp-1 max-w-full px-1">{item.name}</p>
    </div>
  );
}
