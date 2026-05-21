import { PRINT_DOCUMENT_READY_MESSAGE } from "@/lib/print-routes";

/**
 * hidden iframe으로 인쇄 URL을 불러온 뒤, 페이지가 준비되면 print() 호출
 */
export function printDocument(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    iframe.style.visibility = "hidden";
    iframe.setAttribute("aria-hidden", "true");

    let settled = false;

    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(fallbackTimer);
      if (iframe.parentNode) {
        document.body.removeChild(iframe);
      }
    };

    const finish = (action: "resolve" | "reject", err?: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (action === "resolve") resolve();
      else reject(err ?? new Error("print_failed"));
    };

    const triggerPrint = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        finish("resolve");
      } catch (err) {
        finish("reject", err);
      }
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.source !== iframe.contentWindow) return;
      if (event.data?.type !== PRINT_DOCUMENT_READY_MESSAGE) return;
      requestAnimationFrame(triggerPrint);
    };

    window.addEventListener("message", onMessage);

    const fallbackTimer = setTimeout(() => {
      triggerPrint();
    }, 4000);

    iframe.onerror = () => finish("reject", new Error("iframe_load_error"));

    document.body.appendChild(iframe);
    iframe.src = url;
  });
}
