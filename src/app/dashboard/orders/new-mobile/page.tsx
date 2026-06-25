"use client";

import React, { useState, useMemo, useEffect, useCallback, memo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import Textarea from "@/components/ui/textarea";
import { toast } from "sonner";
import { Minus, Plus, Trash2, Store, Search, Calendar as CalendarIcon, ChevronRight, User, MapPin, CreditCard, ShoppingBag, X, ChevronUp, ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
type Branch = { id: string; name: string; type?: string; deliveryFees?: { district: string; fee: number }[]; };
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useOrders } from "@/hooks/use-orders";
import { OrderData } from "@/types/order";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useProducts } from "@/hooks/use-products";
import { Product } from "@/types/product";
import { useCustomers } from "@/hooks/use-customers";
import { Customer } from "@/types/customer";
import { enqueuePrintJob } from "@/lib/print-service";
import { useAuth } from "@/hooks/use-auth";
import { useDiscountSettings } from "@/hooks/use-discount-settings";
import { createClient } from '@/utils/supabase/client';
const supabase = createClient();
import debounce from "lodash/debounce";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  NEW_ORDER_PAYMENT_METHODS,
  getNewOrderPaymentMethodLabel,
  selectOrderPaymentMethod,
  type OrderPaymentMethod,
} from "@/lib/order-payment-methods";
import { getMessages } from "@/i18n/getMessages";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { usePosConnection } from "@/hooks/use-pos-connection";
import {
  requiresPosApprovalBeforeSave,
  requestPosPaymentApproval,
  CARD_APPROVAL_FAILED_MESSAGE,
} from "@/lib/order-payment-gate";
import {
  clearOrderFormDraft,
  ORDER_SAVE_FAILED_KEEP_FORM_HINT,
  type OrderFormDraft,
} from "@/lib/order-form-draft";
import { useOrderFormDraft } from "@/hooks/use-order-form-draft";
import { CardPaymentConfirmDialog } from "../new/components/CardPaymentConfirmDialog";
import { PaymentApprovalFailedBanner } from "../new/components/PaymentApprovalFailedBanner";

// --- TYPES ---
interface OrderItem extends Product {
    quantity: number;
    isCustomProduct?: boolean;
}

type ReceiptType = "store_pickup" | "pickup_reservation" | "delivery_reservation";
type PaymentMethod = OrderPaymentMethod;
type PaymentStatus = "pending" | "paid" | "completed" | "split_payment";
type MessageType = "card" | "ribbon" | "none";

declare global {
    interface Window {
        daum: any;
    }
}

// --- UTILS ---
const formatPhoneNumber = (value: string) => {
    const raw = value.replace(/[^0-9]/g, '');
    let result = '';

    if (raw.startsWith('02')) {
        if (raw.length < 3) return raw;
        if (raw.length < 6) result = `${raw.slice(0, 2)}-${raw.slice(2)}`;
        else if (raw.length < 10) result = `${raw.slice(0, 2)}-${raw.slice(2, 5)}-${raw.slice(5)}`;
        else result = `${raw.slice(0, 2)}-${raw.slice(2, 6)}-${raw.slice(6, 10)}`;
    } else {
        if (raw.length < 4) return raw;
        if (raw.length < 7) result = `${raw.slice(0, 3)}-${raw.slice(3)}`;
        else if (raw.length < 11) result = `${raw.slice(0, 3)}-${raw.slice(3, 6)}-${raw.slice(6)}`;
        else result = `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7, 11)}`;
    }
    return result;
};

// --- SUB-COMPONENTS (Memoized) ---

const BranchSelector = memo(({ isAdmin, branches, selectedBranch, onSelect }: { isAdmin: boolean, branches: Branch[], selectedBranch: Branch | null, onSelect: (b: Branch | null) => void }) => {
    const router = useRouter();
    return (
        <div className="bg-white sticky top-0 z-10 shadow-sm border-b">
            <div className="p-4 pb-2">
                <div className="flex items-center justify-between mb-2">
                    <h1 className="font-bold text-lg">모바일 주문접수</h1>
                </div>
                {!selectedBranch ? (
                    <Select onValueChange={(v) => {
                        const b = branches.find(b => b.id === v);
                        if (b) onSelect(b);
                    }}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="지점을 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                            {branches.filter(b => b.type !== '본사').map(b => (
                                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                ) : (
                    <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium" onClick={() => isAdmin && onSelect(null)}>
                        <Store className="h-4 w-4" />
                        {selectedBranch.name}
                        {isAdmin && <span className="text-xs text-gray-400 ml-auto">(변경)</span>}
                    </div>
                )}
            </div>

            {/* Quick Navigation Tabs */}
            <div className="px-3 pt-2 flex gap-1 border-t">
                <button
                    onClick={() => router.push("/dashboard/pos/pickup")}
                    className="flex-1 py-2 text-xs font-bold text-gray-400 hover:bg-gray-50 border-b-4 border-transparent transition-all whitespace-nowrap"
                >
                    📦 픽업/배송
                </button>
                <button
                    onClick={() => router.push("/dashboard/pos/quick")}
                    className="flex-1 py-2 text-xs font-bold text-gray-400 hover:bg-gray-50 border-b-4 border-transparent transition-all whitespace-nowrap"
                >
                    ⚡ 빠른판매 POS
                </button>
                <button
                    className="flex-1 py-2 text-xs font-black border-b-4 border-blue-500 text-blue-600 bg-blue-50/50 rounded-t-xl transition-all whitespace-nowrap"
                >
                    📝 주문접수(mobile)
                </button>
            </div>
        </div>
    );
});
BranchSelector.displayName = "BranchSelector";

const OrdererSection = memo(({
    ordererName, setOrdererName,
    ordererContact, setOrdererContact,
    ordererCompany, setOrdererCompany,
    ordererEmail, setOrdererEmail,
    selectedCustomer, setSelectedCustomer,
    isRegisterCustomer, setIsRegisterCustomer,
    marketingConsent, setMarketingConsent,
    isAnonymous, setIsAnonymous,
    onOpenSearch
}: any) => {
    return (
        <Card>
            <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base flex justify-between items-center">
                    주문자 정보
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onOpenSearch}>
                        <Search className="h-3 w-3 mr-1" /> 고객검색
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                        <Label className="text-xs text-muted-foreground">회사명</Label>
                        <Input value={ordererCompany} onChange={e => setOrdererCompany(e.target.value)} className="h-9" placeholder="회사명을 입력하세요" />
                    </div>
                    <div>
                        <Label className="text-xs text-muted-foreground">이메일 (선택)</Label>
                        <Input
                            type="email"
                            value={ordererEmail}
                            onChange={e => setOrdererEmail(e.target.value)}
                            className="h-9"
                            placeholder="example@email.com"
                        />
                    </div>
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug -mt-1">
                    제작·배송 완료 시 연락은 이메일로 전달됩니다.
                </p>
                <div className="flex gap-2">
                    <div className="flex-1">
                        <Label className="text-xs text-muted-foreground">이름</Label>
                        <Input value={ordererName} onChange={e => setOrdererName(e.target.value)} className="h-9" />
                    </div>
                    <div className="flex-[1.5]">
                        <Label className="text-xs text-muted-foreground">연락처</Label>
                        <Input value={ordererContact} onChange={e => setOrdererContact(formatPhoneNumber(e.target.value))} type="tel" className="h-9" />
                    </div>
                </div>
                {selectedCustomer && (
                    <div className="bg-green-50 p-2 rounded text-xs text-green-700 flex justify-between">
                        <span>보유 포인트: {selectedCustomer.points?.toLocaleString() ?? 0}P</span>
                        <span className="font-bold cursor-pointer" onClick={() => setSelectedCustomer(null)}>x</span>
                    </div>
                )}
                <div className="flex items-start space-x-2 pt-2">
                    <Checkbox id="register-customer" checked={isRegisterCustomer} onCheckedChange={(c) => setIsRegisterCustomer(!!c)} />
                    <Label htmlFor="register-customer" className="text-[11px] leading-tight font-normal text-muted-foreground pt-0.5">
                        이 주문자 정보를 고객으로 등록/업데이트합니다.<br />(포인트 적립/사용 포함)
                    </Label>
                </div>
                {isRegisterCustomer && (
                    <div className="flex items-start space-x-2 pt-2 mt-1 ml-2 pl-2 border-l-2 border-pink-100">
                        <Checkbox id="marketing-consent" checked={marketingConsent} onCheckedChange={(c) => setMarketingConsent(!!c)} />
                        <Label htmlFor="marketing-consent" className="text-[11px] leading-tight font-normal text-pink-700 pt-0.5 cursor-pointer">
                            마케팅 및 알림톡/문자 수신 동의
                        </Label>
                    </div>
                )}
                <div className="flex items-start space-x-2 pt-2 mt-1 border-t border-dashed">
                    <Checkbox id="is-anonymous" checked={isAnonymous} onCheckedChange={(c) => setIsAnonymous(!!c)} />
                    <div className="grid gap-0.5">
                        <Label htmlFor="is-anonymous" className="text-xs font-medium leading-none pt-0.5">익명으로 보내기</Label>
                        <p className="text-[10px] text-muted-foreground">체크 시 인수증 및 리본/카드에 주문자 이름이 노출되지 않습니다.</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
});
OrdererSection.displayName = "OrdererSection";

const ProductListSection = memo(({ orderItems, updateQuantity, removeProduct, onOpenProductSheet, disabled }: any) => {
    return (
        <Card>
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base">주문 상품</CardTitle>
                <Button size="sm" onClick={onOpenProductSheet} disabled={disabled}>+ 상품 추가</Button>
            </CardHeader>
            <CardContent className="p-4 pt-2">
                {orderItems.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-sm bg-gray-50 rounded-lg border border-dashed">
                        상품을 추가해주세요
                    </div>
                ) : (
                    <div className="space-y-3">
                        {orderItems.map((item: any, idx: number) => (
                            <div key={item.id || idx} className="flex items-center justify-between bg-white p-2 rounded border shadow-sm">
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">{item.name}</div>
                                    <div className="text-xs text-muted-foreground">{item.price.toLocaleString()}원</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQuantity(item.id, -1)}><Minus className="h-3 w-3" /></Button>
                                    <span className="w-4 text-center text-sm font-medium">{item.quantity}</span>
                                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQuantity(item.id, 1)}><Plus className="h-3 w-3" /></Button>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => removeProduct(item.id)}><Trash2 className="h-3 w-3" /></Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
});
ProductListSection.displayName = "ProductListSection";

const FulfillmentSection = memo(({
    receipt_type, setReceiptType,
    scheduleDate, setScheduleDate,
    scheduleTime, setScheduleTime,
    recipientName, setRecipientName,
    recipientContact, setRecipientContact,
    isSameAsOrderer, setIsSameAsOrderer,
    deliveryAddress, setDeliveryAddress,
    deliveryAddressDetail, setDeliveryAddressDetail,
    handleAddressSearch,
    deliveryFeeType, setDeliveryFeeType,
    manualDeliveryFee, setManualDeliveryFee,
    orderSummary,
    selectedDistrict
}: any) => {
    return (
        <Card>
            <Tabs value={receipt_type} onValueChange={(v) => setReceiptType(v as ReceiptType)} className="w-full">
                <TabsList className="grid w-full grid-cols-3 p-1">
                    <TabsTrigger value="store_pickup" className="text-xs">매장픽업</TabsTrigger>
                    <TabsTrigger value="pickup_reservation" className="text-xs">픽업예약</TabsTrigger>
                    <TabsTrigger value="delivery_reservation" className="text-xs">배송예약</TabsTrigger>
                </TabsList>
                <div className="p-4 space-y-4">
                    {receipt_type !== 'store_pickup' && (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs">날짜</Label>
                                <Popover>
                                    <PopoverTrigger render={(props) => (
                                        <Button {...props} variant="outline" className={cn("w-full pl-3 text-left font-normal h-9", !scheduleDate && "text-muted-foreground")}>
                                            {scheduleDate ? format(scheduleDate, "MM-dd") : <span>선택</span>}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    )} />
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar mode="single" selected={scheduleDate} onSelect={setScheduleDate} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div>
                                <Label className="text-xs">시간</Label>
                                <Select value={scheduleTime} onValueChange={setScheduleTime}>
                                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {Array.from({ length: 30 }, (_, i) => {
                                            const h = Math.floor(i / 2) + 9;
                                            const m = i % 2 === 0 ? "00" : "30";
                                            return `${h}:${m}`;
                                        }).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                    <div className="space-y-3 pt-2 border-t">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold">{receipt_type === 'delivery_reservation' ? '받는 분' : '수령인 정보'}</Label>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="same-as-orderer" checked={isSameAsOrderer} onCheckedChange={(c) => setIsSameAsOrderer(!!c)} />
                                <Label htmlFor="same-as-orderer" className="text-xs font-normal">주문자와 동일</Label>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Input value={recipientName} onChange={e => { setRecipientName(e.target.value); setIsSameAsOrderer(false); }} placeholder="이름" className="h-9 flex-1" />
                            <Input value={recipientContact} onChange={e => { setRecipientContact(formatPhoneNumber(e.target.value)); setIsSameAsOrderer(false); }} type="tel" placeholder="연락처" className="h-9 flex-[1.5]" />
                        </div>
                    </div>
                    {receipt_type === 'delivery_reservation' && (
                        <div className="space-y-3 pt-2 border-t">
                            <div>
                                <Label className="text-xs">배송지</Label>
                                <div className="flex gap-2">
                                    <Input value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder="주소 입력 또는 검색" className="h-9 flex-1 text-xs" />
                                    <Button variant="outline" size="sm" onClick={handleAddressSearch} className="h-9 px-3"><Search className="h-4 w-4" /></Button>
                                </div>
                                <Input value={deliveryAddressDetail} onChange={e => setDeliveryAddressDetail(e.target.value)} placeholder="상세주소" className="mt-2 h-9 text-xs" />
                            </div>
                            <div className="bg-orange-50 p-2 rounded text-xs text-orange-800 space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="flex items-center gap-2">
                                        <span>배송비</span>
                                        {deliveryFeeType === 'auto' && selectedDistrict && <span className="text-[10px] text-orange-600/80">({selectedDistrict})</span>}
                                    </span>
                                    <div className="flex items-center space-x-1">
                                        <Label htmlFor="manual-delivery-fee" className="text-[10px] font-normal cursor-pointer text-orange-700">직접 입력</Label>
                                        <Switch id="manual-delivery-fee" className="scale-75 origin-right" checked={deliveryFeeType === 'manual'} onCheckedChange={(c) => setDeliveryFeeType(c ? 'manual' : 'auto')} />
                                    </div>
                                </div>
                                {deliveryFeeType === 'manual' ? (
                                    <div className="flex justify-end items-center gap-1">
                                        <Input type="number" value={manualDeliveryFee} onChange={e => setManualDeliveryFee(Number(e.target.value))} className="h-8 w-24 text-right bg-white text-orange-900 border-orange-200" />
                                        <span className="font-bold">원</span>
                                    </div>
                                ) : (
                                    <div className="flex justify-end"><span className="font-bold">{orderSummary.deliveryFee.toLocaleString()}원</span></div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </Tabs>
        </Card>
    );
});
FulfillmentSection.displayName = "FulfillmentSection";

const MessagePaymentSection = memo(({
    messageType, setMessageType,
    messageContent, setMessageContent,
    specialRequest, setSpecialRequest,
    deliveryRequest, setDeliveryRequest,
    recentRibbonMessages,
    canApplyDiscount, selectedDiscountRate, setSelectedDiscountRate,
    customDiscountRate, setCustomDiscountRate,
    discountRates, discountAmount,
    selectedCustomer, usedPoints, setUsedPoints,
    orderSummary, handleUseAllPoints,
    paymentMethod, setPaymentMethod,
    paymentStatus, setPaymentStatus,
    cardApprovalError,
    onClearCardApprovalError,
    paymentSectionRef,
}: any) => {
    const locale = usePreferredLocale();
    const tf = getMessages(locale).tenantFlows;

    return (
        <Card>
            <CardContent className="p-4 space-y-4">
                <div>
                    <Label className="text-xs font-medium mb-2 block">메시지</Label>
                    <RadioGroup value={messageType} onValueChange={(v) => { setMessageType(v as MessageType); setMessageContent(''); }} className="flex gap-4 mb-2">
                        <div className="flex items-center space-x-2"><RadioGroupItem value="card" id="m1" /><Label htmlFor="m1" className="text-xs">카드</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="ribbon" id="m2" /><Label htmlFor="m2" className="text-xs">리본</Label></div>
                    </RadioGroup>

                    {messageType === 'ribbon' && (
                        <div className="space-y-3">
                            {/* 표준 문구 예제 (PC 버전 레퍼런스) */}
                            <div>
                                <Label className="text-[10px] text-gray-500 mb-2 block">표준 문구 (클릭 시 입력)</Label>
                                <div className="flex flex-wrap gap-1.5">
                                    {[
                                        { label: "축발전 / 祝發展", color: "bg-white text-gray-700 border-gray-200" },
                                        { label: "축개업 / 祝開業", color: "bg-white text-gray-700 border-gray-200" },
                                        { label: "축승진 / 祝昇進", color: "bg-white text-gray-700 border-gray-200" },
                                        { label: "축영전 / 祝榮轉", color: "bg-white text-gray-700 border-gray-200" },
                                        { label: "근조 / 謹弔", color: "bg-white text-gray-700 border-gray-200" },
                                        { label: "축결혼 / 祝結婚", color: "bg-white text-gray-700 border-gray-200" },
                                        { label: "삼가 故人의 冥福을 빕니다", color: "bg-orange-50 text-orange-700 border-orange-200" }
                                    ].map((preset, idx) => (
                                        <Badge 
                                            key={idx} 
                                            variant="outline" 
                                            className={cn("cursor-pointer py-1 px-2 text-[10px] font-normal transition-all hover:border-primary", preset.color)}
                                            onClick={() => setMessageContent(preset.label)}
                                        >
                                            {preset.label}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            {/* 고객별 과거 이력 (기존 기능 유지) */}
                            {recentRibbonMessages && recentRibbonMessages.length > 0 && (
                                <div>
                                    <Label className="text-[10px] text-gray-500 mb-1 block">이 고객의 최근 문구</Label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {recentRibbonMessages.map((msg: any, idx: number) => (
                                            <Badge 
                                                key={idx} 
                                                variant="secondary" 
                                                className="cursor-pointer hover:bg-primary hover:text-white transition-colors py-1 px-2 text-[10px] font-normal border-none bg-gray-100"
                                                onClick={() => {
                                                    const combined = msg.sender ? `${msg.content} / ${msg.sender}` : msg.content;
                                                    setMessageContent(combined);
                                                }}
                                            >
                                                {msg.content}
                                                {msg.sender && <span className="ml-1 opacity-60">({msg.sender})</span>}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Input
                                    placeholder="메시지 / 보내는분 (예: 축결혼 / 홍길동) - 보내는분 미입력시 주문자명 사용"
                                    className="h-9 text-sm"
                                    value={messageContent}
                                    onChange={e => setMessageContent(e.target.value)}
                                />
                                <p className="text-[10px] text-muted-foreground">* 메시지와 보내는 분을 '/' 로 구분해서 입력하세요.</p>
                            </div>
                        </div>
                    )}

                    {messageType === 'card' && (
                        <Textarea
                            placeholder="카드에 들어갈 내용을 자유롭게 입력하세요."
                            className="h-20 text-sm"
                            value={messageContent}
                            onChange={e => setMessageContent(e.target.value)}
                        />
                    )}

                    <Separator className="my-2" />
                    <div>
                        <Label className="text-xs font-medium mb-2 block">요청 사항 (주문서 참고용)</Label>
                        <Textarea 
                            placeholder="제작 시 참고할 사항을 입력하세요"
                            className="h-16 text-sm"
                            value={specialRequest}
                            onChange={(e) => setSpecialRequest(e.target.value)}
                        />
                    </div>
                    <div className="mt-4">
                        <Label className="text-xs font-medium mb-2 block">배송 요청 사항 (기사님 전달용)</Label>
                        <Textarea 
                            placeholder="배송 기사님께 전달할 메시지를 입력하세요 (예: 문 앞에 두고 문자주세요)"
                            className="h-16 text-sm"
                            value={deliveryRequest}
                            onChange={(e) => setDeliveryRequest(e.target.value)}
                        />
                    </div>
                </div>
                <Separator />
                {canApplyDiscount && (
                    <div>
                        <Label className="text-xs font-medium mb-2 block">할인 적용</Label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {discountRates.map((rate: any) => (
                                <Button key={rate.rate} variant={selectedDiscountRate === rate.rate ? "default" : "outline"} size="sm" onClick={() => { setSelectedDiscountRate(rate.rate); setCustomDiscountRate(0); }} className="text-xs h-8">
                                    {rate.label}
                                </Button>
                            ))}
                            <div className="flex items-center gap-1 border rounded px-2 bg-white">
                                <Input type="number" placeholder="직접" className="border-0 h-8 w-12 text-center p-0 text-xs focus-visible:ring-0" value={customDiscountRate || ''} onChange={(e) => { const val = Number(e.target.value); setCustomDiscountRate(val); if (val > 0) setSelectedDiscountRate(0); }} />
                                <span className="text-xs text-muted-foreground">%</span>
                            </div>
                        </div>
                        {discountAmount > 0 && <div className="text-right text-xs text-green-600 font-bold mb-2">-{discountAmount.toLocaleString()}원 할인</div>}
                    </div>
                )}
                <Separator />
                {selectedCustomer && (
                    <div>
                        <Label className="text-xs font-medium mb-2 flex justify-between">포인트 사용 <span className="text-muted-foreground font-normal">보유: {selectedCustomer.points?.toLocaleString() ?? 0}P</span></Label>
                        <div className="flex gap-2">
                            <Input type="number" value={usedPoints || ''} onChange={(e) => setUsedPoints(Number(e.target.value))} placeholder="사용 포인트" className="h-9 text-right" />
                            <Button variant="outline" size="sm" onClick={handleUseAllPoints} className="whitespace-nowrap h-9">전액사용</Button>
                        </div>
                        {!orderSummary.canUsePoints && selectedCustomer.points > 0 && <p className="text-[10px] text-amber-600 mt-1">※ 5,000원 이상 결제 시 사용 가능</p>}
                    </div>
                )}
                <Separator />
                <div ref={paymentSectionRef} id="order-payment-section">
                    {cardApprovalError ? (
                        <div className="mb-3">
                            <PaymentApprovalFailedBanner
                                message={cardApprovalError}
                                onClear={onClearCardApprovalError}
                                setPaymentMethod={setPaymentMethod}
                                setPaymentStatus={setPaymentStatus}
                            />
                        </div>
                    ) : null}
                    <Label className="text-xs font-medium mb-2 block">결제 수단</Label>
                    <div className="grid grid-cols-4 gap-2">
                        {NEW_ORDER_PAYMENT_METHODS.map((m) => (
                            <div
                                key={m}
                                className={cn(
                                    "border rounded p-2 text-center text-xs font-medium cursor-pointer transition-colors px-1",
                                    paymentMethod === m ? "bg-primary text-white border-primary" : "bg-white hover:bg-gray-50"
                                )}
                                onClick={() => selectOrderPaymentMethod(m, setPaymentMethod, setPaymentStatus, onClearCardApprovalError)}
                            >
                                {getNewOrderPaymentMethodLabel(m, tf)}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex justify-between items-center bg-gray-100 p-2 rounded">
                    <span className="text-xs">결제 상태</span>
                    <Switch checked={paymentStatus === 'paid'} onCheckedChange={(c) => setPaymentStatus(c ? 'paid' : 'pending')} />
                    <span className={cn("text-xs font-bold", paymentStatus === 'paid' ? "text-green-600" : "text-gray-500")}>
                        {paymentStatus === 'paid' ? '결제완료' : '미수금'}
                    </span>
                </div>
            </CardContent>
        </Card>
    );
});
MessagePaymentSection.displayName = "MessagePaymentSection";

// --- CUSTOMER SEARCH SHEET ---
const CustomerSearchSheet = memo(({ open, onOpenChange, onSelect, customers }: any) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<Customer[]>([]);

    const handleSearch = useCallback(debounce((query: string) => {
        if (query.length < 2) { setSearchResults([]); return; }
        const searchTerm = query.toLowerCase();
        const filtered = customers.filter((c: any) =>
            c.name.toLowerCase().includes(searchTerm) ||
            c.contact.includes(searchTerm) ||
            c.company_name?.toLowerCase().includes(searchTerm)
        );
        setSearchResults(filtered);
    }, 300), [customers]);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="h-[80vh] flex flex-col p-0 rounded-t-xl">
                <SheetHeader className="p-4 border-b">
                    <SheetTitle>고객 검색</SheetTitle>
                    <SheetDescription>
                        이름, 전화번호 또는 회사명으로 고객을 검색할 수 있습니다.
                    </SheetDescription>
                    <Input
                        placeholder="이름, 전화번호 또는 회사명 검색"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            handleSearch(e.target.value);
                        }}
                        className="mt-2"
                    />
                </SheetHeader>
                <div className="flex-1 overflow-y-auto p-4">
                    {searchResults.map(c => (
                        <div key={c.id} className="py-2 border-b flex justify-between items-center" onClick={() => { onSelect(c); onOpenChange(false); }}>
                            <div>
                                <div className="font-bold text-sm">
                                    {c.name}
                                    {c.company_name && <span className="text-xs text-muted-foreground ml-1">({c.company_name})</span>}
                                </div>
                                <div className="text-xs text-gray-500">{c.contact}</div>
                            </div>
                            <Badge variant="outline" className="text-xs">{c.points?.toLocaleString() ?? 0}P</Badge>
                        </div>
                    ))}
                    {searchQuery.length >= 2 && searchResults.length === 0 && (
                        <div className="text-center py-10 text-muted-foreground text-sm">검색 결과가 없습니다</div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
});
CustomerSearchSheet.displayName = "CustomerSearchSheet";

// --- PRODUCT SELECTION SHEET ---
const ProductSelectionSheet = memo(({ open, onOpenChange, categorizedProducts, onAddProduct, orderItems, onOpenCustomProduct }: any) => {
    const [activeTab, setActiveTab] = useState("전체");
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const keys = Object.keys(categorizedProducts);
        if (keys.length > 0 && (!activeTab || !keys.includes(activeTab))) {
            if (!keys.includes("전체")) {
                setActiveTab(keys[0]);
            } else {
                setActiveTab("전체");
            }
        }
    }, [categorizedProducts, activeTab]);

    const getProductQuantity = (id: string) => {
        return orderItems.find((item: any) => item.id === id)?.quantity || 0;
    };

    const subtotal = orderItems.reduce((acc: number, i: any) => acc + (i.price * i.quantity), 0);

    const filteredCategorizedProducts = useMemo(() => {
        const result: any = {};
        Object.keys(categorizedProducts).forEach(key => {
            const products = categorizedProducts[key];
            if (!searchTerm.trim()) {
                result[key] = products;
            } else {
                result[key] = products.filter((p: any) => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
            }
        });
        return result;
    }, [categorizedProducts, searchTerm]);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="h-[80vh] flex flex-col p-0 rounded-t-xl">
                <SheetHeader className="p-4 border-b flex flex-row items-center justify-between">
                    <div>
                        <SheetTitle>상품 선택</SheetTitle>
                        <SheetDescription className="text-xs text-muted-foreground">
                            카테고리별 상품을 선택하여 주문에 추가할 수 있습니다.
                        </SheetDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={onOpenCustomProduct}>직접 입력</Button>
                </SheetHeader>
                <div className="px-4 pt-2">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="상품 검색..."
                            className="pl-8 h-9 text-sm bg-gray-50"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                    <div className="mx-4 mt-2 overflow-x-auto no-scrollbar">
                        <TabsList className="inline-flex w-max min-w-full p-1 h-10">
                            {Object.keys(categorizedProducts).map(cat => (
                                <TabsTrigger key={cat} value={cat} className="px-4 text-xs whitespace-nowrap">
                                    {cat}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                        {Object.entries(filteredCategorizedProducts).map(([key, products]) => (
                            <TabsContent key={key} value={key} className="mt-0 grid grid-cols-2 gap-2">
                                {(products as any[]).map(p => {
                                    const qty = getProductQuantity(p.id);
                                    return (
                                        <div key={p.id} className={cn("p-2 border rounded-lg relative cursor-pointer", qty > 0 ? "border-blue-500 bg-blue-50" : "bg-white")} onClick={() => onAddProduct(p)}>
                                            {qty > 0 && <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center">{qty}</Badge>}
                                            <div className="text-sm font-semibold truncate">{p.name}</div>
                                            <div className="text-xs text-gray-500">{p.price.toLocaleString()}원</div>
                                        </div>
                                    );
                                })}
                            </TabsContent>
                        ))}
                    </div>
                </Tabs>
                <div className="p-4 border-t bg-white safe-area-bottom">
                    <Button className="w-full" onClick={() => onOpenChange(false)}>
                        선택 완료 (합계: {subtotal.toLocaleString()}원)
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
});
ProductSelectionSheet.displayName = "ProductSelectionSheet";

// --- MAIN PAGE ---

export default function NewOrderMobilePage() {
    const { user, profile, tenantId, isLoading: authLoading } = useAuth();
    const branches = tenantId ? [{ id: tenantId, name: profile?.tenants?.name || "Floxync", type: '가맹점' }] : [];
    const branchesLoading = authLoading;
    const { products: allProducts, loading: productsLoading, fetchProducts } = useProducts(true, true, true);
    const { orders, addOrder } = useOrders();
    const { customers } = useCustomers();
    const { discountSettings, canApplyDiscount, getActiveDiscountRates } = useDiscountSettings();
      const router = useRouter();

    // 지점이 선택되면 해당 지점의 상품 목록을 가져옴


    // --- STATE ---
    const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

    // 유저 정보 로드 시 자동 지점 선택
    useEffect(() => {
        if (!selectedBranch && user && branches.length > 0) {
            const uBranch = user.franchise || (user as any).tenant_name || (user as any).tenantName;
            if (uBranch) {
                const found = branches.find(b => b.name.trim() === uBranch.trim());
                if (found) setSelectedBranch(found);
            }
        }
    }, [user, branches, selectedBranch]);

    // 지점이 선택되면 해당 지점의 상품 목록을 가져옴
    useEffect(() => {
        if (selectedBranch) {
            fetchProducts();
        }
    }, [selectedBranch, fetchProducts]);
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

    // Orderer
    const [ordererName, setOrdererName] = useState("");
    const [ordererContact, setOrdererContact] = useState("");
    const [ordererCompany, setOrdererCompany] = useState("");
    const [ordererEmail, setOrdererEmail] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [isRegisterCustomer, setIsRegisterCustomer] = useState(true);
    const [marketingConsent, setMarketingConsent] = useState(true);
    const [recentRibbonMessages, setRecentRibbonMessages] = useState<{ sender: string; content: string }[]>([]);
    const [messageType, setMessageType] = useState<MessageType>("card");
    const [messageContent, setMessageContent] = useState("");
    const [specialRequest, setSpecialRequest] = useState("");
    const [deliveryRequest, setDeliveryRequest] = useState("");

    const applyLastOrderPreferences = useCallback(async (contact: string, company?: string) => {
        try {
            if (!contact && (!company || !company.trim())) return;

            let query = supabase
                .from('orders')
                .select('payment')
                .order('order_date', { ascending: false })
                .limit(1);

            if (company && company.trim()) {
                query = query.eq('orderer->>company', company.trim());
            } else {
                query = query.eq('orderer->>contact', contact);
            }

            const { data, error } = await query;
            if (error) throw error;

            if (data && data.length > 0) {
                const lastOrder = data[0];
                if (lastOrder.payment) {
                    const payment = lastOrder.payment as any;
                    if (payment.method) setPaymentMethod(payment.method as PaymentMethod);
                    if (payment.status) setPaymentStatus(payment.status as PaymentStatus);
                }
            }
        } catch (error) {
            console.error("Error applying last order preferences:", error);
        }
    }, []);

    // --- 리본 메세지 이력 가져오기 (PC 버전과 동일) ---
    useEffect(() => {
        const fetchRecentRibbonMessages = async () => {
            if (messageType !== 'ribbon' || !selectedCustomer || !selectedCustomer.contact) {
                setRecentRibbonMessages([]);
                return;
            }

            try {
                const { data: ordersData, error } = await supabase
                    .from('orders')
                    .select('message, extra_data, orderer')
                    .eq('orderer->>contact', selectedCustomer.contact)
                    .or('message->>type.eq.ribbon,extra_data->message->>type.eq.ribbon')
                    .order('order_date', { ascending: false })
                    .limit(20);

                if (error) throw error;

                const messages: { sender: string; content: string }[] = [];
                const seen = new Set<string>();

                ordersData?.forEach(row => {
                    const msg = (row.message && Object.keys(row.message).length > 0) ? row.message : (row.extra_data?.message || {});
                    if (msg.type === 'ribbon' && msg.content) {
                        const sender = msg.sender || row.orderer?.name || '';
                        const content = msg.content;
                        const key = `${sender}|${content}`;
                        if (!seen.has(key)) {
                            seen.add(key);
                            messages.push({ sender, content });
                        }
                    }
                });

                setRecentRibbonMessages(messages.slice(0, 10));
            } catch (error) {
                console.error("Error fetching ribbon history:", error);
            }
        };

        fetchRecentRibbonMessages();
    }, [messageType, selectedCustomer]);

    // Fulfillment
    const [receipt_type, setReceiptType] = useState<ReceiptType>("store_pickup");
    const [scheduleDate, setScheduleDate] = useState<Date | undefined>(new Date());
    const [scheduleTime, setScheduleTime] = useState("10:00");
    const [recipientName, setRecipientName] = useState("");
    const [recipientContact, setRecipientContact] = useState("");
    const [isSameAsOrderer, setIsSameAsOrderer] = useState(true);
    const [deliveryAddress, setDeliveryAddress] = useState("");
    const [deliveryAddressDetail, setDeliveryAddressDetail] = useState("");
    const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
    const [manualDeliveryFee, setManualDeliveryFee] = useState(0);
    const [deliveryFeeType, setDeliveryFeeType] = useState<"auto" | "manual">("auto");

    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
    const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("paid");
    const [selectedDiscountRate, setSelectedDiscountRate] = useState<number>(0);
    const [customDiscountRate, setCustomDiscountRate] = useState<number>(0);
    const [usedPoints, setUsedPoints] = useState(0);

    // UI State
    const [isProductSheetOpen, setIsProductSheetOpen] = useState(false);
    const [isCustomerSheetOpen, setIsCustomerSheetOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSummaryOpen, setIsSummaryOpen] = useState(false);
    const [cardApprovalError, setCardApprovalError] = useState<string | null>(null);
    const [cardPayDialogOpen, setCardPayDialogOpen] = useState(false);
    const paymentSectionRef = useRef<HTMLDivElement>(null);
    const cardPayResolverRef = useRef<((approved: boolean) => void) | null>(null);

    const clearCardApprovalError = useCallback(() => setCardApprovalError(null), []);

    const promptManualCardPayment = useCallback(() => {
        return new Promise<{ ok: true } | { ok: false; message: string }>((resolve) => {
            cardPayResolverRef.current = (approved: boolean) => {
                if (approved) resolve({ ok: true });
                else resolve({ ok: false, message: CARD_APPROVAL_FAILED_MESSAGE });
            };
            setCardPayDialogOpen(true);
        });
    }, []);

    const scrollToPaymentSection = useCallback(() => {
        paymentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        setIsSummaryOpen(true);
    }, []);

    const [isCustomProductDialogOpen, setIsCustomProductDialogOpen] = useState(false);
    const [customProductName, setCustomProductName] = useState("");
    const [customProductPrice, setCustomProductPrice] = useState("");
    const [customProductQuantity, setCustomProductQuantity] = useState(1);

    const { counterPaymentAvailable } = usePosConnection();

    const orderFormDraftSaveTrigger = useMemo(
        () =>
            JSON.stringify({
                orderItems,
                ordererName,
                ordererContact,
                ordererCompany,
                ordererEmail,
                selectedCustomerId: selectedCustomer?.id ?? null,
                isAnonymous,
                isRegisterCustomer,
                marketingConsent,
                receipt_type,
                scheduleDate: scheduleDate?.toISOString() ?? null,
                scheduleTime,
                recipientName,
                recipientContact,
                isSameAsOrderer,
                deliveryAddress,
                deliveryAddressDetail,
                selectedDistrict,
                deliveryFeeType,
                manualDeliveryFee,
                messageType,
                messageContent,
                specialRequest,
                deliveryRequest,
                paymentMethod,
                paymentStatus,
                usedPoints,
                selectedDiscountRate,
                customDiscountRate,
            }),
        [
            orderItems,
            ordererName,
            ordererContact,
            ordererCompany,
            ordererEmail,
            selectedCustomer,
            isAnonymous,
            isRegisterCustomer,
            marketingConsent,
            receipt_type,
            scheduleDate,
            scheduleTime,
            recipientName,
            recipientContact,
            isSameAsOrderer,
            deliveryAddress,
            deliveryAddressDetail,
            selectedDistrict,
            deliveryFeeType,
            manualDeliveryFee,
            messageType,
            messageContent,
            specialRequest,
            deliveryRequest,
            paymentMethod,
            paymentStatus,
            usedPoints,
            selectedDiscountRate,
            customDiscountRate,
        ]
    );

    const buildOrderFormDraft = useCallback((): OrderFormDraft | null => {
        if (!tenantId) return null;
        return {
            version: 1,
            tenantId,
            variant: "mobile",
            savedAt: new Date().toISOString(),
            orderItems,
            ordererName,
            ordererContact,
            ordererCompany,
            ordererEmail: ordererEmail,
            isAnonymous,
            registerCustomer: isRegisterCustomer,
            marketingConsent,
            registerAnniversaryFromOrder: false,
            selectedCustomer: selectedCustomer
                ? {
                      id: selectedCustomer.id,
                      name: selectedCustomer.name,
                      contact: selectedCustomer.contact,
                      company_name: selectedCustomer.company_name,
                      points: selectedCustomer.points,
                  }
                : null,
            receipt_type,
            scheduleDate: scheduleDate?.toISOString() ?? null,
            scheduleTime,
            recipientName,
            recipientContact,
            isSameAsOrderer,
            deliveryAddress,
            deliveryAddressDetail,
            selectedDistrict,
            deliveryFeeType,
            manualDeliveryFee,
            messageType,
            messageContent,
            specialRequest,
            deliveryRequest,
            paymentMethod,
            paymentStatus,
            usedPoints,
            selectedDiscountRate,
            customDiscountRate,
        };
    }, [
        tenantId,
        orderItems,
        ordererName,
        ordererContact,
        ordererCompany,
        ordererEmail,
        isAnonymous,
        isRegisterCustomer,
        marketingConsent,
        selectedCustomer,
        receipt_type,
        scheduleDate,
        scheduleTime,
        recipientName,
        recipientContact,
        isSameAsOrderer,
        deliveryAddress,
        deliveryAddressDetail,
        selectedDistrict,
        deliveryFeeType,
        manualDeliveryFee,
        messageType,
        messageContent,
        specialRequest,
        deliveryRequest,
        paymentMethod,
        paymentStatus,
        usedPoints,
        selectedDiscountRate,
        customDiscountRate,
    ]);

    const applyOrderFormDraft = useCallback((draft: OrderFormDraft) => {
        setOrderItems(
            draft.orderItems.map((item) => ({
                ...item,
                stock: item.stock ?? 999,
            })) as OrderItem[]
        );
        setOrdererName(draft.ordererName);
        setOrdererContact(draft.ordererContact);
        setOrdererCompany(draft.ordererCompany);
        setOrdererEmail(draft.ordererEmail || "");
        setIsAnonymous(draft.isAnonymous);
        setIsRegisterCustomer(draft.registerCustomer);
        setMarketingConsent(draft.marketingConsent);
        setSelectedCustomer(
            draft.selectedCustomer
                ? ({
                      id: draft.selectedCustomer.id,
                      name: draft.selectedCustomer.name,
                      contact: draft.selectedCustomer.contact,
                      company_name: draft.selectedCustomer.company_name ?? undefined,
                      points: draft.selectedCustomer.points ?? 0,
                  } as Customer)
                : null
        );
        setReceiptType(draft.receipt_type);
        if (draft.scheduleDate) {
            const parsed = new Date(draft.scheduleDate);
            if (!Number.isNaN(parsed.getTime())) setScheduleDate(parsed);
        }
        setScheduleTime(draft.scheduleTime);
        setRecipientName(draft.recipientName);
        setRecipientContact(draft.recipientContact);
        setIsSameAsOrderer(draft.isSameAsOrderer);
        setDeliveryAddress(draft.deliveryAddress);
        setDeliveryAddressDetail(draft.deliveryAddressDetail);
        setSelectedDistrict(draft.selectedDistrict);
        setDeliveryFeeType(draft.deliveryFeeType);
        setManualDeliveryFee(draft.manualDeliveryFee);
        setMessageType(draft.messageType);
        setMessageContent(draft.messageContent);
        setSpecialRequest(draft.specialRequest);
        if (draft.deliveryRequest !== undefined) setDeliveryRequest(draft.deliveryRequest);
        setPaymentMethod(draft.paymentMethod);
        setPaymentStatus(draft.paymentStatus);
        setUsedPoints(draft.usedPoints);
        setSelectedDiscountRate(draft.selectedDiscountRate);
        setCustomDiscountRate(draft.customDiscountRate);
    }, []);

    useOrderFormDraft({
        tenantId,
        variant: "mobile",
        enabled: true,
        saveTrigger: orderFormDraftSaveTrigger,
        getDraft: buildOrderFormDraft,
        applyDraft: applyOrderFormDraft,
    });

    // --- LOGIC ---
    const isAdmin = user?.role === '본사 관리자';
    const userBranch = user?.franchise;

    useEffect(() => {
        if (!isAdmin && userBranch && !selectedBranch && branches.length > 0) {
            const b = branches.find(b => b.name === userBranch);
            if (b) setSelectedBranch(b);
        }
    }, [isAdmin, userBranch, selectedBranch, branches]);

    useEffect(() => {
        if (isSameAsOrderer) {
            setRecipientName(ordererName);
            setRecipientContact(ordererContact);
        }
    }, [isSameAsOrderer, ordererName, ordererContact]);

    useEffect(() => {
        if (receipt_type === 'delivery_reservation') {
            setIsSameAsOrderer(false);
            setRecipientName("");
            setRecipientContact("");
        }
    }, [receipt_type]);

    useEffect(() => {
        if (receipt_type === 'delivery_reservation' && deliveryAddress && selectedBranch?.deliveryFees) {
            const matched = selectedBranch.deliveryFees.find(df => df.district !== '기타' && deliveryAddress.includes(df.district));
            if (matched) { setSelectedDistrict(matched.district); setDeliveryFeeType('auto'); }
        }
    }, [deliveryAddress, selectedBranch, receipt_type]);

    const orderSummary = useMemo(() => {
        const subtotal = orderItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
        const rate = selectedDiscountRate > 0 ? selectedDiscountRate : customDiscountRate;
        const discountAmount = Math.floor(subtotal * (rate / 100));
        let deliveryFee = 0;
        if (receipt_type === 'delivery_reservation') {
            if (deliveryFeeType === 'manual') deliveryFee = manualDeliveryFee;
            else if (selectedBranch && selectedDistrict) {
                const feeInfo = selectedBranch.deliveryFees?.find(df => df.district === selectedDistrict);
                deliveryFee = feeInfo ? feeInfo.fee : (selectedBranch.deliveryFees?.find(df => df.district === "기타")?.fee ?? 0);
            }
        }
        const discountedSubtotal = subtotal - discountAmount;
        const totalBeforePoints = discountedSubtotal + deliveryFee;
        const maxUsablePoints = selectedCustomer && discountedSubtotal >= 5000 ? Math.min(selectedCustomer.points || 0, totalBeforePoints) : 0;
        const actualUsedPoints = Math.min(usedPoints, maxUsablePoints);
        const finalTotal = totalBeforePoints - actualUsedPoints;
        const canApply = selectedBranch ? canApplyDiscount(selectedBranch.id, subtotal) : false;
        return { subtotal, discountAmount, discountRate: rate, deliveryFee, finalTotal, maxUsablePoints, actualUsedPoints, canUsePoints: discountedSubtotal >= 5000, canApply };
    }, [orderItems, selectedDiscountRate, customDiscountRate, receipt_type, deliveryFeeType, manualDeliveryFee, selectedBranch, selectedDistrict, usedPoints, selectedCustomer, canApplyDiscount]);

    const branchProducts = useMemo(() => {
        if (!selectedBranch) return [];
        return allProducts;
    }, [allProducts, selectedBranch]);

    // --- PC 버전과 동일한 상품 필터링/정렬 로직 ---
    const calculateTopProducts = useCallback((category: string, limit: number, isMidCategory = false) => {
        if (!branchProducts.length || !selectedBranch) return [];

        const productCounts: Record<string, number> = {};
        orders.forEach(order => {
            if (true) {
                order.items.forEach(item => {
                    if (item.id) productCounts[item.id] = (productCounts[item.id] || 0) + item.quantity;
                });
            }
        });

        let targetProducts = branchProducts;
        if (isMidCategory) {
            targetProducts = targetProducts.filter(p => {
                const mCat = (p.main_category || "").toString();
                const midCat = (p.mid_category || "").toString();
                const name = (p.name || "").toString();

                if (category === '어버이날') return mCat === '어버이날';
                if (category === '화환') return mCat.includes('화환') || midCat.includes('화환') || name.includes('화환') || name.includes('근조') || name.includes('축하');
                if (category === '동서양란') return mCat.includes('란') || midCat.includes('란') || name.includes('란') || mCat.includes('난') || midCat.includes('난') || name.includes('난') || name.includes('동양란') || name.includes('서양란') || name.includes('호접란');
                if (category === '플랜트') return mCat.includes('플랜트') || mCat.includes('관엽') || mCat.includes('공기정화');

                return mCat.includes(category) || midCat.includes(category) || name.includes(category);
            });
        } else {
            targetProducts = targetProducts.filter(p => p.main_category === category);
        }

        // '어버이날' 정렬: 영문 알파벳 시작(A1, B1...I...) → 앞, 나머지 → 뒤 (PC 버전과 동일)
        if (category === '어버이날') {
            return targetProducts
                .sort((a, b) => {
                    const nameA = a.name || "";
                    const nameB = b.name || "";
                    const aIsAlpha = /^[A-Za-z]/.test(nameA);
                    const bIsAlpha = /^[A-Za-z]/.test(nameB);
                    if (aIsAlpha && !bIsAlpha) return -1;
                    if (!aIsAlpha && bIsAlpha) return 1;
                    return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
                })
                .slice(0, limit);
        }

        // 판매 순위 정렬
        const sold = Object.entries(productCounts)
            .map(([id, count]) => ({ product: targetProducts.find(p => p.id === id), count }))
            .filter((x): x is { product: any; count: number } => x.product !== undefined)
            .sort((a, b) => b.count - a.count)
            .map(x => x.product);

        const allAvailable = [...sold];
        if (allAvailable.length < limit) {
            const remaining = targetProducts
                .filter(p => !allAvailable.find(ap => ap.id === p.id))
                .sort((a, b) => (b.stock > 0 ? 1 : 0) - (a.stock > 0 ? 1 : 0));
            allAvailable.push(...remaining);
        }
        return allAvailable.slice(0, limit);
    }, [branchProducts, selectedBranch, orders]);

    const categorizedProducts = useMemo(() => {
        if (!selectedBranch || !branchProducts.length) return {};

        const priority = ['꽃다발', '꽃바구니', '센터피스', '플랜트', '동서양란', '화환', '자재', '어버이날'];
        const sortedGroups: Record<string, any[]> = {};

        // PC 버전과 동일한 카테고리 구성
        priority.forEach(cat => {
            const products = calculateTopProducts(cat, cat === '어버이날' ? 50 : 15, true);
            if (products.length > 0) {
                sortedGroups[cat] = products;
            }
        });

        return sortedGroups;
    }, [branchProducts, orders, selectedBranch, calculateTopProducts]);


    // --- HANDLERS ---
    const handleUpdateQuantity = useCallback((id: string, delta: number) => {
        setOrderItems(prev => prev.map(item => item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item));
    }, []);

    const handleRemoveProduct = useCallback((id: string) => {
        setOrderItems(prev => prev.filter(i => i.id !== id));
    }, []);

    const handleAddProduct = useCallback((product: Product) => {
        setOrderItems(prev => {
            const existing = prev.find(i => i.id === product.id);
            if (existing) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
            return [...prev, { ...product, quantity: 1 }];
        });
    }, []);

    const handleAddressSearch = () => {
        if (window.daum && window.daum.Postcode) {
            new window.daum.Postcode({
                oncomplete: (data: any) => {
                    let full = data.address;
                    if (data.addressType === 'R') {
                        let extra = '';
                        if (data.bname !== '') extra += data.bname;
                        if (data.buildingName !== '') extra += (extra !== '' ? `, ${data.buildingName}` : data.buildingName);
                        full += (extra !== '' ? ` (${extra})` : '');
                    }
                    setDeliveryAddress(full); setDeliveryAddressDetail('');
                    const district = data.sigungu;
                    if (selectedBranch?.deliveryFees?.some(df => df.district === district)) { setSelectedDistrict(district); setDeliveryFeeType('auto'); }
                    else setSelectedDistrict("기타");
                }
            }).open();
        }
    };

    const handleSubmit = async () => {
        if (!selectedBranch) return toast.error("지점 선택 필요");
        if (orderItems.length === 0) return toast.error("상품을 담아주세요");
        setIsSubmitting(true);
        try {
            if (
                tenantId &&
                requiresPosApprovalBeforeSave(paymentMethod, counterPaymentAvailable)
            ) {
                const approval = await requestPosPaymentApproval(
                    {
                        tenantId,
                        amount: orderSummary.finalTotal,
                        method: paymentMethod,
                    },
                    { onManualConfirm: promptManualCardPayment }
                );
                if (!approval.ok) {
                    setCardApprovalError(approval.message);
                    toast.error(approval.message, { description: ORDER_SAVE_FAILED_KEEP_FORM_HINT });
                    scrollToPaymentSection();
                    return;
                }
            }

            setCardApprovalError(null);

            // 리본 메시지 파싱
            const buildMessage = () => {
                if (messageType === 'ribbon') {
                    const parts = messageContent.split('/');
                    const content = parts[0].trim();
                    const sender = parts.length > 1 ? parts.slice(1).join('/').trim() : "";
                    return { type: messageType as 'ribbon', content, sender: sender || ordererName };
                }
                return { type: messageType as 'card' | 'none', content: messageContent, sender: "" };
            };

            const orderPayload: OrderData = {
                order_date: new Date().toISOString(),
                status: 'processing',

                receipt_type,
                // PC 버전과 동일하게 필수 필드만 추려서 전달 (type 안전)
                items: orderItems.map(({ id, name, quantity, price }) => ({ id, name, quantity, price })),
                summary: {
                    subtotal: orderSummary.subtotal,
                    discountAmount: orderSummary.discountAmount,
                    discountRate: orderSummary.discountRate,
                    deliveryFee: orderSummary.deliveryFee,
                    pointsUsed: orderSummary.actualUsedPoints,
                    pointsEarned: 0,
                    total: orderSummary.finalTotal
                },
                orderer: {
                    id: selectedCustomer?.id || "",
                    name: ordererName,
                    contact: ordererContact,
                    company: ordererCompany,
                    email: ordererEmail
                },
                payment: {
                    method: paymentMethod,
                    status: paymentStatus,
                    completedAt: (paymentStatus === 'paid' || paymentStatus === 'completed') ? new Date().toISOString() : undefined,
                    isSplitPayment: false
                },
                pickup_info: (receipt_type !== 'delivery_reservation') ? {
                    date: scheduleDate ? format(scheduleDate, "yyyy-MM-dd") : '',
                    time: scheduleTime,
                    pickerName: recipientName || ordererName,
                    pickerContact: recipientContact || ordererContact
                } : null,
                delivery_info: receipt_type === 'delivery_reservation' ? {
                    date: scheduleDate ? format(scheduleDate, "yyyy-MM-dd") : '',
                    time: scheduleTime,
                    recipientName,
                    recipientContact,
                    address: `${deliveryAddress} ${deliveryAddressDetail}`.trim(),
                    district: selectedDistrict || ''
                } : null,
                message: buildMessage() as any,
                memo: specialRequest,
                extra_data: {
                    delivery_request: deliveryRequest
                }
            };

            const result = await addOrder(orderPayload);
            if (result) {
                if (tenantId) clearOrderFormDraft(tenantId, "mobile");
                // --- PRINT QUEUE TRIGGER ---
                let dbOrderType = 'store';
                if (receipt_type === 'pickup_reservation') dbOrderType = 'pickup';
                else if (receipt_type === 'delivery_reservation') dbOrderType = 'delivery';
                
                await enqueuePrintJob(supabase, selectedBranch.id, result, dbOrderType as any, orderPayload);

                router.push('/dashboard/orders');
            } else {
                toast.error("주문 저장에 실패했습니다.", { description: ORDER_SAVE_FAILED_KEEP_FORM_HINT });
            }
        } catch (e) {
            console.error('모바일 주문 접수 오류:', e);
            toast.error("예상치 못한 오류가 발생했습니다.", { description: ORDER_SAVE_FAILED_KEEP_FORM_HINT });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (authLoading || (branchesLoading && !selectedBranch)) {
        return (
            <div className="fixed inset-0 bg-white flex flex-col items-center justify-center gap-4">
                <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-500 text-sm">지점 정보를 불러오는 중...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col bg-gray-50" style={{ height: '100dvh' }}>
            <BranchSelector
                isAdmin={isAdmin}
                branches={branches}
                selectedBranch={selectedBranch}
                onSelect={setSelectedBranch}
            />

            <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-4 pb-4">
                <OrdererSection
                    ordererName={ordererName} setOrdererName={setOrdererName}
                    ordererContact={ordererContact} setOrdererContact={setOrdererContact}
                    ordererCompany={ordererCompany} setOrdererCompany={setOrdererCompany}
                    ordererEmail={ordererEmail} setOrdererEmail={setOrdererEmail}
                    selectedCustomer={selectedCustomer} setSelectedCustomer={setSelectedCustomer}
                    isRegisterCustomer={isRegisterCustomer} setIsRegisterCustomer={setIsRegisterCustomer}
                    marketingConsent={marketingConsent} setMarketingConsent={setMarketingConsent}
                    isAnonymous={isAnonymous} setIsAnonymous={setIsAnonymous}
                    onOpenSearch={() => setIsCustomerSheetOpen(true)}
                />

                <ProductListSection
                    orderItems={orderItems}
                    updateQuantity={handleUpdateQuantity}
                    removeProduct={handleRemoveProduct}
                    onOpenProductSheet={() => setIsProductSheetOpen(true)}
                    disabled={!selectedBranch}
                />

                <FulfillmentSection
                    receipt_type={receipt_type} setReceiptType={setReceiptType}
                    scheduleDate={scheduleDate} setScheduleDate={setScheduleDate}
                    scheduleTime={scheduleTime} setScheduleTime={setScheduleTime}
                    recipientName={recipientName} setRecipientName={setRecipientName}
                    recipientContact={recipientContact} setRecipientContact={setRecipientContact}
                    isSameAsOrderer={isSameAsOrderer} setIsSameAsOrderer={setIsSameAsOrderer}
                    deliveryAddress={deliveryAddress} setDeliveryAddress={setDeliveryAddress}
                    deliveryAddressDetail={deliveryAddressDetail} setDeliveryAddressDetail={setDeliveryAddressDetail}
                    handleAddressSearch={handleAddressSearch}
                    deliveryFeeType={deliveryFeeType} setDeliveryFeeType={setDeliveryFeeType}
                    manualDeliveryFee={manualDeliveryFee} setManualDeliveryFee={setManualDeliveryFee}
                    orderSummary={orderSummary}
                    selectedDistrict={selectedDistrict}
                />

                <MessagePaymentSection
                    messageType={messageType} setMessageType={setMessageType}
                    messageContent={messageContent} setMessageContent={setMessageContent}
                    specialRequest={specialRequest} setSpecialRequest={setSpecialRequest}
                    deliveryRequest={deliveryRequest} setDeliveryRequest={setDeliveryRequest}
                    recentRibbonMessages={recentRibbonMessages}
                    canApplyDiscount={orderSummary.canApply}
                    selectedDiscountRate={selectedDiscountRate} setSelectedDiscountRate={setSelectedDiscountRate}
                    customDiscountRate={customDiscountRate} setCustomDiscountRate={setCustomDiscountRate}
                    discountRates={selectedBranch ? getActiveDiscountRates(selectedBranch.id) : []}
                    discountAmount={orderSummary.discountAmount}
                    selectedCustomer={selectedCustomer}
                    usedPoints={usedPoints} setUsedPoints={setUsedPoints}
                    orderSummary={orderSummary}
                    handleUseAllPoints={() => setUsedPoints(orderSummary.maxUsablePoints)}
                    paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod}
                    paymentStatus={paymentStatus} setPaymentStatus={setPaymentStatus}
                    cardApprovalError={cardApprovalError}
                    onClearCardApprovalError={clearCardApprovalError}
                    paymentSectionRef={paymentSectionRef}
                />
            </div>
            </div>{/* end scrollable area */}

            {/* Footer - 항상 하단에 고정, 화면 크기와 무관하게 항상 보임 */}
            <div className="bg-white border-t z-20 safe-area-bottom shadow-lg flex-shrink-0">
                <div className="flex justify-center items-center py-1 cursor-pointer" onClick={() => setIsSummaryOpen(!isSummaryOpen)}>
                    <div className="w-10 h-1 bg-gray-200 rounded-full" />
                </div>
                <div className={cn("overflow-hidden transition-all duration-300 px-4", isSummaryOpen ? "max-h-36 overflow-y-auto py-2" : "max-h-0")}>
                    <div className="space-y-1 text-xs text-gray-600 pb-2">
                        {orderItems.map((item, idx) => (
                            <div key={idx} className="flex justify-between">
                                <span>{item.name} x{item.quantity}</span>
                                <span>{(item.price * item.quantity).toLocaleString()}원</span>
                            </div>
                        ))}
                        <Separator className="my-1" />
                        <div className="flex justify-between"><span>합계</span><span>{orderSummary.subtotal.toLocaleString()}원</span></div>
                        {orderSummary.deliveryFee > 0 && <div className="flex justify-between"><span>배송비</span><span>+{orderSummary.deliveryFee.toLocaleString()}원</span></div>}
                        {orderSummary.discountAmount > 0 && <div className="flex justify-between text-green-600"><span>할인</span><span>-{orderSummary.discountAmount.toLocaleString()}원</span></div>}
                        {orderSummary.actualUsedPoints > 0 && <div className="flex justify-between text-blue-600"><span>포인트</span><span>-{orderSummary.actualUsedPoints.toLocaleString()}원</span></div>}
                    </div>
                </div>
                <div className="p-4 pt-0 bg-white">
                    <div className="flex justify-between items-center mb-2" onClick={() => setIsSummaryOpen(!isSummaryOpen)}>
                        <div className="flex items-center gap-1 text-xs font-medium text-gray-500">
                            총 결제금액 {isSummaryOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                        </div>
                        <span className="text-lg font-bold text-primary">{orderSummary.finalTotal.toLocaleString()}원</span>
                    </div>
                    <Button className="w-full h-11 font-bold" onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting ? "처리중..." : "주문 접수하기"}</Button>
                </div>
            </div>

            {/* Customer Search Sheet */}
            <CustomerSearchSheet
                open={isCustomerSheetOpen}
                onOpenChange={setIsCustomerSheetOpen}
                onSelect={(c: Customer) => {
                    setSelectedCustomer(c);
                    setOrdererName(c.name);
                    setOrdererContact(c.contact);
                    setOrdererCompany(c.company_name || "");
                    setOrdererEmail(c.email || "");
                    applyLastOrderPreferences(c.contact, c.company_name || undefined);
                }}
                customers={customers}
            />

            {/* Product Selection Sheet */}
            <ProductSelectionSheet
                open={isProductSheetOpen}
                onOpenChange={setIsProductSheetOpen}
                categorizedProducts={categorizedProducts}
                onAddProduct={handleAddProduct}
                orderItems={orderItems}
                onOpenCustomProduct={() => setIsCustomProductDialogOpen(true)}
            />

            {/* Custom Product Dialog */}
            <CardPaymentConfirmDialog
                open={cardPayDialogOpen}
                onOpenChange={(open) => {
                    if (!open && cardPayResolverRef.current) {
                        cardPayResolverRef.current(false);
                        cardPayResolverRef.current = null;
                    }
                    setCardPayDialogOpen(open);
                }}
                amount={orderSummary.finalTotal}
                method={paymentMethod}
                onApproved={() => {
                    cardPayResolverRef.current?.(true);
                    cardPayResolverRef.current = null;
                    setCardPayDialogOpen(false);
                }}
                onFailed={() => {
                    cardPayResolverRef.current?.(false);
                    cardPayResolverRef.current = null;
                    setCardPayDialogOpen(false);
                }}
            />

            <Dialog open={isCustomProductDialogOpen} onOpenChange={setIsCustomProductDialogOpen}>
                <DialogContent className="max-w-xs">
                    <DialogHeader>
                        <DialogTitle>수동 상품 추가</DialogTitle>
                        <DialogDescription>
                            등록되지 않은 상품을 직접 입력하여 추가합니다.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <Label className="text-xs">상품명</Label>
                        <Input value={customProductName} onChange={e => setCustomProductName(e.target.value)} />
                        <Label className="text-xs">가격</Label>
                        <Input type="number" value={customProductPrice} onChange={e => setCustomProductPrice(e.target.value)} />
                        <Label className="text-xs">수량</Label>
                        <Input type="number" value={customProductQuantity} onChange={e => setCustomProductQuantity(Number(e.target.value))} />
                    </div>
                    <DialogFooter><Button onClick={() => {
                        const price = parseInt(customProductPrice) || 0;
                        const newItem = { id: `custom-${Date.now()}`, name: customProductName, price, quantity: customProductQuantity, isCustomProduct: true } as any;
                        setOrderItems(prev => [...prev, newItem]);
                        setCustomProductName(""); setCustomProductPrice(""); setCustomProductQuantity(1); setIsCustomProductDialogOpen(false);
                    }}>추가하기</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    
    );
}
