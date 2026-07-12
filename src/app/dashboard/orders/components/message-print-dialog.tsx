"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Printer } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Order } from "@/types/order";
import { useSearchParams } from "next/navigation";
import { LabelGridSelector } from "./label-grid-selector";
import { TiptapEditor } from "@/components/ui/tiptap-editor";
import { FontManagerDialog } from "./font-manager-dialog";
import { SuggestionModal } from "../print-message/components/SuggestionModal";
import { Sparkles, MessageSquareText } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { MessagePrintLayout } from "../print-message/components/message-print-layout";
import { getLabelSheetConfig, LABEL_SHEET_PRINT_CSS } from "@/lib/label-sheet-config";
import React, { useMemo, useRef } from "react";

interface MessagePrintDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (data: {
    orderId: string,
    labelType: string,
    startPosition: number,
    messageContent: string,
    selectedPositions: number[],
    // For backward compatibility with the backend API / print page:
    messageFont?: string,
    messageFontSize?: number,
    senderFont?: string,
    senderFontSize?: number,
    senderName?: string,
  }) => void;
  order: Order;
}
const getLabelTypes = (baseLocale: string) => [
  { value: 'formtec-3107', label: pickUiText(baseLocale, "폼텍 3107 (6칸)", "Formtec 3107 (6 cells)", "Formtec 3107 (6 ô)", "Formtec 3107 (6セル)", "Formtec 3107（6 芯）", "Formtec 3107（6 芯）", "Formtec 3107 (6 celdas)", "Formtec 3107 (6 células)", "Formtec 3107 (6 cellules)", "Formtec 3107 (6 Zellen)", "Formtec 3107 (6 ячеек)"), cells: 6, gridCols: 'grid-cols-2', height: '93.1mm', className: 'gap-x-[2.5mm]' },
  { value: 'formtec-3108', label: pickUiText(baseLocale, "폼텍 3108 (8칸)", "Formtec 3108 (8 cells)", "Formtec 3108 (8 ô)", "Formtec 3108 (8セル)", "Formtec 3108（8 节电池）", "Formtec 3108（8 顆電池）", "Formtec 3108 (8 celdas)", "Formtec 3108 (8 células)", "Formtec 3108 (8 cellules)", "Formtec 3108 (8 Zellen)", "Formtec 3108 (8 ячеек)"), cells: 8, gridCols: 'grid-cols-2', height: '67.7mm', className: 'gap-x-[2.5mm]' },
  { value: 'formtec-3109', label: pickUiText(baseLocale, "폼텍 3109 (12칸)", "Formtec 3109 (12 cells)", "Formtec 3109 (12 ô)", "Formtec 3109 (12 セル)", "Formtec 3109（12 节电池）", "Formtec 3109（12 顆電池）", "Formtec 3109 (12 celdas)", "Formtec 3109 (12 células)", "Formtec 3109 (12 cellules)", "Formtec 3109 (12 Zellen)", "Formtec 3109 (12 ячеек)"), cells: 12, gridCols: 'grid-cols-2', height: '45mm', className: 'gap-x-[2.5mm]' },
  { value: 'label-90x60', label: pickUiText(baseLocale, "감열 라벨지 (90x60)", "Thermal Label (90x60)", "Nhãn nhiệt (90x60)", "感熱ラベル (90x60)", "热敏标签 (90x60)", "熱敏標籤 (90x60)", "Etiqueta Térmica (90x60)", "Etiqueta Térmica (90x60)", "Étiquette Thermique (90x60)", "Thermoetikett (90x60)", "Термоэтикетка (90x60)"), cells: 1, gridCols: 'grid-cols-1', height: '60mm', className: 'gap-x-0' },
  { value: 'label-90x90', label: pickUiText(baseLocale, "감열 라벨지 (90x90)", "Thermal Label (90x90)", "Nhãn nhiệt (90x90)", "感熱ラベル (90x90)", "热敏标签 (90x90)", "熱敏標籤 (90x90)", "Etiqueta Térmica (90x90)", "Etiqueta Térmica (90x90)", "Étiquette Thermique (90x90)", "Thermoetikett (90x90)", "Термоэтикетка (90x90)"), cells: 1, gridCols: 'grid-cols-1', height: '90mm', className: 'gap-x-0' },
];

export function MessagePrintDialog({ isOpen, onOpenChange, onSubmit, order }: MessagePrintDialogProps) {
  
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const labelTypes = getLabelTypes(baseLocale);
const searchParams = useSearchParams();

  const getInitialValue = (paramName: string, defaultValue: string) => {
    return searchParams.get(paramName) || defaultValue;
  };

  const getInitialPositions = () => {
    const positionsParam = searchParams.get('positions');
    if (positionsParam) {
      return positionsParam.split(',').map(p => parseInt(p)).filter(p => !isNaN(p));
    }
    return [1];
  };

  const [labelType, setLabelType] = useState(getInitialValue('labelType', 'formtec-3108'));
  const [selectedPositions, setSelectedPositions] = useState<number[]>(getInitialPositions());
  const [messageContent, setMessageContent] = useState("");
  const [fontManagerOpen, setFontManagerOpen] = useState(false);
  const [suggestionModalOpen, setSuggestionModalOpen] = useState(false);
  const [suggestionType, setSuggestionType] = useState<'quote' | 'message'>('quote');

  const contentRef = useRef<HTMLDivElement>(null);
  const printPageStyle = useMemo(() => {
    const config = getLabelSheetConfig(labelType);
    if (config.isThermal) {
      return `
        @page { size: ${config.pageWidthMm}mm ${config.pageHeightMm}mm; margin: 0; }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: ${config.pageWidthMm}mm !important;
            height: ${config.pageHeightMm}mm !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `;
    }
    return LABEL_SHEET_PRINT_CSS;
  }, [labelType]);

  const reactToPrintFn = useReactToPrint({
    contentRef: contentRef,
    documentTitle: `Message_Print_${order.id}`,
    pageStyle: printPageStyle,
  });

  useEffect(() => {
    if (isOpen && order) {
      const draftContent = localStorage.getItem(`msg_draft_content_${order.id}`);
      
      let rawContent = order.message?.content || "";
      if (rawContent.includes('\n---\n')) {
          rawContent = rawContent.replace('\n---\n', '\n');
      }
      if (order.message?.sender && !rawContent.includes(order.message.sender)) {
          rawContent += '\n' + order.message.sender;
      }

      if (searchParams.has('messageContent')) {
        setMessageContent(searchParams.get('messageContent') || '');
      } else if (draftContent !== null) {
        setMessageContent(draftContent);
      } else {
        let finalHtml = rawContent;
        // 기존 텍스트를 Tiptap 에디터용 HTML로 변환
        if (!finalHtml.includes('<p>') && !finalHtml.includes('<div>') && finalHtml.trim()) {
           finalHtml = finalHtml.split('\n').map(line => `<p style="text-align: center">${line}</p>`).join('');
        }
        setMessageContent(finalHtml);
      }
    }
  }, [isOpen, order, searchParams]);

  const handleFormSubmit = () => {
    localStorage.setItem(`msg_draft_content_${order.id}`, messageContent);

    // Call react-to-print directly instead of routing
    if (reactToPrintFn) {
      reactToPrintFn();
    }
  };

  const selectedLabel = labelTypes.find(lt => lt.value === labelType) || labelTypes[0];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-6xl max-h-[95vh] h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{pickUiText(baseLocale, "메시지 인쇄 옵션", "Message Print Options", "Tùy chọn in tin nhắn", "メッセージ印刷オプション", "消息打印选项", "訊息列印選項", "Opciones de impresión de mensajes", "Opções de impressão de mensagens", "Options d'impression des messages", "Optionen zum Drucken von Nachrichten", "Параметры печати сообщений")}</DialogTitle>
            <DialogDescription>
              좌측에서 내용을 입력하고 우측에서 인쇄될 위치를 클릭하여 선택하세요. (자동 저장됨)
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden min-h-0">
            <div className="lg:col-span-4 space-y-4 overflow-y-auto pr-2">

              <div className="space-y-2 border p-4 rounded-md">
                <Label htmlFor="label-type" className="font-bold">{pickUiText(baseLocale, "1. 라벨지 규격 선택", "1. Select Label Size", "1. Chọn Kích thước Nhãn", "1. ラベルサイズを選択します", "1. 选择标签尺寸", "1. 選擇標籤尺寸", "1. Seleccione el tamaño de la etiqueta", "1. Selecione o tamanho da etiqueta", "1. Sélectionnez la taille de l'étiquette", "1. Wählen Sie Etikettengröße", "1. Выберите размер этикетки.")}</Label>
                <Select value={labelType} onValueChange={(value) => {
                  setLabelType(value || 'formtec-3108');
                  setSelectedPositions([]);
                }}>
                  <SelectTrigger id="label-type">
                    <SelectValue placeholder={pickUiText(baseLocale, "라벨지 선택", "Select Label", "Chọn Nhãn", "ラベルの選択", "选择标签", "選擇標籤", "Seleccionar etiqueta", "Selecione o rótulo", "Sélectionner une étiquette", "Wählen Sie Etikett aus", "Выберите ярлык")} />
                  </SelectTrigger>
                  <SelectContent>
                    {labelTypes.map(lt => (
                      <SelectItem key={lt.value} value={lt.value}>{lt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4 border p-4 rounded-md bg-muted/30">
                <div className="flex items-center justify-between">
                  <Label className="font-bold">{pickUiText(baseLocale, "2. 내용 입력", "2. Enter Content", "2. Nhập nội dung", "2. コンテンツを入力します", "2. 输入内容", "2. 輸入內容", "2. Ingrese el contenido", "2. Insira o conteúdo", "2. Entrez le contenu", "2. Geben Sie den Inhalt ein", "2. Введите контент")}</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs px-2 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                      onClick={() => { setSuggestionType('quote'); setSuggestionModalOpen(true); }}
                    >
                      <Sparkles className="h-3 w-3 mr-1" /> 명언
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs px-2 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                      onClick={() => { setSuggestionType('message'); setSuggestionModalOpen(true); }}
                    >
                      <MessageSquareText className="h-3 w-3 mr-1" /> 예제
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="message-content" className="text-xs text-muted-foreground mb-1 block">{pickUiText(baseLocale, "메시지 본문", "Message Body", "Nội dung tin nhắn", "メッセージ本文", "消息正文", "訊息正文", "Cuerpo del mensaje", "Corpo da mensagem", "Corps du message", "Nachrichtentext", "Тело сообщения")}</Label>
                  <TiptapEditor
                    value={messageContent}
                    onChange={setMessageContent}
                  />
                </div>
              </div>

              <div className="space-y-2 border p-4 rounded-md">
                <Label className="font-bold">{pickUiText(baseLocale, "3. 폰트/이모지 설정", "3. Font/Emoji Settings", "3. Cài đặt phông chữ/Biểu tượng cảm xúc", "3. フォント/絵文字の設定", "3. 字体/表情符号设置", "3. 字體/表情符號設置", "3. Configuración de fuentes/emojis", "3. Configurações de fonte/emoji", "3. Paramètres de police/Emoji", "3. Schriftart-/Emoji-Einstellungen", "3. Настройки шрифта/эмодзи")}</Label>
                <div className="pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full justify-start text-muted-foreground hover:text-primary"
                    onClick={() => setFontManagerOpen(true)}
                  >
                    👉 폰트/이모지 설정 마법사 열기
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2 px-1">
                    원하는 폰트를 활성화하거나 PC 윈도우의 폰트를 무제한 추가할 수 있습니다.
                  </p>
                </div>
              </div>
              
            </div>

            <div className="lg:col-span-8 bg-gray-50 border rounded-lg p-4 flex flex-col items-center overflow-y-auto">
              <LabelGridSelector
                labelType={labelType}
                selectedPositions={selectedPositions}
                onPositionToggle={(pos) => {
                  if (selectedPositions.includes(pos)) {
                    setSelectedPositions(prev => prev.filter(p => p !== pos));
                  } else {
                    setSelectedPositions(prev => [...prev, pos]);
                  }
                }}
                onSelectAll={() => setSelectedPositions(Array.from({ length: selectedLabel.cells }, (_, i) => i + 1))}
                onClearAll={() => setSelectedPositions([])}
                onSelectFirst={() => setSelectedPositions([1])}
                messageContent={messageContent}
              />
            </div>
          </div>
          <DialogFooter className="pt-4 flex-col items-stretch sm:flex-row sm:items-center gap-2">
            <p className="text-xs text-red-600 font-medium sm:flex-1 sm:text-left text-center">
              인쇄 시 브라우저 설정에서 <strong>여백: 없음</strong>, <strong>배율: 100%</strong>으로 맞춰 주세요.
            </p>
            <div className="flex gap-2 justify-end">
            <DialogClose render={<Button type="button" variant="secondary" />}>
              {pickUiText(baseLocale, "취소", "Cancel", "Hủy", "キャンセル", "取消", "取消", "Cancelar", "Cancelar", "Annuler", "Abbrechen", "Отмена")}
            </DialogClose>
            <Button type="button" onClick={handleFormSubmit} disabled={!messageContent || (selectedLabel.cells > 1 && selectedPositions.length === 0)}>
              <Printer className="mr-2 h-4 w-4" /> {pickUiText(baseLocale, "인쇄", "Print", "In", "印刷する", "打印", "列印", "Imprimir", "Imprimir", "Imprimer", "Drucken", "Распечатать")}
            </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* react-to-print 전용 — 화면에 보이지 않게 클립, 다이얼로그 열릴 때만 마운트 */}
      {isOpen && (
        <div
          aria-hidden
          className="message-print-hidden-root pointer-events-none fixed overflow-hidden opacity-0"
          style={{
            left: 0,
            top: 0,
            width: 1,
            height: 1,
            clip: 'rect(0, 0, 0, 0)',
            clipPath: 'inset(50%)',
            whiteSpace: 'nowrap',
            border: 0,
            zIndex: -1,
          }}
        >
          <div ref={contentRef} style={{ width: '210mm' }}>
            <MessagePrintLayout
              order={order}
              labelType={labelType}
              startPosition={1}
              messageContent={messageContent}
              selectedPositions={selectedPositions}
              hideHeader
            />
          </div>
        </div>
      )}
      <FontManagerDialog
        isOpen={fontManagerOpen}
        onOpenChange={setFontManagerOpen}
      />
      <SuggestionModal
        isOpen={suggestionModalOpen}
        onClose={() => setSuggestionModalOpen(false)}
        type={suggestionType}
        onSelectText={(content, author) => {
           const newContent = content + (author ? `\n\n- ${author} -` : '');
           const htmlContent = newContent.split('\n').map(line => `<p style="text-align: center">${line}</p>`).join('');
           setMessageContent(htmlContent);
        }}
      />
    </>
  );
}
