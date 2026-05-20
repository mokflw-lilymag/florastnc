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
import { MOBILE_PAYMENT_METHODS } from "@/lib/mobile/payment-methods";
import { formatPhoneNumber } from "@/lib/mobile/format-phone";
import type { Product } from "@/types/product";
import type { OrderData } from "@/types/order";
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

const RECEIPT_OPTIONS: { value: ReceiptType; label: string }[] = [
  { value: "store_pickup", label: "매장 픽업" },
  { value: "pickup_reservation", label: "픽업 예약" },
  { value: "delivery_reservation", label: "배송" },
];

export default function MobileNewOrderPage() {
  const router = useRouter();
  const { profile, tenantId } = useAuth();
  const storeName = profile?.tenants?.name;
  const { addOrder } = useOrders();
  const { customers, loading: customersLoading, addCustomer } = useCustomers();
  const { settings } = useSettings();

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [registerCustomer, setRegisterCustomer] = useState(false);
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
  const [receiptType, setReceiptType] = useState<ReceiptType>("pickup_reservation");
  const [scheduleDate, setScheduleDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [scheduleTime, setScheduleTime] = useState("10:00");
  const [recipientName, setRecipientName] = useState("");
  const [recipientContact, setRecipientContact] = useState("");
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
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "pending">("pending");

  const loadProducts = useCallback(async () => {
    if (!tenantId) return;
    try {
      setProducts(await fetchTenantProductsForMobile(tenantId));
    } catch {
      toast.error("상품 목록을 불러오지 못했습니다.");
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
    setRegisterCustomer(false);
    setUsedPoints(0);
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setUsedPoints(0);
  };

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
      toast.error("주문자 이름과 연락처를 입력해 주세요.");
      return;
    }
    if (cart.length === 0) {
      toast.error("상품을 1개 이상 추가해 주세요.");
      return;
    }

    setSubmitting(true);
    try {
      let finalCustomerId = selectedCustomer?.id || "";
      if (registerCustomer && !finalCustomerId) {
        const newId = await addCustomer({
          name: ordererName.trim(),
          contact: ordererContact.trim(),
          company_name: ordererCompany.trim() || undefined,
          type: ordererCompany.trim() ? "company" : "individual",
          grade: "일반",
          points: 0,
        });
        if (newId) finalCustomerId = newId;
      }

      const payload: OrderData = {
        status: "processing",
        receipt_type: receiptType,
        order_date: new Date().toISOString(),
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
      setLastOrderId(id);
      setLastOrderNumber(`ORD-${Date.now().toString().slice(-8)}`);
      setSubmittedMessageType(messageType);
      setShowSuccessDialog(true);
      toast.success("주문이 접수되었습니다.");
    } catch {
      toast.error("주문 저장에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!tenantId) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-gray-500">
        매장 정보가 없습니다.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <MobilePageHeader
        title="모바일 주문접수"
        subtitle={storeName ?? undefined}
        icon={ShoppingBag}
        variant="blue"
      />

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 pb-28">
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
          registerCustomer={registerCustomer}
          setRegisterCustomer={setRegisterCustomer}
          usedPoints={usedPoints}
          setUsedPoints={setUsedPoints}
          maxUsablePoints={maxUsablePoints}
          pointRate={settings?.pointRate}
        />

        <section className="space-y-2 rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-800">수령 방식</h2>
          <div className="grid grid-cols-3 gap-2">
            {RECEIPT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setReceiptType(opt.value)}
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
              <Label className="text-xs text-gray-500">예약일</Label>
              <Input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="mt-1 h-10"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">시간</Label>
              <Input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="mt-1 h-10"
              />
            </div>
          </div>
          {receiptType === "delivery_reservation" && (
            <>
              <Input
                placeholder="배송 주소"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="h-10"
              />
              <Input
                placeholder="수령인 이름"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="h-10"
              />
              <Input
                placeholder="수령인 연락처"
                value={recipientContact}
                onChange={(e) => setRecipientContact(formatPhoneNumber(e.target.value))}
                className="h-10"
              />
            </>
          )}
        </section>

        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-800">주문 상품</h2>
            <Button size="sm" type="button" onClick={openProductSheet}>
              + 상품 추가
            </Button>
          </div>
          {cart.length === 0 ? (
            <p className="rounded-lg border border-dashed py-6 text-center text-sm text-gray-400">
              상품을 추가해 주세요
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
                      {(item.price * item.quantity).toLocaleString()}원
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
            합계 {total.toLocaleString()}원
            {pointsToUse > 0 && (
              <span className="block text-xs font-normal text-amber-700">
                포인트 -{pointsToUse.toLocaleString()}P
              </span>
            )}
            {deliveryFee > 0 && (
              <span className="ml-1 text-xs font-normal text-gray-500">
                (배송비 {deliveryFee.toLocaleString()}원 포함)
              </span>
            )}
            {pointsEarned > 0 && (
              <span className="block text-xs font-normal text-emerald-600">
                적립 예정 +{pointsEarned.toLocaleString()}P
              </span>
            )}
          </p>
        </section>

        <section className="space-y-3 rounded-2xl border bg-white p-4 shadow-sm">
          <div>
            <h2 className="text-sm font-bold text-gray-800">메시지 (카드 · 리본)</h2>
            <p className="mt-1 text-[10px] text-gray-500">
              리본 → 리본 프린터 · 카드 → 디자인 스튜디오와 연동됩니다. 주문 저장 후 바로 출력·편집할 수 있습니다.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { value: "none" as const, label: "없음" },
                { value: "card" as const, label: "카드" },
                { value: "ribbon" as const, label: "리본" },
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
              <Label className="text-xs text-gray-500">카드 메시지</Label>
              <Textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="카드에 들어갈 내용을 입력하세요."
                className="mt-1 min-h-[100px] text-sm"
              />
              <p className="text-[10px] text-indigo-600">
                저장 후 「카드 디자인」으로 디자인 스튜디오에 문구가 자동 반영됩니다.
              </p>
            </div>
          )}

          {messageType === "ribbon" && (
            <div className="space-y-3">
              <div>
                <Label className="mb-2 block text-[10px] text-gray-500">
                  표준 문구 (탭하면 입력)
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
                    이 고객의 최근 리본 문구
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
                <Label className="text-xs text-gray-500">리본 문구</Label>
                <Input
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="예: 축결혼 / 홍길동 (보내는 분 미입력 시 주문자명)"
                  className="mt-1 h-10 text-sm"
                />
                <p className="mt-1 text-[10px] text-gray-400">
                  메시지와 보내는 분은 &apos;/&apos; 로 구분합니다. 보내는 분을 비우면 주문자 이름이
                  사용됩니다.
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
                  리본 프린터 미리보기
                </Button>
              ) : null}
            </div>
          )}

          {messageType === "none" && (
            <p className="text-xs text-gray-400">카드·리본 메시지 없이 주문합니다.</p>
          )}
        </section>

        <section className="space-y-2 rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-800">결제</h2>
          <div className="grid grid-cols-3 gap-1.5">
            {MOBILE_PAYMENT_METHODS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setPaymentMethod(key)}
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
              미결제
            </button>
            <button
              type="button"
              onClick={() => setPaymentStatus("paid")}
              className={`flex-1 rounded-xl py-2 text-sm font-bold ${
                paymentStatus === "paid" ? "bg-emerald-600 text-white" : "bg-gray-100"
              }`}
            >
              결제완료
            </button>
          </div>
          <Input
            placeholder="요청사항"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="h-10"
          />
        </section>
      </div>

      <div className="shrink-0 border-t bg-white p-4">
        <Button
          className="h-12 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-base font-black"
          disabled={submitting}
          onClick={handleSubmit}
        >
          {submitting ? "저장 중..." : "주문 접수"}
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
                <SheetTitle>상품 선택</SheetTitle>
                {cartItemCount > 0 ? (
                  <span className="shrink-0 rounded-full bg-blue-600 px-2.5 py-1 text-xs font-bold text-white">
                    {cartItemCount}개 담음
                  </span>
                ) : null}
              </div>
              {activeProductCategory ? (
                <p className="text-xs text-gray-500">
                  {activeProductCategory} ·{" "}
                  {(categoryProductCounts.get(activeProductCategory) ?? 0).toLocaleString()}개
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
                  ? `${activeProductCategory} 상품 검색`
                  : "상품명 검색"
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
                  ? "검색 결과가 없습니다."
                  : "이 카테고리에 등록된 상품이 없습니다."}
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
                      {p.price.toLocaleString()}원
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-sm rounded-3xl border-none">
          <DialogHeader className="space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <DialogTitle className="text-center text-xl font-bold">주문 접수 완료</DialogTitle>
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
                리본 프린터로 출력
              </Button>
            )}
            {submittedMessageType === "card" && lastOrderId && (
              <Button
                className="h-11 gap-2 rounded-2xl bg-violet-600 font-bold"
                onClick={() => openCardDesignStudio(lastOrderId)}
              >
                <Sparkles className="h-4 w-4" />
                카드 디자인 스튜디오
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
                메시지 카드 인쇄
              </Button>
            )}
            <Button
              variant="outline"
              className="h-11 rounded-2xl font-bold"
              onClick={() => router.push("/dashboard/mobile/pickup")}
            >
              픽업/배송 관리로 이동
            </Button>
            <Button
              variant="ghost"
              className="rounded-2xl"
              onClick={() => {
                setShowSuccessDialog(false);
                window.location.reload();
              }}
            >
              이어서 주문 접수
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
