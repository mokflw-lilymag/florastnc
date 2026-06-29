"use client";
import { getMessages } from "@/i18n/getMessages";
import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Loader2, Printer, PlusCircle, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import debounce from "lodash/debounce";
import { createClient } from '@/utils/supabase/client';

import { useOrders } from '@/hooks/use-orders';
import { Order, OrderData } from "@/types/order";
import { Product } from "@/types/product";
import { Customer } from "@/types/customer";
import { useCustomerSearch } from "@/hooks/use-customer-search";
import { useDebounce } from "@/hooks/use-debounce";
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
import { CardPaymentConfirmDialog } from "./components/CardPaymentConfirmDialog";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import {
  postOrderAnniversary,
  resolveAnniversaryDateFromSchedule,
} from "@/lib/revenue/order-anniversary-register";
import {
  findCustomerByContact,
  orderFormChecksForExistingCustomer,
} from "@/lib/customers/order-customer-form";
import type { OrderPaymentMethod } from "@/lib/order-payment-methods";
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
type PaymentMethod = OrderPaymentMethod;
type PaymentStatus = "pending" | "paid" | "completed" | "split_payment";

declare global {
  interface Window {
    daum: any;
  }
}

export default function NewOrderPage() {
  const supabase = useMemo(() => createClient(), []);
  const { profile, tenantId, isLoading: authLoading } = useAuth();
  const { orders, loading: ordersLoading, addOrder, updateOrder } = useOrders();
  const { fees: regionFees } = useDeliveryFees();
  const { settings } = useSettings();
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
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
    setIsMobileSummaryOpen(true);
  }, []);

  // Initialize selectedBranch from profile
  useEffect(() => {
    if (tenantId && !selectedBranch && profile?.tenants) {
      setSelectedBranch({ 
        id: tenantId, 
        name: profile.tenants.name || tf.f00293
      });
    }
  }, [tenantId, profile, selectedBranch]);

  useEffect(() => {
    // Products and customers are no longer pre-fetched entirely to improve performance.
  }, [selectedBranch?.id]);

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
  const [registerCustomer, setRegisterCustomer] = useState(true);
  const [marketingConsent, setMarketingConsent] = useState(true);
  const [registerAnniversaryFromOrder, setRegisterAnniversaryFromOrder] = useState(false);
  const lastHasInfoRef = useRef(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const debouncedCustomerSearch = useDebounce(customerSearchQuery, 300);
  const { results: customerSearchResults, loading: customerSearchLoading, searchCustomers } = useCustomerSearch();
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);

  useEffect(() => {
    if (isCustomerSearchOpen && debouncedCustomerSearch) {
      searchCustomers(debouncedCustomerSearch);
    }
  }, [debouncedCustomerSearch, isCustomerSearchOpen, searchCustomers]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    const customerId = searchParams.get('customerId');
    if (customerId && tenantId) {
      supabase.from('customers').select('*').eq('id', customerId).eq('tenant_id', tenantId).maybeSingle()
        .then(({ data: customer }) => {
          if (customer) {
            setSelectedCustomer(customer);
            setOrdererName(customer.name);
            setOrdererContact(customer.contact || "");
            setOrdererCompany(customer.company_name || "");
            setOrdererEmail(customer.email || "");
            const checks = orderFormChecksForExistingCustomer();
            setRegisterCustomer(checks.registerCustomer);
            setMarketingConsent(checks.marketingConsent);
            setRegisterAnniversaryFromOrder(checks.registerAnniversaryFromOrder);
            lastHasInfoRef.current = true;
          }
        });
    }
  }, [searchParams, tenantId, supabase]);

  useEffect(() => {
    const hasInfo = (ordererName || "").trim() !== "" || 
                    (ordererContact || "").trim() !== "" || 
                    (ordererCompany || "").trim() !== "";
    
    if (selectedCustomer) {
      lastHasInfoRef.current = hasInfo;
      return;
    }

    if (hasInfo && !lastHasInfoRef.current) {
      setRegisterCustomer(true);
    } else if (!hasInfo && lastHasInfoRef.current) {
      setRegisterCustomer(false);
    }
    lastHasInfoRef.current = hasInfo;
  }, [ordererName, ordererContact, ordererCompany, selectedCustomer]);

  useEffect(() => {
    if (isAnonymous) {
      setMarketingConsent(false);
      setRegisterAnniversaryFromOrder(false);
      setRegisterCustomer(false);
    }
  }, [isAnonymous]);

  useEffect(() => {
    if (!marketingConsent) setRegisterAnniversaryFromOrder(false);
  }, [marketingConsent]);

  const hasOrdererIdentity = useMemo(
    () =>
      !!selectedCustomer?.id ||
      ((ordererName || "").trim() !== "" && (ordererContact || "").trim() !== ""),
    [selectedCustomer, ordererName, ordererContact],
  );

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

  const { counterPaymentAvailable } = usePosConnection();
  const draftEnabled = !orderId && !searchParams.get("customerId") && !existingOrder;

  const orderFormDraftSaveTrigger = useMemo(
    () =>
      JSON.stringify({
        orderItems,
        ordererName,
        ordererContact,
        ordererCompany,
        ordererEmail,
        isAnonymous,
        registerCustomer,
        marketingConsent,
        registerAnniversaryFromOrder,
        selectedCustomerId: selectedCustomer?.id ?? null,
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
        itemSize,
        isExpress,
        messageType,
        messageContent,
        specialRequest,
        paymentMethod,
        paymentStatus,
        isSplitPaymentEnabled,
        firstPaymentAmount,
        firstPaymentMethod,
        secondPaymentMethod,
        usedPoints,
        selectedDiscountRate,
        customDiscountRate,
        externalVendorId: externalVendor?.id ?? null,
      }),
    [
      orderItems,
      ordererName,
      ordererContact,
      ordererCompany,
      ordererEmail,
      isAnonymous,
      registerCustomer,
      marketingConsent,
      registerAnniversaryFromOrder,
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
      itemSize,
      isExpress,
      messageType,
      messageContent,
      specialRequest,
      paymentMethod,
      paymentStatus,
      isSplitPaymentEnabled,
      firstPaymentAmount,
      firstPaymentMethod,
      secondPaymentMethod,
      usedPoints,
      selectedDiscountRate,
      customDiscountRate,
      externalVendor,
    ]
  );

  const buildOrderFormDraft = useCallback((): OrderFormDraft | null => {
    if (!tenantId) return null;
    return {
      version: 1,
      tenantId,
      variant: "desktop",
      savedAt: new Date().toISOString(),
      orderItems,
      ordererName,
      ordererContact,
      ordererCompany,
      ordererEmail,
      isAnonymous,
      registerCustomer,
      marketingConsent,
      registerAnniversaryFromOrder,
      selectedCustomer: selectedCustomer
        ? {
            id: selectedCustomer.id,
            name: selectedCustomer.name,
            contact: selectedCustomer.contact,
            company_name: selectedCustomer.company_name,
            email: selectedCustomer.email,
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
      itemSize,
      isExpress,
      messageType,
      messageContent,
      specialRequest,
      paymentMethod,
      paymentStatus,
      isSplitPaymentEnabled,
      firstPaymentAmount,
      firstPaymentMethod,
      secondPaymentMethod,
      usedPoints,
      selectedDiscountRate,
      customDiscountRate,
      externalVendor: externalVendor
        ? { id: externalVendor.id, name: externalVendor.name }
        : null,
    };
  }, [
    tenantId,
    orderItems,
    ordererName,
    ordererContact,
    ordererCompany,
    ordererEmail,
    isAnonymous,
    registerCustomer,
    marketingConsent,
    registerAnniversaryFromOrder,
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
    itemSize,
    isExpress,
    messageType,
    messageContent,
    specialRequest,
    paymentMethod,
    paymentStatus,
    isSplitPaymentEnabled,
    firstPaymentAmount,
    firstPaymentMethod,
    secondPaymentMethod,
    usedPoints,
    selectedDiscountRate,
    customDiscountRate,
    externalVendor,
  ]);

  const applyOrderFormDraft = useCallback((draft: OrderFormDraft) => {
    setOrderItems(
      draft.orderItems.map((item) => ({
        ...item,
        stock: item.stock ?? 999,
      }))
    );
    setOrdererName(draft.ordererName);
    setOrdererContact(draft.ordererContact);
    setOrdererCompany(draft.ordererCompany);
    setOrdererEmail(draft.ordererEmail);
    setIsAnonymous(draft.isAnonymous);
    setRegisterCustomer(draft.registerCustomer);
    setMarketingConsent(draft.marketingConsent);
    setRegisterAnniversaryFromOrder(draft.registerAnniversaryFromOrder);
    setSelectedCustomer(
      draft.selectedCustomer
        ? ({
            id: draft.selectedCustomer.id,
            name: draft.selectedCustomer.name,
            contact: draft.selectedCustomer.contact,
            company_name: draft.selectedCustomer.company_name ?? undefined,
            email: draft.selectedCustomer.email ?? undefined,
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
    if (draft.itemSize) setItemSize(draft.itemSize);
    if (draft.isExpress !== undefined) setIsExpress(draft.isExpress);
    setMessageType(draft.messageType);
    setMessageContent(draft.messageContent);
    setSpecialRequest(draft.specialRequest);
    setPaymentMethod(draft.paymentMethod);
    setPaymentStatus(draft.paymentStatus);
    setIsSplitPaymentEnabled(draft.isSplitPaymentEnabled ?? false);
    setFirstPaymentAmount(draft.firstPaymentAmount ?? 0);
    setFirstPaymentMethod(draft.firstPaymentMethod ?? "card");
    setSecondPaymentMethod(draft.secondPaymentMethod ?? "card");
    setUsedPoints(draft.usedPoints);
    setSelectedDiscountRate(draft.selectedDiscountRate);
    setCustomDiscountRate(draft.customDiscountRate);
    if (draft.externalVendor) setExternalVendor(draft.externalVendor);
  }, []);

  useOrderFormDraft({
    tenantId,
    variant: "desktop",
    enabled: draftEnabled,
    saveTrigger: orderFormDraftSaveTrigger,
    getDraft: buildOrderFormDraft,
    applyDraft: applyOrderFormDraft,
  });

  const resetNewOrderForm = useCallback(() => {
    if (tenantId) clearOrderFormDraft(tenantId, "desktop");
    setOrderItems([]);
    setOrdererName("");
    setOrdererContact("");
    setOrdererCompany("");
    setOrdererEmail("");
    setSelectedCustomer(null);
    setIsAnonymous(false);
    setRegisterCustomer(true);
    setMarketingConsent(true);
    setRegisterAnniversaryFromOrder(false);
    setReceiptType("store_pickup");
    setScheduleDate(new Date());
    setScheduleTime(getInitialTime());
    setRecipientName("");
    setRecipientContact("");
    setIsSameAsOrderer(true);
    setDeliveryAddress("");
    setDeliveryAddressDetail("");
    setSelectedDistrict(null);
    setDeliveryFeeType("auto");
    setManualDeliveryFee(0);
    setItemSize("small");
    setIsExpress(false);
    setMessageType("card");
    setMessageContent("");
    setSpecialRequest("");
    setPaymentMethod("card");
    setPaymentStatus("paid");
    setIsSplitPaymentEnabled(false);
    setFirstPaymentAmount(0);
    setFirstPaymentMethod("card");
    setSecondPaymentMethod("card");
    setUsedPoints(0);
    setSelectedDiscountRate(0);
    setCustomDiscountRate(0);
    setExternalVendor(null);
    setShowSuccessDialog(false);
    setLastOrderId(null);
    setLastOrderNumber(null);
  }, [tenantId]);

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

    if (productId && tenantId) {
      supabase.from('products').select('*').eq('id', productId).eq('tenant_id', tenantId).maybeSingle()
        .then(({ data: targetProduct }) => {
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
        });
    }
  }, [searchParams, tenantId, supabase]);

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

  // dynamicCategories has been removed since ProductSection handles it internally

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
      toast.error(tf.f00340);
      setIsSubmitting(false); return;
    }

    // POS 연동 + 카드·페이: 승인 후에만 저장 (실패 시 DB 미저장, 입력값 유지)
    if (
      !existingOrder &&
      !isSplitPaymentEnabled &&
      tenantId &&
      requiresPosApprovalBeforeSave(paymentMethod, counterPaymentAvailable)
    ) {
      const approval = await requestPosPaymentApproval(
        {
          tenantId,
          amount: orderSummary.total,
          method: paymentMethod,
        },
        { onManualConfirm: promptManualCardPayment }
      );
      if (!approval.ok) {
        setCardApprovalError(approval.message);
        toast.error(approval.message, { description: ORDER_SAVE_FAILED_KEEP_FORM_HINT });
        scrollToPaymentSection();
        setIsSubmitting(false);
        return;
      }
    }

    setCardApprovalError(null);

    let finalCustomerId = selectedCustomer?.id || "";

    // 고객 정보 자동 등록 (연락처 중복 시 기존 고객 연결)
    if (registerCustomer && !finalCustomerId) {
      // Check for existing customer by contact directly from DB since we don't load all customers anymore
      let existingCustomerId = null;
      if (ordererContact) {
        const { data: existingData } = await supabase
          .from('customers')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('contact', ordererContact)
          .eq('is_deleted', false)
          .maybeSingle();
        if (existingData) existingCustomerId = existingData.id;
      }

      if (existingCustomerId) {
        finalCustomerId = existingCustomerId;
      } else {
        try {
          const { data: newCust, error: newCustError } = await supabase
            .from('customers')
            .insert([{
              tenant_id: tenantId,
              name: ordererName,
              contact: ordererContact,
              company_name: ordererCompany,
              email: ordererEmail,
              type: ordererCompany ? 'company' : 'individual',
              grade: tf.f00415,
              points: 0,
              marketing_consent: marketingConsent,
            }])
            .select()
            .single();
          if (!newCustError && newCust) {
            finalCustomerId = newCust.id;
          }
        } catch (e) {
          console.error(tf.f00068, e);
        }
      }
    }

    if (finalCustomerId && marketingConsent) {
      try {
        await supabase.from('customers').update({ marketing_consent: true }).eq('id', finalCustomerId);
      } catch (e) {
        console.error("marketing_consent sync", e);
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
          if (tenantId) clearOrderFormDraft(tenantId, "desktop");
          toast.success(tf.f00637);
          router.push("/dashboard/orders");
        } else {
          toast.error(tf.f00603, { description: ORDER_SAVE_FAILED_KEEP_FORM_HINT });
        }
      } else {
        // 주문량 한도 체크 (Hard Limit 차단)
        if (tenantId) {
          const { checkTenantOrderLimit } = await import("@/lib/subscription/limit-notifier");
          const tenantPlan = (profile?.tenants as any)?.plan || "free";
          const limitStatus = await checkTenantOrderLimit(supabase, tenantId, tenantPlan);
          if (limitStatus.isOverHardLimit) {
            toast.error("월 주문 등록 한도를 모두 초과하였습니다.", {
              description: "추가 주문 등록을 위해 요금제 변경(업그레이드) 페이지로 이동하여 결제해 주세요.",
              action: {
                label: "업그레이드",
                onClick: () => router.push("/dashboard/subscription")
              },
              duration: 8000
            });
            setIsSubmitting(false);
            return;
          }
        }

        const resultId = await addOrder(orderPayload);
        if (resultId) {
          if (
            !isAnonymous &&
            marketingConsent &&
            registerAnniversaryFromOrder &&
            finalCustomerId
          ) {
            const anniv = await postOrderAnniversary({
              customerId: finalCustomerId,
              anniversaryDate: resolveAnniversaryDateFromSchedule(scheduleDate),
              marketingConsent,
            });
            if (anniv.ok) {
              if (anniv.duplicate) {
                toast.info("이미 같은 날짜의 기념일이 등록되어 있습니다.", { duration: 4000 });
              } else {
                toast.success("기념일 날짜 등록됨 — 고객 관리에서 이름을 입력해 주세요.", { duration: 4000 });
              }
            }
          }
          const utmCampaign = searchParams.get("utm_campaign");
          if (utmCampaign) {
            fetch("/api/revenue/attributions/match", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: resultId,
                utmSource: searchParams.get("utm_source") ?? undefined,
                utmMedium: searchParams.get("utm_medium") ?? undefined,
                utmCampaign,
                customerId: searchParams.get("customerId") ?? orderPayload.orderer?.id,
                attributedAmount: orderPayload.summary?.total ?? 0,
              }),
            }).catch(() => {});
          }
          setLastOrderId(resultId);
          setLastOrderNumber(orderPayload.order_number || `ORD-${Date.now()}`);
          if (tenantId) clearOrderFormDraft(tenantId, "desktop");
          setShowSuccessDialog(true);
        } else {
          toast.error(tf.f00610, { description: ORDER_SAVE_FAILED_KEEP_FORM_HINT });
        }
      }
    } catch (error) {
       console.error(error);
       toast.error(tf.f00609, { description: ORDER_SAVE_FAILED_KEEP_FORM_HINT });
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
      if (data.orderer.email) setOrdererEmail(data.orderer.email);
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
        name: item.name || tf.f00501,
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

    const aiRibbonText =
      (typeof data.message?.content === "string" && data.message.content.trim()) ||
      (typeof data.ribbonMessage === "string" && data.ribbonMessage.trim()) ||
      (typeof data.ribbon_message === "string" && data.ribbon_message.trim()) ||
      "";
    if (aiRibbonText) setMessageContent(aiRibbonText);
    if (data.memo) setSpecialRequest(data.memo);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50/30">
      <PageHeader
        title={existingOrder ? tf.f00602 : (externalVendor ? `${tf.f00773} (${externalVendor.name})` : tf.f00346)}
        description={existingOrder 
          ? tf.f00113 
          : (externalVendor
              ? tf.f00799.replace("{name}", externalVendor.name)
              : tf.f00800.replace("{shop}", profile?.tenants?.name || tf.f02587))}
      >
        <div className="mt-4 flex justify-end px-4 md:px-6">
          <AiOrderConcierge onApply={handleApplyAiData} />
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-4 md:p-6 h-[calc(100vh-140px)] md:h-[calc(100vh-140px)]">
        <div className="md:col-span-8 space-y-6 overflow-y-auto pr-0 md:pr-2 pb-32 md:pb-20 scrollbar-hide">
          <CustomerSection
            selectedBranch={selectedBranch}
            availableBranches={tenantId ? [{ id: tenantId, name: profile?.tenants?.name || tf.f00293 }] : []}
            onBranchChange={() => {}}
            isAdmin={profile?.role === 'super_admin'}
            isCustomerSearchOpen={isCustomerSearchOpen}
            setIsCustomerSearchOpen={setIsCustomerSearchOpen}
            customerSearchQuery={customerSearchQuery}
            setCustomerSearchQuery={setCustomerSearchQuery}
            customerSearchResults={customerSearchResults}
            customerSearchLoading={customerSearchLoading}
            onCustomerSelect={(c: Customer) => {
              setSelectedCustomer(c);
              setOrdererName(c.name);
              setOrdererContact(c.contact);
              setOrdererCompany(c.company_name || "");
              setOrdererEmail(c.email || "");
              const checks = orderFormChecksForExistingCustomer();
              setRegisterCustomer(checks.registerCustomer);
              setMarketingConsent(checks.marketingConsent);
              setRegisterAnniversaryFromOrder(checks.registerAnniversaryFromOrder);
              setIsCustomerSearchOpen(false);
              setCustomerSearchQuery(c.name);
            }}
            ordererName={ordererName}
            setOrdererName={setOrdererName}
            ordererContact={ordererContact}
            setOrdererContact={setOrdererContact}
            ordererCompany={ordererCompany}
            setOrdererCompany={setOrdererCompany}
            ordererEmail={ordererEmail}
            setOrdererEmail={setOrdererEmail}
            isAnonymous={isAnonymous}
            setIsAnonymous={setIsAnonymous}
            registerCustomer={registerCustomer}
            setRegisterCustomer={setRegisterCustomer}
            registerAnniversaryFromOrder={registerAnniversaryFromOrder}
            setRegisterAnniversaryFromOrder={setRegisterAnniversaryFromOrder}
            marketingConsent={marketingConsent}
            setMarketingConsent={setMarketingConsent}
            selectedCustomer={selectedCustomer}
            hasOrdererIdentity={hasOrdererIdentity}
            formatPhoneNumber={formatPhoneNumber}
          />

          <ProductSection
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
            cardApprovalError={cardApprovalError}
            onClearCardApprovalError={clearCardApprovalError}
            paymentSectionRef={paymentSectionRef}
            onSubmit={handleCompleteOrder}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>

      {/* --- Mobile Fixed Summary Bar (md- only) --- */}
      <div className="md:hidden fixed bottom-16 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 pb-safe flex flex-col gap-2 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between px-1">
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 font-medium">{tf.f00356} {orderItems.length}{tf.f00025}</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-primary">{orderSummary.total.toLocaleString()}</span>
              <span className="text-xs font-bold text-primary">{tf.f00487}</span>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs text-slate-500 underline decoration-slate-300"
            onClick={() => setIsMobileSummaryOpen(true)}
          >
            {tf.f00131}
          </Button>
          <Dialog open={isMobileSummaryOpen} onOpenChange={setIsMobileSummaryOpen}>
            <DialogContent className="max-h-[85vh] overflow-y-auto p-0 border-none rounded-t-3xl sm:rounded-3xl">
              <DialogHeader className="p-4 bg-slate-50 border-b">
                <DialogTitle>{tf.f00605}</DialogTitle>
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
                  cardApprovalError={cardApprovalError}
                  onClearCardApprovalError={clearCardApprovalError}
                  paymentSectionRef={paymentSectionRef}
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
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : `${orderSummary.total.toLocaleString()}${tf.f00489}`}
            </Button>
        </div>
      </div>


      <CardPaymentConfirmDialog
        open={cardPayDialogOpen}
        onOpenChange={(open) => {
          if (!open && cardPayResolverRef.current) {
            cardPayResolverRef.current(false);
            cardPayResolverRef.current = null;
          }
          setCardPayDialogOpen(open);
        }}
        amount={orderSummary.total}
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
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900">{tf.f00374}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
               <Label className="text-slate-700">{tf.f00338}</Label>
               <Input value={customProductName} onChange={e => setCustomProductName(e.target.value)} />
            </div>
            <div className="space-y-2">
               <Label className="text-slate-700">{tf.f00021}</Label>
               <Input type="number" value={customProductPrice} onChange={e => setCustomProductPrice(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => {
              const price = Number(customProductPrice);
              if (!customProductName || price <= 0) return;
              setOrderItems(prev => [...prev, { id: `custom_${Date.now()}`, name: customProductName, price, quantity: 1, stock: 999 }]);
              setIsCustomProductDialogOpen(false);
            }}>{tf.f00697}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md bg-white border-none shadow-2xl rounded-3xl">
          <DialogHeader className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <DialogTitle className="text-center text-2xl font-bold text-slate-900">{tf.f00614}</DialogTitle>
            <DialogDescription className="text-center font-mono text-primary font-bold">
              {lastOrderNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-4">
            <Button className="w-full rounded-2xl bg-primary text-white h-12 font-bold" onClick={() => router.push('/dashboard/orders')}>
              {tf.f00621}
            </Button>
            {lastOrderId && receipt_type === 'delivery_reservation' && (
              <div className="flex flex-col gap-2 w-full">
                <Button 
                  variant="outline" 
                  className="w-full rounded-2xl h-12 font-bold border-primary text-primary hover:bg-primary/5 flex items-center justify-center gap-2" 
                  onClick={() => router.push(`/dashboard/orders/print-preview/${lastOrderId}`)}
                >
                  <Printer className="w-4 h-4" /> {tf.f00631}
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full rounded-2xl h-10 font-bold text-slate-500 flex items-center justify-center gap-2" 
                  onClick={() => router.push(`/dashboard/orders?openMessagePrint=true&orderId=${lastOrderId}`)}
                >
                  <Printer className="w-4 h-4" /> {tf.f00185}
                </Button>
              </div>
            )}
            <Button variant="ghost" className="w-full rounded-2xl h-12 font-bold text-gray-500" onClick={resetNewOrderForm}>
              {tf.f00345}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
