import { getMessages } from "@/i18n/getMessages";
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
import { cn } from "@/lib/utils";
import { dateFnsLocaleForBase } from "@/lib/date-fns-locale";
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
    const tf = getMessages(locale).tenantFlows;
    const dateLocale = dateFnsLocaleForBase(toBaseLocale(locale));
    const isDelivery = receiptType === 'delivery_reservation';

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold">{tf.f00379}</CardTitle>
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
                            <div className="font-semibold text-sm">{tf.f00194}</div>
                            <div className="text-xs text-muted-foreground text-center">{tf.f00660}</div>
                        </div>
                        <div
                            className={cn(
                                "cursor-pointer border rounded-md p-4 flex flex-col items-center justify-center space-y-2 transition-all",
                                receiptType === "pickup_reservation" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-accent"
                            )}
                            onClick={() => setReceiptType("pickup_reservation")}
                        >
                            <span className="text-lg">📅</span>
                            <div className="font-semibold text-sm">{tf.f00753}</div>
                            <div className="text-xs text-muted-foreground text-center">{tf.f00126}</div>
                        </div>
                        <div
                            className={cn(
                                "cursor-pointer border rounded-md p-4 flex flex-col items-center justify-center space-y-2 transition-all",
                                receiptType === "delivery_reservation" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-accent"
                            )}
                            onClick={() => setReceiptType("delivery_reservation")}
                        >
                            <span className="text-lg">🚚</span>
                            <div className="font-semibold text-sm">{tf.f00245}</div>
                            <div className="text-xs text-muted-foreground text-center">{tf.f00490}</div>
                        </div>
                    </div>

                    {/* 2. 일시 선택 */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{tf.f00127}</Label>
                            <Popover>
                                <PopoverTrigger className={cn(
                                    "w-full h-10 flex items-center justify-start text-left font-normal border rounded-md px-3 bg-background hover:bg-muted transition-colors",
                                    !scheduleDate && "text-muted-foreground"
                                )}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {scheduleDate
                                      ? format(scheduleDate, "PPP", { locale: dateLocale })
                                      : <span className="text-sm">{tf.f00129}</span>}
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={scheduleDate}
                                        onSelect={setScheduleDate}
                                        initialFocus
                                        locale={dateLocale}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <Label>{tf.f00409}</Label>
                            <Select value={scheduleTime} onValueChange={setScheduleTime}>
                                <SelectTrigger>
                                    <SelectValue placeholder={tf.f00411} />
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
                            <Label className="text-base font-semibold">{isDelivery ? tf.f00228 : tf.f00755}</Label>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="sameAsOrderer"
                                    checked={isSameAsOrderer}
                                    onCheckedChange={(checked) => setIsSameAsOrderer(checked as boolean)}
                                />
                                <Label htmlFor="sameAsOrderer" className="text-sm font-normal cursor-pointer text-muted-foreground">{tf.f00648}</Label>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{tf.f00500}</Label>
                                <Input
                                    value={recipientName}
                                    onChange={(e: any) => setRecipientName(e.target.value)}
                                    placeholder={isDelivery ? tf.f00229 : tf.f00757}
                                    disabled={isSameAsOrderer}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{tf.f00444}</Label>
                                <Input
                                    value={recipientContact}
                                    onChange={(e: any) => setRecipientContact(formatPhoneNumber(e.target.value))}
                                    placeholder={tf.f02603}
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
                                    <Label className="text-sm font-medium">{tf.f00337}</Label>
                                    <RadioGroup
                                        value={itemSize}
                                        onValueChange={(val) => setItemSize(val as 'small' | 'medium' | 'large')}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="small" id="size-small" />
                                            <Label htmlFor="size-small" className="cursor-pointer">{tf.f00365}</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="medium" id="size-medium" />
                                            <Label htmlFor="size-medium" className="cursor-pointer">{tf.f00658}</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="large" id="size-large" />
                                            <Label htmlFor="size-large" className="cursor-pointer">{tf.f00151}</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">{tf.f00256}</Label>
                                    <div className="flex items-center space-x-2 h-10">
                                        <Checkbox
                                            id="isExpress"
                                            checked={isExpress}
                                            onCheckedChange={(checked) => setIsExpress(checked as boolean)}
                                        />
                                        <Label htmlFor="isExpress" className="text-sm font-normal cursor-pointer text-orange-600 font-bold">
                                            {tf.f00107}
                                        </Label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 5. 주소 (배송일 경우만) */}
                    {isDelivery && (
                        <div className="space-y-4 pt-2 border-t">
                            <Label className="text-base font-semibold">{tf.f00275}</Label>
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <Input
                                        value={deliveryAddress}
                                        onChange={(e: any) => setDeliveryAddress(e.target.value)}
                                        placeholder={tf.f00652}
                                        className="flex-1"
                                    />
                                    <Button type="button" onClick={onAddressSearch} variant="secondary">
                                        <Search className="w-4 h-4 mr-2" />
                                        {tf.f00651}
                                    </Button>
                                </div>
                                <Input
                                    value={deliveryAddressDetail}
                                    onChange={(e: any) => setDeliveryAddressDetail(e.target.value)}
                                    placeholder={tf.f00317}
                                />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 메시지 및 요청사항 */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold">{tf.f00202}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <RadioGroup value={messageType} onValueChange={(v) => setMessageType(v as MessageType)} className="flex gap-6">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="card" id="msg-card" />
                            <Label htmlFor="msg-card">{tf.f00207}</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="ribbon" id="msg-ribbon" />
                            <Label htmlFor="msg-ribbon">{tf.f00179}</Label>
                        </div>
                    </RadioGroup>

                    {messageType === 'ribbon' && recentRibbonMessages && recentRibbonMessages.length > 0 && (
                        <div className="p-3 bg-muted/30 rounded-md border notranslate" translate="no">
                            <Label className="text-xs text-muted-foreground mb-2 block">{tf.f00112}</Label>
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
                                    <SelectValue placeholder={tf.f00510} />
                                </SelectTrigger>
                                <SelectContent>
                                    {recentRibbonMessages.map((msg, idx) => (
                                        <SelectItem key={idx} value={JSON.stringify(msg)} className="py-2">
                                            <div className="flex flex-col items-start gap-1 text-left">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                                        {msg.sender || tf.f00284}
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
                        <Label>{tf.f00200}</Label>
                        {messageType === 'card' ? (
                            <Textarea
                                value={messageContent}
                                onChange={(e: any) => setMessageContent(e.target.value)}
                                placeholder={tf.f00709}
                                className="min-h-[100px]"
                            />
                        ) : (
                            <div className="space-y-2">
                                {/* 인기 리본 문구 퀵 버튼 */}
                                <div className="flex flex-wrap gap-1.5 mb-2 notranslate" translate="no">
                                    {[tf.f02597, tf.f02598, tf.f02599, tf.f02600, tf.f02601, tf.f02602].map((msg, idx) => (
                                        <Button
                                            key={idx}
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-7 px-2 text-[11px] bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary font-medium"
                                            onClick={() => setMessageContent(msg)}
                                        >
                                            {msg}
                                        </Button>
                                    ))}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-7 px-2 text-[11px] bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700 font-medium"
                                        onClick={() => setMessageContent(tf.f00310)}
                                    >
                                        {tf.f00310}
                                    </Button>
                                </div>
                                <Input
                                    value={messageContent}
                                    onChange={(e: any) => setMessageContent(e.target.value)}
                                    translate="no"
                                    className="notranslate"
                                    placeholder={tf.f00199}
                                />
                                <p className="text-xs text-muted-foreground">{tf.f00003}</p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>{tf.f00482}</Label>
                        <Textarea
                            value={specialRequest}
                            onChange={(e: any) => setSpecialRequest(e.target.value)}
                            placeholder={tf.f00578}
                            className="h-20 resize-none"
                        />
                    </div>
                </CardContent>
            </Card >
        </div >
    );
}
