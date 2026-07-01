"use client";

import { useEffect, useState } from "react";
import { isElectronClient } from "@/lib/electron-env";
import { ElectronBackButton } from "@/components/desktop/electron-back-button";

/** Electron titleBarOverlay.height 와 동일 */
export const ELECTRON_TITLE_BAR_HEIGHT = 32;
/** Windows 11 기본 캡션 버튼 영역 */
const CAPTION_BUTTONS_WIDTH = 138;

/** titleBarOverlay.color (electron/main.js) 와 동일 */
export const ELECTRON_TITLE_BAR_BG = "#f1f5f9";

export function ElectronTitleBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(isElectronClient());
  }, []);

  if (!visible) return null;

  return (
    <div
      className="shrink-0 flex items-center justify-between border-b border-slate-200/90 select-none z-[9999]"
      style={{
        height: ELECTRON_TITLE_BAR_HEIGHT,
        backgroundColor: ELECTRON_TITLE_BAR_BG,
        WebkitAppRegion: "drag",
        paddingLeft: 12,
        paddingRight: CAPTION_BUTTONS_WIDTH,
      } as React.CSSProperties}
    >
      <span className="flex items-center gap-2 text-[11px] font-semibold tracking-tight text-slate-600">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
        Floxync Desktop
      </span>
      <ElectronBackButton />
    </div>
  );
}
