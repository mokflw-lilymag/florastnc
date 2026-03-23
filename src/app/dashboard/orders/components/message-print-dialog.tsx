"use client";

import { useState, useEffect } from "react";
import { Printer } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";

import { Order } from "@/types/order";
import { useSettings } from "@/hooks/use-settings";
import { FontSelector } from "./font-selector";
import { LabelGridSelector } from "./label-grid-selector";

interface MessagePrintDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (data: {
    orderId: string,
    labelType: string,
    startPosition: number,
    messageFont: string,
    messageFontSize: number,
    senderFont: string,
    senderFontSize: number,
    messageContent: string,
    senderName: string,
    selectedPositions: number[]
  }) => void;
  order: Order | null;
}

const labelTypes = [
  { value: 'formtec-3107', label: '폼텍 3107 (6칸)', cells: 6 },
  { value: 'formtec-3108', label: '폼텍 3108 (8칸)', cells: 8 },
  { value: 'formtec-3109', label: '폼텍 3109 (12칸)', cells: 12 },
];

export function MessagePrintDialog({ isOpen, onOpenChange, onSubmit, order }: MessagePrintDialogProps) {
  const { settings } = useSettings();
  const searchParams = useSearchParams();

  const STORAGE_KEY_MSG_FONT = 'msg_print_msg_font';
  const STORAGE_KEY_MSG_SIZE = 'msg_print_msg_size';
  const STORAGE_KEY_SENDER_FONT = 'msg_print_sender_font';
  const STORAGE_KEY_SENDER_SIZE = 'msg_print_sender_size';

  const [labelType, setLabelType] = useState('formtec-3108');
  const [selectedPositions, setSelectedPositions] = useState<number[]>([1]);
  const [messageFont, setMessageFont] = useState('Noto Sans KR');
  const [messageFontSize, setMessageFontSize] = useState(14);
  const [senderFont, setSenderFont] = useState('Noto Sans KR');
  const [senderFontSize, setSenderFontSize] = useState(12);
  const [messageContent, setMessageContent] = useState("");
  const [senderName, setSenderName] = useState("");

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setMessageFont(localStorage.getItem(STORAGE_KEY_MSG_FONT) || settings.messageFont || 'Noto Sans KR');
      setMessageFontSize(parseInt(localStorage.getItem(STORAGE_KEY_MSG_SIZE) || String(settings.messageFontSize || 14)));
      setSenderFont(localStorage.getItem(STORAGE_KEY_SENDER_FONT) || settings.messageFont || 'Noto Sans KR');
      setSenderFontSize(parseInt(localStorage.getItem(STORAGE_KEY_SENDER_SIZE) || String(settings.messageFontSize || 12)));
    }
  }, [settings]);

  useEffect(() => {
    if (isOpen && order) {
      const parts = (order.memo || "").split('\n---\n');
      setMessageContent(parts[0] || "");
      setSenderName(parts.length > 1 ? parts[1] : "");
    }
  }, [isOpen, order]);

  const handleFormSubmit = () => {
    if (!order) return;
    
    // Save settings
    localStorage.setItem(STORAGE_KEY_MSG_FONT, messageFont);
    localStorage.setItem(STORAGE_KEY_MSG_SIZE, String(messageFontSize));
    localStorage.setItem(STORAGE_KEY_SENDER_FONT, senderFont);
    localStorage.setItem(STORAGE_KEY_SENDER_SIZE, String(senderFontSize));

    onSubmit({
      orderId: order.id,
      labelType,
      startPosition: selectedPositions[0] || 1,
      messageFont,
      messageFontSize,
      senderFont,
      senderFontSize,
      messageContent,
      senderName,
      selectedPositions,
    });
  };

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl max-h-[95vh] h-[90vh] overflow-hidden flex flex-col p-4 md:p-6">
        <DialogHeader>
          <DialogTitle className="text-slate-900">메시지 인쇄 옵션</DialogTitle>
          <DialogDescription className="text-slate-500">
            내용을 입력하고 인쇄될 위치를 선택하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden min-h-0">
          <div className="lg:col-span-5 space-y-4 overflow-y-auto pr-2">
            <div className="space-y-2 border p-3 rounded-md">
                <Label className="font-bold text-xs uppercase text-gray-500">1. 라벨지 규격 선택</Label>
                <Select value={labelType} onValueChange={(val) => val && setLabelType(val)}>
                    <SelectTrigger className="bg-white">
                        <SelectValue placeholder="라벨지 선택" />
                    </SelectTrigger>
                    <SelectContent>
                        {labelTypes.map(lt => (
                            <SelectItem key={lt.value} value={lt.value}>{lt.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-4 border p-3 rounded-md bg-muted/20">
              <Label className="font-bold text-xs uppercase text-gray-500">2. 내용 입력</Label>
              <div className="space-y-2">
                <Label htmlFor="message-content" className="text-xs text-slate-700">메시지 본문</Label>
                <Textarea
                  id="message-content"
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="메시지 입력"
                  className="min-h-[100px] bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sender-name" className="text-xs text-slate-700">보내는 분</Label>
                <Input
                  id="sender-name"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="이름 입력"
                  className="bg-white"
                />
              </div>
            </div>

            <div className="space-y-4 border p-3 rounded-md">
              <Label className="font-bold text-xs uppercase text-gray-500">3. 스타일 설정</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                    <Label className="text-xs text-slate-700">본문 폰트</Label>
                    <FontSelector value={messageFont} onValueChange={setMessageFont} />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs text-slate-700">본문 크기 (pt)</Label>
                    <Input
                        type="number"
                        value={messageFontSize}
                        onChange={(e) => setMessageFontSize(Number(e.target.value))}
                        className="bg-white"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs text-slate-700">작성자 폰트</Label>
                    <FontSelector value={senderFont} onValueChange={setSenderFont} />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs text-slate-700">작성자 크기 (pt)</Label>
                    <Input
                        type="number"
                        value={senderFontSize}
                        onChange={(e) => setSenderFontSize(Number(e.target.value))}
                        className="bg-white"
                    />
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-gray-50 border rounded-lg p-4 flex flex-col overflow-hidden">
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
              onSelectAll={() => setSelectedPositions(Array.from({ length: labelTypes.find(l => l.value === labelType)?.cells || 8 }, (_, i) => i + 1))}
              onClearAll={() => setSelectedPositions([])}
              onSelectFirst={() => setSelectedPositions([1])}
              messageContent={messageContent}
              senderName={senderName}
              messageFont={messageFont}
              messageFontSize={messageFontSize}
              senderFont={senderFont}
              senderFontSize={senderFontSize}
            />
          </div>
        </div>
        <DialogFooter className="pt-4 gap-2">
          <DialogClose render={<Button type="button" variant="secondary" />}>
            취소
          </DialogClose>
          <Button type="button" onClick={handleFormSubmit} disabled={!messageContent || selectedPositions.length === 0}>
            <Printer className="mr-2 h-4 w-4" /> 인쇄 미리보기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
