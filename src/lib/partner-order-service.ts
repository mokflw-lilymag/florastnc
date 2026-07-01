import type { SupabaseClient } from "@supabase/supabase-js";
import type { Order } from "@/types/order";
import { enqueuePrintJob, type OrderType } from "@/lib/print-service";
import { maskPartnerName, maskPartnerPhone } from "@/lib/partner-order-masking";

export interface ExternalOrderRecord {
  id: string;
  sender_tenant_id: string;
  receiver_tenant_id: string;
  origin_order_id: string | null;
  status: string;
  total_amount: number;
  fulfillment_amount: number;
  notes?: string | null;
  order_data?: Order & {
    sender_branding?: {
      name?: string;
      logo_url?: string;
      contact?: string;
      address?: string;
    };
    orderer?: { name?: string; contact?: string };
    items?: { name?: string; quantity?: number }[];
    delivery_info?: {
      recipientName?: string;
      recipientContact?: string;
      date?: string;
      time?: string;
      address?: string;
    };
    pickup_info?: {
      pickerName?: string;
      pickerContact?: string;
      date?: string;
      time?: string;
    };
    summary?: { total?: number; subtotal?: number; deliveryFee?: number };
    receipt_type?: string;
    memo?: string;
    message?: { type?: string; content?: string; sender?: string };
  };
}

export function resolvePartnerOrderType(orderData?: ExternalOrderRecord["order_data"]): OrderType {
  const rt = orderData?.receipt_type as string | undefined;
  if (rt === "delivery_reservation" || rt === "delivery") return "delivery";
  if (rt === "pickup_reservation") return "pickup";
  return "store";
}

export function buildPartnerOrderFormPayload(
  orderData: ExternalOrderRecord["order_data"],
  fulfillmentAmount: number,
  senderName: string,
  senderContact: string,
  senderLogoUrl?: string | null,
) {
  const base = { ...(orderData || {}) } as Order & { logo_url?: string | null };
  const branding = orderData?.sender_branding;
  return {
    ...base,
    logo_url: senderLogoUrl || branding?.logo_url || base.logo_url || null,
    orderer: {
      ...(base.orderer || { name: "", contact: "" }),
      name: senderName || branding?.name || "발주 매장",
      contact: senderContact || branding?.contact || "",
    },
    summary: {
      ...(base.summary || { subtotal: 0, discountAmount: 0, discountRate: 0, deliveryFee: 0, total: 0 }),
      total: fulfillmentAmount,
      subtotal: fulfillmentAmount,
      deliveryFee: 0,
      discountAmount: 0,
    },
    hideBranding: true,
  };
}

export function buildPartnerReceiptPayload(
  orderData: ExternalOrderRecord["order_data"],
  fulfillmentAmount: number,
  senderLogoUrl?: string | null,
) {
  const base = { ...(orderData || {}) } as Order & { logo_url?: string | null };
  const delivery = base.delivery_info
    ? {
        ...base.delivery_info,
        recipientName: maskPartnerName(base.delivery_info.recipientName),
        recipientContact: maskPartnerPhone(base.delivery_info.recipientContact),
      }
    : base.delivery_info;

  const pickup = base.pickup_info
    ? {
        ...base.pickup_info,
        pickerName: maskPartnerName(base.pickup_info.pickerName),
        pickerContact: maskPartnerPhone(base.pickup_info.pickerContact),
      }
    : base.pickup_info;

  return {
    ...base,
    logo_url: senderLogoUrl || orderData?.sender_branding?.logo_url || base.logo_url || null,
    orderer: {
      ...(base.orderer || { name: "", contact: "" }),
      name: maskPartnerName(base.orderer?.name),
      contact: maskPartnerPhone(base.orderer?.contact),
      email: "",
    },
    orderer_name: maskPartnerName(base.orderer?.name),
    customer_name: maskPartnerName(base.orderer?.name),
    delivery_info: delivery,
    pickup_info: pickup,
    summary: {
      ...(base.summary || { subtotal: 0, discountAmount: 0, discountRate: 0, deliveryFee: 0, total: 0 }),
      total: fulfillmentAmount,
      subtotal: fulfillmentAmount,
      deliveryFee: 0,
      discountAmount: 0,
    },
    isDriverInfoOnly: true,
  };
}

export async function enqueuePartnerOrderPrints(
  supabase: SupabaseClient,
  receiverTenantId: string,
  row: ExternalOrderRecord,
  senderName: string,
  senderContact: string,
  senderLogoUrl?: string | null,
): Promise<boolean> {
  const orderData = row.order_data;
  const orderId = row.origin_order_id || row.id;
  const orderType = resolvePartnerOrderType(orderData);
  const fulfillmentAmount = Math.round(Number(row.fulfillment_amount || 0));

  const orderFormPayload = buildPartnerOrderFormPayload(
    orderData,
    fulfillmentAmount,
    senderName,
    senderContact,
    senderLogoUrl,
  );
  const receiptPayload = buildPartnerReceiptPayload(orderData, fulfillmentAmount, senderLogoUrl);

  try {
    await enqueuePrintJob(supabase, receiverTenantId, orderId, orderType, orderFormPayload, true, "order_form");
    await enqueuePrintJob(supabase, receiverTenantId, orderId, orderType, receiptPayload, true, "receipt");
    return true;
  } catch (err) {
    console.error("[partner-order-service] print enqueue failed", err);
    return false;
  }
}

export interface AcceptPartnerOrderParams {
  supabase: SupabaseClient;
  tenantId: string;
  row: ExternalOrderRecord;
  senderName: string;
  senderContact?: string;
  senderLogoUrl?: string | null;
  receiverShopName: string;
  printOnAccept?: boolean;
}

export async function acceptPartnerExternalOrder({
  supabase,
  tenantId,
  row,
  senderName,
  senderContact = "",
  senderLogoUrl,
  receiverShopName,
  printOnAccept = true,
}: AcceptPartnerOrderParams): Promise<{ printOk: boolean }> {
  const { error: extErr } = await supabase
    .from("external_orders")
    .update({ status: "accepted", updated_at: new Date().toISOString() })
    .eq("id", row.id);
  if (extErr) throw extErr;

  if (row.origin_order_id) {
    const { error: ordErr } = await supabase
      .from("orders")
      .update({
        transfer_info: {
          type: "partner",
          isTransferred: true,
          status: "accepted",
          externalOrderId: row.id,
          processBranchId: tenantId,
          process_branch_id: tenantId,
          processBranchName: receiverShopName || "수주 매장",
          sendBranchName: senderName,
          transferAmount: row.fulfillment_amount,
          acceptedAt: new Date().toISOString(),
        },
      })
      .eq("id", row.origin_order_id);
    if (ordErr) throw ordErr;
  }

  let printOk = true;
  if (printOnAccept) {
    printOk = await enqueuePartnerOrderPrints(
      supabase,
      tenantId,
      row,
      senderName,
      senderContact,
      senderLogoUrl,
    );
  }

  return { printOk };
}

export async function rejectPartnerExternalOrder(
  supabase: SupabaseClient,
  rowId: string,
  originOrderId?: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("external_orders")
    .update({ status: "rejected", updated_at: new Date().toISOString() })
    .eq("id", rowId);
  if (error) throw error;

  if (originOrderId) {
    await supabase
      .from("orders")
      .update({
        transfer_info: {
          type: "partner",
          isTransferred: true,
          status: "rejected",
          externalOrderId: rowId,
        },
      })
      .eq("id", originOrderId);
  }
}

export async function placePartnerExternalOrder({
  supabase,
  senderTenantId,
  receiverTenantId,
  order,
  senderBranding,
  fulfillmentAmount,
  notes,
}: {
  supabase: SupabaseClient;
  senderTenantId: string;
  receiverTenantId: string;
  order: Order;
  senderBranding: { name: string; logo_url?: string; contact?: string; address?: string };
  fulfillmentAmount: number;
  notes?: string;
}): Promise<{ id: string }> {
  const orderTotal = Math.round(Number(order.summary?.total || 0));
  const fulfillment = Math.round(fulfillmentAmount);
  const senderProfit = orderTotal - fulfillment;

  const sharedOrderData = {
    ...order,
    sender_branding: senderBranding,
  };

  const { data: extOrder, error: extError } = await supabase
    .from("external_orders")
    .insert([
      {
        sender_tenant_id: senderTenantId,
        receiver_tenant_id: receiverTenantId,
        origin_order_id: order.id,
        status: "pending",
        total_amount: orderTotal,
        fulfillment_amount: fulfillment,
        sender_profit: senderProfit,
        platform_fee: 0,
        order_data: sharedOrderData,
        notes: notes || null,
        hide_customer_info: false,
      },
    ])
    .select("id")
    .single();

  if (extError) throw extError;

  const { data: receiverTenant } = await supabase
    .from("tenants")
    .select("name")
    .eq("id", receiverTenantId)
    .maybeSingle();

  const { error: orderErr } = await supabase
    .from("orders")
    .update({
      transfer_info: {
        type: "partner",
        isTransferred: true,
        status: "pending",
        externalOrderId: extOrder.id,
        processBranchId: receiverTenantId,
        process_branch_id: receiverTenantId,
        processBranchName: receiverTenant?.name || "수주 매장",
        sendBranchName: senderBranding.name,
        transferAmount: fulfillment,
        sentAt: new Date().toISOString(),
      },
    })
    .eq("id", order.id);

  if (orderErr) throw orderErr;

  return { id: extOrder.id };
}
