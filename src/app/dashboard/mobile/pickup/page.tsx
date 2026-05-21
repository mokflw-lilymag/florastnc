"use client";

import { useMemo, useState } from "react";
import {
  Package,
  Truck,
  CheckCircle2,
  Search,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { useOrders } from "@/hooks/use-orders";
import { useAuth } from "@/hooks/use-auth";
import { MobilePageHeader } from "@/components/mobile/mobile-page-header";
import { toast } from "sonner";
import {
  mapOrderToPickupItem,
  getUrgencyColor,
  formatOrderDateShort,
  matchesDateFilter,
  type DateFilterType,
  type PickupTabType,
  type PickupListItem,
} from "@/lib/mobile/pickup-utils";
import type { Order } from "@/types/order";

const PAY_BUTTONS: { id: Order["payment"]["method"]; label: string; cls: string }[] = [
  { id: "card", label: "카드", cls: "bg-blue-500 text-white" },
  { id: "cash", label: "현금", cls: "bg-emerald-500 text-white" },
  { id: "transfer", label: "이체", cls: "bg-orange-500 text-white" },
  { id: "mainpay", label: "메인", cls: "bg-rose-500 text-white" },
  { id: "epay", label: "e-Pay", cls: "bg-violet-500 text-white" },
  { id: "kakao", label: "카카오", cls: "bg-yellow-400 text-gray-900" },
];

export default function MobilePickupPage() {
  const { profile, tenantId } = useAuth();
  const storeName = profile?.tenants?.name;
  const { orders, loading, isRefreshing, fetchOrders, updateOrder } = useOrders();
  const [activeTab, setActiveTab] = useState<PickupTabType>("전체");
  const [dateFilter, setDateFilter] = useState<DateFilterType>("오늘");
  const [search, setSearch] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const list = useMemo(() => {
    return orders
      .filter((o) => o.status !== "canceled")
      .filter((o) =>
        ["pickup_reservation", "delivery_reservation"].includes(o.receipt_type)
      )
      .map(mapOrderToPickupItem);
  }, [orders]);

  const filtered = useMemo(() => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    threeDaysAgo.setHours(0, 0, 0, 0);

    return list
      .filter((o) => {
        if (!matchesDateFilter(o, dateFilter)) return false;

        if (o.status === "completed") {
          if (!showCompleted) return false;
          const compare = o.scheduledTime
            ? new Date(o.scheduledTime)
            : o.completedAt
              ? new Date(o.completedAt)
              : o.orderDate
                ? new Date(o.orderDate)
                : new Date(0);
          if (compare < threeDaysAgo) return false;
        }

        if (activeTab === "픽업" && o.receiptType === "delivery_reservation") return false;
        if (activeTab === "배송" && o.receiptType !== "delivery_reservation") return false;

        if (search) {
          const q = search.toLowerCase();
          return (
            o.ordererName.toLowerCase().includes(q) ||
            o.contact.includes(q) ||
            o.itemsLabel.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        const aDone = a.status === "completed";
        const bDone = b.status === "completed";
        if (aDone !== bDone) return aDone ? 1 : -1;
        if (a.scheduledTime && b.scheduledTime) {
          return a.scheduledTime.getTime() - b.scheduledTime.getTime();
        }
        return 0;
      });
  }, [list, dateFilter, showCompleted, activeTab, search]);

  const pendingCount = list.filter((o) => o.status !== "completed").length;

  const handleToggleProduction = async (orderId: string, current: boolean) => {
    const row = orders.find((o) => o.id === orderId);
    if (!row) return;
    const extra = { ...(row.extra_data || {}), production_completed: !current };
    const ok = await updateOrder(orderId, { extra_data: extra } as Partial<Order>);
    if (ok) toast.success(!current ? "제작 완료로 표시했습니다." : "제작 대기로 변경했습니다.");
    else toast.error("저장에 실패했습니다.");
  };

  const handleComplete = async (
    orderId: string,
    method: Order["payment"]["method"] | null,
    amount: number
  ) => {
    const label = method
      ? PAY_BUTTONS.find((p) => p.id === method)?.label ?? method
      : "선결제";
    if (!confirm(`${label}로 수령 완료 처리하시겠습니까?`)) return;

    setCompletingId(orderId);
    try {
      const row = orders.find((o) => o.id === orderId);
      const completedAt = new Date().toISOString();
      const payment = method
        ? {
            ...(row?.payment || {}),
            status: "paid" as const,
            method,
            completedAt, // 픽업 결제(현장결제): 결제일을 오늘(수령일)로 업데이트
          }
        : {
            ...(row?.payment || {}),
            // 선결제: 기존 결제일(payment.completedAt)을 유지해야 일일마감이 틀어지지 않음
          };

      const ok = await updateOrder(orderId, {
        status: "completed",
        payment,
        completed_at: completedAt,
      } as Partial<Order>);
      if (ok) toast.success("수령 완료 처리되었습니다.");
      else toast.error("처리에 실패했습니다.");
      void amount;
    } catch {
      toast.error("처리 중 오류가 발생했습니다.");
    } finally {
      setCompletingId(null);
    }
  };

  const handleUpdateDeliveryCost = async (orderId: string, cardCost: number, cashCost: number) => {
    const ok = await updateOrder(orderId, {
      actual_delivery_cost: cardCost,
      actual_delivery_cost_cash: cashCost,
    } as Partial<Order>);
    if (ok) toast.success("배송비가 저장되었습니다.");
    else toast.error("배송비 저장에 실패했습니다.");
  };

  if (!tenantId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <Package className="h-12 w-12 text-gray-300" />
        <p className="font-bold text-gray-700">매장 정보를 불러올 수 없습니다</p>
        <p className="text-sm text-gray-400">로그인 후 다시 시도해 주세요.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <MobilePageHeader
        title="픽업 / 배송 관리"
        subtitle={storeName ?? undefined}
        icon={Package}
        variant="emerald"
        badge={pendingCount > 0 ? `${pendingCount}건 대기` : undefined}
        loading={loading || isRefreshing}
        onRefresh={() => fetchOrders(60)}
      />

      <div className="sticky top-0 z-10 space-y-2 border-b bg-white px-3 py-2 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="고객명, 연락처, 상품명 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl bg-gray-100 py-2.5 pl-9 pr-4 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-400"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5 pb-1">
          {(["전체", "픽업", "배송"] as PickupTabType[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap rounded-xl px-4 py-1.5 text-xs font-bold ${
                activeTab === tab
                  ? "bg-emerald-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {tab === "픽업" && "📦 "}
              {tab === "배송" && "🚚 "}
              {tab}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-gray-200" />
          {(["오늘", "내일", "전체"] as DateFilterType[]).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setDateFilter(opt)}
              className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-[11px] font-bold ${
                dateFilter === opt
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {opt}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowCompleted(!showCompleted)}
            className={`ml-auto whitespace-nowrap rounded-xl px-3 py-1.5 text-[10px] font-bold ${
              showCompleted ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-400"
            }`}
          >
            완료 {showCompleted ? "숨기기" : "보기"}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {loading && filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
            <RefreshCw className="h-10 w-10 animate-spin text-emerald-200" />
            <p className="text-sm">불러오는 중...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-gray-400">
            <Package className="mx-auto mb-4 h-16 w-16 opacity-10" />
            <p className="text-sm">예약·픽업·배송 주문이 없습니다.</p>
          </div>
        ) : (
          filtered.map((order) => (
            <PickupOrderCard
              key={order.id}
              order={order}
              completingId={completingId}
              onToggleProduction={handleToggleProduction}
              onComplete={handleComplete}
              onUpdateDeliveryCost={handleUpdateDeliveryCost}
            />
          ))
        )}
      </div>
    </div>
  );
}

function PickupOrderCard({
  order,
  completingId,
  onToggleProduction,
  onComplete,
  onUpdateDeliveryCost,
}: {
  order: PickupListItem;
  completingId: string | null;
  onToggleProduction: (id: string, current: boolean) => void;
  onComplete: (id: string, method: Order["payment"]["method"] | null, amount: number) => void;
  onUpdateDeliveryCost: (id: string, cardCost: number, cashCost: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [cardCost, setCardCost] = useState(order.actualDeliveryCost || 0);
  const [cashCost, setCashCost] = useState(order.actualDeliveryCostCash || 0);

  // Sync state if order changes externally
  useMemo(() => {
    setCardCost(order.actualDeliveryCost || 0);
    setCashCost(order.actualDeliveryCostCash || 0);
  }, [order.actualDeliveryCost, order.actualDeliveryCostCash]);

  const isPickup =
    order.receiptType === "pickup_reservation" || order.receiptType === "store_pickup";
  const isCompleted = order.status === "completed";
  const isPrePaid = order.paymentStatus === "paid";
  const urgencyClass = isCompleted
    ? "border-gray-200 bg-gray-50/50 grayscale-[0.5]"
    : getUrgencyColor(order.scheduledTime);

  const scheduleLabel =
    order.pickupDate || order.deliveryDate
      ? `${order.pickupDate || order.deliveryDate} ${order.pickupTime || order.deliveryTime || ""}`.trim()
      : null;

  return (
    <div className={`rounded-3xl border-2 p-4 shadow-sm ${urgencyClass}`}>
      <div className="flex items-start gap-3">
        <div
          className={`rounded-2xl p-2.5 ${
            isPickup ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
          }`}
        >
          {isPickup ? <Package className="h-5 w-5" /> : <Truck className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1">
            <span
              className={`rounded-md px-1.5 py-0.5 text-[9px] font-black text-white ${
                isPickup ? "bg-blue-600" : "bg-purple-600"
              }`}
            >
              {isPickup ? "픽업" : "배송"}
            </span>
            {!isCompleted && isPrePaid && (
              <span className="rounded-md bg-indigo-100 px-1.5 py-0.5 text-[9px] font-black text-indigo-700">
                💳 선결제
              </span>
            )}
            {order.productionCompleted && (
              <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-black text-emerald-700">
                ✨ 제작완료
              </span>
            )}
            {isCompleted && (
              <span className="flex items-center gap-0.5 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-black text-emerald-700">
                <CheckCircle2 className="h-3 w-3" /> 완료
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-sm font-black text-gray-900">{order.ordererName}</h3>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={() => onToggleProduction(order.id, !!order.productionCompleted)}
                className={`rounded-lg border px-2 py-1 text-[9px] font-bold ${
                  order.productionCompleted
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 bg-white text-gray-500"
                }`}
              >
                {order.productionCompleted ? "제작완료" : "제작대기"}
              </button>
              {!isCompleted && isPrePaid && (
                <button
                  type="button"
                  disabled={completingId === order.id}
                  onClick={() => onComplete(order.id, null, order.total)}
                  className="rounded-lg bg-indigo-500 px-2.5 py-1 text-[9px] font-bold text-white disabled:opacity-50"
                >
                  수령확인
                </button>
              )}
            </div>
          </div>

          {order.orderDate && (
            <p className="mt-1 text-[10px] text-gray-400">
              주문: {formatOrderDateShort(order.orderDate)}
            </p>
          )}

          {!isCompleted && !isPrePaid && (
            <div className="mt-2 flex gap-0.5">
              {PAY_BUTTONS.map(({ id, label, cls }) => (
                <button
                  key={id}
                  type="button"
                  disabled={completingId === order.id}
                  onClick={() => onComplete(order.id, id, order.total)}
                  className={`flex-1 rounded py-1 text-[9px] font-bold disabled:opacity-50 ${cls}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <p className="mt-1 truncate text-xs text-gray-700">{order.itemsLabel}</p>
          {order.deliveryAddress && (
            <p className="mt-0.5 truncate text-[10px] text-gray-400">📍 {order.deliveryAddress}</p>
          )}
          {scheduleLabel && (
            <p className="mt-1 text-[10px] font-bold text-emerald-700">🕐 {scheduleLabel}</p>
          )}
          <div className="mt-2 flex items-center justify-between">
            <p className="text-sm font-black text-gray-900">
              {order.total.toLocaleString()}원
            </p>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[10px] font-bold text-emerald-600 underline"
            >
              {expanded ? "접기" : "상세보기"}
            </button>
          </div>
        </div>
      </div>
      
      {/* Expanded Details */}
      {expanded && (
        <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50/50 p-3">
          <div className="mb-3 border-b border-gray-100 pb-2">
            <p className="text-[10px] font-bold text-gray-500">주문 상품</p>
            {order.rawItems.map((item, idx) => (
              <div key={idx} className="mt-1 flex items-center justify-between text-xs">
                <span className="text-gray-700">{item.name}</span>
                <span className="font-bold text-gray-900">{item.quantity}개</span>
              </div>
            ))}
          </div>

          {order.memo && (
            <div className="mb-3 border-b border-gray-100 pb-2">
              <p className="text-[10px] font-bold text-gray-500">메모</p>
              <p className="mt-1 whitespace-pre-wrap text-xs text-rose-600">{order.memo}</p>
            </div>
          )}

          {order.receiptType === "delivery_reservation" && (
            <div className="rounded-lg border border-gray-200 bg-white p-2">
              <p className="mb-2 text-[11px] font-bold text-gray-700">🚚 실제 배송비 입력</p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-[9px] text-gray-500">기본(카드) 배송비</label>
                  <input
                    type="number"
                    value={cardCost || ""}
                    onChange={(e) => setCardCost(Number(e.target.value))}
                    className="w-full rounded border bg-gray-50 px-2 py-1 text-xs outline-none focus:border-emerald-400 focus:bg-white"
                    placeholder="0"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-[9px] text-gray-500">기사 현금지급</label>
                  <input
                    type="number"
                    value={cashCost || ""}
                    onChange={(e) => setCashCost(Number(e.target.value))}
                    className="w-full rounded border bg-gray-50 px-2 py-1 text-xs outline-none focus:border-emerald-400 focus:bg-white"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="mt-2 text-right">
                <button
                  onClick={() => onUpdateDeliveryCost(order.id, cardCost, cashCost)}
                  className="rounded bg-gray-800 px-3 py-1 text-[10px] font-bold text-white hover:bg-gray-700"
                >
                  저장
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
