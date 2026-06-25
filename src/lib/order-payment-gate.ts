import type { OrderPaymentMethod } from "@/lib/order-payment-methods";

export type PosPaymentApprovalResult =
  | { ok: true; transactionId?: string; approvalNo?: string }
  | { ok: false; message: string };

export const CARD_APPROVAL_FAILED_MESSAGE =
  "카드(페이) 승인에 실패했습니다.";

const BRIDGE_PAYMENT_URLS = [
  "http://127.0.0.1:8004/payment",
  "http://127.0.0.1:8002/payment",
];

/**
 * 카드·페이 단말 승인 게이트 — **실제 POS/단말 연동**이 있을 때만.
 * (설정 ON만 된 경우는 posPaymentAvailable=false → 수동 접수)
 */
export function requiresPosApprovalBeforeSave(
  method: OrderPaymentMethod,
  posPaymentAvailable: boolean
): boolean {
  if (!posPaymentAvailable) return false;
  if (method === "cash" || method === "transfer" || method === "unknown") return false;
  if (method === "shopping_mall") return false;
  return method === "card" || method === "epay" || method === "mainpay";
}

async function tryBridgeAutoPayment(payload: {
  amount: number;
  method: OrderPaymentMethod;
  tenantId: string;
}): Promise<PosPaymentApprovalResult | null> {
  for (const url of BRIDGE_PAYMENT_URLS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(90_000),
        mode: "cors",
      });
      if (res.status === 404) continue;
      const data = (await res.json()) as {
        ok?: boolean;
        success?: boolean;
        approved?: boolean;
        message?: string;
        error?: string;
        transactionId?: string;
        approvalNo?: string;
      };
      const ok = data.ok === true || data.success === true || data.approved === true;
      if (ok) {
        return {
          ok: true,
          transactionId: data.transactionId,
          approvalNo: data.approvalNo,
        };
      }
      return {
        ok: false,
        message:
          data.message ||
          data.error ||
          CARD_APPROVAL_FAILED_MESSAGE,
      };
    } catch {
      // 다음 URL 시도
    }
  }
  return null;
}

/**
 * PG/POS 승인 — 실패 시 주문 미저장, 접수 페이지 입력값 유지.
 * 1) 로컬 브릿지 자동 승인 시도
 * 2) 없으면 onManualConfirm(단말 확인 다이얼로그)
 */
export async function requestPosPaymentApproval(
  payload: {
    tenantId: string;
    amount: number;
    method: OrderPaymentMethod;
  },
  options?: {
    onManualConfirm?: () => Promise<PosPaymentApprovalResult>;
  }
): Promise<PosPaymentApprovalResult> {
  const bridgeResult = await tryBridgeAutoPayment(payload);
  if (bridgeResult !== null) return bridgeResult;

  if (options?.onManualConfirm) {
    return options.onManualConfirm();
  }

  // 단말 연동이 필요한데 승인 경로 없음 → 저장 차단하지 않고 수동 접수(POS 미연동과 동일)
  return { ok: true };
}
