import { Product } from "@/types/product";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Trash2, MinusCircle, PlusCircle, CreditCard, Coins, Smartphone, Globe, Banknote, CheckCircle2, Circle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";

// Remove OrderItem import from use-orders as it may not exist there
// import { OrderItem } from "@/hooks/use-orders"; 

interface OrderItem extends Product {
    quantity: number;
    isCustomProduct?: boolean;
}

type PaymentMethod = "card" | "cash" | "transfer" | "mainpay" | "shopping_mall" | "epay" | "kakao" | "apple";
type PaymentStatus = "pending" | "paid" | "completed" | "split_payment";

interface OrderSummarySideProps {
    orderItems: any[]; // Using any to avoid circular deps if types not shared, but better to import OrderItem
    setOrderItems: React.Dispatch<React.SetStateAction<any[]>>;

    // Financials
    orderSummary: {
        subtotal: number;
        discountAmount: number;
        deliveryFee: number;
        pointsUsed: number;
        total: number;
        vat: number;
        supplyPrice: number;
    };

    // Discount & Points
    discountSettings: any; // Type from useDiscountSettings
    activeDiscountRates: any[]; // List of active discount rates
    selectedDiscountRate: number;
    setSelectedDiscountRate: (rate: number) => void;
    customDiscountRate: number;
    setCustomDiscountRate: (rate: number) => void;
    usedPoints: number;
    setUsedPoints: (points: number) => void;
    maxPoints: number; // Customer's available points

    // Delivery Fee Logic
    deliveryFeeType: "auto" | "manual";
    setDeliveryFeeType: (type: "auto" | "manual") => void;
    manualDeliveryFee: number;
    setManualDeliveryFee: (fee: number) => void;

    // Payment
    paymentMethod: PaymentMethod;
    setPaymentMethod: (method: PaymentMethod) => void;
    paymentStatus: PaymentStatus;
    setPaymentStatus: (status: PaymentStatus) => void;

    // Split Payment
    isSplitPaymentEnabled: boolean;
    setIsSplitPaymentEnabled: (enabled: boolean) => void;
    firstPaymentAmount: number;
    setFirstPaymentAmount: (amount: number) => void;
    firstPaymentMethod: PaymentMethod;
    setFirstPaymentMethod: (method: PaymentMethod) => void;
    secondPaymentMethod: PaymentMethod;
    setSecondPaymentMethod: (method: PaymentMethod) => void;

    // Actions
    onSubmit: () => void;
    isSubmitting: boolean;
}

export function OrderSummarySide({
    orderItems,
    setOrderItems,
    orderSummary,
    discountSettings,
    activeDiscountRates,
    selectedDiscountRate,
    setSelectedDiscountRate,
    customDiscountRate,
    setCustomDiscountRate,
    usedPoints,
    setUsedPoints,
    maxPoints,
    deliveryFeeType,
    setDeliveryFeeType,
    manualDeliveryFee,
    setManualDeliveryFee,
    paymentMethod,
    setPaymentMethod,
    paymentStatus,
    setPaymentStatus,
    isSplitPaymentEnabled,
    setIsSplitPaymentEnabled,
    firstPaymentAmount,
    setFirstPaymentAmount,
    firstPaymentMethod,
    setFirstPaymentMethod,
    secondPaymentMethod,
    setSecondPaymentMethod,
    onSubmit,
    isSubmitting
}: OrderSummarySideProps) {
    const locale = usePreferredLocale();
    const isKo = toBaseLocale(locale) === "ko";
    const tr = (ko: string, en: string) => (isKo ? ko : en);

    const updateQuantity = (index: number, delta: number) => {
        const newItems = [...orderItems];
        newItems[index].quantity = Math.max(1, newItems[index].quantity + delta);
        setOrderItems(newItems);
    };

    const removeItem = (index: number) => {
        setOrderItems(orderItems.filter((_, i) => i !== index));
    };

    const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: any }[] = [
        { value: "card", label: tr("카드", "Card"), icon: CreditCard },
        { value: "cash", label: tr("현금", "Cash"), icon: Banknote },
        { value: "transfer", label: tr("계좌이체", "Transfer"), icon: Coins },
        { value: "mainpay", label: tr("메인페이", "Mainpay"), icon: Smartphone },
        { value: "shopping_mall", label: tr("쇼핑몰", "Mall"), icon: Globe },
        { value: "epay", label: "e-Pay", icon: Smartphone },
        { value: "kakao", label: tr("카카오페이", "KakaoPay"), icon: Smartphone },
        { value: "apple", label: tr("애플페이", "ApplePay"), icon: Smartphone },
    ];

    return (
        <Card className="h-[calc(100vh-2rem)] flex flex-col sticky top-4">
            <CardHeader className="pb-2 bg-muted/30">
                <CardTitle>{tr("결제 금액", "Payment Summary")}</CardTitle>
            </CardHeader>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* 1. Order Items List */}
                <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-muted-foreground mb-2">{tr("주문 상품", "Order Items")}</h4>
                    {orderItems.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground text-sm">
                            {tr("선택된 상품이 없습니다.", "No selected items.")}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {orderItems.map((item, index) => (
                                <div key={`${item.id}-${index}`} className="flex items-start justify-between bg-white p-3 rounded-md border shadow-sm">
                                    <div className="flex-1 min-w-0 mr-2">
                                        <div className="font-medium text-sm truncate">{item.name}</div>
                                        <div className="text-xs text-muted-foreground">{item.price.toLocaleString()}{tr("원", " KRW")}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center border rounded-md">
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQuantity(index, -1)}>
                                                <MinusCircle className="h-3 w-3" />
                                            </Button>
                                            <span className="w-6 text-center text-sm">{item.quantity}</span>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQuantity(index, 1)}>
                                                <PlusCircle className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => removeItem(index)}>
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <Separator />

                {/* 2. Discount & Points */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                            <Label>{tr("할인 적용", "Discount")}</Label>
                        <Select
                            value={selectedDiscountRate === -1 ? "custom" : selectedDiscountRate.toString()}
                            onValueChange={(val) => {
                                if (val === 'custom') setSelectedDiscountRate(-1); // -1 for custom
                                else setSelectedDiscountRate(Number(val));
                            }}
                        >
                            <SelectTrigger className="w-[140px] h-8 text-xs">
                                <SelectValue placeholder={tr("할인 선택", "Select discount")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="0">{tr("적용 안함", "No discount")}</SelectItem>
                                {(activeDiscountRates || []).map((rate: any) => (
                                    <SelectItem key={rate.rate} value={rate.rate.toString()}>
                                        {rate.label || `${rate.rate}%`}
                                    </SelectItem>
                                ))}
                                {/* Use rate.label if available, or just rate% */}
                                <SelectItem value="custom">{tr("직접 입력", "Custom")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {selectedDiscountRate === -1 && (
                        <Input
                            type="number"
                            placeholder={tr("할인율(%)", "Discount rate(%)")}
                            value={customDiscountRate}
                            onChange={(e) => setCustomDiscountRate(Number(e.target.value))}
                            className="mt-2 text-right"
                        />
                    )}

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>{tr("배송비 설정", "Delivery Fee")}</Label>
                            <div className="flex items-center space-x-2">
                                <span className={cn("text-xs", deliveryFeeType === 'auto' ? "font-bold" : "text-muted-foreground")}>{tr("자동", "Auto")}</span>
                                <Switch
                                    checked={deliveryFeeType === 'manual'}
                                    onCheckedChange={(checked) => setDeliveryFeeType(checked ? 'manual' : 'auto')}
                                />
                                <span className={cn("text-xs", deliveryFeeType === 'manual' ? "font-bold" : "text-muted-foreground")}>{tr("수동", "Manual")}</span>
                            </div>
                        </div>
                        {deliveryFeeType === 'manual' && (
                            <Input
                                type="number"
                                placeholder={tr("배송비 입력", "Enter delivery fee")}
                                value={manualDeliveryFee}
                                onChange={(e) => setManualDeliveryFee(Number(e.target.value))}
                                className="text-right"
                            />
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label className="flex justify-between">
                            <span>{tr("포인트 사용", "Use points")}</span>
                            <span className="text-xs text-muted-foreground font-normal">{tr("보유", "Available")}: {maxPoints?.toLocaleString()} P</span>
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                type="number"
                                value={usedPoints}
                                onChange={(e) => setUsedPoints(Math.min(maxPoints, Number(e.target.value)))}
                                className="text-right"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setUsedPoints(maxPoints)}
                            >{tr("전액", "Max")}</Button>
                        </div>
                    </div>
                </div>

                <Separator />

                {/* 3. Payment Method */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <Label>{tr("결제 수단", "Payment Method")}</Label>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="splitPay"
                                checked={isSplitPaymentEnabled}
                                onCheckedChange={(c) => setIsSplitPaymentEnabled(c as boolean)}
                            />
                            <Label htmlFor="splitPay" className="text-xs font-normal cursor-pointer">{tr("복합 결제", "Split payment")}</Label>
                        </div>
                    </div>

                    {!isSplitPaymentEnabled ? (
                        <div className="grid grid-cols-4 gap-2">
                            {PAYMENT_METHODS.map((method) => (
                                <Button
                                    key={method.value}
                                    variant={paymentMethod === method.value ? "default" : "outline"}
                                    className={cn("h-16 flex flex-col p-1", paymentMethod === method.value ? "border-primary" : "")}
                                    onClick={() => setPaymentMethod(method.value)}
                                >
                                    <method.icon className="w-5 h-5 mb-1" />
                                    <span className="text-[10px]">{method.label}</span>
                                </Button>
                            ))}
                        </div>
                    ) : (
                        // Split Payment UI
                        <div className="space-y-3 bg-muted/20 p-3 rounded-md">
                            <div className="space-y-1">
                                <Label className="text-xs">{tr("1차 결제", "1st payment")}</Label>
                                <div className="flex gap-2">
                                    <Select value={firstPaymentMethod} onValueChange={(v) => setFirstPaymentMethod(v as PaymentMethod)}>
                                        <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        type="number"
                                        value={firstPaymentAmount}
                                        onChange={(e) => setFirstPaymentAmount(Number(e.target.value))}
                                        className="h-8 text-right text-xs"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">{tr("2차 결제 (잔액)", "2nd payment (remaining)")}</Label>
                                <div className="flex gap-2">
                                    <Select value={secondPaymentMethod} onValueChange={(v) => setSecondPaymentMethod(v as PaymentMethod)}>
                                        <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <div className="flex-1 h-8 flex items-center justify-end px-3 border rounded bg-muted text-xs font-medium">
                                        {(orderSummary.total - firstPaymentAmount).toLocaleString()}{tr("원", " KRW")}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between pt-2">
                        <Button
                            variant={paymentStatus === 'paid' ? 'default' : 'outline'}
                            size="sm"
                            className="flex-1 mr-2"
                            onClick={() => setPaymentStatus('paid')}
                        >
                            <CheckCircle2 className="w-4 h-4 mr-1" /> {tr("결제 완료", "Paid")}
                        </Button>
                        <Button
                            variant={paymentStatus === 'pending' ? 'default' : 'outline'}
                            size="sm"
                            className="flex-1"
                            onClick={() => setPaymentStatus('pending')}
                        >
                            <Circle className="w-4 h-4 mr-1" /> {tr("미수금(외상)", "Pending")}
                        </Button>
                    </div>
                </div>
            </div>

            {/* 4. Footer Totals */}
            <CardFooter className="flex-col bg-muted/50 p-4 border-t">
                <div className="w-full space-y-2 text-sm mb-4">
                    <div className="flex justify-between text-muted-foreground">
                        <span>{tr("상품 합계", "Subtotal")}</span>
                        <span>{orderSummary.subtotal.toLocaleString()}{tr("원", " KRW")}</span>
                    </div>
                    {orderSummary.discountAmount > 0 && (
                        <div className="flex justify-between text-red-500">
                            <span>{tr("할인", "Discount")}</span>
                            <span>- {orderSummary.discountAmount.toLocaleString()}{tr("원", " KRW")}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-muted-foreground">
                        <span>{tr("배송비", "Delivery")}</span>
                        <span>+ {orderSummary.deliveryFee.toLocaleString()}{tr("원", " KRW")}</span>
                    </div>
                    {orderSummary.pointsUsed > 0 && (
                        <div className="flex justify-between text-blue-500">
                            <span>{tr("포인트 사용", "Points")}</span>
                            <span>- {orderSummary.pointsUsed.toLocaleString()}{tr("원", " KRW")}</span>
                        </div>
                    )}
                    <Separator className="my-2" />
                    <div className="flex justify-between font-bold text-lg">
                        <span>{tr("최종 결제 금액", "Total")}</span>
                        <span className="text-primary">{orderSummary.total.toLocaleString()}{tr("원", " KRW")}</span>
                    </div>
                </div>

                <Button
                    className="w-full py-6 text-lg"
                    size="lg"
                    onClick={onSubmit}
                    disabled={isSubmitting || orderItems.length === 0}
                >
                    {isSubmitting ? tr("처리 중...", "Processing...") : `${orderSummary.total.toLocaleString()}${tr("원 결제하기", " Pay now")}`}
                </Button>
            </CardFooter>
        </Card>
    );
}
