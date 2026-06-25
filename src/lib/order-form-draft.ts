import type { OrderPaymentMethod } from "@/lib/order-payment-methods";
import type { PaymentStatus } from "@/types/order";

export type OrderFormDraftVariant = "desktop" | "mobile";

export interface OrderFormDraftItem {
  id: string;
  name: string;
  price: number;
  stock?: number;
  quantity: number;
  isCustomProduct?: boolean;
}

export interface OrderFormDraftCustomer {
  id: string;
  name: string;
  contact: string;
  company_name?: string | null;
  email?: string | null;
  points?: number;
}

/** 새 주문 접수 폼 — 저장 실패·승인 실패 시 복원용 */
export interface OrderFormDraft {
  version: 1;
  tenantId: string;
  variant: OrderFormDraftVariant;
  savedAt: string;
  orderItems: OrderFormDraftItem[];
  ordererName: string;
  ordererContact: string;
  ordererCompany: string;
  ordererEmail: string;
  isAnonymous: boolean;
  registerCustomer: boolean;
  marketingConsent: boolean;
  registerAnniversaryFromOrder: boolean;
  selectedCustomer: OrderFormDraftCustomer | null;
  receipt_type: "store_pickup" | "pickup_reservation" | "delivery_reservation";
  scheduleDate: string | null;
  scheduleTime: string;
  recipientName: string;
  recipientContact: string;
  isSameAsOrderer: boolean;
  deliveryAddress: string;
  deliveryAddressDetail: string;
  selectedDistrict: string | null;
  deliveryFeeType: "auto" | "manual";
  manualDeliveryFee: number;
  itemSize?: "small" | "medium" | "large";
  isExpress?: boolean;
  messageType: "card" | "ribbon" | "none";
  messageContent: string;
  specialRequest: string;
  deliveryRequest?: string;
  paymentMethod: OrderPaymentMethod;
  paymentStatus: PaymentStatus;
  isSplitPaymentEnabled?: boolean;
  firstPaymentAmount?: number;
  firstPaymentMethod?: OrderPaymentMethod;
  secondPaymentMethod?: OrderPaymentMethod;
  usedPoints: number;
  selectedDiscountRate: number;
  customDiscountRate: number;
  externalVendor?: { id: string; name: string } | null;
}

function draftKey(tenantId: string, variant: OrderFormDraftVariant) {
  return `floxync:order-form-draft:${tenantId}:${variant}`;
}

export function loadOrderFormDraft(
  tenantId: string,
  variant: OrderFormDraftVariant
): OrderFormDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(draftKey(tenantId, variant));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OrderFormDraft;
    if (parsed.version !== 1 || parsed.tenantId !== tenantId || parsed.variant !== variant) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveOrderFormDraft(draft: OrderFormDraft) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(draftKey(draft.tenantId, draft.variant), JSON.stringify(draft));
  } catch {
    // quota exceeded 등 — 무시
  }
}

export function clearOrderFormDraft(tenantId: string, variant: OrderFormDraftVariant) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(draftKey(tenantId, variant));
  } catch {
    // ignore
  }
}

export function hasMeaningfulDraftContent(draft: OrderFormDraft): boolean {
  return (
    draft.orderItems.length > 0 ||
    draft.ordererName.trim() !== "" ||
    draft.ordererContact.trim() !== "" ||
    draft.deliveryAddress.trim() !== "" ||
    draft.messageContent.trim() !== "" ||
    draft.specialRequest.trim() !== ""
  );
}

export const ORDER_SAVE_FAILED_KEEP_FORM_HINT =
  "입력 내용은 그대로 유지됩니다. 결제 수단을 바꾸거나 미수금으로 접수해 주세요.";
