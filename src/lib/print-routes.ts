/** 대시보드 크롬(사이드바·헤더) 없이 문서만 보여주는 인쇄 전용 경로 */
export function isBarePrintDocumentPath(pathname: string): boolean {
  return (
    pathname === "/dashboard/customers/print" ||
    pathname.startsWith("/dashboard/print-labels") ||
    pathname.startsWith("/dashboard/orders/print-message") ||
    pathname.startsWith("/dashboard/orders/print-preview")
  );
}

export const PRINT_DOCUMENT_READY_MESSAGE = "PRINT_DOCUMENT_READY" as const;

export function signalPrintDocumentReady(): void {
  if (typeof window === "undefined") return;
  window.parent.postMessage({ type: PRINT_DOCUMENT_READY_MESSAGE }, window.location.origin);
}
