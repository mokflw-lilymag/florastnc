"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
type Branch = { id: string; name: string; type?: string; };
import { createClient } from '@/utils/supabase/client';
const supabase = createClient();
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { CheckCircle, ChevronLeft, Plus, Minus, RotateCcw, Zap } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  mainCategory: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

const DISCOUNT_OPTIONS = [
  { label: "할인 없음", value: 0 },
  { label: "5% 할인", value: 0.05 },
  { label: "10% 할인", value: 0.10 },
  { label: "20% 할인", value: 0.20 },
];

const PAYMENT_METHODS = [
  { key: "card", label: "카드", color: "bg-blue-500 hover:bg-blue-600" },
  { key: "cash", label: "현금", color: "bg-emerald-500 hover:bg-emerald-600" },
  { key: "transfer", label: "계좌이체", color: "bg-orange-500 hover:bg-orange-600" },
  { key: "mainpay", label: "메인", color: "bg-rose-500 hover:bg-rose-600" },
  { key: "epay", label: "e-Pay", color: "bg-violet-500 hover:bg-violet-600" },
  { key: "kakaopay", label: "카카오", color: "bg-yellow-400 hover:bg-yellow-500 text-gray-900" },
];

const PINNED_CAT_KEY = 'quickpos_pinned_category';

export default function QuickPOSPage() {
  const router = useRouter();
  const { user, profile, tenantId, isLoading: authLoading } = useAuth();
  const branches = tenantId ? [{ id: tenantId, name: profile?.tenants?.name || "Floxync", type: '가맹점' }] : [];
  const branchesLoading = authLoading;

  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("card");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // localStorage 에 저장된 고정 카테고리로 진입 (없으면 '플라워')
  const [pinnedCategory, setPinnedCategory] = useState<string>(() =>
    (typeof window !== 'undefined' ? localStorage.getItem(PINNED_CAT_KEY) : null) || '플라워'
  );
  const [selectedCategory, setSelectedCategory] = useState<string>(() =>
    (typeof window !== 'undefined' ? localStorage.getItem(PINNED_CAT_KEY) : null) || '플라워'
  );
  const [customAmount, setCustomAmount] = useState<string>("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  // 카테고리 고정 핸들러 - 다음 진입부터 해당 카테고리로 시작
  const handlePinCategory = (cat: string) => {
    if (typeof window !== 'undefined') localStorage.setItem(PINNED_CAT_KEY, cat);
    setPinnedCategory(cat);
    setSelectedCategory(cat);
  };

  // 유저 정보에서 지점명 추출 (필드명 다양성 대응)
  const userBranch = user?.franchise || (user as any)?.tenant_name || (user as any)?.tenantName || "";

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    if (!userBranch) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, main_category")
        .eq("branch", userBranch.trim()) // 공백 제거 매칭
        .order("main_category")
        .order("price");

      if (error) throw error;

      setProducts(
        (data || [])
          .filter((p) => p.main_category !== '어버이날old')
          .map((p) => ({
            id: p.id,
            name: p.name,
            price: Number(p.price),
            mainCategory: p.main_category,
          }))
      );
    } catch (err) {
      console.error("상품 로딩 오류:", err);
    } finally {
      setLoading(false);
    }
  }, [userBranch]); // userBranch가 채워지면 자동 재실행

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // 카테고리 고정 순서: 플라워 → 플랜트 → 자재 → 기타상품 → 어버이날 (전체는 맨 마지막)
  const CATEGORY_PRIORITY = ['플라워', '플랜트', '자재', '기타상품', '어버이날'];
  const allCats = Array.from(new Set(products.map((p) => p.mainCategory).filter(Boolean)));
  const sortedCats = [
    ...CATEGORY_PRIORITY.filter((c) => allCats.includes(c)),
    ...allCats.filter((c) => !CATEGORY_PRIORITY.includes(c)).sort(),
  ];
  const categories = [...sortedCats, '전체'];

  // 상품 로드 후 기본 카테고리가 실제 목록에 없으면 첫 번째 유효 카테고리로 대체
  useEffect(() => {
    if (allCats.length > 0 && selectedCategory !== '전체' && !allCats.includes(selectedCategory)) {
      const fallback = CATEGORY_PRIORITY.find((c) => allCats.includes(c)) || allCats[0];
      setSelectedCategory(fallback);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products.length]);

  const filteredProducts =
    selectedCategory === "전체"
      ? products
      : products.filter((p) => p.mainCategory === selectedCategory);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === productId);
      if (existing && existing.quantity > 1) {
        return prev.map((item) =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        );
      }
      return prev.filter((item) => item.product.id !== productId);
    });
  };

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const customAmountValue = showCustomInput ? (parseInt(customAmount.replace(/,/g, "")) || 0) : 0;
  const effectiveSubtotal = showCustomInput && customAmountValue > 0 ? customAmountValue : subtotal;
  const discountAmount = Math.round(effectiveSubtotal * discount);
  const total = effectiveSubtotal - discountAmount;

  const handleSubmit = async () => {
    if (total <= 0) return;
    setSubmitting(true);
    try {
      const now = new Date();
      const orderNumber = `POS-${now.getTime()}`;
      const branch = branches.find(b => b.name === userBranch || b.name.toLowerCase().includes(userBranch.toLowerCase()) || userBranch.toLowerCase().includes(b.name.toLowerCase()));

      let items = cart.map((item) => ({
        id: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        total: item.product.price * item.quantity,
      }));

      if (showCustomInput && customAmountValue > 0 && items.length === 0) {
        items = [{ id: "custom", name: "현장 판매", quantity: 1, price: customAmountValue, total: customAmountValue }];
      }

      const { error } = await supabase.from("orders").insert([{
        id: crypto.randomUUID(),
        order_number: orderNumber,
        order_date: now.toISOString(),
        status: "completed",
        tenant_id: branch?.id || "",
        tenant_name: userBranch,
        extra_data: { tenant_name: userBranch },
        is_anonymous: true,
        order_type: "store",
        receipt_type: "store_pickup",
        items,
        orderer: { name: "현장고객", contact: "", company: "", email: "" },
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
      }]);

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setCart([]);
        setDiscount(0);
        setPaymentMethod("card");
        setCustomAmount("");
        setShowCustomInput(false);
      }, 2000);
    } catch (err) {
      console.error(err);
      alert("주문 등록 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  // user 인증 로딩 중
  if (authLoading) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">지점 정보를 불러오는 중...</p>
      </div>
    );
  }

  // 지점 정보 없음
  if (!userBranch) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center gap-4 px-6">
        <Zap className="w-12 h-12 text-orange-400" />
        <p className="text-gray-700 font-bold text-lg">지점 정보가 없습니다</p>
        <p className="text-gray-400 text-sm text-center">어드민 페이지에서 지점을 배정하거나<br/>본사에 문의해 주세요.</p>
        <button onClick={() => router.back()} className="mt-2 px-6 py-2 bg-orange-500 text-white rounded-xl font-bold">돌아가기</button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="fixed inset-0 bg-emerald-500 flex flex-col items-center justify-center z-50 animate-in fade-in">
        <CheckCircle className="w-24 h-24 text-white mb-6 animate-in zoom-in" />
        <p className="text-4xl font-bold text-white">결제 완료!</p>
        <p className="text-2xl text-white/80 mt-3">{total.toLocaleString()}원</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-pink-500 text-white px-4 py-3 flex items-center gap-3 shadow-md">
        <button onClick={() => router.back()} className="p-1 rounded-full hover:bg-white/20 transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <Zap className="w-5 h-5" />
        <div className="flex-1">
          <p className="font-bold text-lg leading-none">빠른 판매 POS</p>
          <p className="text-xs text-white/70">{userBranch} · {format(new Date(), "M월 d일 (eee)", { locale: ko })}</p>
        </div>
        <button onClick={() => { setCart([]); setDiscount(0); setShowCustomInput(false); setCustomAmount(""); }}
          className="p-2 rounded-full hover:bg-white/20 transition-colors">
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Navigation Tabs */}
      <div className="bg-white px-3 pt-2 flex gap-1 border-b">
        <button
          onClick={() => router.push("/dashboard/pos/pickup")}
          className="flex-1 py-2 text-xs font-bold text-gray-400 hover:bg-gray-50 border-b-4 border-transparent transition-all whitespace-nowrap"
        >
          📦 픽업/배송
        </button>
        <button
          className="flex-1 py-2 text-xs font-black border-b-4 border-orange-500 text-orange-600 bg-orange-50/50 rounded-t-xl transition-all whitespace-nowrap"
        >
          ⚡ 빠른판매 POS
        </button>
        <button
          onClick={() => router.push("/dashboard/orders/new-mobile")}
          className="flex-1 py-2 text-xs font-bold text-gray-400 hover:bg-gray-50 border-b-4 border-transparent transition-all whitespace-nowrap"
        >
          📝 주문접수(mobile)
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Product Selection */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Category Tabs - 선택 중인 탭 옆 📌 버튼으로 고정 가능 */}
          <div className="flex gap-1.5 px-3 py-2 overflow-x-auto bg-white border-b scrollbar-hide items-center">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              const isPinned = pinnedCategory === cat;
              return (
                <div key={cat} className="flex-shrink-0 flex items-center gap-0.5">
                  <button
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      isSelected
                        ? "bg-orange-500 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}>
                    {isPinned && <span className="mr-1">📌</span>}{cat}
                  </button>
                  {/* 선택 중인 탭(전체 제외)에만 고정 버튼 노출 */}
                  {isSelected && cat !== '전체' && (
                    <button
                      onClick={() => handlePinCategory(cat)}
                      title="이 카테고리를 다음 진입 시 기본으로 고정"
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all ${
                        isPinned
                          ? "bg-orange-200 text-orange-600 scale-110"
                          : "bg-gray-100 text-gray-400 hover:bg-orange-100 hover:text-orange-500"
                      }`}>
                      📌
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto p-3">
            {/* Custom Amount Button */}
            <div className="mb-3">
              {!showCustomInput ? (
                <button onClick={() => setShowCustomInput(true)}
                  className="w-full py-3 border-2 border-dashed border-orange-300 rounded-xl text-orange-500 font-medium hover:bg-orange-50 transition-colors flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" /> 금액 직접 입력
                </button>
              ) : (
                <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-3 flex items-center gap-2">
                  <span className="text-orange-600 font-bold text-sm">₩</span>
                  <input
                    type="number"
                    placeholder="판매 금액 입력"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-gray-800 font-bold text-lg"
                    autoFocus
                  />
                  <button onClick={() => { setShowCustomInput(false); setCustomAmount(""); }}
                    className="text-gray-400 hover:text-red-500">✕</button>
                </div>
              )}
            </div>

            {loading ? (
              <div className="text-center py-10 text-gray-400">상품 불러오는 중...</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {filteredProducts.map((product) => {
                  const cartItem = cart.find((c) => c.product.id === product.id);
                  return (
                    <button key={product.id} onClick={() => addToCart(product)}
                      className={`relative p-3 rounded-xl border-2 text-left transition-all active:scale-95 ${
                        cartItem
                          ? "border-orange-400 bg-orange-50"
                          : "border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50/50"
                      }`}>
                      {cartItem && (
                        <span className="absolute top-1.5 right-1.5 bg-orange-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {cartItem.quantity}
                        </span>
                      )}
                      <p className="text-xs text-gray-400 mb-0.5 truncate">{product.mainCategory}</p>
                      <p className="font-semibold text-gray-800 text-sm leading-tight line-clamp-2">{product.name}</p>
                      <p className="text-orange-600 font-bold text-sm mt-1">{product.price.toLocaleString()}원</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Cart & Payment */}
        {/* max-h: 할인(~50px) + 결제(~80px) + 합계/버튼(~120px) = ~250px 고정 영역 + 장바구니 90px = 340px 이상 필요 */}
        <div className="bg-white border-t lg:border-t-0 lg:border-l lg:w-80 flex flex-col max-h-[65vh] lg:max-h-none">
          {/* Cart Items - 최소 1개 항목(~56px)이 완전히 보이도록 min-h 보장 */}
          <div className="flex-1 overflow-y-auto p-3 min-h-[90px]">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">주문 항목</p>
            {cart.length === 0 && !showCustomInput ? (
              <p className="text-center text-gray-300 text-sm py-4">상품을 선택하세요</p>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.product.name}</p>
                      <p className="text-xs text-gray-500">{item.product.price.toLocaleString()}원</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => removeFromCart(item.product.id)}
                        className="w-6 h-6 rounded-full bg-gray-200 hover:bg-red-100 flex items-center justify-center">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center font-bold text-sm">{item.quantity}</span>
                      <button onClick={() => addToCart(item.product)}
                        className="w-6 h-6 rounded-full bg-gray-200 hover:bg-green-100 flex items-center justify-center">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-sm font-bold w-20 text-right">{(item.product.price * item.quantity).toLocaleString()}</p>
                  </div>
                ))}
                {showCustomInput && customAmountValue > 0 && (
                  <div className="flex items-center bg-orange-50 rounded-lg p-2">
                    <p className="flex-1 text-sm font-medium text-gray-700">직접 입력</p>
                    <p className="text-sm font-bold">{customAmountValue.toLocaleString()}원</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Discount Selection */}
          <div className="px-3 pb-2 border-t pt-2">
            <p className="text-xs font-semibold text-gray-400 mb-1.5">할인</p>
            <div className="grid grid-cols-4 gap-1">
              {DISCOUNT_OPTIONS.map((opt) => (
                <button key={opt.value} onClick={() => setDiscount(opt.value)}
                  className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    discount === opt.value
                      ? "bg-orange-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method */}
          <div className="px-3 pb-2">
            <p className="text-xs font-semibold text-gray-400 mb-1.5">결제 수단</p>
            <div className="grid grid-cols-3 gap-1.5">
              {PAYMENT_METHODS.map((pm) => {
                const isActive = paymentMethod === pm.key;
                const activeColor = pm.color.includes("text-") ? pm.color : `${pm.color} text-white`;
                return (
                  <button
                    key={pm.key}
                    onClick={() => setPaymentMethod(pm.key)}
                    className={`py-2 rounded-lg text-center transition-all ${
                      isActive
                        ? `${activeColor} font-black shadow-sm scale-[1.02]`
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium"
                    }`}
                  >
                    <span className="text-xs">{pm.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Total & Submit */}
          <div className="px-3 pb-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-gray-500">소계</span>
              <span className="text-sm">{effectiveSubtotal.toLocaleString()}원</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-red-500">할인</span>
                <span className="text-sm text-red-500">-{discountAmount.toLocaleString()}원</span>
              </div>
            )}
            <div className="flex justify-between items-center mb-3">
              <span className="text-lg font-bold text-gray-800">합계</span>
              <span className="text-2xl font-black text-orange-500">{total.toLocaleString()}원</span>
            </div>
            <button
              onClick={handleSubmit}
              disabled={total <= 0 || submitting}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 disabled:opacity-40 text-white text-lg font-black rounded-2xl shadow-lg active:scale-95 transition-all">
              {submitting ? "처리 중..." : "✓ 결제 완료"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
