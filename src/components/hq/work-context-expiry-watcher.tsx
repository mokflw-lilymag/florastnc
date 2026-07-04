"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toast } from "sonner";

/** 지점 업무 모드 2시간 자동 만료 — 마운트·주기 점검 */
export function WorkContextExpiryWatcher() {
  const { isOrgWorkContext, refreshAuth } = useAuth();
  const locale = usePreferredLocale();
  const warned = useRef(false);

  useEffect(() => {
    if (!isOrgWorkContext) {
      warned.current = false;
      return;
    }

    const check = async () => {
      try {
        const res = await fetch(`/api/hq/work-context?uiLocale=${encodeURIComponent(locale)}`, {
          credentials: "include",
        });
        const json = await res.json().catch(() => ({}));
        if (json.expired) {
          await refreshAuth();
          if (!warned.current) {
            warned.current = true;
            toast.info("업무 모드가 2시간 제한으로 자동 종료되었습니다.");
          }
        }
      } catch {
        /* ignore */
      }
    };

    void check();
    const id = window.setInterval(() => void check(), 5 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [isOrgWorkContext, locale, refreshAuth]);

  return null;
}
