"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePosSettings } from "@/hooks/use-pos-settings";
import { checkPosBridgeOnline } from "@/lib/pos/check-pos-bridge";
import {
  isPosCashReceiptAvailable,
  isPosCounterPaymentAvailable,
  resolvePosConnectionStatus,
  type PosConnectionStatus,
} from "@/lib/pos/pos-connection-status";

export function usePosConnection(pollBridgeMs = 8000) {
  const { tenantId } = useAuth();
  const { integration, loading: integrationLoading, refresh } = usePosSettings();
  const [bridgeOnline, setBridgeOnline] = useState(false);
  const [bridgeChecking, setBridgeChecking] = useState(true);

  const refreshBridge = useCallback(async () => {
    setBridgeChecking(true);
    const online = await checkPosBridgeOnline(tenantId);
    setBridgeOnline(online);
    setBridgeChecking(false);
  }, [tenantId]);

  useEffect(() => {
    refreshBridge();
    if (pollBridgeMs <= 0) return;
    const timer = setInterval(refreshBridge, pollBridgeMs);
    return () => clearInterval(timer);
  }, [refreshBridge, pollBridgeMs]);

  const status: PosConnectionStatus = useMemo(
    () => resolvePosConnectionStatus(integration, { bridgeOnline }),
    [integration, bridgeOnline]
  );

  const counterPaymentAvailable = useMemo(
    () => isPosCounterPaymentAvailable(integration, { bridgeOnline }),
    [integration, bridgeOnline]
  );

  const cashReceiptAvailable = useMemo(
    () => isPosCashReceiptAvailable(integration, { bridgeOnline }),
    [integration, bridgeOnline]
  );

  return {
    integration,
    loading: integrationLoading || bridgeChecking,
    bridgeOnline,
    refreshBridge,
    refreshIntegration: refresh,
    status,
    /** 실제 POS/단말 연동 완료 */
    isPosConnected: status.isConnected,
    /** 주문 접수 시 카드·페이 단말 승인 가능 */
    counterPaymentAvailable,
    /** 현금영수증 단말 발행 가능 */
    cashReceiptAvailable,
  };
}
