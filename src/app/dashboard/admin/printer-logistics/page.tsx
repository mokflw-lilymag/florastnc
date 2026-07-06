import { Suspense } from "react";
import { PrinterLogisticsClient } from "./components/printer-logistics-client";
import { Loader2 } from "lucide-react";

export default function PrinterLogisticsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>}>
      <PrinterLogisticsClient />
    </Suspense>
  );
}
