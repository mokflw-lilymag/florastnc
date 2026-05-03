import { getMessages } from "@/i18n/getMessages";
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
    const tf = getMessages(locale).tenantFlows;
    const updateQuantity = (index: number, delta: number) => {
        const newItems = [...orderItems];
        newItems[index].quantity = Math.max(1, newItems[index].quantity + delta);
        setOrderItems(newItems);
    };

    const removeItem = (index: number) => {
        setOrderItems(orderItems.filter((_, i) => i !== index));
    };

    const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: any }[] = [
        { value: "card", label: tf.f00704, icon: CreditCard },
        { value: "cash", label: tf.f00769, icon: Banknote },
        { value: "transfer", label: tf.f00057, icon: Coins },
        { value: "mainpay", label: tf.f00211, icon: Smartphone },
        { value: "shopping_mall", label: tf.f00368, icon: Globe },
        { value: "epay", label: "e-Pay", icon: Smartphone },
        { value: "kakao", label: tf.f00712, icon: Smartphone },
        { value: "apple", label: tf.f00432, icon: Smartphone },
    ];

    return (
        <Card className="h-[calc(100vh-2rem)] flex flex-col sticky top-4">
            <CardHeader className="pb-2 bg-muted/30">
                <CardTitle>{tf.f00045}</CardTitle>
            </CardHeader>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* 1. Order Items List */}
                <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-muted-foreground mb-2">{tf.f00600}</h4>
                    {orderItems.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground text-sm">
                            {tf.f00360}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {orderItems.map((item, index) => (
                                <div key={`${item.id}-${index}`} className="flex items-start justify-between bg-white p-3 rounded-md border shadow-sm">
                                    <div className="flex-1 min-w-0 mr-2">
                                        <div className="font-medium text-sm truncate">{item.name}</div>
                                        <div className="text-xs text-muted-foreground">{item.price.toLocaleString()}{tf.f00487}</div>
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
                            <Label>{tf.f00762}</Label>
                        <Select
                            value={selectedDiscountRate === -1 ? "custom" : selectedDiscountRate.toString()}
                            onValueChange={(val) => {
                                if (val === 'custom') setSelectedDiscountRate(-1); // -1 for custom
                                else setSelectedDiscountRate(Number(val));
                            }}
                        >
                            <SelectTrigger className="w-[140px] h-8 text-xs">
                                <SelectValue placeholder={tf.f00761} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="0">{tf.f00545}</SelectItem>
                                {(activeDiscountRates || []).map((rate: any) => (
                                    <SelectItem key={rate.rate} value={rate.rate.toString()}>
                                        {rate.label || `${rate.rate}%`}
                                    </SelectItem>
                                ))}
                                {/* Use rate.label if available, or just rate% */}
                                <SelectItem value="custom">{tf.f00668}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {selectedDiscountRate === -1 && (
                        <Input
                            type="number"
                            placeholder={tf.f00763}
                            value={customDiscountRate}
                            onChange={(e) => setCustomDiscountRate(Number(e.target.value))}
                            className="mt-2 text-right"
                        />
                    )}

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>{tf.f00260}</Label>
                            <div className="flex items-center space-x-2">
                                <span className={cn("text-xs", deliveryFeeType === 'auto' ? "font-bold" : "text-muted-foreground")}>{tf.f00533}</span>
                                <Switch
                                    checked={deliveryFeeType === 'manual'}
                                    onCheckedChange={(checked) => setDeliveryFeeType(checked ? 'manual' : 'auto')}
                                />
                                <span className={cn("text-xs", deliveryFeeType === 'manual' ? "font-bold" : "text-muted-foreground")}>{tf.f00373}</span>
                            </div>
                        </div>
                        {deliveryFeeType === 'manual' && (
                            <Input
                                type="number"
                                placeholder={tf.f00261}
                                value={manualDeliveryFee}
                                onChange={(e) => setManualDeliveryFee(Number(e.target.value))}
                                className="text-right"
                            />
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label className="flex justify-between">
                            <span>{tf.f00732}</span>
                            <span className="text-xs text-muted-foreground font-normal">{tf.f00285}: {maxPoints?.toLocaleString()} P</span>
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
                            >{tf.f00551}</Button>
                        </div>
                    </div>
                </div>

                <Separator />

                {/* 3. Payment Method */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <Label>{tf.f00049}</Label>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="splitPay"
                                checked={isSplitPaymentEnabled}
                                onCheckedChange={(c) => setIsSplitPaymentEnabled(c as boolean)}
                            />
                            <Label htmlFor="splitPay" className="text-xs font-normal cursor-pointer">{tf.f00289}</Label>
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
                                <Label className="text-xs">{tf.f00015}</Label>
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
                                <Label className="text-xs">{tf.f00018}</Label>
                                <div className="flex gap-2">
                                    <Select value={secondPaymentMethod} onValueChange={(v) => setSecondPaymentMethod(v as PaymentMethod)}>
                                        <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <div className="flex-1 h-8 flex items-center justify-end px-3 border rounded bg-muted text-xs font-medium">
                                        {(orderSummary.total - firstPaymentAmount).toLocaleString()}{tf.f00487}
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
                            <CheckCircle2 className="w-4 h-4 mr-1" /> {tf.f00051}
                        </Button>
                        <Button
                            variant={paymentStatus === 'pending' ? 'default' : 'outline'}
                            size="sm"
                            className="flex-1"
                            onClick={() => setPaymentStatus('pending')}
                        >
                            <Circle className="w-4 h-4 mr-1" /> {tf.f00222}
                        </Button>
                    </div>
                </div>
            </div>

            {/* 4. Footer Totals */}
            <CardFooter className="flex-col bg-muted/50 p-4 border-t">
                <div className="w-full space-y-2 text-sm mb-4">
                    <div className="flex justify-between text-muted-foreground">
                        <span>{tf.f00336}</span>
                        <span>{orderSummary.subtotal.toLocaleString()}{tf.f00487}</span>
                    </div>
                    {orderSummary.discountAmount > 0 && (
                        <div className="flex justify-between text-red-500">
                            <span>{tf.f00759}</span>
                            <span>- {orderSummary.discountAmount.toLocaleString()}{tf.f00487}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-muted-foreground">
                        <span>{tf.f00259}</span>
                        <span>+ {orderSummary.deliveryFee.toLocaleString()}{tf.f00487}</span>
                    </div>
                    {orderSummary.pointsUsed > 0 && (
                        <div className="flex justify-between text-blue-500">
                            <span>{tf.f00732}</span>
                            <span>- {orderSummary.pointsUsed.toLocaleString()}{tf.f00487}</span>
                        </div>
                    )}
                    <Separator className="my-2" />
                    <div className="flex justify-between font-bold text-lg">
                        <span>{tf.f00692}</span>
                        <span className="text-primary">{orderSummary.total.toLocaleString()}{tf.f00487}</span>
                    </div>
                </div>

                <Button
                    className="w-full py-6 text-lg"
                    size="lg"
                    onClick={onSubmit}
                    disabled={isSubmitting || orderItems.length === 0}
                >
                    {isSubmitting ? tf.f00677 : `${orderSummary.total.toLocaleString()}${tf.f00488}`}
                </Button>
            </CardFooter>
        </Card>
    );
}
