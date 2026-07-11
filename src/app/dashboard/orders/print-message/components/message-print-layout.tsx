"use client"

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Printer, ArrowLeft } from "lucide-react";
import { useRouter } from 'next/navigation';
import type { SerializableOrder } from '../page';
import { cn } from "@/lib/utils";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";
import { FONT_CATALOG } from "@/lib/font-catalog";

interface MessagePrintLayoutProps {
  order: SerializableOrder;
  labelType: string;
  startPosition: number;
  messageContent: string;
  selectedPositions?: number[];
  // Keep these for backward compatibility temporarily if needed
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

const labelConfigs: Record<string, {
  cells: number;
  cols: number;
  height: string;
  width: string;
  marginTop: string;
  marginBottom: string;
  marginLeft: string;
  marginRight: string;
  hGap: string;
  vGap: string;
  isThermal?: boolean;
}> = {
  'formtec-3107': {
    cells: 6, cols: 2,
    width: '99.1mm', height: '93.1mm',
    marginTop: '8.5mm', marginBottom: '8.5mm', marginLeft: '4.9mm', marginRight: '4.9mm',
    hGap: '2mm', vGap: '0mm'
  },
  'formtec-3108': {
    cells: 8, cols: 2,
    width: '99.1mm', height: '67.7mm',
    marginTop: '14mm', marginBottom: '12.2mm', marginLeft: '4.95mm', marginRight: '4.95mm',
    hGap: '2mm', vGap: '0mm'
  },
  'formtec-3109': {
    cells: 12, cols: 2,
    width: '99.1mm', height: '45mm',
    marginTop: '13.5mm', marginBottom: '13.5mm', marginLeft: '4.9mm', marginRight: '4.9mm',
    hGap: '2mm', vGap: '0mm'
  },
  'label-90x60': {
    cells: 1, cols: 1,
    width: '90mm', height: '60mm',
    marginTop: '0mm', marginBottom: '0mm', marginLeft: '0mm', marginRight: '0mm',
    hGap: '0mm', vGap: '0mm',
    isThermal: true
  },
  'label-90x90': {
    cells: 1, cols: 1,
    width: '90mm', height: '90mm',
    marginTop: '0mm', marginBottom: '0mm', marginLeft: '0mm', marginRight: '0mm',
    hGap: '0mm', vGap: '0mm',
    isThermal: true
  }
};

export function MessagePrintLayout({
  order,
  labelType,
  startPosition,
  messageContent,
  selectedPositions = [startPosition],
}: MessagePrintLayoutProps) {
  
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
const router = useRouter();
  const config = labelConfigs[labelType] || labelConfigs['formtec-3108'];
  const labels = Array(config.cells).fill(null);

  // 편집된 메시지 내용 또는 원본 메시지 사용
  let finalMessageContent = messageContent || order.message?.content || "";

  // 원본 메시지에 보내는 사람이 있는 경우 (이전 데이터 호환)
  if (!messageContent && order.message?.content) {
    let rawContent = order.message.content;
    if (rawContent.includes('\n---\n')) {
        rawContent = rawContent.replace('\n---\n', '\n');
    }
    if (order.message.sender && !rawContent.includes(order.message.sender)) {
        rawContent += '\n' + order.message.sender;
    }
    
    // 기존 텍스트를 Tiptap 에디터용 HTML로 변환
    if (!rawContent.includes('<p>') && !rawContent.includes('<div>')) {
        finalMessageContent = rawContent.split('\n').map(line => `<p style="text-align: center">${line}</p>`).join('');
    } else {
        finalMessageContent = rawContent;
    }
  }

  if (finalMessageContent) {
    selectedPositions.forEach(position => {
      if (position - 1 < config.cells && position > 0) {
        labels[position - 1] = { content: finalMessageContent };
      }
    });
  }

  return (
    <div className="max-w-4xl mx-auto">
      <style jsx global>{`
          @media print {
            @page {
              size: ${config.isThermal ? `${config.width} ${config.height}` : 'A4'};
              margin: 0 !important;
            }
            /* 부모 엘리먼트들이 인쇄 시 어떠한 여백이나 오프셋도 생성하지 않도록 완전 무력화 */
            html, body, #__next, [data-overlay-container="true"], main {
              margin: 0 !important;
              padding: 0 !important;
              height: auto !important;
              min-height: 0 !important;
              position: static !important;
              transform: none !important;
              box-shadow: none !important;
            }
            /* 모든 요소를 숨기기 */
            body * {
              visibility: hidden !important;
            }
            /* 인쇄 대상 영역 및 내부 하위 자식 요소들만 보이도록 지정 */
            #printable-area-wrapper,
            #printable-area-wrapper * {
              visibility: visible !important;
            }
            #printable-area-wrapper {
              visibility: visible !important;
              position: absolute !important;
              left: 0px !important;
              top: 0px !important;
              margin: 0px !important;
              width: ${config.isThermal ? config.width : '210mm'} !important;
              height: ${config.isThermal ? config.height : '297mm'} !important;
              box-sizing: border-box !important;
              background-color: white !important;
              overflow: hidden !important;
              box-shadow: none !important;
            }
          }
        `}</style>
      
      {/* Load Fonts for Print */}
      {FONT_CATALOG.map((font, i) => {
        const isCss = font.url.includes('.css') || font.url.includes('fonts.googleapis.com');
        if (isCss) {
            return <link key={i} rel="stylesheet" href={font.url} />;
        }
        return (
            <style key={i} dangerouslySetInnerHTML={{
                __html: `
                    @font-face {
                        font-family: '${font.family}';
                        src: url('${font.url}') format('${font.url.endsWith('woff2') ? 'woff2' : 'woff'}');
                        font-display: swap;
                    }
                `
            }} />
        );
      })}

      <div className="no-print">
        <PageHeader
          title={pickUiText(baseLocale, "메시지 인쇄 미리보기", "Message Print Preview", "Xem trước bản in tin nhắn", "メッセージ印刷プレビュー", "留言打印预览", "留言列印預覽", "Vista previa de impresión de mensaje", "Pré-visualização da impressão da mensagem", "Aperçu avant impression des messages", "Druckvorschau der Nachricht", "Предварительный просмотр печати сообщения")}
          description={`${pickUiText(baseLocale, "주문자:", "Orderer:", "Người đặt hàng:", "注文者:", "订购者：", "訂購者：", "Ordenante:", "Encomenda:", "Commandant :", "Besteller:", "Заказчик:")} ${order.orderer.name} / ${pickUiText(baseLocale, "라벨지:", "Label:", "Nhãn:", "ラベル：", "标签：", "標籤：", "Etiqueta:", "Rótulo:", "Étiquette:", "Etikett:", "Этикетка:")} ${labelType} / ${pickUiText(baseLocale, "출력 위치:", "Print Position:", "Vị trí in:", "印刷位置:", "打印位置：", "列印位置：", "Posición de impresión:", "Posição de impressão:", "Position d'impression :", "Druckposition:", "Позиция печати:")} ${selectedPositions.join(', ')}`}
        >
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
            <div className="text-red-500 font-bold text-sm bg-red-50 px-3 py-1.5 rounded-md flex items-center">{pickUiText(baseLocale, "⚠️ 인쇄 옵션의 '여백' 설정을 반드시 '없음'으로 선택해 주세요!", "⚠️ Please make sure to set 'Margins' to 'None' in print options!", "⚠️ Vui lòng đảm bảo đặt 'Lề' thành 'Không' trong tùy chọn in!", "⚠️ 印刷オプションで「余白」を必ず「なし」に設定してください。", "⚠️ 请确保在打印选项中将“边距”设置为“无”！", "⚠️ 請確保在列印選項中將「邊距」設為「無」！", "⚠️ ¡Asegúrese de configurar 'Márgenes' en 'Ninguno' en las opciones de impresión!", "⚠️ Certifique-se de definir 'Margens' como 'Nenhum' nas opções de impressão!", "⚠️ Veuillez vous assurer de définir « Marges » sur « Aucune » dans les options d'impression !", "⚠️ Bitte achten Sie darauf, in den Druckoptionen „Ränder“ auf „Keine“ zu setzen!", "⚠️ Обязательно установите для параметра «Поля» значение «Нет» в параметрах печати!")}</div>
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
              aria-label={pickUiText(baseLocale, "메시지 인쇄 옵션으로 돌아가기", "Return to Message Print Options", "Quay lại Tùy chọn In Tin nhắn", "メッセージ印刷オプションに戻る", "返回消息打印选项", "返回訊息列印選項", "Volver a Opciones de impresión de mensajes", "Retornar às opções de impressão de mensagens", "Revenir aux options d'impression des messages", "Kehren Sie zu den Nachrichtendruckoptionen zurück", "Вернуться к параметрам печати сообщения")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />{pickUiText(baseLocale, "옵션 수정", "Edit Options", "Chỉnh sửa tùy chọn", "編集オプション", "编辑选项", "編輯選項", "Editar opciones", "Editar opções", "Modifier les options", "Optionen bearbeiten", "Редактировать параметры")}</Button>
            <Button
              onClick={() => window.print()}
              aria-label={pickUiText(baseLocale, "메시지 라벨 인쇄하기", "Print Message Label", "In nhãn tin nhắn", "メッセージラベルを印刷する", "打印消息标签", "列印訊息標籤", "Imprimir etiqueta de mensaje", "Imprimir etiqueta de mensagem", "Imprimer l'étiquette du message", "Nachrichtenetikett drucken", "Распечатать этикетку сообщения")}
            >
              <Printer className="mr-2 h-4 w-4" />{pickUiText(baseLocale, "인쇄하기", "Print", "In", "印刷する", "打印", "列印", "Imprimir", "Imprimir", "Imprimer", "Drucken", "Распечатать")}</Button>
          </div>
        </PageHeader>
      </div>
      <div id="printable-area-wrapper" className={cn("bg-white mx-auto", !config.isThermal && "shadow-lg")} style={{ width: config.isThermal ? config.width : '210mm' }}>
        <div
          id="label-grid-container"
          className="h-full"
          style={{
            width: config.isThermal ? config.width : '210mm',
            height: config.isThermal ? config.height : '297mm',
            paddingTop: config.marginTop,
            paddingBottom: config.marginBottom,
            paddingLeft: config.marginLeft,
            paddingRight: config.marginRight,
            display: 'grid',
            gridTemplateColumns: `repeat(${config.cols}, ${config.width})`,
            gridTemplateRows: `repeat(${config.cells / config.cols}, ${config.height})`,
            columnGap: config.hGap,
            rowGap: config.vGap,
            boxSizing: 'border-box',
            backgroundColor: 'white'
          }}
          role="grid"
          aria-label={`${labelType} ${pickUiText(baseLocale, "라벨 그리드", "Label Grid", "Lưới nhãn", "ラベルグリッド", "标签网格", "標籤網格", "Cuadrícula de etiquetas", "Grade de rótulos", "Grille d'étiquettes", "Beschriftungsraster", "Сетка этикеток")} (${config.cells}${pickUiText(baseLocale, "칸", "cells", "tế bào", "細胞", "细胞", "細胞", "células", "células", "cellules", "Zellen", "клетки")})`}
        >
          {labels.map((labelData, index) => (
            <div
              key={index}
              className="flex flex-col items-center justify-center text-center relative overflow-hidden"
              style={{
                height: config.height,
                width: config.width,
              }}
              role="gridcell"
              aria-label={labelData ? `${pickUiText(baseLocale, "라벨", "Label", "Nhãn", "ラベル", "标签", "標籤", "Etiqueta", "Rótulo", "Étiquette", "Etikett", "Этикетка")} ${index + 1}: ${labelData.content.substring(0, 50)}${labelData.content.length > 50 ? '...' : ''}` : `${pickUiText(baseLocale, "빈 라벨", "Empty Label", "Nhãn trống", "空のラベル", "空标签", "空標籤", "Etiqueta vacía", "Etiqueta Vazia", "Étiquette vide", "Leeres Etikett", "Пустой ярлык")} ${index + 1}`}
            >
              {labelData ? (
                <div className="w-full h-full p-2 flex flex-col items-center justify-center relative">
                  <div
                    className="whitespace-pre-wrap flex-1 flex flex-col items-center justify-center w-full"
                    style={{
                      lineHeight: 1.4,
                      wordBreak: 'break-word',
                    }}
                    aria-label={`${pickUiText(baseLocale, "메시지 내용:", "Message Content:", "Nội dung tin nhắn:", "メッセージの内容:", "留言内容：", "留言內容：", "Contenido del mensaje:", "Conteúdo da mensagem:", "Contenu du message :", "Nachrichteninhalt:", "Содержание сообщения:")} ${labelData.content}`}
                    dangerouslySetInnerHTML={{
                      __html: (labelData.content.includes('<p>') ? labelData.content : labelData.content.split('\n').map((line: string) => `<p style="text-align: center">${line}</p>`).join(''))
                        .replace(/<p><\/p>/g, '<p><br></p>')
                        .replace(/<p([^>]*)><\/p>/g, '<p$1><br></p>')
                    }}
                  />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
