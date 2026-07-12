import { PRINT_DOCUMENT_READY_MESSAGE } from "@/lib/print-routes";

const PRINT_TIMEOUT_MS = 60_000;

/**
 * 숨김 iframe에 인쇄 전용 페이지를 로드한 뒤 브라우저 인쇄 대화상자만 띄웁니다.
 * (팝업 창 없음 — 현재 탭 위에 인쇄 UI만 표시)
 */
export function printDocument(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("printDocument is client-only"));
      return;
    }

    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.setAttribute("title", "print");
    Object.assign(iframe.style, {
      position: "fixed",
      left: "-10000px",
      top: "0",
      width: "0",
      height: "0",
      border: "0",
      visibility: "hidden",
    });

    let settled = false;

    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      iframe.remove();
    };

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      cleanup();
      fn();
    };

    const timeoutId = window.setTimeout(() => {
      finish(() => reject(new Error("Print timeout")));
    }, PRINT_TIMEOUT_MS);

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== PRINT_DOCUMENT_READY_MESSAGE) return;

      try {
        const win = iframe.contentWindow;
        if (!win) {
          finish(() => reject(new Error("Print frame not ready")));
          return;
        }

        win.focus();
        win.addEventListener(
          "afterprint",
          () => finish(resolve),
          { once: true },
        );
        win.print();
        // afterprint 미지원 브라우저 대비
        window.setTimeout(() => finish(resolve), 2000);
      } catch (err) {
        finish(() => reject(err instanceof Error ? err : new Error(String(err))));
      }
    };

    iframe.addEventListener("error", () => {
      finish(() => reject(new Error("Failed to load print document")));
    });

    window.addEventListener("message", onMessage);
    document.body.appendChild(iframe);
    iframe.src = url;
  });
}
