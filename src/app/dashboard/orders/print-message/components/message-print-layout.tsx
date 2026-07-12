"use client"

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Printer, ArrowLeft } from "lucide-react";
import { useRouter } from 'next/navigation';
import type { SerializableOrder } from '../page';
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";
import { LABEL_SHEET_PRINT_CSS } from "@/lib/label-sheet-config";
import { LabelSheet } from "../../components/label-sheet";

interface MessagePrintLayoutProps {
  order: SerializableOrder;
  labelType: string;
  startPosition: number;
  messageContent: string;
  selectedPositions?: number[];
  hideHeader?: boolean;
  messageFont?: string;
  messageFontSize?: number;
  senderFont?: string;
  senderFontSize?: number;
  senderName?: string;
  messageBold?: boolean;
  messageItalic?: boolean;
  senderBold?: boolean;
  senderItalic?: boolean;
}

export function MessagePrintLayout({
  order,
  labelType,
  startPosition,
  messageContent,
  selectedPositions = [startPosition],
  hideHeader = false,
}: MessagePrintLayoutProps) {
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const router = useRouter();

  let finalMessageContent = messageContent || order.message?.content || "";

  if (!messageContent && order.message?.content) {
    let rawContent = order.message.content;
    if (rawContent.includes('\n---\n')) {
      rawContent = rawContent.replace('\n---\n', '\n');
    }
    if (order.message.sender && !rawContent.includes(order.message.sender)) {
      rawContent += '\n' + order.message.sender;
    }

    if (!rawContent.includes('<p>') && !rawContent.includes('<div>')) {
      finalMessageContent = rawContent.split('\n').map(line => `<p style="text-align: center">${line}</p>`).join('');
    } else {
      finalMessageContent = rawContent;
    }
  }

  return (
    <div className={hideHeader ? undefined : "max-w-4xl mx-auto"}>
      <style dangerouslySetInnerHTML={{ __html: LABEL_SHEET_PRINT_CSS }} />

      {!hideHeader && (
        <div className="no-print">
          <PageHeader
            title={pickUiText(baseLocale, "메시지 인쇄 미리보기", "Message Print Preview", "Xem trước bản in tin nhắn", "メッセージ印刷プレビュー", "留言打印预览", "留言列印預覽", "Vista previa de impresión de mensaje", "Pré-visualização da impressão da mensagem", "Aperçu avant impression des messages", "Druckvorschau der Nachricht", "Предварительный просмотр печати сообщения")}
            description={`${pickUiText(baseLocale, "주문자:", "Orderer:", "Người đặt hàng:", "注文者:", "订购者：", "訂購者：", "Ordenante:", "Encomenda:", "Commandant :", "Besteller:", "Заказчик:")} ${order.orderer.name} / ${pickUiText(baseLocale, "라벨지:", "Label:", "Nhãn:", "ラベル：", "标签：", "標籤：", "Etiqueta:", "Rótulo:", "Étiquette:", "Etikett:", "Этикетка:")} ${labelType} / ${pickUiText(baseLocale, "출력 위치:", "Print Position:", "Vị trí in:", "印刷位置:", "打印位置：", "列印位置：", "Posición de impresión:", "Posição de impressão:", "Position d'impression :", "Druckposition:", "Позиция печати:")} ${selectedPositions.join(', ')}`}
          >
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
              <div className="text-red-500 font-bold text-sm bg-red-50 px-3 py-1.5 rounded-md flex items-center">{pickUiText(baseLocale, "⚠️ 인쇄 옵션의 '여백' 설정을 반드시 '없음'으로 선택해 주세요!", "⚠️ Please make sure to set 'Margins' to 'None' in print options!", "⚠️ Vui lòng đảm bảo đặt 'Lề' thành 'Không' trong tùy chọn in!", "⚠️ 印刷オプションで「余白」を必ず「なし」に設定してください。", "⚠️ 请确保在打印选项中将“边距”设置为“无”！", "⚠️ 請確保在列印選項中將「邊距」設為「無」！", "⚠️ ¡Asegúrese de configurar 'Márgenes' en 'Ninguno' en las opciones de impresión!", "⚠️ Certifique-se de definir 'Margens' como 'Nenhum' nas opções de impressão!", "⚠️ Veuillez vous assurer de définir « Marges » sur « Aucune » dans les options d'impression !", "⚠️ Bitte achten Sie darauf, in den Druckoptionen „Ränder“ auf „Keine“ zu setzen!", "⚠️ Обязательно установите для параметра «Поля» значение «Нет» в параметрах печати!")}</div>
              <Button
                variant="outline"
                onClick={() => {
                  const params = new URLSearchParams();
                  params.set('orderId', order.id);
                  params.set('labelType', labelType);
                  params.set('start', String(startPosition));
                  params.set('messageContent', messageContent);
                  params.set('positions', selectedPositions.join(','));
                  params.set('openMessagePrint', 'true');
                  router.push(`/dashboard/orders?${params.toString()}`);
                }}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />{pickUiText(baseLocale, "옵션 수정", "Edit Options", "Chỉnh sửa tùy chọn", "編集オプション", "编辑选项", "編輯選項", "Editar opciones", "Editar opções", "Modifier les options", "Optionen bearbeiten", "Редактировать параметры")}
              </Button>
              <Button onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" />{pickUiText(baseLocale, "인쇄하기", "Print", "In", "印刷する", "打印", "列印", "Imprimir", "Imprimir", "Imprimer", "Drucken", "Распечатать")}
              </Button>
            </div>
          </PageHeader>
        </div>
      )}

      <LabelSheet
        labelType={labelType}
        messageContent={finalMessageContent}
        selectedPositions={selectedPositions}
        displayScale={1}
        id="printable-area-wrapper"
      />
    </div>
  );
}
