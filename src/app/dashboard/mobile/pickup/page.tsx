"use client";

import { useMemo, useState } from "react";
import {
  Package,
  Truck,
  CheckCircle2,
  Search,
  RefreshCw,
} from "lucide-react";
import { useOrders } from "@/hooks/use-orders";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import { MobilePageHeader } from "@/components/mobile/mobile-page-header";
import { toast } from "sonner";
import {
  mapOrderToPickupItem,
  getUrgencyColor,
  formatOrderDateShort,
  matchesDateFilter,
  PICKUP_TABS,
  PICKUP_DATE_FILTERS,
  type DateFilterType,
  type PickupTabType,
  type PickupListItem,
} from "@/lib/mobile/pickup-utils";
import {
  mobilePaymentLabels,
  useMobileShopMessages,
} from "@/lib/mobile/use-mobile-shop-messages";
import { formatMobileCurrency } from "@/lib/mobile/format-mobile-currency";
import type { Order } from "@/types/order";
import { OrderDetailDialog } from "../../pickup-delivery/components/order-detail-dialog";

export default function MobilePickupPage() {
  const { m, locale, dateLocale } = useMobileShopMessages();
  const { settings } = useSettings();
  const currency = settings?.currency ?? "KRW";
  const fmt = (amount: number) => formatMobileCurrency(amount, locale, currency);

  const itemLabels = useMemo(
    () => ({
      productFallback: m.common.productFallback,
      customerFallback: m.common.customerFallback,
      itemsMore: m.common.itemsMore,
    }),
    [m],
  );

  const payButtons = useMemo(() => {
    const labels = mobilePaymentLabels(m);
    return (
      [
        { id: "card" as const, label: labels.card, cls: "bg-blue-500 text-white" },
        { id: "cash" as const, label: labels.cash, cls: "bg-emerald-500 text-white" },
        { id: "transfer" as const, label: labels.transfer, cls: "bg-orange-500 text-white" },
        { id: "mainpay" as const, label: labels.mainpay, cls: "bg-rose-500 text-white" },
        { id: "epay" as const, label: labels.epay, cls: "bg-violet-500 text-white" },
        { id: "kakao" as const, label: labels.kakao, cls: "bg-yellow-400 text-gray-900" },
      ] as const
    );
  }, [m]);

  const tabLabel = (tab: PickupTabType) => {
    if (tab === "pickup") return m.pickup.tabPickup;
    if (tab === "delivery") return m.pickup.tabDelivery;
    return m.pickup.tabAll;
  };

  const dateLabel = (opt: DateFilterType) => {
    if (opt === "today") return m.pickup.dateToday;
    if (opt === "tomorrow") return m.pickup.dateTomorrow;
    return m.pickup.dateAll;
  };

  const { profile, tenantId } = useAuth();
  const storeName = profile?.tenants?.name;
  const { orders, loading, isRefreshing, fetchOrders, updateOrder, setOrders } = useOrders();
  const [activeTab, setActiveTab] = useState<PickupTabType>("all");
  const [dateFilter, setDateFilter] = useState<DateFilterType>("today");
  const [search, setSearch] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const list = useMemo(() => {
    return orders
      .filter((o) => o.status !== "canceled")
      .filter((o) =>
        ["pickup_reservation", "delivery_reservation"].includes(o.receipt_type)
      )
      .map((o) => mapOrderToPickupItem(o, itemLabels));
  }, [orders, itemLabels]);

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

        if (activeTab === "pickup" && o.receiptType === "delivery_reservation") return false;
        if (activeTab === "delivery" && o.receiptType !== "delivery_reservation") return false;

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
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, extra_data: extra } : o));
    const ok = await updateOrder(orderId, { extra_data: extra } as Partial<Order>);
    if (ok) toast.success(!current ? m.pickup.toastProductionDone : m.pickup.toastProductionWait);
    else toast.error(m.pickup.toastSaveFailed);
  };

  const handleComplete = async (
    orderId: string,
    method: Order["payment"]["method"] | null,
    amount: number
  ) => {
    const label = method
      ? payButtons.find((p) => p.id === method)?.label ?? method
      : m.payment.prepaid;
    if (!confirm(m.pickup.confirmComplete.replace("{{method}}", label))) return;

    setCompletingId(orderId);
    try {
      const row = orders.find((o) => o.id === orderId);
      const completedAt = new Date().toISOString();
      const payment = method
        ? {
            ...(row?.payment || {}),
            status: "paid" as const,
            method,
            completedAt,
          }
        : {
            ...(row?.payment || {}),
          };

      const ok = await updateOrder(orderId, {
        status: "completed",
        payment,
        completed_at: completedAt,
      } as Partial<Order>);
      if (ok) toast.success(m.pickup.toastCompleteSuccess);
      else toast.error(m.pickup.toastCompleteFailed);
      void amount;
    } catch {
      toast.error(m.pickup.toastError);
    } finally {
      setCompletingId(null);
    }
  };

  if (!tenantId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <Package className="h-12 w-12 text-gray-300" />
        <p className="font-bold text-gray-700">{m.pickup.noTenantTitle}</p>
        <p className="text-sm text-gray-400">{m.pickup.noTenantBody}</p>
      </div>
    );
  }

  return (
    <>
    <div className="flex h-full min-h-0 flex-col">
      <MobilePageHeader
        title={m.pickup.title}
        subtitle={storeName ?? undefined}
        icon={Package}
        variant="emerald"
        badge={
          pendingCount > 0
            ? m.pickup.pendingBadge.replace("{{count}}", String(pendingCount))
            : undefined
        }
        loading={loading || isRefreshing}
        onRefresh={() => fetchOrders(60)}
        dateLocale={dateLocale}
      />

      <div className="sticky top-0 z-10 space-y-2 border-b bg-white px-3 py-2 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder={m.pickup.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl bg-gray-100 py-2.5 pl-9 pr-4 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-400"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5 pb-1">
          {PICKUP_TABS.map((tab) => (
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
              {tab === "pickup" && "📦 "}
              {tab === "delivery" && "🚚 "}
              {tabLabel(tab)}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-gray-200" />
          {PICKUP_DATE_FILTERS.map((opt) => (
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
              {dateLabel(opt)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowCompleted(!showCompleted)}
            className={`ml-auto whitespace-nowrap rounded-xl px-3 py-1.5 text-[10px] font-bold ${
              showCompleted ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-400"
            }`}
          >
            {showCompleted ? m.pickup.hideCompleted : m.pickup.showCompleted}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {loading && filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
            <RefreshCw className="h-10 w-10 animate-spin text-emerald-200" />
            <p className="text-sm">{m.common.loading}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-gray-400">
            <Package className="mx-auto mb-4 h-16 w-16 opacity-10" />
            <p className="text-sm">{m.pickup.empty}</p>
          </div>
        ) : (
          filtered.map((order) => (
            <PickupOrderCard
              key={order.id}
              order={order}
              completingId={completingId}
              payButtons={payButtons}
              onToggleProduction={handleToggleProduction}
              onComplete={handleComplete}
              onOrderClick={() => setSelectedOrder(order.originalOrder)}
              fmt={fmt}
              dateLocale={dateLocale}
            />
          ))
        )}
      </div>
    </div>
      {selectedOrder && (
        <OrderDetailDialog
          open={!!selectedOrder}
          onOpenChange={(open) => !open && setSelectedOrder(null)}
          order={selectedOrder}
        />
      )}
    </>
  );
}

function PickupOrderCard({
  order,
  completingId,
  payButtons,
  onToggleProduction,
  onComplete,
  onOrderClick,
  fmt,
  dateLocale,
}: {
  order: PickupListItem;
  completingId: string | null;
  payButtons: readonly { id: Order["payment"]["method"]; label: string; cls: string }[];
  onToggleProduction: (id: string, current: boolean) => void;
  onComplete: (id: string, method: Order["payment"]["method"] | null, amount: number) => void;
  onOrderClick: () => void;
  fmt: (amount: number) => string;
  dateLocale: import("date-fns").Locale;
}) {
  const { m } = useMobileShopMessages();

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
              {isPickup ? m.pickup.badgePickup : m.pickup.badgeDelivery}
            </span>
            {!isCompleted && isPrePaid && (
              <span className="rounded-md bg-indigo-100 px-1.5 py-0.5 text-[9px] font-black text-indigo-700">
                💳 {m.pickup.prepaid}
              </span>
            )}
            {order.productionCompleted && (
              <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-black text-emerald-700">
                ✨ {m.pickup.productionDone}
              </span>
            )}
            {isCompleted && (
              <span className="flex items-center gap-0.5 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-black text-emerald-700">
                <CheckCircle2 className="h-3 w-3" /> {m.pickup.statusDone}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <h3 onClick={onOrderClick} className="truncate text-sm font-black text-gray-900 cursor-pointer underline hover:text-emerald-600 decoration-emerald-200 underline-offset-4">{order.ordererName}</h3>
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
                {order.productionCompleted ? m.pickup.productionDone : m.pickup.productionWait}
              </button>
              {!isCompleted && isPrePaid && (
                <button
                  type="button"
                  disabled={completingId === order.id}
                  onClick={() => onComplete(order.id, null, order.total)}
                  className="rounded-lg bg-indigo-500 px-2.5 py-1 text-[9px] font-bold text-white disabled:opacity-50"
                >
                  {m.pickup.confirmReceipt}
                </button>
              )}
            </div>
          </div>

          {order.orderDate && (
            <p className="mt-1 text-[10px] text-gray-400">
              {m.pickup.orderDatePrefix} {formatOrderDateShort(order.orderDate, dateLocale)}
            </p>
          )}

          {!isCompleted && !isPrePaid && (
            <div className="mt-2 flex gap-0.5">
              {payButtons.map(({ id, label, cls }) => (
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
              {fmt(order.total)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
