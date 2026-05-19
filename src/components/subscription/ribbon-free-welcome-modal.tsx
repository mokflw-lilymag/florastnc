"use client";

import Link from "next/link";
import { Printer, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";
import { FREE_PRINTS_PER_DAY } from "@/lib/subscription/plan-access";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function RibbonFreeWelcomeModal({ open, onClose }: Props) {
  const locale = usePreferredLocale();
  const base = toBaseLocale(locale);

  if (!open) return null;

  const title = pickUiText(
    base,
    "리본 출력 무료 체험",
    "Free ribbon printing trial",
    "Dùng thử in ruy băng miễn phí",
    "リボン印刷 無料体験",
    "丝带打印免费体验",
    "Prueba gratis de cinta",
    "Teste grátis de fita",
    "Essai gratuit ruban",
    "Kostenlose Banddruck-Testversion",
    "Бесплатная проба печати лент",
  );

  const intro = pickUiText(
    base,
    `FloXync는 아래 프린터에서 리본 출력을 지원합니다. 오늘 ${FREE_PRINTS_PER_DAY}회까지 무료로 출력해 보세요.`,
    `FloXync supports these printers. Try up to ${FREE_PRINTS_PER_DAY} free prints today.`,
    `FloXync hỗ trợ các máy in sau. In thử tối đa ${FREE_PRINTS_PER_DAY} lần hôm nay.`,
    `以下のプリンターに対応。本日${FREE_PRINTS_PER_DAY}回まで無料でお試しください。`,
    `支持以下打印机。今日可免费打印 ${FREE_PRINTS_PER_DAY} 次。`,
    `Compatible con estas impresoras. Hasta ${FREE_PRINTS_PER_DAY} impresiones gratis hoy.`,
    `Compatível com estas impressoras. Até ${FREE_PRINTS_PER_DAY} impressões grátis hoje.`,
    `Compatible avec ces imprimantes. Jusqu’à ${FREE_PRINTS_PER_DAY} essais gratuits aujourd’hui.`,
    `Diese Drucker werden unterstützt. Heute bis zu ${FREE_PRINTS_PER_DAY} Gratisdrucke.`,
    `Поддерживаются эти принтеры. До ${FREE_PRINTS_PER_DAY} бесплатных печатей сегодня.`,
  );

  const printers = [
    pickUiText(
      base,
      "Epson M105 (잉크젯 리본)",
      "Epson M105 (inkjet ribbon)",
      "Epson M105",
      "Epson M105",
      "Epson M105",
      "Epson M105",
      "Epson M105",
      "Epson M105",
      "Epson M105",
    ),
    pickUiText(
      base,
      "Epson L210 등 L시리즈",
      "Epson L210 and L series",
      "Epson L210 / L series",
      "Epson L210 など Lシリーズ",
      "Epson L210 等 L 系列",
      "Epson L210 y serie L",
      "Epson L210 e série L",
      "Epson L210 et série L",
      "Epson L210 und L-Serie",
      "Epson L210 и серия L",
    ),
    pickUiText(
      base,
      "Xprinter 감열 리본 (105mm 이하)",
      "Xprinter thermal ribbon (≤105mm)",
      "Xprinter nhiệt ≤105mm",
      "Xprinter 感熱リボン（105mm以下）",
      "Xprinter 热敏丝带（≤105mm）",
      "Xprinter térmica ≤105 mm",
      "Xprinter térmica ≤105 mm",
      "Xprinter thermique ≤105 mm",
      "Xprinter Thermo ≤105 mm",
      "Xprinter термо ≤105 мм",
    ),
  ];

  const bridge = pickUiText(
    base,
    "PC에 FloXync 프린터 브릿지를 설치·실행한 뒤 출력하세요.",
    "Install and run the FloXync printer bridge on your PC before printing.",
    "Cài và chạy bridge máy in FloXync trên PC trước khi in.",
    "印刷前にPCでFloXyncプリンターブリッジを起動してください。",
    "打印前请在电脑上安装并运行 FloXync 打印机桥接程序。",
    "Instale y ejecute el puente de impresora FloXync en el PC.",
    "Instale e execute a ponte de impressora FloXync no PC.",
    "Installez le pont d’impression FloXync sur le PC.",
    "FloXync-Druckerbridge auf dem PC starten.",
    "Запустите мост принтера FloXync на ПК.",
  );

  const start = pickUiText(
    base,
    "시작하기",
    "Get started",
    "Bắt đầu",
    "始める",
    "开始",
    "Empezar",
    "Começar",
    "Commencer",
    "Loslegen",
    "Начать",
  );
  const plans = pickUiText(
    base,
    "플랜 보기",
    "View plans",
    "Xem gói",
    "プラン",
    "查看方案",
    "Ver planes",
    "Ver planos",
    "Voir les offres",
    "Pläne",
    "Тарифы",
  );

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md rounded-2xl border border-indigo-100 bg-white p-6 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
            <Printer className="h-6 w-6" />
          </div>
          <h2 className="pr-8 text-lg font-bold text-slate-900">{title}</h2>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-slate-600">{intro}</p>
        <ul className="mb-4 space-y-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
          {printers.map((line) => (
            <li key={line} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <p className="mb-6 text-xs text-slate-500">{bridge}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={onClose}>
            {start}
          </Button>
          <Link
            href="/dashboard/subscription"
            className="inline-flex flex-1 items-center justify-center rounded-md border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
          >
            {plans}
          </Link>
        </div>
      </div>
    </div>
  );
}
