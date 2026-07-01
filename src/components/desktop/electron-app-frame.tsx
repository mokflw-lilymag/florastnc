"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { ElectronTitleBar } from "@/components/desktop/electron-title-bar";
import { isElectronClient } from "@/lib/electron-env";

/** 로그인 등 대시보드 밖 Electron 화면 — 타이틀 바 + 본문 */
export function ElectronAppFrame({ children }: { children: ReactNode }) {
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    setIsElectron(isElectronClient());
  }, []);

  if (!isElectron) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <ElectronTitleBar />
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </div>
  );
}
