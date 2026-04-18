"use client";

import { useSyncExternalStore } from "react";
import { isCapacitorAndroid } from "@/lib/client-platform";

const MQ = "(max-width: 1023px)";

function subscribe(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia(MQ);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getTouchUiSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MQ).matches || isCapacitorAndroid();
}

/**
 * 좁은 뷰포트(모바일·태블릿 세로) 또는 Capacitor Android일 때 true.
 * 터치 친화 레이아웃·여백에 사용합니다.
 */
export function usePartnerTouchUi(): boolean {
  return useSyncExternalStore(subscribe, getTouchUiSnapshot, () => false);
}
