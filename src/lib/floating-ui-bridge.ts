/** 대시보드 플로팅 UI(퀵챗 등)를 잠시 숨길 때 사용. Android에서 카메라 권한 창이 오버레이로 막히는 경우 완화. */
export const FLORASYNC_FLOATING_UI_EVENT = "florasync-floating-ui" as const;

export type FlorasyncFloatingUiDetail = { suppressOverlays: boolean };

export function setFlorasyncFloatingUiSuppressed(suppress: boolean) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<FlorasyncFloatingUiDetail>(FLORASYNC_FLOATING_UI_EVENT, {
      detail: { suppressOverlays: suppress },
    })
  );
}

/** DOM에서 플로팅이 사라진 뒤 getUserMedia 호출 (권한 다이얼로그와 겹침 완화) */
export function waitForFloatingUiHiddenFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}
