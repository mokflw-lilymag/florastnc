"use client";

import Link from "next/link";
import { Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";
import { FREE_PRINTS_PER_DAY } from "@/lib/subscription/plan-access";

type Props = { open: boolean; onClose: () => void };

export function RibbonFreeLimitModal({ open, onClose }: Props) {
  const locale = usePreferredLocale();
  const base = toBaseLocale(locale);
  if (!open) return null;

  const title = pickUiText(
    base,
    "오늘 무료 출력을 모두 사용했어요",
    "Today's free prints are used up",
    "Het luot in",
    "本日の無料印刷回数を使い切りました",
    "今日免费打印次数已用完",
    "Impresiones agotadas",
    "Impressoes esgotadas",
    "Essais epuises",
    "Gratisdrucke aufgebraucht",
    "Pechati konchilis",
  );

  const body = pickUiText(
    base,
    `무료 체험은 하루 ${FREE_PRINTS_PER_DAY}회입니다. 무제한 출력은 PRINT CORE 플랜에서 이용하실 수 있습니다. 내일 다시 무료 ${FREE_PRINTS_PER_DAY}회가 제공됩니다.`,
    `Free trial: ${FREE_PRINTS_PER_DAY} prints/day. Unlimited on PRINT CORE. Resets tomorrow.`,
    `Thu ${FREE_PRINTS_PER_DAY}/ngay. PRINT CORE khong gioi han.`,
    `Muryo ${FREE_PRINTS_PER_DAY}/nichi. PRINT CORE mugen.`,
    `Mianfei ${FREE_PRINTS_PER_DAY}/ri. PRINT CORE wuxian.`,
    `Prueba ${FREE_PRINTS_PER_DAY}/dia.`,
    `Teste ${FREE_PRINTS_PER_DAY}/dia.`,
    `Essai ${FREE_PRINTS_PER_DAY}/jour.`,
    `Gratis ${FREE_PRINTS_PER_DAY}/Tag.`,
    `Proba ${FREE_PRINTS_PER_DAY}/den.`,
  );

  const plans = pickUiText(base, "PRINT CORE 플랜 보기", "View PRINT CORE", "Xem", "PRINT CORE", "查看", "Ver", "Ver", "Voir", "PRINT CORE", "PRINT CORE");
  const closeLabel = pickUiText(base, "닫기", "Close", "Dong", "Tojiru", "Guanbi", "Cerrar", "Fechar", "Fermer", "Schliessen", "Zakryt");

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-sm rounded-2xl border border-amber-100 bg-white p-6 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-slate-400 hover:bg-slate-100"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="mb-4 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <Clock className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        </div>
        <p className="mb-6 text-center text-sm leading-relaxed text-slate-600">{body}</p>
        <div className="flex flex-col gap-2">
          <Link
            href="/dashboard/subscription"
            className="inline-flex w-full items-center justify-center rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            {plans}
          </Link>
          <Button variant="outline" className="w-full" onClick={onClose}>
            {closeLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
