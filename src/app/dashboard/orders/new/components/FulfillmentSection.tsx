import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, MessageSquare, Search } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";
import Textarea from "@/components/ui/textarea";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";

// Type definitions should be imported or redefined if they are local
type ReceiptType = "store_pickup" | "pickup_reservation" | "delivery_reservation";
type MessageType = "card" | "ribbon" | "none";

interface FulfillmentSectionProps {
    receiptType: ReceiptType;
    setReceiptType: (type: ReceiptType) => void;

    scheduleDate: Date | undefined;
    setScheduleDate: (date: Date | undefined) => void;
    scheduleTime: string;
    setScheduleTime: (time: any) => void;
    timeOptions: string[];

    // Recipient / Picker
    recipientName: string; // Used for both recipient and picker name in UI logic
    setRecipientName: (name: string) => void;
    recipientContact: string;
    setRecipientContact: (contact: string) => void;

    // Delivery
    deliveryAddress: string;
    setDeliveryAddress: (addr: string) => void;
    deliveryAddressDetail: string;
    setDeliveryAddressDetail: (detail: string) => void;
    onAddressSearch: () => void;

    // Message
    messageType: MessageType;
    setMessageType: (type: MessageType) => void;

    messageContent: string;
    setMessageContent: (content: string) => void;
    specialRequest: string;
    setSpecialRequest: (req: string) => void;

    // Logic
    isSameAsOrderer: boolean;
    setIsSameAsOrderer: (isSame: boolean) => void;

    formatPhoneNumber: (value: string) => string;
    recentRibbonMessages?: { sender: string; content: string }[];

    // New props for delivery fee automation
    itemSize: 'small' | 'medium' | 'large';
    setItemSize: (size: 'small' | 'medium' | 'large') => void;
    isExpress: boolean;
    setIsExpress: (isExpress: boolean) => void;
}

export function FulfillmentSection({
    receiptType,
    setReceiptType,
    scheduleDate,
    setScheduleDate,
    scheduleTime,
    setScheduleTime,
    timeOptions,
    recipientName,
    setRecipientName,
    recipientContact,
    setRecipientContact,
    deliveryAddress,
    setDeliveryAddress,
    deliveryAddressDetail,
    setDeliveryAddressDetail,
    onAddressSearch,
    messageType,
    setMessageType,
    messageContent,
    setMessageContent,
    specialRequest,
    setSpecialRequest,
    isSameAsOrderer,
    setIsSameAsOrderer,
    formatPhoneNumber,
    recentRibbonMessages,
    itemSize,
    setItemSize,
    isExpress,
    setIsExpress
}: FulfillmentSectionProps) {
    const locale = usePreferredLocale();
    const isKo = toBaseLocale(locale) === "ko";
    const tr = (koText: string, enText: string) => (isKo ? koText : enText);

    const isDelivery = receiptType === 'delivery_reservation';

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold">{tr("수령 및 배송 정보", "Pickup & Delivery Info")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* 1. Receipt type */}
                    <div className="grid grid-cols-3 gap-4">
                        <div
                            className={cn(
                                "cursor-pointer border rounded-md p-4 flex flex-col items-center justify-center space-y-2 transition-all",
                                receiptType === "store_pickup" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-accent"
                            )}
                            onClick={() => setReceiptType("store_pickup")}
                        >
                            <span className="text-lg">🏪</span>
                            <div className="font-semibold text-sm">{tr("매장 픽업", "Store Pickup")}</div>
                            <div className="text-xs text-muted-foreground text-center">{tr("지금 바로 방문", "Visit now")}</div>
                        </div>
                        <div
                            className={cn(
                                "cursor-pointer border rounded-md p-4 flex flex-col items-center justify-center space-y-2 transition-all",
                                receiptType === "pickup_reservation" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-accent"
                            )}
                            onClick={() => setReceiptType("pickup_reservation")}
                        >
                            <span className="text-lg">📅</span>
                            <div className="font-semibold text-sm">{tr("픽업 예약", "Pickup Reservation")}</div>
                            <div className="text-xs text-muted-foreground text-center">{tr("나중에 방문", "Visit later")}</div>
                        </div>
                        <div
                            className={cn(
                                "cursor-pointer border rounded-md p-4 flex flex-col items-center justify-center space-y-2 transition-all",
                                receiptType === "delivery_reservation" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-accent"
                            )}
                            onClick={() => setReceiptType("delivery_reservation")}
                        >
                            <span className="text-lg">🚚</span>
                            <div className="font-semibold text-sm">{tr("배송 예약", "Delivery Reservation")}</div>
                            <div className="text-xs text-muted-foreground text-center">{tr("원하는 곳으로 배송", "Deliver to destination")}</div>
                        </div>
                    </div>

                    {/* 2. 일시 선택 */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{tr("날짜", "Date")}</Label>
                            <Popover>
                                <PopoverTrigger className={cn(
                                    "w-full h-10 flex items-center justify-start text-left font-normal border rounded-md px-3 bg-background hover:bg-muted transition-colors",
                                    !scheduleDate && "text-muted-foreground"
                                )}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {scheduleDate ? format(scheduleDate, isKo ? "yyyy년 MM월 dd일" : "yyyy-MM-dd", { locale: ko }) : <span className="text-sm">{tr("날짜 선택", "Select date")}</span>}
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={scheduleDate}
                                        onSelect={setScheduleDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <Label>{tr("시간", "Time")}</Label>
                            <Select value={scheduleTime} onValueChange={setScheduleTime}>
                                <SelectTrigger>
                                    <SelectValue placeholder={tr("시간 선택", "Select time")} />
                                </SelectTrigger>
                                <SelectContent>
                                    {timeOptions.map((time) => (
                                        <SelectItem key={time} value={time}>
                                            {time}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* 3. 대상 정보 (수령인/픽업자) */}
                    <div className="space-y-4 pt-2 border-t">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold">{isDelivery ? tr("받는 분", "Recipient") : tr("픽업 하시는 분", "Pickup Person")}</Label>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="sameAsOrderer"
                                    checked={isSameAsOrderer}
                                    onCheckedChange={(checked) => setIsSameAsOrderer(checked as boolean)}
                                />
                                <Label htmlFor="sameAsOrderer" className="text-sm font-normal cursor-pointer text-muted-foreground">{tr("주문자와 동일", "Same as orderer")}</Label>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{tr("이름", "Name")}</Label>
                                <Input
                                    value={recipientName}
                                    onChange={(e: any) => setRecipientName(e.target.value)}
                                    placeholder={isDelivery ? tr("받는분 성함", "Recipient name") : tr("픽업자 성함", "Pickup person name")}
                                    disabled={isSameAsOrderer}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{tr("연락처", "Contact")}</Label>
                                <Input
                                    value={recipientContact}
                                    onChange={(e: any) => setRecipientContact(formatPhoneNumber(e.target.value))}
                                    placeholder="010-0000-0000"
                                    maxLength={13}
                                    disabled={isSameAsOrderer}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 4. 배송 옵션 (상품규격 및 급행) */}
                    {isDelivery && (
                        <div className="space-y-4 pt-2 border-t">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">{tr("상품규격 (배송비 추가)", "Item size (adds delivery fee)")}</Label>
                                    <RadioGroup
                                        value={itemSize}
                                        onValueChange={(val) => setItemSize(val as 'small' | 'medium' | 'large')}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="small" id="size-small" />
                                            <Label htmlFor="size-small" className="cursor-pointer">{tr("소품(기본)", "Small (default)")}</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="medium" id="size-medium" />
                                            <Label htmlFor="size-medium" className="cursor-pointer">{tr("중품(+3,000)", "Medium (+3,000)")}</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="large" id="size-large" />
                                            <Label htmlFor="size-large" className="cursor-pointer">{tr("대품(+5,000)", "Large (+5,000)")}</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">{tr("배송 특이사항", "Delivery Options")}</Label>
                                    <div className="flex items-center space-x-2 h-10">
                                        <Checkbox
                                            id="isExpress"
                                            checked={isExpress}
                                            onCheckedChange={(checked) => setIsExpress(checked as boolean)}
                                        />
                                        <Label htmlFor="isExpress" className="text-sm font-normal cursor-pointer text-orange-600 font-bold">
                                            {tr("급행 배송 예약 (+10,000원)", "Express delivery (+10,000)")}
                                        </Label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 5. 주소 (배송일 경우만) */}
                    {isDelivery && (
                        <div className="space-y-4 pt-2 border-t">
                            <Label className="text-base font-semibold">{tr("배송지 정보", "Delivery Address")}</Label>
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <Input
                                        value={deliveryAddress}
                                        onChange={(e: any) => setDeliveryAddress(e.target.value)}
                                        placeholder={tr("주소 입력 또는 검색", "Enter or search address")}
                                        className="flex-1"
                                    />
                                    <Button type="button" onClick={onAddressSearch} variant="secondary">
                                        <Search className="w-4 h-4 mr-2" />
                                        {tr("주소 검색", "Search")}
                                    </Button>
                                </div>
                                <Input
                                    value={deliveryAddressDetail}
                                    onChange={(e: any) => setDeliveryAddressDetail(e.target.value)}
                                    placeholder={tr("상세 주소를 입력하세요 (예: 101동 101호)", "Enter detail address (e.g. Apt 101-101)")}
                                />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 메시지 및 요청사항 */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold">{tr("메시지 및 요청사항", "Message & Requests")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <RadioGroup value={messageType} onValueChange={(v) => setMessageType(v as MessageType)} className="flex gap-6">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="card" id="msg-card" />
                            <Label htmlFor="msg-card">{tr("메시지 카드", "Message Card")}</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="ribbon" id="msg-ribbon" />
                            <Label htmlFor="msg-ribbon">{tr("리본", "Ribbon")}</Label>
                        </div>
                    </RadioGroup>

                    {messageType === 'ribbon' && recentRibbonMessages && recentRibbonMessages.length > 0 && (
                        <div className="p-3 bg-muted/30 rounded-md border notranslate" translate="no">
                            <Label className="text-xs text-muted-foreground mb-2 block">{tr("기존 메시지 불러오기", "Load previous messages")}</Label>
                            <Select onValueChange={(val: string | null) => {
                                if (!val) return;
                                try {
                                    const msg = JSON.parse(val);
                                    if (msg.content) {
                                        // 메시지와 보내는 분을 합쳐서 세팅 (기존 입력 방식 준수)
                                        setMessageContent(`${msg.content}${msg.sender ? ' / ' + msg.sender : ''}`);
                                    }
                                } catch (e: any) { }
                            }}>
                                <SelectTrigger className="h-8 text-sm bg-white">
                                    <SelectValue placeholder={tr("이전 문구 선택...", "Select previous text...")} />
                                </SelectTrigger>
                                <SelectContent>
                                    {recentRibbonMessages.map((msg, idx) => (
                                        <SelectItem key={idx} value={JSON.stringify(msg)} className="py-2">
                                            <div className="flex flex-col items-start gap-1 text-left">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                                        {msg.sender || tr('보내는분 미입력', 'No sender')}
                                                    </span>
                                                </div>
                                                <span className="text-sm text-muted-foreground px-1">
                                                    {msg.content}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>{tr("메시지 내용", "Message Content")}</Label>
                        {messageType === 'card' ? (
                            <Textarea
                                value={messageContent}
                                onChange={(e: any) => setMessageContent(e.target.value)}
                                placeholder={tr("카드에 들어갈 내용을 자유롭게 입력하세요.", "Enter text for the message card.")}
                                className="min-h-[100px]"
                            />
                        ) : (
                            <div className="space-y-2">
                                {/* 인기 리본 문구 퀵 버튼 */}
                                <div className="flex flex-wrap gap-1.5 mb-2 notranslate" translate="no">
                                    {[
                                        { ko: "축발전", zh: "祝發展" },
                                        { ko: "축개업", zh: "祝開業" },
                                        { ko: "축승진", zh: "祝昇進" },
                                        { ko: "축영전", zh: "祝榮轉" },
                                        { ko: "근조", zh: "謹弔" },
                                        { ko: "축결혼", zh: "祝結婚" },
                                    ].map((msg) => (
                                        <Button
                                            key={msg.ko}
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-7 px-2 text-[11px] bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary font-medium"
                                            onClick={() => {
                                                const content = `${msg.ko} / ${msg.zh}`;
                                                setMessageContent(content);
                                            }}
                                        >
                                            {msg.ko} / {msg.zh}
                                        </Button>
                                    ))}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-7 px-2 text-[11px] bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700 font-medium"
                                        onClick={() => setMessageContent("삼가 故人의 冥福을 빕니다")}
                                    >
                                        {tr("삼가 故人의 冥福을 빕니다", "Rest in peace")}
                                    </Button>
                                </div>
                                <Input
                                    value={messageContent}
                                    onChange={(e: any) => setMessageContent(e.target.value)}
                                    translate="no"
                                    className="notranslate"
                                    placeholder={tr("메시지 / 보내는분 (예: 축결혼 / 홍길동) - 보내는분 미입력시 주문자명 사용", "Message / sender (e.g. Congrats / Alex) - sender defaults to orderer")}
                                />
                                <p className="text-xs text-muted-foreground">{tr("* 메시지와 보내는 분을 '/' 로 구분해서 입력하세요.", "* Separate message and sender with '/'.")}</p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>{tr("요청 사항 (주문서 참고용)", "Special Request (for order sheet)")}</Label>
                        <Textarea
                            value={specialRequest}
                            onChange={(e: any) => setSpecialRequest(e.target.value)}
                            placeholder={tr("제작 시 참고할 사항이나 배송 기사님께 전달할 메시지를 입력하세요", "Enter production notes or delivery message")}
                            className="h-20 resize-none"
                        />
                    </div>
                </CardContent>
            </Card >
        </div >
    );
}
