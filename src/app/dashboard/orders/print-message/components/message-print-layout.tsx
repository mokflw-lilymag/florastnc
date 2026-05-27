"use client"

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Printer, ArrowLeft } from "lucide-react";
import { useRouter } from 'next/navigation';
import type { SerializableOrder } from '../page';
import { cn } from "@/lib/utils";
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
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
            }
            /* 사이드바와 네비게이션 완전히 숨기기 */
            .sidebar, nav, header, .no-print, aside, [data-sidebar] {
              display: none !important;
            }
            /* 메인 콘텐츠만 표시 */
            main {
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
            }
            /* 전체 페이지 레이아웃 재설정 */
            * {
              visibility: hidden;
            }
            #printable-area-wrapper, #printable-area-wrapper * {
              visibility: visible;
            }
            #printable-area-wrapper {
              background: white;
              box-shadow: none;
              margin: 0;
              width: ${config.isThermal ? config.width : '210mm'};
              height: ${config.isThermal ? config.height : '297mm'};
              position: relative;
              overflow: hidden;
            }

            @media print {
              #printable-area-wrapper {
                position: absolute;
                left: 0;
                top: 0;
                width: ${config.isThermal ? config.width : '210mm'};
                height: ${config.isThermal ? config.height : '297mm'};
                box-sizing: border-box;
                margin: 0;
                padding: 0;
                overflow: hidden;
                box-shadow: none;
              }
            }
            /* 6칸 라벨용 여백 설정 */
            #printable-area-wrapper[data-label-type="formtec-3107"] {
              padding: 8mm 5mm 10mm 5mm;
            }
            /* 12칸 라벨용 여백 설정 */
            #printable-area-wrapper[data-label-type="formtec-3109"] {
              padding: 11mm 5mm 16mm 5mm;
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
          title="메시지 인쇄 미리보기"
          description={`주문자: ${order.orderer.name} / 라벨지: ${labelType} / 출력 위치: ${selectedPositions.join(', ')}`}
        >
          <div className="flex gap-2">
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
              aria-label="메시지 인쇄 옵션으로 돌아가기"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              옵션 수정
            </Button>
            <Button
              onClick={() => window.print()}
              aria-label="메시지 라벨 인쇄하기"
            >
              <Printer className="mr-2 h-4 w-4" />
              인쇄하기
            </Button>
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
          aria-label={`${labelType} 라벨 그리드 (${config.cells}칸)`}
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
              aria-label={labelData ? `라벨 ${index + 1}: ${labelData.content.substring(0, 50)}${labelData.content.length > 50 ? '...' : ''}` : `빈 라벨 ${index + 1}`}
            >
              {labelData ? (
                <div className="w-full h-full p-2 flex flex-col items-center justify-center relative">
                  <div
                    className="whitespace-pre-wrap flex-1 flex flex-col items-center justify-center w-full"
                    style={{
                      lineHeight: 1.4,
                      wordBreak: 'break-word',
                    }}
                    aria-label={`메시지 내용: ${labelData.content}`}
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
