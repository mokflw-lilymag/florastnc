"use client";

import { useEffect, useRef } from "react";
import debounce from "lodash/debounce";
import {
  hasMeaningfulDraftContent,
  loadOrderFormDraft,
  saveOrderFormDraft,
  type OrderFormDraft,
  type OrderFormDraftVariant,
} from "@/lib/order-form-draft";

type UseOrderFormDraftOptions = {
  tenantId: string | null | undefined;
  variant: OrderFormDraftVariant;
  enabled: boolean;
  /** 변경 시 debounce 저장 트리거 (JSON 문자열 등) */
  saveTrigger: string;
  getDraft: () => OrderFormDraft | null;
  applyDraft: (draft: OrderFormDraft) => void;
};

export function useOrderFormDraft({
  tenantId,
  variant,
  enabled,
  saveTrigger,
  getDraft,
  applyDraft,
}: UseOrderFormDraftOptions) {
  const restoredRef = useRef(false);
  const getDraftRef = useRef(getDraft);
  getDraftRef.current = getDraft;
  const applyDraftRef = useRef(applyDraft);
  applyDraftRef.current = applyDraft;

  const debouncedSave = useRef(
    debounce(() => {
      const draft = getDraftRef.current();
      if (!draft || !hasMeaningfulDraftContent(draft)) return;
      saveOrderFormDraft({ ...draft, savedAt: new Date().toISOString() });
    }, 400)
  ).current;

  useEffect(() => {
    if (!enabled || !tenantId || restoredRef.current) return;
    const draft = loadOrderFormDraft(tenantId, variant);
    if (draft && hasMeaningfulDraftContent(draft)) {
      applyDraftRef.current(draft);
    }
    restoredRef.current = true;
  }, [enabled, tenantId, variant]);

  useEffect(() => {
    if (!enabled || !tenantId || !restoredRef.current) return;
    debouncedSave();
    return () => debouncedSave.cancel();
  }, [enabled, tenantId, saveTrigger, debouncedSave]);

  return { restoredRef };
}
