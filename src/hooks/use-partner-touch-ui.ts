"use client";

import { useSyncExternalStore } from "react";

const MQ = "(max-width: 1023px)";

function subscribe(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia(MQ);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getTouchUiSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MQ).matches;
}

/** 좁은 뷰포트(모바일·태블릿 세로)일 때 true — 터치 친화 레이아웃에 사용 */
export function usePartnerTouchUi(): boolean {
  return useSyncExternalStore(subscribe, getTouchUiSnapshot, () => false);
}
