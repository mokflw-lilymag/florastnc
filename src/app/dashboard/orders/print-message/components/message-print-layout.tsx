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
  messageFont: string;
  messageFontSize: number;
  senderFont: string;
  senderFontSize: number;
  messageContent: string;
  senderName: string;
  selectedPositions?: number[];
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
}> = {
  'formtec-3107': {
    cells: 6, cols: 2,
    width: '99.1mm', height: '93.1mm',
    marginTop: '8.5mm', marginBottom: '8.5mm', marginLeft: '5mm', marginRight: '5mm',
    hGap: '2mm', vGap: '0mm'
  },
  'formtec-3108': {
    cells: 8, cols: 2,
    width: '99.1mm', height: '67.7mm',
    marginTop: '13mm', marginBottom: '14mm', marginLeft: '5mm', marginRight: '5mm',
    hGap: '2mm', vGap: '0mm'
  },
  'formtec-3109': {
    cells: 12, cols: 2,
    width: '99.1mm', height: '45mm',
    marginTop: '11mm', marginBottom: '16mm', marginLeft: '5mm', marginRight: '5mm',
    hGap: '2mm', vGap: '0mm'
  },
};

export function MessagePrintLayout({
  order,
  labelType,
  startPosition,
  messageFont,
  messageFontSize,
  senderFont,
  senderFontSize,
  messageContent,
  senderName,
  selectedPositions = [startPosition]
}: MessagePrintLayoutProps) {
  const router = useRouter();
  const config = labelConfigs[labelType] || labelConfigs['formtec-3108'];
  const labels = Array(config.cells).fill(null);

  let finalMessageContent = messageContent || order.message?.content || "";
  let finalSenderName = senderName || order.message?.sender || "";

  if (finalMessageContent) {
    selectedPositions.forEach(position => {
      if (position - 1 < config.cells && position > 0) {
        labels[position - 1] = { content: finalMessageContent, senderName: finalSenderName };
      }
    });
  }

  return (
    <div className="max-w-4xl mx-auto">
      <style jsx global>{`
          @media print {
            @page {
              size: A4;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
            }
            .no-print, [data-sidebar], header, aside {
              display: none !important;
            }
            main {
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
            }
            * {
              visibility: hidden;
            }
            #printable-area-wrapper, #printable-area-wrapper * {
              visibility: visible;
            }
            #printable-area-wrapper {
              position: absolute;
              left: 0;
              top: 0;
              width: 210mm;
              height: 297mm;
            }
          }
        `}</style>
      
      {FONT_CATALOG.map((font, i) => (
        <link key={i} rel="stylesheet" href={font.url} />
      ))}

      <div className="no-print p-4">
        <PageHeader
          title="메시지 인쇄 미리보기"
          description={`주문자: ${order.orderer?.name || '익명'} / 라벨지: ${labelType}`}
        >
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                params.set('openMessagePrint', 'true');
                router.push(`/dashboard/orders?${params.toString()}`);
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              옵션 수정
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              인쇄하기
            </Button>
          </div>
        </PageHeader>
      </div>

      <div id="printable-area-wrapper" className="bg-white">
        <div
          id="label-grid-container"
          style={{
            paddingTop: config.marginTop,
            paddingBottom: config.marginBottom,
            paddingLeft: config.marginLeft,
            paddingRight: config.marginRight,
            display: 'grid',
            gridTemplateColumns: `repeat(${config.cols}, 1fr)`,
            columnGap: config.hGap,
            rowGap: config.vGap,
          }}
        >
          {labels.map((labelData, index) => (
            <div
              key={index}
              style={{ height: config.height, width: config.width }}
              className="flex flex-col items-center justify-center text-center overflow-hidden"
            >
              {labelData ? (
                <div className="w-full h-full p-2 flex flex-col items-center justify-center">
                  <div
                    style={{ fontFamily: `'${messageFont}'`, fontSize: `${messageFontSize}pt`, lineHeight: 1.4, wordBreak: 'break-word' }}
                    className="whitespace-pre-wrap flex-1 flex items-center justify-center w-full"
                  >
                    {labelData.content}
                  </div>
                  {labelData.senderName && (
                    <div style={{ fontFamily: `'${senderFont}'`, fontSize: `${senderFontSize}pt` }} className="mt-1">
                      {labelData.senderName}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
