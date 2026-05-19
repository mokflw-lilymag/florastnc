"use client";

import Link from "next/link";
import { Gem, ClipboardList } from "lucide-react";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";
import { cn } from "@/lib/utils";

export function ErpTrialBanner({ className }: { className?: string }) {
  const locale = usePreferredLocale();
  const base = toBaseLocale(locale);

  const title = pickUiText(
    base,
    "ERP 무료 체험",
    "Free ERP trial",
    "Dùng thử ERP miễn phí",
    "ERP無料体験",
    "ERP 免费体验",
    "Prueba ERP gratis",
    "Teste ERP grátis",
    "Essai ERP gratuit",
    "Kostenlose ERP-Testversion",
    "Бесплатная проба ERP",
  );

  const body = pickUiText(
    base,
    "아래는 샘플 주문입니다. 버튼·상세·인쇄는 체험할 수 있고, 저장·삭제·연동은 ERP SMART 이상에서 가능합니다.",
    "Sample orders below. Try buttons and details; saving, deletes, and sync need ERP SMART or higher.",
    "Đơn mẫu bên dưới. Thử nút và chi tiết; lưu/xóa/đồng bộ cần ERP SMART trở lên.",
    "サンプル注文です。操作は体験できます。保存・削除・連携はERP SMART以上。",
    "以下为样本订单，可体验操作；保存、删除与同步需 ERP SMART 及以上。",
    "Pedidos de muestra. Prueba botones; guardar/eliminar/sincronizar requiere ERP SMART+.",
    "Pedidos de exemplo. Teste os botões; salvar/excluir/sincronizar exige ERP SMART+.",
    "Commandes exemple. Essayez les boutons ; enregistrer/supprimer/sync = ERP SMART+.",
    "Beispielbestellungen. Buttons testen; Speichern/Löschen/Sync ab ERP SMART.",
    "Примеры заказов. Кнопки можно пробовать; сохранение — с ERP SMART.",
  );

  const cta = pickUiText(
    base,
    "ERP 플랜 보기",
    "View ERP plans",
    "Xem gói ERP",
    "ERPプラン",
    "查看 ERP 方案",
    "Ver planes ERP",
    "Ver planos ERP",
    "Offres ERP",
    "ERP-Pläne",
    "Тарифы ERP",
  );

  return (
    <div
      className={cn(
        "rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 shadow-sm",
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-bold text-emerald-900">{title}</p>
            <p className="mt-1 text-xs leading-relaxed text-emerald-800/90">{body}</p>
          </div>
        </div>
        <Link
          href="/dashboard/subscription"
          className="inline-flex shrink-0 items-center justify-center rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          <Gem className="mr-1.5 h-4 w-4" />
          {cta}
        </Link>
      </div>
    </div>
  );
}
