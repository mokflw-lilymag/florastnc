"use client";

import Link from "next/link";
import { Gem, Sparkles } from "lucide-react";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";
import {
  FREE_PRINTS_PER_DAY,
  getFreePrintsUsedToday,
} from "@/lib/subscription/plan-access";
import { cn } from "@/lib/utils";

type FreePlanUpsellProps = {
  tenantId?: string;
  variant?: "ribbon" | "design";
  className?: string;
};

export function FreePlanUpsell({
  tenantId,
  variant = "ribbon",
  className,
}: FreePlanUpsellProps) {
  const locale = usePreferredLocale();
  const base = toBaseLocale(locale);
  const remaining = Math.max(
    0,
    FREE_PRINTS_PER_DAY - (tenantId ? getFreePrintsUsedToday(tenantId) : 0),
  );

  const title =
    variant === "design"
      ? pickUiText(
          base,
          "무료 체험 — 디자인 미리보기",
          "Free trial — design preview",
          "Dùng thử — xem trước thiết kế",
          "無料体験 — デザインプレビュー",
          "免费体验 — 设计预览",
          "Prueba gratis — vista previa",
          "Teste grátis — pré-visualização",
          "Essai gratuit — aperçu",
          "Kostenlos — Design-Vorschau",
          "Бесплатно — предпросмотр",
        )
      : pickUiText(
          base,
          "무료 체험 — 리본 출력",
          "Free trial — ribbon printing",
          "Dùng thử — in ruy băng",
          "無料体験 — リボン印刷",
          "免费体验 — 丝带打印",
          "Prueba gratis — impresión",
          "Teste grátis — impressão",
          "Essai gratuit — impression",
          "Kostenlos — Banddruck",
          "Бесплатно — печать лент",
        );

  const body =
    variant === "design"
      ? pickUiText(
          base,
          "갤러리·편집은 이용할 수 있습니다. PDF 저장·인쇄·Formtec 연동은 PRINT CORE 이상 플랜에서 이용하세요.",
          "Browse and edit freely. PDF export, print, and Formtec need PRINT CORE or higher.",
          "Xem và chỉnh sửa được. Xuất PDF/in/Formtec cần gói PRINT CORE trở lên.",
          "閲覧・編集は可能です。PDF・印刷・FormtecはPRINT CORE以上でご利用ください。",
          "可浏览编辑；导出 PDF、打印、Formtec 需 PRINT CORE 及以上。",
          "Puedes editar; exportar PDF, imprimir y Formtec requieren PRINT CORE o superior.",
          "Edite à vontade; PDF, impressão e Formtec exigem PRINT CORE ou superior.",
          "Édition libre ; export PDF, impression et Formtec avec PRINT CORE ou plus.",
          "Bearbeiten möglich; PDF, Druck und Formtec ab PRINT CORE.",
          "Редактирование доступно; PDF, печать и Formtec — с PRINT CORE.",
        )
      : pickUiText(
          base,
          `오늘 무료 출력 ${FREE_PRINTS_PER_DAY}회 중 남은 횟수입니다. 지원 프린터 안내는 처음 입장 시 표시됩니다.`,
          `Free prints remaining today (of ${FREE_PRINTS_PER_DAY}). Printer compatibility is shown on your first visit.`,
          `Số lần in miễn phí còn lại hôm nay (/${FREE_PRINTS_PER_DAY}). Thông tin máy in ở lần vào đầu.`,
          `本日の無料印刷の残り回数（${FREE_PRINTS_PER_DAY}回中）。対応プリンターは初回表示。`,
          `今日剩余免费打印次数（共 ${FREE_PRINTS_PER_DAY} 次）。打印机说明在首次进入时显示。`,
          `Impresiones gratis restantes hoy (de ${FREE_PRINTS_PER_DAY}). Compatibilidad al primer acceso.`,
          `Impressões grátis restantes hoje (de ${FREE_PRINTS_PER_DAY}). Impressoras no primeiro acesso.`,
          `Impressions gratuites restantes (sur ${FREE_PRINTS_PER_DAY}). Infos imprimante à la première visite.`,
          `Verbleibende Gratisdrucke heute (von ${FREE_PRINTS_PER_DAY}). Druckerinfos beim ersten Besuch.`,
          `Осталось бесплатных печатей сегодня (из ${FREE_PRINTS_PER_DAY}). О принтерах — при первом входе.`,
        );

  const cta = pickUiText(
    base,
    "플랜 보기",
    "View plans",
    "Xem gói",
    "プランを見る",
    "查看方案",
    "Ver planes",
    "Ver planos",
    "Voir les offres",
    "Pläne ansehen",
    "Тарифы",
  );

  const remainLabel = pickUiText(
    base,
    `오늘 남은 무료 출력 ${remaining}회`,
    `${remaining} free prints left today`,
    `Còn ${remaining} lần in hôm nay`,
    `本日の無料印刷 残り${remaining}回`,
    `今日剩余免费打印 ${remaining} 次`,
    `Quedan ${remaining} impresiones gratis hoy`,
    `Restam ${remaining} impressões grátis hoje`,
    `Il reste ${remaining} impressions gratuites`,
    `Noch ${remaining} Gratisdrucke heute`,
    `Осталось ${remaining} бесплатных печатей`,
  );

  return (
    <div
      className={cn(
        "rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50 px-4 py-3 shadow-sm",
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
          <div>
            <p className="text-sm font-bold text-indigo-900">{title}</p>
            <p className="mt-1 text-xs leading-relaxed text-indigo-800/90">{body}</p>
            {variant === "ribbon" && tenantId ? (
              <p className="mt-1.5 text-[11px] font-medium text-indigo-600">{remainLabel}</p>
            ) : null}
          </div>
        </div>
        <Link
          href="/dashboard/subscription"
          className="inline-flex shrink-0 items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Gem className="mr-1.5 h-4 w-4" />
          {cta}
        </Link>
      </div>
    </div>
  );
}
