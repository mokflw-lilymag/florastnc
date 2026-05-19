"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { readGuestBrowseCookie } from "@/lib/subscription/guest-trial";

/** 서버 게스트 쿠키와 클라이언트 Zustand 게스트 상태 동기화 */
export function GuestBrowseBootstrap() {
  const enterGuestTrial = useAuthStore((s) => s.enterGuestTrial);
  const isGuestTrial = useAuthStore((s) => s._guestTrial);

  useEffect(() => {
    if (!isGuestTrial && readGuestBrowseCookie()) {
      enterGuestTrial();
    }
  }, [enterGuestTrial, isGuestTrial]);

  return null;
}
