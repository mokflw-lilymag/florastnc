"use client";
import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Loader2, Printer, PlusCircle, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { debounce } from "lodash";
import { createClient } from '@/utils/supabase/client';

import { useOrders } from '@/hooks/use-orders';
import { Order, OrderData } from "@/types/order";
import { useProducts } from '@/hooks/use-products';
import { Product } from "@/types/product";
import { useCustomers } from '@/hooks/use-customers';
import { Customer } from "@/types/customer";
import { useAuth } from "@/hooks/use-auth";
import { useDeliveryFees } from "@/hooks/use-delivery-fees";
import { useSettings } from "@/hooks/use-settings";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";

import { CustomerSection } from "./components/CustomerSection";
import { ProductSection } from "./components/ProductSection";
import { FulfillmentSection } from "./components/FulfillmentSection";
import { OrderSummarySide } from "./components/OrderSummarySide";

interface OrderItem {
  id: string;
  name: string;
  price: number;
  stock: number;
  quantity: number;
  isCustomProduct?: boolean;
}

type ReceiptType = "store_pickup" | "pickup_reservation" | "delivery_reservation";
type MessageType = "card" | "ribbon" | "none";
type PaymentMethod = "card" | "cash" | "transfer" | "mainpay" | "shopping_mall" | "epay" | "kakao" | "apple";
type PaymentStatus = "pending" | "paid" | "completed" | "split_payment";

declare global {
  interface Window {
    daum: any;
  }
}

export default function NewOrderPage() {
  const { profile, tenantId, isLoading: authLoading } = useAuth();
  const { products: allProducts, loading: productsLoading, fetchProducts } = useProducts();
  const { orders, loading: ordersLoading, addOrder, updateOrder } = useOrders();
  const { customers } = useCustomers();
  const { fees: regionFees } = useDeliveryFees();
  const { settings } = useSettings();
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('id');
  
  // --- STATE ---
  const [selectedBranch, setSelectedBranch] = useState<any | null>(null);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [lastOrderNumber, setLastOrderNumber] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize selectedBranch from profile
  useEffect(() => {
    if (tenantId && !selectedBranch && profile?.tenants) {
      setSelectedBranch({ 
        id: tenantId, 
        name: profile.tenants.name || '본점' 
      });
    }
  }, [tenantId, profile, selectedBranch]);

  useEffect(() => {
    if (selectedBranch?.id) {
      fetchProducts();
    }
  }, [selectedBranch?.id, fetchProducts]);

  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  // Custom Product Dialog
  const [isCustomProductDialogOpen, setIsCustomProductDialogOpen] = useState(false);
  const [customProductName, setCustomProductName] = useState("");
  const [customProductPrice, setCustomProductPrice] = useState("");
  const [customProductQuantity, setCustomProductQuantity] = useState(1);

  // Delivery Fee
  const [deliveryFeeType, setDeliveryFeeType] = useState<"auto" | "manual">("auto");
  const [manualDeliveryFee, setManualDeliveryFee] = useState(0);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [itemSize, setItemSize] = useState<'small' | 'medium' | 'large'>('small');
  const [isExpress, setIsExpress] = useState(false);

  // Customer & Orderer
  const [ordererName, setOrdererName] = useState("");
  const [ordererContact, setOrdererContact] = useState("");
  const [ordererCompany, setOrdererCompany] = useState("");
  const [ordererEmail, setOrdererEmail] = useState("");
  const [registerCustomer, setRegisterCustomer] = useState(false);
  const lastHasInfoRef = useRef(false);

  useEffect(() => {
    const hasInfo = (ordererName || "").trim() !== "" || 
                    (ordererContact || "").trim() !== "" || 
                    (ordererCompany || "").trim() !== "";
    
    if (hasInfo && !lastHasInfoRef.current) {
      setRegisterCustomer(true);
    } else if (!hasInfo && lastHasInfoRef.current) {
      setRegisterCustomer(false);
    }
    lastHasInfoRef.current = hasInfo;
  }, [ordererName, ordererContact, ordererCompany]);

  // Search
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Fulfillment
  const [receipt_type, setReceiptType] = useState<ReceiptType>("store_pickup");

  const getInitialTime = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const roundedMinutes = minutes < 15 ? 0 : minutes < 45 ? 30 : 0;
    const adjustedHours = minutes >= 45 ? hours + 1 : hours;
    if (adjustedHours < 7 || (adjustedHours === 7 && roundedMinutes < 30)) return "07:30";
    else if (adjustedHours >= 22) return "07:30";
    return `${String(adjustedHours).padStart(2, '0')}:${String(roundedMinutes).padStart(2, '0')}`;
  };

  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(new Date());
  const [scheduleTime, setScheduleTime] = useState(getInitialTime());
  const [recipientName, setRecipientName] = useState("");
  const [recipientContact, setRecipientContact] = useState("");
  const [isSameAsOrderer, setIsSameAsOrderer] = useState(true);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryAddressDetail, setDeliveryAddressDetail] = useState("");

  // Message
  const [messageType, setMessageType] = useState<MessageType>("card");
  const [messageContent, setMessageContent] = useState("");
  const [specialRequest, setSpecialRequest] = useState("");
  const [recentRibbonMessages, setRecentRibbonMessages] = useState<{ sender: string; content: string }[]>([]);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("paid");

  // Split Payment
  const [isSplitPaymentEnabled, setIsSplitPaymentEnabled] = useState(false);
  const [firstPaymentAmount, setFirstPaymentAmount] = useState(0);
  const [firstPaymentMethod, setFirstPaymentMethod] = useState<PaymentMethod>("card");
  const [secondPaymentMethod, setSecondPaymentMethod] = useState<PaymentMethod>("card");

  // Discount & Points
  const [usedPoints, setUsedPoints] = useState(0);
  const [selectedDiscountRate, setSelectedDiscountRate] = useState<number>(0);
  const [customDiscountRate, setCustomDiscountRate] = useState<number>(0);

  const [existingOrder, setExistingOrder] = useState<Order | null>(null);

  const formatPhoneNumber = (value: string) => {
    const raw = value.replace(/[^0-9]/g, '');
    let result = '';
    if (raw.startsWith('02')) {
      if (raw.length < 3) return raw;
      else if (raw.length < 6) result = `${raw.slice(0, 2)}-${raw.slice(2)}`;
      else if (raw.length < 10) result = `${raw.slice(0, 2)}-${raw.slice(2, 5)}-${raw.slice(5)}`;
      else result = `${raw.slice(0, 2)}-${raw.slice(2, 6)}-${raw.slice(6, 10)}`;
    } else {
      if (raw.length < 4) return raw;
      else if (raw.length < 7) result = `${raw.slice(0, 3)}-${raw.slice(3)}`;
      else if (raw.length < 11) result = `${raw.slice(0, 3)}-${raw.slice(3, 6)}-${raw.slice(6)}`;
      else result = `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7, 11)}`;
    }
    return result;
  };

  const timeOptions = useMemo(() => {
    const options = [];
    for (let h = 7; h <= 22; h++) {
      for (let m = 0; m < 60; m += 30) {
        if (h === 7 && m < 30) continue;
        if (h === 22 && m > 0) continue;
        options.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      }
    }
    return options;
  }, []);

  const calculateTopProducts = useCallback((category: string, limit: number, isMidCategory = false) => {
    if (!allProducts.length) return [];
    
    let targetProducts = allProducts;
    if (isMidCategory) {
      targetProducts = targetProducts.filter(p => {
        const mCat = p.main_category || "";
        const midCat = p.mid_category || "";
        const name = p.name || "";
        if (category === '축하화환') return mCat.includes('화환') || midCat.includes('화환') || name.includes('화환') || name.includes('축하');
        if (category === '동양란/서양란') return mCat.includes('란') || midCat.includes('란') || name.includes('란') || mCat.includes('난') || midCat.includes('난') || name.includes('난');
        if (category === '관엽식물') return mCat.includes('관엽') || mCat.includes('식물') || mCat.includes('공기정화');
        return mCat.includes(category) || midCat.includes(category) || name.includes(category);
      });
    } else {
      targetProducts = targetProducts.filter(p => p.main_category === category);
    }

    return targetProducts.slice(0, limit);
  }, [allProducts]);

  const dynamicCategories = useMemo(() => {
    if (!allProducts.length) return [];
    const priority = ['꽃다발', '꽃바구니', '센터피스', '관엽식물', '동양란/서양란', '축하화환', '부자재'];
    return priority.map(cat => ({
        name: cat,
        products: calculateTopProducts(cat, 10, true)
    })).filter(c => c.products.length > 0);
  }, [allProducts, calculateTopProducts]);

  const deliveryFee = useMemo(() => {
    if (receipt_type === 'store_pickup' || receipt_type === 'pickup_reservation') return 0;
    if (deliveryFeeType === 'manual') return manualDeliveryFee;
    
    // Find matching fee for selected district (sigungu)
    if (selectedDistrict) {
      const match = regionFees.find(f => 
        selectedDistrict.includes(f.region_name) || f.region_name.includes(selectedDistrict)
      );
      if (match) return match.fee;
    }

    return settings?.defaultDeliveryFee || 10000;
  }, [deliveryFeeType, manualDeliveryFee, receipt_type, selectedDistrict, regionFees, settings]);

  const orderSummary = useMemo(() => {
    const subtotal = orderItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const discountRate = selectedDiscountRate > 0 ? selectedDiscountRate : (selectedDiscountRate === -1 ? customDiscountRate : 0);
    const discountAmount = Math.floor(subtotal * (discountRate / 100));
    const total = subtotal - discountAmount + deliveryFee - usedPoints;
    return {
      subtotal,
      discountAmount,
      deliveryFee,
      pointsUsed: usedPoints,
      total,
      vat: Math.round(total - total / 1.1),
      supplyPrice: Math.round(total / 1.1),
    };
  }, [orderItems, deliveryFee, usedPoints, selectedDiscountRate, customDiscountRate]);

  const handleCompleteOrder = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (orderItems.length === 0) {
      toast.error('상품을 선택해주세요.');
      setIsSubmitting(false); return;
    }

    const orderPayload: OrderData = {
      status: existingOrder?.status || 'processing',
      receipt_type,
      order_date: (scheduleDate && (receipt_type === 'pickup_reservation' || receipt_type === 'delivery_reservation')) 
                  ? scheduleDate.toISOString() 
                  : new Date().toISOString(),
      items: orderItems.map(({ id, name, quantity, price }) => ({ id, name, quantity, price })),
      summary: {
        ...orderSummary,
        discountRate: selectedDiscountRate === -1 ? customDiscountRate : selectedDiscountRate,
        pointsEarned: Math.floor(orderSummary.total * 0.01)
      },
      orderer: {
        id: selectedCustomer?.id || "",
        name: ordererName,
        contact: ordererContact,
        company: ordererCompany,
        email: ordererEmail
      },
      payment: {
        method: isSplitPaymentEnabled ? 'card' : paymentMethod,
        status: isSplitPaymentEnabled ? "split_payment" : paymentStatus,
        isSplitPayment: isSplitPaymentEnabled,
        firstPaymentAmount: isSplitPaymentEnabled ? firstPaymentAmount : undefined,
        firstPaymentMethod: isSplitPaymentEnabled ? firstPaymentMethod : undefined,
        secondPaymentAmount: isSplitPaymentEnabled ? (orderSummary.total - firstPaymentAmount) : undefined,
        secondPaymentMethod: isSplitPaymentEnabled ? secondPaymentMethod : undefined,
      },
      pickup_info: (receipt_type === 'store_pickup' || receipt_type === 'pickup_reservation') ? {
        date: scheduleDate ? format(scheduleDate, "yyyy-MM-dd") : '',
        time: scheduleTime,
        pickerName: recipientName,
        pickerContact: recipientContact
      } : null,
      delivery_info: receipt_type === 'delivery_reservation' ? {
        date: scheduleDate ? format(scheduleDate, "yyyy-MM-dd") : '',
        time: scheduleTime,
        recipientName,
        recipientContact,
        address: `${deliveryAddress} ${deliveryAddressDetail}`,
        district: selectedDistrict ?? '',
        itemSize,
        isExpress,
      } : null,
      message: {
        type: messageType,
        content: messageContent
      } as any,
      memo: specialRequest
    };

    try {
      if (existingOrder) {
        await updateOrder(existingOrder.id, orderPayload);
        toast.success("주문이 수정되었습니다.");
        router.push("/dashboard/orders");
      } else {
        const resultId = await addOrder(orderPayload);
        if (resultId) {
          setLastOrderId(resultId);
          setLastOrderNumber(orderPayload.order_number || `ORD-${Date.now()}`);
          setShowSuccessDialog(true);
        }
      }
    } catch (error) {
       console.error(error);
    } finally {
       setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50/30">
      <PageHeader
        title={existingOrder ? "주문 수정" : "새 주문 등록"}
        description={existingOrder 
          ? "기존 주문 정보를 수정합니다." 
          : `${profile?.tenants?.name || "새로운 화원"}의 새로운 주문을 접수합니다.`}
      />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 h-[calc(100vh-140px)]">
        <div className="md:col-span-8 space-y-6 overflow-y-auto pr-2 pb-20 scrollbar-hide">
          <CustomerSection
            selectedBranch={selectedBranch}
            availableBranches={tenantId ? [{ id: tenantId, name: profile?.tenants?.name || '본점' }] : []}
            onBranchChange={() => {}}
            isAdmin={profile?.role === 'super_admin'}
            isCustomerSearchOpen={isCustomerSearchOpen}
            setIsCustomerSearchOpen={setIsCustomerSearchOpen}
            customerSearchQuery={customerSearchQuery}
            setCustomerSearchQuery={setCustomerSearchQuery}
            customerSearchResults={customerSearchResults}
            customerSearchLoading={customerSearchLoading}
            onCustomerSelect={(c: any) => {
              setSelectedCustomer(c);
              setOrdererName(c.name);
              setOrdererContact(c.contact);
              setOrdererCompany(c.company_name || "");
              setIsCustomerSearchOpen(false);
              setCustomerSearchQuery(c.name);
            }}
            ordererName={ordererName}
            setOrdererName={setOrdererName}
            ordererContact={ordererContact}
            setOrdererContact={setOrdererContact}
            ordererCompany={ordererCompany}
            setOrdererCompany={setOrdererCompany}
            isAnonymous={isAnonymous}
            setIsAnonymous={setIsAnonymous}
            registerCustomer={registerCustomer}
            setRegisterCustomer={setRegisterCustomer}
            formatPhoneNumber={formatPhoneNumber}
          />

          <ProductSection
            allProducts={allProducts}
            categories={dynamicCategories}
            onAddProduct={(p: Product) => setOrderItems(prev => {
              const idx = prev.findIndex(item => item.id === p.id);
              if (idx > -1) return prev.map((item, i) => i === idx ? { ...item, quantity: item.quantity + 1 } : item);
              return [...prev, { ...p, quantity: 1 }];
            })}
            onOpenCustomProductDialog={() => setIsCustomProductDialogOpen(true)}
          />

          <FulfillmentSection
            receiptType={receipt_type}
            setReceiptType={setReceiptType}
            scheduleDate={scheduleDate}
            setScheduleDate={setScheduleDate}
            scheduleTime={scheduleTime}
            setScheduleTime={setScheduleTime}
            timeOptions={timeOptions}
            recipientName={recipientName}
            setRecipientName={setRecipientName}
            recipientContact={recipientContact}
            setRecipientContact={setRecipientContact}
            deliveryAddress={deliveryAddress}
            setDeliveryAddress={setDeliveryAddress}
            deliveryAddressDetail={deliveryAddressDetail}
            setDeliveryAddressDetail={setDeliveryAddressDetail}
            onAddressSearch={() => {
              if (window.daum?.Postcode) {
                new window.daum.Postcode({
                  oncomplete: (data: any) => {
                    setDeliveryAddress(data.address);
                    setSelectedDistrict(data.sigungu);
                  }
                }).open();
              }
            }}
            messageType={messageType}
            setMessageType={setMessageType}
            messageContent={messageContent}
            setMessageContent={setMessageContent}
            specialRequest={specialRequest}
            setSpecialRequest={setSpecialRequest}
            isSameAsOrderer={isSameAsOrderer}
            setIsSameAsOrderer={setIsSameAsOrderer}
            formatPhoneNumber={formatPhoneNumber}
            recentRibbonMessages={recentRibbonMessages}
            itemSize={itemSize}
            setItemSize={setItemSize}
            isExpress={isExpress}
            setIsExpress={setIsExpress}
          />
        </div>

        <div className="md:col-span-4 h-full">
          <OrderSummarySide
            orderItems={orderItems}
            setOrderItems={setOrderItems}
            orderSummary={orderSummary}
            discountSettings={{} as any}
            activeDiscountRates={[]}
            selectedDiscountRate={selectedDiscountRate}
            setSelectedDiscountRate={setSelectedDiscountRate}
            customDiscountRate={customDiscountRate}
            setCustomDiscountRate={setCustomDiscountRate}
            usedPoints={usedPoints}
            setUsedPoints={setUsedPoints}
            maxPoints={selectedCustomer?.points || 0}
            deliveryFeeType={deliveryFeeType}
            setDeliveryFeeType={setDeliveryFeeType}
            manualDeliveryFee={manualDeliveryFee}
            setManualDeliveryFee={setManualDeliveryFee}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            paymentStatus={paymentStatus}
            setPaymentStatus={setPaymentStatus}
            isSplitPaymentEnabled={isSplitPaymentEnabled}
            setIsSplitPaymentEnabled={setIsSplitPaymentEnabled}
            firstPaymentAmount={firstPaymentAmount}
            setFirstPaymentAmount={setFirstPaymentAmount}
            firstPaymentMethod={firstPaymentMethod}
            setFirstPaymentMethod={setFirstPaymentMethod}
            secondPaymentMethod={secondPaymentMethod}
            setSecondPaymentMethod={setSecondPaymentMethod}
            onSubmit={handleCompleteOrder}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>

      <Dialog open={isCustomProductDialogOpen} onOpenChange={setIsCustomProductDialogOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>수동 상품 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
               <Label>상품명</Label>
               <Input value={customProductName} onChange={e => setCustomProductName(e.target.value)} />
            </div>
            <div className="space-y-2">
               <Label>가격</Label>
               <Input type="number" value={customProductPrice} onChange={e => setCustomProductPrice(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => {
              const price = Number(customProductPrice);
              if (!customProductName || price <= 0) return;
              setOrderItems(prev => [...prev, { id: `custom_${Date.now()}`, name: customProductName, price, quantity: 1, stock: 999 }]);
              setIsCustomProductDialogOpen(false);
            }}>추가</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md bg-white border-none shadow-2xl rounded-3xl">
          <DialogHeader className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <DialogTitle className="text-center text-2xl font-bold">주문 접수 완료!</DialogTitle>
            <DialogDescription className="text-center font-mono text-primary font-bold">
              {lastOrderNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-4">
            <Button className="w-full rounded-2xl bg-primary text-white h-12 font-bold" onClick={() => router.push('/dashboard/orders')}>
              주문 현황 보기
            </Button>
            {lastOrderId && (
              <Button 
                variant="outline" 
                className="w-full rounded-2xl h-12 font-bold border-primary text-primary hover:bg-primary/5" 
                onClick={() => router.push(`/dashboard/orders?openMessagePrint=true&orderId=${lastOrderId}`)}
              >
                <Printer className="w-4 h-4 mr-2" /> 리본/카드 인쇄
              </Button>
            )}
            <Button variant="ghost" className="w-full rounded-2xl h-12 font-bold text-gray-500" onClick={() => window.location.reload()}>
              새 주문 계속 등록
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
