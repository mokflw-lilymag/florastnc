"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle, Plus, Minus, RotateCcw, Zap } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useOrders } from "@/hooks/use-orders";
import { usePinnedMobileProductCategory } from "@/hooks/use-pinned-mobile-product-category";
import { MobilePageHeader } from "@/components/mobile/mobile-page-header";
import { MobileProductCategoryPicker } from "@/components/mobile/mobile-product-category-picker";
import { fetchTenantProductsForMobile } from "@/lib/mobile/fetch-tenant-products";
import {
  buildMobileProductCategories,
  countProductsByCategory,
  filterProductsForMobilePicker,
  MOBILE_PRODUCT_CATEGORY_PRIORITY,
  resolveMobileProductCategory,
} from "@/lib/mobile/product-categories";
import { MOBILE_PAYMENT_METHODS } from "@/lib/mobile/payment-methods";
import type { Product } from "@/types/product";
import type { OrderData } from "@/types/order";
import { toast } from "sonner";

type CartItem = { product: Product; quantity: number };

const DISCOUNT_OPTIONS = [
  { label: "할인 없음", value: 0 },
  { label: "5%", value: 0.05 },
  { label: "10%", value: 0.1 },
  { label: "20%", value: 0.2 },
];

export default function MobileQuickPosPage() {
  const { profile, tenantId } = useAuth();
  const storeName = profile?.tenants?.name;
  const { addOrder } = useOrders();

  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<OrderData["payment"]["method"]>("card");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const loadProducts = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      setProducts(await fetchTenantProductsForMobile(tenantId));
    } catch {
      toast.error("상품을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const categories = useMemo(
    () => buildMobileProductCategories(products),
    [products]
  );

  const categoryCounts = useMemo(
    () => countProductsByCategory(products),
    [products]
  );

  const { pinnedCategory, pinCategory, pinnedFallback, ready } =
    usePinnedMobileProductCategory(categories);

  useEffect(() => {
    if (!ready || categories.length === 0) return;
    setSelectedCategory((prev) =>
      resolveMobileProductCategory(
        categories,
        prev ?? pinnedCategory,
        pinnedFallback ?? MOBILE_PRODUCT_CATEGORY_PRIORITY[0]
      )
    );
  }, [ready, categories, pinnedCategory, pinnedFallback]);

  const activeCategory = useMemo(
    () =>
      resolveMobileProductCategory(
        categories,
        selectedCategory,
        pinnedFallback ?? MOBILE_PRODUCT_CATEGORY_PRIORITY[0]
      ),
    [categories, selectedCategory, pinnedFallback]
  );

  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat);
  };

  const handlePinCategory = (cat: string) => {
    pinCategory(cat);
    setSelectedCategory(cat);
  };

  const filteredProducts = useMemo(
    () => filterProductsForMobilePicker(products, activeCategory, ""),
    [products, activeCategory]
  );

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const ex = prev.find((i) => i.product.id === product.id);
      if (ex) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const ex = prev.find((i) => i.product.id === productId);
      if (ex && ex.quantity > 1) {
        return prev.map((i) =>
          i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i
        );
      }
      return prev.filter((i) => i.product.id !== productId);
    });
  };

  const subtotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const customValue = showCustomInput ? parseInt(customAmount.replace(/,/g, ""), 10) || 0 : 0;
  const effectiveSubtotal = showCustomInput && customValue > 0 ? customValue : subtotal;
  const discountAmount = Math.round(effectiveSubtotal * discount);
  const total = effectiveSubtotal - discountAmount;

  const handleSubmit = async () => {
    if (total <= 0 || !tenantId) return;
    setSubmitting(true);
    try {
      const now = new Date();
      let items = cart.map((item) => ({
        id: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
      }));
      if (showCustomInput && customValue > 0 && items.length === 0) {
        items = [{ id: "custom", name: "현장 판매", quantity: 1, price: customValue }];
      }

      const payload: OrderData = {
        status: "completed",
        receipt_type: "store_pickup",
        order_date: now.toISOString(),
        items,
        orderer: { name: "현장고객", contact: "" },
        summary: {
          subtotal: effectiveSubtotal,
          discountAmount,
          discountRate: discount,
          deliveryFee: 0,
          total,
        },
        payment: {
          method: paymentMethod,
          status: "paid",
          completedAt: now.toISOString(),
        },
        pickup_info: {
          date: now.toISOString().slice(0, 10),
          time: formatTime(now),
          pickerName: "현장고객",
          pickerContact: "",
        },
        delivery_info: null,
        source: "pos",
        extra_data: { mobile_pos: true },
      };

      const id = await addOrder(payload);
      if (!id) throw new Error("create failed");
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setCart([]);
        setDiscount(0);
        setCustomAmount("");
        setShowCustomInput(false);
      }, 2000);
    } catch {
      toast.error("주문 등록 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!tenantId) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-gray-500">
        매장 정보가 없습니다.
      </div>
    );
  }

  if (success) {
    return (
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-emerald-500">
        <CheckCircle className="mb-6 h-24 w-24 text-white" />
        <p className="text-4xl font-bold text-white">결제 완료!</p>
        <p className="mt-3 text-2xl text-white/80">{total.toLocaleString()}원</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <MobilePageHeader
        title="빠른 판매 POS"
        subtitle={storeName ?? undefined}
        icon={Zap}
        variant="orange"
        onRefresh={loadProducts}
        loading={loading}
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 border-b bg-white px-3 py-2">
            <MobileProductCategoryPicker
              categories={categories}
              activeCategory={activeCategory}
              categoryCounts={categoryCounts}
              pinnedCategory={pinnedCategory}
              onSelect={handleCategorySelect}
              onPinCategory={handlePinCategory}
              accent="orange"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {!showCustomInput ? (
              <button
                type="button"
                onClick={() => setShowCustomInput(true)}
                className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-orange-300 py-3 font-medium text-orange-500"
              >
                <Plus className="h-4 w-4" /> 금액 직접 입력
              </button>
            ) : (
              <div className="mb-3 flex items-center gap-2 rounded-xl border-2 border-orange-200 bg-orange-50 p-3">
                <span className="font-bold text-orange-600">₩</span>
                <input
                  type="number"
                  placeholder="판매 금액"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="flex-1 bg-transparent text-lg font-bold outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomInput(false);
                    setCustomAmount("");
                  }}
                  className="text-gray-400"
                >
                  ✕
                </button>
              </div>
            )}

            {loading ? (
              <p className="py-10 text-center text-gray-400">상품 불러오는 중...</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {filteredProducts.map((product) => {
                  const cartItem = cart.find((c) => c.product.id === product.id);
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => addToCart(product)}
                      className={`relative rounded-xl border-2 p-3 text-left active:scale-95 ${
                        cartItem
                          ? "border-orange-400 bg-orange-50"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      {cartItem && (
                        <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
                          {cartItem.quantity}
                        </span>
                      )}
                      <p className="truncate text-xs text-gray-400">{product.main_category}</p>
                      <p className="line-clamp-2 text-sm font-semibold text-gray-800">
                        {product.name}
                      </p>
                      <p className="mt-1 text-sm font-bold text-orange-600">
                        {product.price.toLocaleString()}원
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex max-h-[45vh] min-h-[200px] flex-col border-t bg-white lg:max-h-none lg:w-80 lg:border-l lg:border-t-0">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-xs font-semibold text-gray-400">장바구니</span>
            <button
              type="button"
              onClick={() => {
                setCart([]);
                setDiscount(0);
                setShowCustomInput(false);
                setCustomAmount("");
              }}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-[72px] flex-1 overflow-y-auto p-3">
            {cart.length === 0 && !showCustomInput ? (
              <p className="py-4 text-center text-sm text-gray-300">상품을 선택하세요</p>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center gap-2 rounded-lg bg-gray-50 p-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.product.name}</p>
                      <p className="text-xs text-gray-500">
                        {item.product.price.toLocaleString()}원
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.id)}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-5 text-center text-sm font-bold">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => addToCart(item.product)}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2 border-t px-3 py-2">
            <p className="text-xs font-semibold text-gray-400">할인</p>
            <div className="grid grid-cols-4 gap-1">
              {DISCOUNT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDiscount(opt.value)}
                  className={`rounded-lg py-1.5 text-xs font-medium ${
                    discount === opt.value
                      ? "bg-orange-500 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs font-semibold text-gray-400">결제</p>
            <div className="grid grid-cols-3 gap-1.5">
              {MOBILE_PAYMENT_METHODS.map((pm) => (
                <button
                  key={pm.key}
                  type="button"
                  onClick={() => setPaymentMethod(pm.key)}
                  className={`rounded-lg py-2 text-xs font-bold ${
                    paymentMethod === pm.key ? pm.color : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {pm.label}
                </button>
              ))}
            </div>
            <div className="flex justify-between py-1">
              <span className="text-lg font-bold">합계</span>
              <span className="text-2xl font-black text-orange-500">
                {total.toLocaleString()}원
              </span>
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={total <= 0 || submitting}
              className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-pink-500 py-4 text-lg font-black text-white disabled:opacity-40"
            >
              {submitting ? "처리 중..." : "✓ 결제 완료"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTime(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
