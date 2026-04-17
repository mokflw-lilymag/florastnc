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

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";

import { CustomerSection } from "./components/CustomerSection";
import { ProductSection } from "./components/ProductSection";
import { FulfillmentSection } from "./components/FulfillmentSection";
import { OrderSummarySide } from "./components/OrderSummarySide";
import { AiOrderConcierge } from "./components/AiOrderConcierge";

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
  const { customers, addCustomer } = useCustomers();
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
  const [isMobileSummaryOpen, setIsMobileSummaryOpen] = useState(false);

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
  const [externalVendor, setExternalVendor] = useState<any | null>(null);

  // Customer & Orderer
  const [ordererName, setOrdererName] = useState("");
  const [ordererContact, setOrdererContact] = useState("");
  const [ordererCompany, setOrdererCompany] = useState("");
  const [ordererEmail, setOrdererEmail] = useState("");
  const [registerCustomer, setRegisterCustomer] = useState(false);
  const lastHasInfoRef = useRef(false);

  useEffect(() => {
    const customerId = searchParams.get('customerId');
    if (customerId && customers.length > 0) {
      const customer = customers.find(c => String(c.id) === customerId);
      if (customer) {
        setOrdererName(customer.name);
        setOrdererContact(customer.contact || "");
        setOrdererCompany(customer.company_name || "");
        setOrdererEmail(customer.email || "");
        setRegisterCustomer(false);
        lastHasInfoRef.current = true;
      }
    }
  }, [searchParams, customers]);

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

  // Sync recipient info when "Same as Orderer" is checked
  useEffect(() => {
    if (isSameAsOrderer) {
      setRecipientName(ordererName);
      setRecipientContact(ordererContact);
    }
  }, [isSameAsOrderer, ordererName, ordererContact]);

  // Load Daum Postcode script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

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

  // --- AUTO-FILL LOGIC FROM URL ---
  const supabase = createClient();
  const [initialCategory, setInitialCategory] = useState<string | null>(null);

  useEffect(() => {
    const outsourceId = searchParams.get('outsource');
    const productId = searchParams.get('productId');
    const category = searchParams.get('category');

    if (outsourceId) {
      // Fetch the partner details
      supabase.from('tenants').select('id, name').eq('id', outsourceId).maybeSingle()
        .then(({ data }) => {
          if (data) setExternalVendor(data);
        });
    }

    if (category) {
      setInitialCategory(category);
    }

    if (productId && allProducts.length > 0) {
      const targetProduct = allProducts.find(p => p.id === productId);
      if (targetProduct) {
        setOrderItems([{
          id: targetProduct.id,
          name: targetProduct.name,
          price: targetProduct.price,
          stock: targetProduct.stock || 999,
          quantity: 1
        }]);
        // Set other product-specific defaults
        if (targetProduct.extra_data?.item_size) setItemSize(targetProduct.extra_data.item_size as any);
      }
    }
  }, [searchParams, allProducts, supabase]);

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
        if (category === '경조화환') return mCat.includes('화환') || midCat.includes('화환') || name.includes('화환') || name.includes('축하') || name.includes('근조');
        if (category === '동양란/서양란' || category === '동서양란') return mCat.includes('란') || midCat.includes('란') || name.includes('란') || mCat.includes('난') || midCat.includes('난') || name.includes('난');
        if (category === '동양란') return mCat.includes('동양란') || midCat.includes('동양란') || name.includes('동양란');
        if (category === '서양란') return mCat.includes('서양란') || midCat.includes('서양란') || name.includes('서양란') || mCat.includes('호접란') || midCat.includes('호접란') || name.includes('호접란');
        if (category === '플랜트' || category === '관엽식물') return mCat.includes('관엽') || mCat.includes('식물') || mCat.includes('공기정화') || mCat.includes('플랜트');
        return mCat.includes(category) || midCat.includes(category) || name.includes(category);
      });
    } else {
      targetProducts = targetProducts.filter(p => p.main_category === category);
    }

    return targetProducts.slice(0, limit);
  }, [allProducts]);

  const dynamicCategories = useMemo(() => {
    if (!allProducts.length) return [];
    
    // 1. Define common priority categories (removed '동양란/서양란', '조화' as requested)
    const priority = [
      '꽃다발', '꽃바구니', '센터피스', '경조화환', '플랜트', '동양란', '서양란'
    ];
    
    // 2. Discover other categories actually used in products
    // (excluding categories explicitly requested to be hidden)
    const excludeCategories = ['기프트상품', '플라워', '동양란/서양란', '웨딩상품', '조화', '동서양란', '근조화환', '축하화환', '꽃상자', '다육/선인장', '관엽식물', '돈꽃다발', '부자재'];
    const existingCats = Array.from(new Set(allProducts.map(p => p.main_category).filter(Boolean))) as string[];
    const filteredExistingCats = existingCats.filter(cat => !excludeCategories.includes(cat));
    
    // 3. Combine them, keeping priority first
    const combined = [...new Set([...priority, ...filteredExistingCats])]
      .filter(cat => !excludeCategories.includes(cat));
    
    // 4. Map to CategoryData
    return combined
      .map(cat => ({
        name: cat,
        products: calculateTopProducts(cat, 10, true)
      }))
      .filter(c => priority.includes(c.name) || c.products.length > 0)
      .slice(0, 10); // Show only top 10 categories in a single row logic
  }, [allProducts, calculateTopProducts]);

  const deliveryFee = useMemo(() => {
    if (receipt_type === 'store_pickup' || receipt_type === 'pickup_reservation') return 0;
    if (deliveryFeeType === 'manual') return manualDeliveryFee;
    
    // 1. Calculate subtotal to check free delivery threshold
    const subtotal = orderItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    if (settings?.freeDeliveryThreshold && settings.freeDeliveryThreshold > 0 && subtotal >= settings.freeDeliveryThreshold) {
      return 0; // Free delivery threshold reached
    }
    
    // 2. Base region fee calculation
    let baseFee = settings?.defaultDeliveryFee ?? 0;
    
    // Normalize address and district for matching
    const targetAddress = (deliveryAddress || "").trim();
    const targetDistrict = (selectedDistrict || "").trim();
    
    // Priority: Try to find a match in the settings first, then in the regionFees DB
    const allDistrictFees = [
      ...(settings?.districtDeliveryFees || []).map(f => ({ name: f.district, fee: f.fee })),
      ...(regionFees || []).map(f => ({ name: f.region_name, fee: f.fee }))
    ];

    if (targetDistrict || targetAddress) {
      // Find the best match
      const match = allDistrictFees.find(f => {
        const regionName = f.name.trim();
        if (!regionName) return false;
        
        // Match by exact/partial district from API
        if (targetDistrict && (targetDistrict.includes(regionName) || regionName.includes(targetDistrict))) {
          return true;
        }
        
        // Match by address text (e.g., if "중구" is in "서울 중구 세종대로...")
        if (targetAddress && targetAddress.includes(regionName)) {
          return true;
        }
        
        return false;
      });
      
      if (match) {
        baseFee = match.fee;
      }
    }

    // 3. Add surcharges
    let surcharges = 0;
    
    // Size-based surcharges
    if (itemSize === 'medium') surcharges += 3000;
    if (itemSize === 'large') surcharges += 5000;
    
    // Express surcharge
    if (isExpress) surcharges += 10000;

    return baseFee + surcharges;
  }, [deliveryFeeType, manualDeliveryFee, receipt_type, selectedDistrict, deliveryAddress, regionFees, settings, orderItems, itemSize, isExpress]);

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

    let finalCustomerId = selectedCustomer?.id || "";

    // 고객 정보 자동 등록
    if (registerCustomer && !finalCustomerId) {
      try {
        const newCustomerId = await addCustomer({
          name: ordererName,
          contact: ordererContact,
          company_name: ordererCompany,
          email: ordererEmail,
          type: ordererCompany ? 'company' : 'individual',
          grade: '신규',
          points: 0,
        });
        if (newCustomerId) {
          finalCustomerId = newCustomerId;
        }
      } catch (e) {
        console.error("고객 자동 등록 실패", e);
      }
    }

    const orderPayload: OrderData = {
      status: existingOrder?.status || 'processing',
      receipt_type,
      order_date: existingOrder ? existingOrder.order_date : new Date().toISOString(),
      items: orderItems.map(({ id, name, quantity, price }) => ({ id, name, quantity, price })),
      summary: {
        ...orderSummary,
        discountRate: selectedDiscountRate === -1 ? customDiscountRate : selectedDiscountRate,
        pointsEarned: Math.floor(orderSummary.total * ((settings?.pointRate ?? 0) / 100))
      },
      orderer: {
        id: finalCustomerId,
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
      memo: specialRequest,
      extra_data: {
        isAnonymous,
        outsource_tenant_id: externalVendor?.id,
        outsource_tenant_name: externalVendor?.name
      }
    };

    try {
      if (existingOrder) {
        const success = await updateOrder(existingOrder.id, orderPayload);
        if (success) {
          toast.success("주문이 수정되었습니다.");
          router.push("/dashboard/orders");
        } else {
          toast.error("주문 수정에 실패했습니다.");
        }
      } else {
        const resultId = await addOrder(orderPayload);
        if (resultId) {
          setLastOrderId(resultId);
          setLastOrderNumber(orderPayload.order_number || `ORD-${Date.now()}`);
          setShowSuccessDialog(true);
        } else {
          toast.error("주문 저장에 실패했습니다. 데이터를 다시 확인해주세요.");
        }
      }
    } catch (error) {
       console.error(error);
       toast.error("주문 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
       setIsSubmitting(false);
    }
  };

  // --- AI DATA APPLICATION ---
  const handleApplyAiData = (data: any) => {
    if (data.orderer) {
      if (data.orderer.name) setOrdererName(data.orderer.name);
      if (data.orderer.contact) setOrdererContact(formatPhoneNumber(data.orderer.contact));
      if (data.orderer.company) setOrdererCompany(data.orderer.company);
    }

    if (data.recipient) {
      if (data.recipient.name) setRecipientName(data.recipient.name);
      if (data.recipient.contact) setRecipientContact(formatPhoneNumber(data.recipient.contact));
      if (data.recipient.address) setDeliveryAddress(data.recipient.address);
      if (data.recipient.detailAddress) setDeliveryAddressDetail(data.recipient.detailAddress);
      setIsSameAsOrderer(false);
    }

    if (data.items && data.items.length > 0) {
      const newItems = data.items.map((item: any) => ({
        id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: item.name || "이름 없음",
        price: item.price || 0,
        quantity: item.quantity || 1,
        stock: 999
      }));
      setOrderItems(newItems);
    }

    if (data.delivery) {
      if (data.delivery.type) setReceiptType(data.delivery.type);
      if (data.delivery.date) {
        try {
          const parsedDate = new Date(data.delivery.date);
          if (!isNaN(parsedDate.getTime())) setScheduleDate(parsedDate);
        } catch (e) {}
      }
      if (data.delivery.time) setScheduleTime(data.delivery.time);
    }

    if (data.message?.content) setMessageContent(data.message.content);
    if (data.memo) setSpecialRequest(data.memo);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50/30">
      <PageHeader
        title={existingOrder ? "주문 수정" : (externalVendor ? `협력사 발주 (${externalVendor.name})` : "새 주문 등록")}
        description={existingOrder 
          ? "기존 주문 정보를 수정합니다." 
          : (externalVendor ? `${externalVendor.name}님에게 보낼 상품을 선택하고 정보를 입력하세요.` : `${profile?.tenants?.name || "새로운 화원"}의 새로운 주문을 접수합니다.`)}
      >
        <div className="mt-4 flex justify-end px-4 md:px-6">
          <AiOrderConcierge onApply={handleApplyAiData} />
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-4 md:p-6 h-[calc(100vh-140px)] md:h-[calc(100vh-140px)]">
        <div className="md:col-span-8 space-y-6 overflow-y-auto pr-0 md:pr-2 pb-32 md:pb-20 scrollbar-hide">
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
            initialCategory={initialCategory || undefined}
            onAddProduct={(p: Product) => {
              // 1. Add/Update order items
              setOrderItems(prev => {
                const idx = prev.findIndex(item => item.id === p.id);
                if (idx > -1) return prev.map((item, i) => i === idx ? { ...item, quantity: item.quantity + 1 } : item);
                return [...prev, { ...p, quantity: 1 }];
              });

              // 2. Auto-set size and ribbon if provided in extra_data
              if (p.extra_data?.item_size) {
                setItemSize(p.extra_data.item_size);
              }
              if (p.extra_data?.ribbon_size) {
                if (p.extra_data.ribbon_size !== 'none') {
                  setMessageType('ribbon');
                } else {
                  setMessageType('card');
                }
              }
            }}
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
                    // console.log("Address selection data:", data);
                    setDeliveryAddress(data.address);
                    // Use sigungu (구) or bname (동) logic to find match
                    // If Seoul, sigungu is typically '강남구'.
                    // For provinces, it might be '성남시 분당구'
                    setSelectedDistrict(data.sigungu || data.district || data.bname);
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

        <div className="hidden md:block md:col-span-4 h-full">
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

      {/* --- Mobile Fixed Summary Bar (md- only) --- */}
      <div className="md:hidden fixed bottom-16 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 pb-safe flex flex-col gap-2 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between px-1">
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 font-medium">선택 상품 {orderItems.length}개</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-primary">{orderSummary.total.toLocaleString()}</span>
              <span className="text-xs font-bold text-primary">원</span>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs text-slate-500 underline decoration-slate-300"
            onClick={() => setIsMobileSummaryOpen(true)}
          >
            내역 확인
          </Button>
          <Dialog open={isMobileSummaryOpen} onOpenChange={setIsMobileSummaryOpen}>
            <DialogContent className="max-h-[85vh] overflow-y-auto p-0 border-none rounded-t-3xl sm:rounded-3xl">
              <DialogHeader className="p-4 bg-slate-50 border-b">
                <DialogTitle>주문 요약 (결제 상세)</DialogTitle>
              </DialogHeader>
              <div className="p-4">
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
                  onSubmit={() => {
                    setIsMobileSummaryOpen(false);
                    handleCompleteOrder();
                  }}
                  isSubmitting={isSubmitting}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex gap-2">
            <Button 
                className="flex-1 h-12 text-base font-bold rounded-xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
                onClick={handleCompleteOrder}
                disabled={isSubmitting || orderItems.length === 0}
            >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : `${orderSummary.total.toLocaleString()}원 주문하기`}
            </Button>
        </div>
      </div>


      <Dialog open={isCustomProductDialogOpen} onOpenChange={setIsCustomProductDialogOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900">수동 상품 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
               <Label className="text-slate-700">상품명</Label>
               <Input value={customProductName} onChange={e => setCustomProductName(e.target.value)} />
            </div>
            <div className="space-y-2">
               <Label className="text-slate-700">가격</Label>
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
            <DialogTitle className="text-center text-2xl font-bold text-slate-900">주문 접수 완료!</DialogTitle>
            <DialogDescription className="text-center font-mono text-primary font-bold">
              {lastOrderNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-4">
            <Button className="w-full rounded-2xl bg-primary text-white h-12 font-bold" onClick={() => router.push('/dashboard/orders')}>
              주문 현황 보기
            </Button>
            {lastOrderId && receipt_type === 'delivery_reservation' && (
              <div className="flex flex-col gap-2 w-full">
                <Button 
                  variant="outline" 
                  className="w-full rounded-2xl h-12 font-bold border-primary text-primary hover:bg-primary/5 flex items-center justify-center gap-2" 
                  onClick={() => router.push(`/dashboard/orders/print-preview/${lastOrderId}`)}
                >
                  <Printer className="w-4 h-4" /> 주문서 출력 (배송용)
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full rounded-2xl h-10 font-bold text-slate-500 flex items-center justify-center gap-2" 
                  onClick={() => router.push(`/dashboard/orders?openMessagePrint=true&orderId=${lastOrderId}`)}
                >
                  <Printer className="w-4 h-4" /> 리본/카드 추가 인쇄
                </Button>
              </div>
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
