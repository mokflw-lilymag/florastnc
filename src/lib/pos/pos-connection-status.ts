import type { PosIntegration } from "@/services/pos/PosIntegrationService";

export type PosConnectionState = "off" | "pending" | "connected";

export type PosConnectionStatus = {
  /** 설정에서 연동 ON 토글 */
  isEnabled: boolean;
  /** API·Webhook·매장코드 등 필수값 입력 완료 */
  isConfigured: boolean;
  /** 실제로 POS/단말과 통신 가능 */
  isConnected: boolean;
  connectionState: PosConnectionState;
  /** 미연동 사유 (UI 안내) */
  reason?: string;
};

export type PosConnectionOptions = {
  bridgeOnline?: boolean;
};

function hasText(value?: string | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/** pos_type별 필수 설정값이 채워졌는지 */
export function isPosCredentialsConfigured(
  integration: PosIntegration | null | undefined
): boolean {
  if (!integration?.is_active) return false;

  switch (integration.pos_type) {
    case "easycheck":
      return (
        hasText(integration.store_code) && hasText(integration.webhook_secret)
      );
    case "toss":
      return (
        hasText(integration.store_code) &&
        hasText(integration.webhook_secret) &&
        hasText(integration.api_key)
      );
    case "manual":
      return true;
    default:
      return false;
  }
}

/** Webhook POS — 최소 1회 결제 이벤트 수신(last_synced_at) */
export function hasPosWebhookEvidence(
  integration: PosIntegration | null | undefined
): boolean {
  return !!integration?.last_synced_at;
}

/**
 * 설정 ON만으로는 connected 아님.
 * - manual: 로컬 브릿지 연결
 * - easycheck/toss: 설정 완료 + Webhook 수신 이력
 */
export function resolvePosConnectionStatus(
  integration: PosIntegration | null | undefined,
  opts: PosConnectionOptions = {}
): PosConnectionStatus {
  if (!integration?.is_active) {
    return {
      isEnabled: false,
      isConfigured: false,
      isConnected: false,
      connectionState: "off",
    };
  }

  const configured = isPosCredentialsConfigured(integration);
  if (!configured) {
    return {
      isEnabled: true,
      isConfigured: false,
      isConnected: false,
      connectionState: "pending",
      reason:
        "POS 연동이 활성화됐지만 매장코드·Webhook/API 설정이 완료되지 않았습니다.",
    };
  }

  if (integration.pos_type === "manual") {
    const bridgeOk = opts.bridgeOnline === true;
    return {
      isEnabled: true,
      isConfigured: true,
      isConnected: bridgeOk,
      connectionState: bridgeOk ? "connected" : "pending",
      reason: bridgeOk
        ? undefined
        : "로컬 단말 브릿지(PP)에 연결되지 않았습니다. 브릿지 실행 후 다시 확인해 주세요.",
    };
  }

  const webhookOk = hasPosWebhookEvidence(integration);
  return {
    isEnabled: true,
    isConfigured: true,
    isConnected: webhookOk,
    connectionState: webhookOk ? "connected" : "pending",
    reason: webhookOk
      ? undefined
      : "POS에서 결제 Webhook이 아직 수신되지 않았습니다. 연동 테스트 후 이용해 주세요.",
  };
}

/** 주문 접수 시 카드·페이 단말 승인 (카운터 결제) */
export function isPosCounterPaymentAvailable(
  integration: PosIntegration | null | undefined,
  opts: PosConnectionOptions = {}
): boolean {
  const status = resolvePosConnectionStatus(integration, opts);
  if (!status.isConnected) return false;

  if (integration?.pos_type === "manual") {
    return opts.bridgeOnline === true;
  }

  // Webhook POS는 입·출력 분리 — 카운터 단말 승인은 브릿지 연결 시에만
  return opts.bridgeOnline === true;
}

/** 현금영수증 등 단말 발행 기능 */
export function isPosCashReceiptAvailable(
  integration: PosIntegration | null | undefined,
  opts: PosConnectionOptions = {}
): boolean {
  return isPosCounterPaymentAvailable(integration, opts);
}

export function getPosConnectionLabel(state: PosConnectionState): string {
  switch (state) {
    case "connected":
      return "연동됨";
    case "pending":
      return "설정만 됨 (미연동)";
    default:
      return "연동 꺼짐";
  }
}
