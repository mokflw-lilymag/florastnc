"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { Plus, Minus, Trash2, Search, ShoppingBag, Check, Printer, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCustomers } from "@/hooks/use-customers";
import { useSettings } from "@/hooks/use-settings";
import { useOrders } from "@/hooks/use-orders";
import { usePinnedMobileProductCategory } from "@/hooks/use-pinned-mobile-product-category";
import type { Customer } from "@/types/customer";
import { MobileCustomerSection } from "@/components/mobile/mobile-customer-section";
import { MobileProductCategoryPicker } from "@/components/mobile/mobile-product-category-picker";
import { smartSplitRibbonMessage } from "@/lib/order-utils";
import { MobilePageHeader } from "@/components/mobile/mobile-page-header";
import { fetchTenantProductsForMobile } from "@/lib/mobile/fetch-tenant-products";
import {
  buildMobileProductCategories,
  countProductsByCategory,
  filterProductsForMobilePicker,
  MOBILE_PRODUCT_CATEGORY_PRIORITY,
  resolveMobileProductCategory,
} from "@/lib/mobile/product-categories";
import { buildMobilePaymentMethods } from "@/lib/mobile/payment-methods";
import {
  receiptTypeLabel,
  useMobileShopMessages,
} from "@/lib/mobile/use-mobile-shop-messages";
import { formatMobileCurrency } from "@/lib/mobile/format-mobile-currency";
import { selectOrderPaymentMethod } from "@/lib/order-payment-methods";
import {
  postOrderAnniversary,
  resolveAnniversaryDateFromSchedule,
} from "@/lib/revenue/order-anniversary-register";
import {
  findCustomerByContact,
  orderFormChecksForExistingCustomer,
} from "@/lib/customers/order-customer-form";
import { formatPhoneNumber } from "@/lib/mobile/format-phone";
import type { Product } from "@/types/product";
import type { OrderData, PaymentStatus } from "@/types/order";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Textarea from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type ReceiptType = OrderData["receipt_type"];
type MessageType = "none" | "card" | "ribbon";
type CartItem = Product & { quantity: number };

const RIBBON_PRESETS = [
  "축발전 / 祝發展",
  "축개업 / 祝開業",
  "축승진 / 祝昇進",
  "축영전 / 祝榮轉",
  "근조 / 謹弔",
  "축결혼 / 祝結婚",
  "삼가 故人의 冥福을 빕니다",
];

function buildOrderMessage(
  messageType: MessageType,
  messageContent: string,
  ordererName: string
): NonNullable<OrderData["message"]> {
  if (messageType === "none") {
    return { type: "none" };
  }
  if (messageType === "card") {
    return { type: "card", content: messageContent.trim() };
  }
  const parts = messageContent.split("/");
  const content = parts[0]?.trim() ?? "";
  const senderFromInput =
    parts.length > 1 ? parts.slice(1).join("/").trim() : "";
  return {
    type: "ribbon",
    content,
    sender: senderFromInput || ordererName.trim(),
  };
}

const RECEIPT_TYPE_VALUES = [
  "store_pickup",
  "pickup_reservation",
  "delivery_reservation",
] as const satisfies readonly OrderData["receipt_type"][];

export default function MobileNewOrderPage() {
  const router = useRouter();
  const { m, tf, locale, dateLocale } = useMobileShopMessages();
  const { settings } = useSettings();
  const currency = settings?.currency ?? "KRW";
  const fmt = (amount: number) => formatMobileCurrency(amount, locale, currency);

  const receiptOptions = useMemo(
    () =>
      RECEIPT_TYPE_VALUES.map((value) => ({
        value,
        label: receiptTypeLabel(value, tf),
      })),
    [tf],
  );
  const { profile, tenantId } = useAuth();
  const storeName = profile?.tenants?.name;
  const { addOrder } = useOrders();
  const { customers, loading: customersLoading, addCustomer, updateCustomer } = useCustomers();

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [registerCustomer, setRegisterCustomer] = useState(true);
  const [marketingConsent, setMarketingConsent] = useState(true);
  const [registerAnniversaryFromOrder, setRegisterAnniversaryFromOrder] = useState(false);
  const [usedPoints, setUsedPoints] = useState(0);

  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductCategory, setSelectedProductCategory] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const productListRef = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState(false);

  const [ordererName, setOrdererName] = useState("");
  const [ordererContact, setOrdererContact] = useState("");
  const [ordererCompany, setOrdererCompany] = useState("");
  const [ordererEmail, setOrdererEmail] = useState("");
  const [receiptType, setReceiptType] = useState<ReceiptType>("pickup_reservation");
  const [scheduleDate, setScheduleDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [scheduleTime, setScheduleTime] = useState("10:00");
  const [recipientName, setRecipientName] = useState("");
  const [recipientContact, setRecipientContact] = useState("");
  const [isSameAsOrderer, setIsSameAsOrderer] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [memo, setMemo] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("card");
  const [messageContent, setMessageContent] = useState("");
  const [recentRibbonMessages, setRecentRibbonMessages] = useState<
    { sender: string; content: string }[]
  >([]);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [lastOrderNumber, setLastOrderNumber] = useState("");
  const [submittedMessageType, setSubmittedMessageType] = useState<MessageType>("none");
  const [cart, setCart] = useState<CartItem[]>([]);
  const supabase = useMemo(() => createClient(), []);
  const [paymentMethod, setPaymentMethod] = useState<OrderData["payment"]["method"]>("card");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("paid");

  // 직접입력 Dialog 상태
  const [isCustomProductDialogOpen, setIsCustomProductDialogOpen] = useState(false);
  const [customProductName, setCustomProductName] = useState("");
  const [customProductPrice, setCustomProductPrice] = useState("");
  const [customProductQuantity, setCustomProductQuantity] = useState(1);

  const similarProducts = useMemo(() => {
    const q = customProductName.replace(/\s+/g, "").toLowerCase().trim();
    if (!q) return [];
    return products
      .filter((p) => p.name.replace(/\s+/g, "").toLowerCase().includes(q) && p.status === "active")
      .slice(0, 8);
  }, [products, customProductName]);

  const handleAddCustomProduct = useCallback(async () => {
    const price = parseInt(customProductPrice) || 0;
    if (!customProductName.trim() || price <= 0) {
      toast.error("상품명과 가격을 올바르게 입력해주세요.");
      return;
    }
    if (!tenantId) { toast.error("매장 정보를 확인할 수 없습니다."); return; }
    try {
      const { data: newProd, error } = await supabase
        .from("products")
        .insert([{
          id: crypto.randomUUID(),
          tenant_id: tenantId,
          name: customProductName.trim(),
          price,
          main_category: "기타",
          mid_category: "직접입력",
          supplier: "직접입력",
          status: "active",
          code: `D${Date.now().toString(36).toUpperCase()}`,
          stock: 9999,
        }])
        .select()
        .single();
      if (error) throw error;
      if (newProd) {
        const p = newProd as unknown as Product;
        setCart((prev) => {
          const ex = prev.find((i) => i.id === p.id);
          if (ex) return prev.map((i) => i.id === p.id ? { ...i, quantity: i.quantity + customProductQuantity } : i);
          return [...prev, { ...p, quantity: customProductQuantity }];
        });
        toast.success(`[${newProd.name}] 상품이 추가되었습니다.`);
      }
    } catch (err: any) {
      toast.error(`상품 등록 오류: ${err.message}`);
      return;
    }
    setCustomProductName("");
    setCustomProductPrice("");
    setCustomProductQuantity(1);
    setIsCustomProductDialogOpen(false);
  }, [customProductName, customProductPrice, customProductQuantity, tenantId, supabase]);

  const mobilePaymentMethods = useMemo(() => buildMobilePaymentMethods(tf), [tf]);

  const loadProducts = useCallback(async () => {
    if (!tenantId) return;
    try {
      setProducts(await fetchTenantProductsForMobile(tenantId));
    } catch {
      toast.error(m.order.loadProductsFailed);
    }
  }, [tenantId]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const productCategories = useMemo(
    () => buildMobileProductCategories(products),
    [products]
  );

  const categoryProductCounts = useMemo(
    () => countProductsByCategory(products),
    [products]
  );

  const { pinnedCategory, pinCategory, pinnedFallback } =
    usePinnedMobileProductCategory(productCategories);

  const activeProductCategory = useMemo(
    () =>
      resolveMobileProductCategory(
        productCategories,
        selectedProductCategory,
        pinnedFallback ?? MOBILE_PRODUCT_CATEGORY_PRIORITY[0]
      ),
    [selectedProductCategory, productCategories, pinnedFallback]
  );

  const filteredProducts = useMemo(
    () =>
      filterProductsForMobilePicker(
        products,
        activeProductCategory,
        productSearch
      ),
    [products, activeProductCategory, productSearch]
  );

  const handleProductCategorySelect = (cat: string) => {
    setSelectedProductCategory(cat);
    setProductSearch("");
    productListRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openProductSheet = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    if (productCategories.length > 0) {
      setSelectedProductCategory(
        resolveMobileProductCategory(
          productCategories,
          pinnedCategory,
          pinnedFallback ?? MOBILE_PRODUCT_CATEGORY_PRIORITY[0]
        )
      );
    }
    setProductSearch("");
    setSheetOpen(true);
  };

  useEffect(() => {
    const contact = ordererContact.replace(/[^0-9]/g, "");
    if (messageType !== "ribbon" || contact.length < 10) {
      setRecentRibbonMessages([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("message, orderer")
          .eq("tenant_id", tenantId!)
          .eq("orderer->>contact", ordererContact.trim())
          .or("message->>type.eq.ribbon,extra_data->message->>type.eq.ribbon")
          .order("order_date", { ascending: false })
          .limit(20);
        if (error || cancelled) return;
        const seen = new Set<string>();
        const list: { sender: string; content: string }[] = [];
        for (const row of data ?? []) {
          const msg = row.message as { type?: string; content?: string; sender?: string } | null;
          if (msg?.type !== "ribbon" || !msg.content) continue;
          const key = `${msg.sender ?? ""}|${msg.content}`;
          if (seen.has(key)) continue;
          seen.add(key);
          list.push({
            sender: msg.sender || row.orderer?.name || "",
            content: msg.content,
          });
          if (list.length >= 8) break;
        }
        if (!cancelled) setRecentRibbonMessages(list);
      } catch {
        if (!cancelled) setRecentRibbonMessages([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ordererContact, messageType, tenantId, supabase]);

  const openRibbonPrinter = useCallback(
    (content: string, sender?: string) => {
      const { left, right } = smartSplitRibbonMessage(
        content,
        sender,
        ordererName.trim()
      );
      router.push(
        `/dashboard/printer?left=${encodeURIComponent(left)}&right=${encodeURIComponent(right)}`
      );
    },
    [router, ordererName]
  );

  const openCardDesignStudio = useCallback(
    (orderId: string) => {
      router.push(`/dashboard/design-studio?orderId=${orderId}&target=card`);
    },
    [router]
  );

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const deliveryFee = receiptType === "delivery_reservation" ? 3000 : 0;
  const totalBeforePoints = subtotal + deliveryFee;
  const maxUsablePoints = selectedCustomer
    ? Math.min(selectedCustomer.points ?? 0, totalBeforePoints)
    : 0;
  const pointsToUse = Math.min(usedPoints, maxUsablePoints);
  const total = totalBeforePoints - pointsToUse;
  const pointsEarned = Math.floor(total * ((settings?.pointRate ?? 0) / 100));

  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setOrdererName(c.name);
    setOrdererContact(c.contact);
    setOrdererCompany(c.company_name || "");
    setOrdererEmail(c.email || "");
    const checks = orderFormChecksForExistingCustomer();
    setRegisterCustomer(checks.registerCustomer);
    setMarketingConsent(checks.marketingConsent);
    setRegisterAnniversaryFromOrder(checks.registerAnniversaryFromOrder);
    setUsedPoints(0);
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setMarketingConsent(true);
    setRegisterCustomer(true);
    setRegisterAnniversaryFromOrder(false);
    setUsedPoints(0);
  };

  useEffect(() => {
    if (!marketingConsent) setRegisterAnniversaryFromOrder(false);
  }, [marketingConsent]);

  const hasOrdererIdentity =
    !!selectedCustomer?.id ||
    (ordererName.trim() !== "" && ordererContact.trim() !== "");

  useEffect(() => {
    if (usedPoints > maxUsablePoints) {
      setUsedPoints(maxUsablePoints);
    }
  }, [maxUsablePoints, usedPoints]);

  const addProduct = (p: Product) => {
    setCart((prev) => {
      const ex = prev.find((i) => i.id === p.id);
      if (ex) {
        return prev.map((i) => (i.id === p.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { ...p, quantity: 1 }];
    });
  };

  const cartQuantityById = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of cart) {
      map.set(item.id, item.quantity);
    }
    return map;
  }, [cart]);

  const cartItemCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const handleSubmit = async () => {
    if (!tenantId) return;
    if (!ordererName.trim() || !ordererContact.trim()) {
      toast.error(m.order.needOrderer);
      return;
    }
    if (cart.length === 0) {
      toast.error(m.order.needItems);
      return;
    }

    setSubmitting(true);
    try {
      let finalCustomerId = selectedCustomer?.id || "";
      if (registerCustomer && !finalCustomerId) {
        const existingByContact = findCustomerByContact(customers, ordererContact);
        if (existingByContact) {
          finalCustomerId = existingByContact.id;
        } else {
          const newId = await addCustomer({
            name: ordererName.trim(),
            contact: ordererContact.trim(),
            company_name: ordererCompany.trim() || undefined,
            email: ordererEmail.trim() || undefined,
            type: ordererCompany.trim() ? "company" : "individual",
            grade: "일반",
            points: 0,
            marketing_consent: marketingConsent,
          });
          if (newId) finalCustomerId = newId;
        }
      }

      if (finalCustomerId && marketingConsent) {
        await updateCustomer(finalCustomerId, { marketing_consent: true });
      }
      if (finalCustomerId && ordererEmail.trim()) {
        await updateCustomer(finalCustomerId, { email: ordererEmail.trim() });
      }

      const anniversaryDate = resolveAnniversaryDateFromSchedule(
        scheduleDate ? new Date(`${scheduleDate}T12:00:00`) : undefined,
      );

      let newOrderDate = new Date();
      if (scheduleDate) {
        newOrderDate = new Date(scheduleDate);
        if (scheduleTime) {
          const [hh, mm] = scheduleTime.split(':');
          newOrderDate.setHours(Number(hh), Number(mm), 0, 0);
        }
      }

      const payload: OrderData = {
        status: "processing",
        receipt_type: receiptType,
        order_date: newOrderDate.toISOString(),
        items: cart.map(({ id, name, quantity, price }) => ({
          id,
          name,
          quantity,
          price,
        })),
        summary: {
          subtotal,
          discountAmount: 0,
          discountRate: 0,
          deliveryFee,
          pointsUsed: pointsToUse,
          pointsEarned,
          total,
        },
        orderer: {
          id: finalCustomerId || undefined,
          name: ordererName.trim(),
          contact: ordererContact.trim(),
          company: ordererCompany.trim() || undefined,
          email: ordererEmail.trim() || undefined,
        },
        payment: {
          method: paymentMethod,
          status: paymentStatus,
          ...(paymentStatus === "paid"
            ? { completedAt: new Date().toISOString() }
            : {}),
        },
        pickup_info:
          receiptType === "store_pickup" || receiptType === "pickup_reservation"
            ? {
                date: scheduleDate,
                time: scheduleTime,
                pickerName: recipientName.trim() || ordererName.trim(),
                pickerContact: recipientContact.trim() || ordererContact.trim(),
              }
            : null,
        delivery_info:
          receiptType === "delivery_reservation"
            ? {
                date: scheduleDate,
                time: scheduleTime,
                recipientName: recipientName.trim() || ordererName.trim(),
                recipientContact: recipientContact.trim() || ordererContact.trim(),
                address: deliveryAddress.trim(),
                district: "",
              }
            : null,
        memo: memo.trim() || undefined,
        message: buildOrderMessage(messageType, messageContent, ordererName),
        extra_data: { mobile_order: true },
        source: "manual",
      };

      const id = await addOrder(payload);
      if (!id) throw new Error("failed");
      if (marketingConsent && registerAnniversaryFromOrder && finalCustomerId) {
        const anniv = await postOrderAnniversary({
          customerId: finalCustomerId,
          anniversaryDate,
          marketingConsent,
        });
        if (anniv.ok) {
          if (anniv.duplicate) {
            toast.info(m.order.anniversaryExists);
          } else {
            toast.success(m.order.anniversaryRegistered);
          }
        }
      }
      setLastOrderId(id);
      setLastOrderNumber(`ORD-${Date.now().toString().slice(-8)}`);
      setSubmittedMessageType(messageType);
      setShowSuccessDialog(true);
      toast.success(m.order.saved);
    } catch {
      toast.error(m.order.saveFailed);
    } finally {
      setSubmitting(false);
    }
  };

  if (!tenantId) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-gray-500">
        {m.common.noStore}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <MobilePageHeader
        title={m.order.title}
        subtitle={storeName ?? undefined}
        icon={ShoppingBag}
        variant="blue"
        dateLocale={dateLocale}
      />

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 pb-28">
        {/* 1. 주문자·고객 */}
        <MobileCustomerSection
          customers={customers}
          customersLoading={customersLoading}
          selectedCustomer={selectedCustomer}
          onSelectCustomer={handleSelectCustomer}
          onClearCustomer={handleClearCustomer}
          ordererName={ordererName}
          setOrdererName={setOrdererName}
          ordererContact={ordererContact}
          setOrdererContact={setOrdererContact}
          ordererCompany={ordererCompany}
          setOrdererCompany={setOrdererCompany}
          ordererEmail={ordererEmail}
          setOrdererEmail={setOrdererEmail}
          registerCustomer={registerCustomer}
          setRegisterCustomer={setRegisterCustomer}
          registerAnniversaryFromOrder={registerAnniversaryFromOrder}
          setRegisterAnniversaryFromOrder={setRegisterAnniversaryFromOrder}
          marketingConsent={marketingConsent}
          setMarketingConsent={setMarketingConsent}
          hasOrdererIdentity={hasOrdererIdentity}
          usedPoints={usedPoints}
          setUsedPoints={setUsedPoints}
          maxUsablePoints={maxUsablePoints}
          pointRate={settings?.pointRate}
        />

        {/* 2. 주문 상품 */}
        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-800">{m.order.orderItems}</h2>
            <Button size="sm" type="button" onClick={openProductSheet}>
              {m.order.addProduct}
            </Button>
          </div>
          {cart.length === 0 ? (
            <p className="rounded-lg border border-dashed py-6 text-center text-sm text-gray-400">
              {m.order.addProductsHint}
            </p>
          ) : (
            <ul className="space-y-2">
              {cart.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-2 rounded-lg bg-gray-50 p-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      {(item.price * item.quantity).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => updateQty(item.id, -1)} className="rounded-full bg-gray-200 p-1">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                    <button type="button" onClick={() => updateQty(item.id, 1)} className="rounded-full bg-gray-200 p-1">
                      <Plus className="h-3 w-3" />
                    </button>
                    <button type="button" onClick={() => updateQty(item.id, -item.quantity)} className="p-1 text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-right text-lg font-black text-blue-700">
            {m.order.totalLine} {fmt(total)}
            {pointsToUse > 0 && (
              <span className="block text-xs font-normal text-amber-700">
                {m.order.pointsUsed.replace("{{amount}}", `${pointsToUse.toLocaleString()}P`)}
              </span>
            )}
            {deliveryFee > 0 && (
              <span className="ml-1 text-xs font-normal text-gray-500">
                {m.order.deliveryFeeIncluded.replace("{{amount}}", fmt(deliveryFee))}
              </span>
            )}
            {pointsEarned > 0 && (
              <span className="block text-xs font-normal text-emerald-600">
                {m.order.pointsEarnHint.replace("{{amount}}", `${pointsEarned.toLocaleString()}P`)}
              </span>
            )}
          </p>
        </section>

        {/* 3. 수령 방식 */}
        <section className="space-y-3 rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-800">{m.order.receiveMethod}</h2>
          <div className="grid grid-cols-3 gap-2">
            {receiptOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setReceiptType(opt.value);
                  if (opt.value !== "delivery_reservation") {
                    setIsSameAsOrderer(false);
                  }
                }}
                className={`rounded-xl py-2 text-xs font-bold ${
                  receiptType === opt.value
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-gray-500">{m.order.scheduleDate}</Label>
              <Input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="mt-1 h-10"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">{m.order.scheduleTime}</Label>
              <Input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="mt-1 h-10"
              />
            </div>
          </div>

          {/* 픽업/픽업예약: 받는 분 정보 */}
          {(receiptType === "store_pickup" || receiptType === "pickup_reservation") && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-gray-700">받는 분 정보</Label>
                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-500">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-gray-300 accent-blue-600"
                    checked={isSameAsOrderer}
                    onChange={(e) => {
                      setIsSameAsOrderer(e.target.checked);
                      if (e.target.checked) {
                        setRecipientName(ordererName);
                        setRecipientContact(ordererContact);
                      }
                    }}
                  />
                  받는 분과 동일
                </label>
              </div>
              <Input
                placeholder={m.order.recipientName}
                value={recipientName}
                onChange={(e) => { setRecipientName(e.target.value); setIsSameAsOrderer(false); }}
                className="h-10"
                disabled={isSameAsOrderer}
              />
              <Input
                placeholder={m.order.recipientContact}
                value={recipientContact}
                onChange={(e) => { setRecipientContact(formatPhoneNumber(e.target.value)); setIsSameAsOrderer(false); }}
                className="h-10"
                disabled={isSameAsOrderer}
              />
            </div>
          )}

          {/* 배송: 배송지 + 받는 분 정보 */}
          {receiptType === "delivery_reservation" && (
            <div className="space-y-2 pt-1">
              <Input
                placeholder={m.order.deliveryAddress}
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="h-10"
              />
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-gray-700">받는 분 정보</Label>
                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-500">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-gray-300 accent-blue-600"
                    checked={isSameAsOrderer}
                    onChange={(e) => {
                      setIsSameAsOrderer(e.target.checked);
                      if (e.target.checked) {
                        setRecipientName(ordererName);
                        setRecipientContact(ordererContact);
                      }
                    }}
                  />
                  받는 분과 동일
                </label>
              </div>
              <Input
                placeholder={m.order.recipientName}
                value={recipientName}
                onChange={(e) => { setRecipientName(e.target.value); setIsSameAsOrderer(false); }}
                className="h-10"
                disabled={isSameAsOrderer}
              />
              <Input
                placeholder={m.order.recipientContact}
                value={recipientContact}
                onChange={(e) => { setRecipientContact(formatPhoneNumber(e.target.value)); setIsSameAsOrderer(false); }}
                className="h-10"
                disabled={isSameAsOrderer}
              />
            </div>
          )}
        </section>

        {/* 5. 메시지 */}
        <section className="space-y-3 rounded-2xl border bg-white p-4 shadow-sm">
          <div>
            <h2 className="text-sm font-bold text-gray-800">{m.order.messageSection}</h2>
            <p className="mt-1 text-[10px] text-gray-500">
              {m.order.messageHint}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { value: "none" as const, label: m.common.none },
                { value: "card" as const, label: tf.f00704 ?? "Card" },
                { value: "ribbon" as const, label: tf.f00179 ?? "Ribbon" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setMessageType(opt.value);
                  setMessageContent("");
                }}
                className={cn(
                  "rounded-xl py-2 text-xs font-bold transition-colors",
                  messageType === opt.value
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {messageType === "card" && (
            <div className="space-y-2">
              <Label className="text-xs text-gray-500">{tf.f00207 ?? "Card message"}</Label>
              <Textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder={m.order.cardContentPlaceholder}
                className="mt-1 min-h-[100px] text-sm"
              />
              <p className="text-[10px] text-indigo-600">{m.order.cardStudioHint}</p>
            </div>
          )}

          {messageType === "ribbon" && (
            <div className="space-y-3">
              <div>
                <Label className="mb-2 block text-[10px] text-gray-500">
                  {m.order.ribbonPresetsLabel}
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {RIBBON_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setMessageContent(preset)}
                      className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[10px] text-gray-700 hover:border-indigo-400 hover:bg-indigo-50"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
              {recentRibbonMessages.length > 0 && (
                <div>
                  <Label className="mb-1 block text-[10px] text-gray-500">
                    {m.order.recentRibbonPhrases}
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {recentRibbonMessages.map((msg, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() =>
                          setMessageContent(
                            msg.sender ? `${msg.content} / ${msg.sender}` : msg.content
                          )
                        }
                        className="rounded-lg bg-gray-100 px-2 py-1 text-left text-[10px] hover:bg-indigo-50"
                      >
                        {msg.content}
                        {msg.sender ? (
                          <span className="ml-1 text-gray-400">({msg.sender})</span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <Label className="text-xs text-gray-500">{tf.f00179 ?? "Ribbon"}</Label>
                <Input
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder={m.order.ribbonPlaceholder}
                  className="mt-1 h-10 text-sm"
                />
                <p className="mt-1 text-[10px] text-gray-400">
                  {tf.f00003}
                </p>
              </div>
              {messageContent.trim() ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 border-indigo-200 text-indigo-700"
                  onClick={() => {
                    const built = buildOrderMessage("ribbon", messageContent, ordererName);
                    openRibbonPrinter(
                      built.content ?? "",
                      built.type === "ribbon" ? built.sender : undefined
                    );
                  }}
                >
                  <Printer className="h-4 w-4" />
                  {m.order.ribbonPreview}
                </Button>
              ) : null}
            </div>
          )}

          {messageType === "none" && (
            <p className="text-xs text-gray-400">{m.order.noMessageOrder}</p>
          )}
        </section>

        {/* 6. 요청사항 */}
        <section className="space-y-2 rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-800">{m.order.requestPlaceholder ? "요청사항" : "요청사항"}</h2>
          <Input
            placeholder={m.order.requestPlaceholder}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="h-10"
          />
        </section>

        {/* 7. 포인트 사용 (고객 선택 시 표시) */}
        {selectedCustomer && maxUsablePoints > 0 && (
          <section className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-amber-900">{m.customer.usePoints}</h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-amber-800"
                onClick={() => setUsedPoints(maxUsablePoints)}
              >
                {m.customer.useAllPoints}
              </Button>
            </div>
            <Input
              type="number"
              min={0}
              max={maxUsablePoints}
              value={usedPoints || ""}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10) || 0;
                setUsedPoints(Math.min(maxUsablePoints, Math.max(0, n)));
              }}
              className="h-10 bg-white"
            />
            <p className="text-[10px] text-amber-800/80">
              {m.customer.maxPointsHint.replace("{{amount}}", maxUsablePoints.toLocaleString())}
            </p>
          </section>
        )}

        {/* 8. 결제수단 */}
        <section className="space-y-2 rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-800">결제수단</h2>
          <div className="grid grid-cols-4 gap-1.5">
            {mobilePaymentMethods.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() =>
                  selectOrderPaymentMethod(key, setPaymentMethod, setPaymentStatus)
                }
                className={`rounded-lg py-2 text-xs font-bold ${
                  paymentMethod === key ? "bg-blue-600 text-white" : "bg-gray-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPaymentStatus("pending")}
              className={`flex-1 rounded-xl py-2 text-sm font-bold ${
                paymentStatus === "pending" ? "bg-amber-500 text-white" : "bg-gray-100"
              }`}
            >
              {m.order.paymentPending}
            </button>
            <button
              type="button"
              onClick={() => setPaymentStatus("paid")}
              className={`flex-1 rounded-xl py-2 text-sm font-bold ${
                paymentStatus === "paid" ? "bg-emerald-600 text-white" : "bg-gray-100"
              }`}
            >
              {m.order.paymentPaid}
            </button>
          </div>
        </section>
      </div>

      <div className="shrink-0 border-t bg-white p-4">
        <Button
          className="h-12 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-base font-black"
          disabled={submitting}
          onClick={handleSubmit}
        >
          {submitting ? m.order.saving : m.order.submit}
        </Button>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          className="flex h-[85vh] max-h-[85vh] flex-col gap-0 overflow-hidden rounded-t-3xl p-0"
        >
          <div className="shrink-0 border-b px-4 pb-3 pt-4">
            <SheetHeader className="space-y-0 p-0 pb-3">
              <div className="flex items-start justify-between gap-3 pr-8">
                <div className="flex items-center gap-2">
                  <SheetTitle>{m.order.addProduct}</SheetTitle>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      setIsCustomProductDialogOpen(true);
                    }}
                    className="flex items-center gap-1 rounded-full border border-violet-300 bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-700 active:bg-violet-100"
                  >
                    ✏️ 직접입력
                  </button>
                </div>
                {cartItemCount > 0 ? (
                  <span className="shrink-0 rounded-full bg-blue-600 px-2.5 py-1 text-xs font-bold text-white">
                    {m.order.cartCountBadge.replace("{{count}}", String(cartItemCount))}
                  </span>
                ) : null}
              </div>
              {activeProductCategory ? (
                <p className="text-xs text-gray-500">
                  {activeProductCategory} ·{" "}
                  {m.order.categoryItemCount.replace(
                    "{{count}}",
                    String(categoryProductCounts.get(activeProductCategory) ?? 0),
                  )}
                </p>
              ) : null}
            </SheetHeader>

            {productCategories.length > 0 ? (
              <MobileProductCategoryPicker
                categories={productCategories}
                activeCategory={activeProductCategory}
                categoryCounts={categoryProductCounts}
                pinnedCategory={pinnedCategory}
                onSelect={handleProductCategorySelect}
                onPinCategory={pinCategory}
                accent="blue"
              />
            ) : null}
          </div>

          <div className="relative shrink-0 px-4 py-3">
            <Search className="absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder={
                activeProductCategory
                  ? `${activeProductCategory} ${m.order.productSearchPlaceholder}`
                  : m.order.productSearchPlaceholder
              }
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="h-10 pl-9"
            />
          </div>

          <div
            ref={productListRef}
            className="grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-y-auto overscroll-contain px-4 pb-10 content-start [-webkit-overflow-scrolling:touch]"
          >
            {filteredProducts.length === 0 ? (
              <div className="col-span-2 py-12 text-center text-sm text-gray-400">
                {productSearch.trim()
                  ? m.order.productSearchEmpty
                  : m.order.categoryEmpty}
              </div>
            ) : (
              filteredProducts.map((p) => {
                const qty = cartQuantityById.get(p.id) ?? 0;
                const isSelected = qty > 0;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addProduct(p)}
                    className={cn(
                      "relative flex min-h-[5.5rem] touch-manipulation flex-col rounded-xl border-2 p-2.5 text-left transition-colors active:scale-[0.98]",
                      isSelected
                        ? "border-blue-500 bg-blue-50 shadow-sm"
                        : "border-gray-200 bg-white active:bg-blue-50/50"
                    )}
                  >
                    {isSelected ? (
                      <span className="absolute right-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                        {qty}
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        "line-clamp-2 pr-5 text-xs font-semibold leading-snug",
                        isSelected ? "text-blue-900" : "text-gray-900"
                      )}
                    >
                      {p.name}
                    </span>
                    {p.mid_category ? (
                      <span className="mt-0.5 line-clamp-1 text-[10px] text-gray-400">
                        {p.mid_category}
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        "mt-auto pt-2 text-sm font-bold",
                        isSelected ? "text-blue-700" : "text-blue-600"
                      )}
                    >
                      {fmt(p.price)}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* 선택 완료 버튼 - 상품 담은 경우만 표시 */}
          {cartItemCount > 0 && (
            <div className="shrink-0 border-t bg-white px-4 py-3">
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="flex h-12 w-full items-center justify-between rounded-2xl bg-blue-600 px-5 font-bold text-white active:bg-blue-700"
              >
                <span>선택 완료</span>
                <span className="rounded-full bg-white/20 px-3 py-1 text-sm">
                  합계 {fmt(cart.reduce((s, i) => s + i.price * i.quantity, 0).valueOf())}
                </span>
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* 직접입력 Dialog */}
      <Dialog open={isCustomProductDialogOpen} onOpenChange={(open) => {
        setIsCustomProductDialogOpen(open);
        if (!open) { setCustomProductName(""); setCustomProductPrice(""); setCustomProductQuantity(1); }
      }}>
        <DialogContent className="max-w-xs rounded-3xl">
          <DialogHeader>
            <DialogTitle>직접입력</DialogTitle>
            <DialogDescription>등록되지 않은 상품을 직접 입력해 추가합니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-gray-500">상품명</Label>
              <Input
                placeholder="상품명을 입력하세요"
                value={customProductName}
                onChange={(e) => setCustomProductName(e.target.value)}
                className="mt-1 h-10"
                autoFocus
              />
              {/* 유사 상품 목록 */}
              {similarProducts.length > 0 && (
                <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5">
                  <p className="mb-1.5 text-[11px] font-bold text-amber-800">⚠️ 유사 상품 목록 (선택하면 바로 추가)</p>
                  <div className="flex flex-col gap-1">
                    {similarProducts.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          addProduct(p);
                          setIsCustomProductDialogOpen(false);
                          setCustomProductName("");
                          setCustomProductPrice("");
                          toast.success(`[${p.name}] 추가됨`);
                        }}
                        className="flex items-center justify-between rounded-lg bg-white px-2.5 py-1.5 text-xs shadow-sm hover:bg-amber-100"
                      >
                        <span className="font-medium text-gray-800">{p.name}</span>
                        <span className="font-bold text-blue-600">{p.price.toLocaleString()}원</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs text-gray-500">가격 (원)</Label>
              <Input
                type="number"
                placeholder="가격을 입력하세요"
                value={customProductPrice}
                onChange={(e) => setCustomProductPrice(e.target.value)}
                className="mt-1 h-10"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">수량</Label>
              <div className="mt-1 flex items-center gap-2">
                <button type="button" onClick={() => setCustomProductQuantity(Math.max(1, customProductQuantity - 1))} className="rounded-full bg-gray-100 p-1.5">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-8 text-center font-bold">{customProductQuantity}</span>
                <button type="button" onClick={() => setCustomProductQuantity(customProductQuantity + 1)} className="rounded-full bg-gray-100 p-1.5">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => setIsCustomProductDialogOpen(false)}>취소</Button>
            <Button className="flex-1 bg-violet-600 hover:bg-violet-700" onClick={handleAddCustomProduct}>추가</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-sm rounded-3xl border-none">
          <DialogHeader className="space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <DialogTitle className="text-center text-xl font-bold">{tf.f00614 ?? m.order.saved}</DialogTitle>
            <DialogDescription className="text-center font-mono text-sm font-bold text-indigo-600">
              {lastOrderNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            {submittedMessageType === "ribbon" && lastOrderId && (
              <Button
                className="h-11 gap-2 rounded-2xl bg-indigo-600 font-bold"
                onClick={() => {
                  const built = buildOrderMessage("ribbon", messageContent, ordererName);
                  openRibbonPrinter(
                    built.content ?? "",
                    built.type === "ribbon" ? built.sender : undefined
                  );
                }}
              >
                <Printer className="h-4 w-4" />
                {tf.f00181 ?? "Ribbon print"}
              </Button>
            )}
            {submittedMessageType === "card" && lastOrderId && (
              <Button
                className="h-11 gap-2 rounded-2xl bg-violet-600 font-bold"
                onClick={() => openCardDesignStudio(lastOrderId)}
              >
                <Sparkles className="h-4 w-4" />
                {m.order.cardDesignStudio}
              </Button>
            )}
            {submittedMessageType === "card" && lastOrderId && (
              <Button
                variant="outline"
                className="h-10 gap-2 rounded-2xl font-bold"
                onClick={() =>
                  router.push(
                    `/dashboard/orders?openMessagePrint=true&orderId=${lastOrderId}`
                  )
                }
              >
                <Printer className="h-4 w-4" />
                {tf.f00706 ?? "Print card"}
              </Button>
            )}
            <Button
              variant="outline"
              className="h-11 rounded-2xl font-bold"
              onClick={() => router.push("/dashboard/mobile/pickup")}
            >
              {m.nav.pickupDelivery}
            </Button>
            <Button
              variant="ghost"
              className="rounded-2xl"
              onClick={() => {
                setShowSuccessDialog(false);
                window.location.reload();
              }}
            >
              {m.order.continueOrder}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
