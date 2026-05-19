"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { setGuestBrowseCookie } from "@/lib/subscription/guest-trial";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";

export default function TryBrowsePage() {
  const router = useRouter();
  const enterGuestTrial = useAuthStore((s) => s.enterGuestTrial);
  const base = toBaseLocale(usePreferredLocale());

  const loadingLabel = pickUiText(
    base,
    "메뉴 둘러보기 준비 중…",
    "Preparing browse mode…",
    "Đang chuẩn bị chế độ xem…",
    "閲覧モードを準備中…",
    "正在准备浏览模式…",
    "Preparando modo exploración…",
    "Preparando modo de navegação…",
    "Préparation du mode visite…",
    "Browse-Modus wird vorbereitet…",
    "Подготовка режима просмотра…",
  );

  useEffect(() => {
    setGuestBrowseCookie();
    enterGuestTrial();
    router.replace("/dashboard");
  }, [enterGuestTrial, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 text-slate-700">
      <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      <p className="text-sm font-medium">{loadingLabel}</p>
    </div>
  );
}
