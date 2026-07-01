"use client";

import type { ReactNode } from "react";
import { ElectronAppFrame } from "@/components/desktop/electron-app-frame";

export function LocaleElectronFrame({ children }: { children: ReactNode }) {
  return <ElectronAppFrame>{children}</ElectronAppFrame>;
}
