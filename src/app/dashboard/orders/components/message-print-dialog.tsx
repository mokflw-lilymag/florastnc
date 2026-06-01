"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
const labelTypes = [
  { value: 'formtec-3107', label: '폼텍 3107 (6칸)', cells: 6, gridCols: 'grid-cols-2', height: '93mm', className: 'gap-x-[2mm]' },
  { value: 'formtec-3108', label: '폼텍 3108 (8칸)', cells: 8, gridCols: 'grid-cols-2', height: '67.5mm', className: 'gap-x-[2mm]' },
  { value: 'formtec-3109', label: '폼텍 3109 (12칸)', cells: 12, gridCols: 'grid-cols-2', height: '45mm', className: 'gap-x-[2mm]' },
  { value: 'label-90x60', label: '감열 라벨지 (90x60)', cells: 1, gridCols: 'grid-cols-1', height: '60mm', className: 'gap-x-0' },
  { value: 'label-90x90', label: '감열 라벨지 (90x90)', cells: 1, gridCols: 'grid-cols-1', height: '90mm', className: 'gap-x-0' },
];

export function MessagePrintDialog({ isOpen, onOpenChange, onSubmit, order }: MessagePrintDialogProps) {
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

    onSubmit({
      orderId: order.id,
      labelType,
      startPosition: 1, 
      messageContent,
      selectedPositions,
      messageFont: 'Noto Sans KR',
      messageFontSize: 14,
      senderFont: 'Noto Sans KR',
      senderFontSize: 12,
      senderName: ''
    });
  };

  const selectedLabel = labelTypes.find(lt => lt.value === labelType) || labelTypes[0];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-6xl max-h-[95vh] h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>메시지 인쇄 옵션</DialogTitle>
            <DialogDescription>
              좌측에서 내용을 입력하고 우측에서 인쇄될 위치를 클릭하여 선택하세요. (자동 저장됨)
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden min-h-0">
            <div className="lg:col-span-4 space-y-4 overflow-y-auto pr-2">

              <div className="space-y-2 border p-4 rounded-md">
                <Label htmlFor="label-type" className="font-bold">1. 라벨지 규격 선택</Label>
                <Select value={labelType} onValueChange={(value) => {
                  setLabelType(value || 'formtec-3108');
                  setSelectedPositions([]);
                }}>
                  <SelectTrigger id="label-type">
                    <SelectValue placeholder="라벨지 선택" />
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
                  <Label className="font-bold">2. 내용 입력</Label>
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
                  <Label htmlFor="message-content" className="text-xs text-muted-foreground mb-1 block">메시지 본문</Label>
                  <TiptapEditor
                    value={messageContent}
                    onChange={setMessageContent}
                  />
                </div>
              </div>

              <div className="space-y-2 border p-4 rounded-md">
                <Label className="font-bold">3. 폰트/이모지 설정</Label>
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
          <DialogFooter className="pt-4">
            <DialogClose render={<Button type="button" variant="secondary" />}>
              취소
            </DialogClose>
            <Button type="button" onClick={handleFormSubmit} disabled={!messageContent || (selectedLabel.cells > 1 && selectedPositions.length === 0)}>
              <Printer className="mr-2 h-4 w-4" /> 인쇄 미리보기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
