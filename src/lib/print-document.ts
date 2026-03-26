/**
 * Prints a document by loading its URL into a hidden iframe and calling window.print()
 * This prevents opening a new browser tab/window for the user to manually close.
 */
export function printDocument(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // 1. Create a hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';
    
    // 2. Add iframe to the body
    document.body.appendChild(iframe);
    
    // 3. Set the src to the document URL
    iframe.src = url;
    
    // 4. Handle loading
    iframe.onload = () => {
      // 5. Short delay to ensure rendering is complete
      setTimeout(() => {
        try {
          if (iframe.contentWindow) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            
            // 6. Cleanup after the print dialog is handled (user prints or cancels)
            // Note: In most browsers, print() is blocking
            document.body.removeChild(iframe);
            resolve();
          } else {
            reject(new Error("Could not access iframe content window"));
          }
        } catch (err) {
          reject(err);
        }
      }, 1500);
    };
    
    iframe.onerror = (err) => {
      document.body.removeChild(iframe);
      reject(err);
    };
  });
}
