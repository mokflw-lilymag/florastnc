import { PRINT_DOCUMENT_READY_MESSAGE } from "@/lib/print-routes";

export function printDocument(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const width = 850;
      const height = Math.min(1000, window.screen.height - 100);
      const left = (window.screen.width / 2) - (width / 2);
      const top = (window.screen.height / 2) - (height / 2);
      
      const popup = window.open(url, "_blank", `width=${width},height=${height},top=${top},left=${left},menubar=no,toolbar=no,location=no,status=no`);
      
      if (!popup) {
        console.warn("Popup blocked, trying to navigate in same window");
        window.location.href = url;
      }
      
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}
