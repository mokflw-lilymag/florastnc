"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Printer } from "lucide-react";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";

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
  title: propTitle,
}: PayslipPreviewDialogProps) {
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const title = propTitle || pickUiText(baseLocale, "급여명세서 미리보기", "Pay stub preview", "Xem trước cuống phiếu lương", "給与明細のプレビュー", "工资单预览", "薪資預覽", "Vista previa del talón de pago", "Visualização do recibo de pagamento", "Aperçu du bulletin de paie", "Vorschau der Gehaltsabrechnung", "Предварительный просмотр квитанции об оплате");

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
             {pickUiText(baseLocale, "새 탭", "new tab", "tab mới", "新しいタブ", "新标签", "新標籤", "nueva pestaña", "nova aba", "nouvel onglet", "Neuer Tab", "новая вкладка")}탭
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
             {pickUiText(baseLocale, "인쇄", "print", "in", "印刷", "打印", "列印", "imprimir", "imprimir", "imprimer", "drucken", "распечатать")}쇄
            </Button>
          </div>
        </DialogHeader>
        <iframe
          title={pickUiText(baseLocale, "급여명세서 미리보기", "Pay stub preview", "Xem trước cuống phiếu lương", "給与明細のプレビュー", "工资单预览", "薪資預覽", "Vista previa del talón de pago", "Visualização do recibo de pagamento", "Aperçu du bulletin de paie", "Vorschau der Gehaltsabrechnung", "Предварительный просмотр квитанции об оплате")}
          src={open ? printUrl : "about:blank"}
          className="w-full h-[min(75vh,720px)] border-0 bg-white"
        />
      </DialogContent>
    </Dialog>
  );
}
