"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Printer } from "lucide-react";

interface PayslipPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statementId: string;
  title?: string;
}

export function PayslipPreviewDialog({
  open,
  onOpenChange,
  statementId,
  title = "급여명세서 미리보기",
}: PayslipPreviewDialogProps) {
  const printUrl = `/dashboard/staff/salary/print/${statementId}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-base">{title}</DialogTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(printUrl, "_blank")}
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              새 탭
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const w = window.open(printUrl, "_blank");
                w?.addEventListener("load", () => w.print());
              }}
            >
              <Printer className="w-4 h-4 mr-1" />
              인쇄
            </Button>
          </div>
        </DialogHeader>
        <iframe
          title="급여명세서 미리보기"
          src={open ? printUrl : "about:blank"}
          className="w-full h-[min(75vh,720px)] border-0 bg-white"
        />
      </DialogContent>
    </Dialog>
  );
}
