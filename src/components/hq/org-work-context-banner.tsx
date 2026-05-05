"use client";

import Link from "next/link";
import { Building2, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button, buttonVariants } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/getMessages";
import { pickUiText } from "@/i18n/pick-ui-text";

export function OrgWorkContextBanner() {
  const { profile, refreshAuth, isLoading, isOrgWorkContext } = useAuth();
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const tf = getMessages(locale).tenantFlows;
  const L = (
    ko: string,
    en: string,
    vi?: string,
    ja?: string,
    zh?: string,
    es?: string,
    pt?: string,
    fr?: string,
    de?: string,
    ru?: string,
  ) => pickUiText(baseLocale, ko, en, vi, ja, zh, es, pt, fr, de, ru);

  if (isLoading || !isOrgWorkContext || !profile?.org_work_tenant_id) {
    return null;
  }

  const name =
    profile?.tenants?.name ??
    L(
      "선택한 지점",
      "Selected branch",
      "Chi nhánh đã chọn",
      "選択中の店舗",
      "所选门店",
      "Sucursal seleccionada",
      "Filial selecionada",
      "Succursale sélectionnée",
      "Ausgewählte Filiale",
      "Выбранная точка",
    );

  const exitWorkContext = async () => {
    try {
      const res = await fetch("/api/hq/work-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: null, uiLocale: locale }),
        credentials: "include",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(
          (j as { error?: string }).error ??
            L(
              "전환 해제에 실패했습니다.",
              "Failed to exit work mode.",
              "Không thể thoát chế độ làm việc.",
              "切り替えの解除に失敗しました。",
              "无法退出工作模式。",
              "No se pudo salir del modo de trabajo.",
              "Falha ao sair do modo de trabalho.",
              "Impossible de quitter le mode travail.",
              "Arbeitsmodus konnte nicht beendet werden.",
              "Не удалось выйти из рабочего режима.",
            ),
        );
        return;
      }
      await refreshAuth();
      toast.success(
        L(
          "업무 모드를 종료했습니다.",
          "Work mode ended.",
          "Đã tắt chế độ làm việc.",
          "業務モードを終了しました。",
          "已结束工作模式。",
          "Modo de trabajo finalizado.",
          "Modo de trabalho encerrado.",
          "Mode travail terminé.",
          "Arbeitsmodus beendet.",
          "Рабочий режим завершён.",
        ),
      );
    } catch {
      toast.error(tf.f01047);
    }
  };

  return (
    <div
      className={cn(
        "mb-4 flex flex-col gap-3 rounded-2xl border border-indigo-200/80 bg-indigo-50/95 px-4 py-3 text-indigo-950",
        "dark:border-indigo-500/40 dark:bg-indigo-950/50 dark:text-indigo-50 sm:flex-row sm:items-center sm:justify-between",
      )}
    >
      <div className="flex items-start gap-2.5 min-w-0">
        <Building2 className="h-5 w-5 shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-300" />
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">
            {L(
              "지점 업무 모드",
              "Branch work mode",
              "Chế độ làm việc chi nhánh",
              "店舗業務モード",
              "门店工作模式",
              "Modo trabajo en sucursal",
              "Modo de trabalho da filial",
              "Mode travail succursale",
              "Filial-Arbeitsmodus",
              "Режим работы точки",
            )}
          </p>
          <p className="text-xs text-indigo-900/80 dark:text-indigo-100/80 mt-0.5">
            {L(
              "현재 화면·주문·재고 등은 ",
              "Orders, inventory, and this screen follow ",
              "Đơn hàng, tồn kho và màn hình hiện đang theo ",
              "注文・在庫・この画面は現在 ",
              "当前订单、库存与本页均以 ",
              "Pedidos, inventario y esta pantalla siguen a ",
              "Pedidos, estoque e esta tela seguem ",
              "Les commandes, les stocks et cet écran suivent ",
              "Bestellungen, Bestand und dieser Bildschirm folgen ",
              "Заказы, склад и этот экран привязаны к ",
            )}
            <strong className="font-semibold text-foreground">{name}</strong>
            {L(
              " 기준입니다. 본사 개요는 상단 링크로 이동하세요.",
              ". Open HQ overview using the link above.",
              ". Dùng liên kết phía trên để xem tổng quan trụ sở.",
              " を基準にしています。本部の概要は上のリンクから開いてください。",
              " 为准。请使用上方链接查看总部概览。",
              ". Abra el resumen de sede con el enlace superior.",
              ". Use o link acima para ver a visão geral da matriz.",
              ". Ouvrez l’aperçu du siège via le lien ci-dessus.",
              ". HQ-Übersicht über den Link oben öffnen.",
              ". Обзор головного офиса — по ссылке выше.",
            )}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <Link
          href="/dashboard/hq"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "border-indigo-300 bg-white/80 dark:bg-indigo-900/40",
          )}
        >
          {L(
            "본사 개요",
            "HQ overview",
            "Tổng quan trụ sở",
            "本部概要",
            "总部概览",
            "Resumen de sede",
            "Visão geral da matriz",
            "Aperçu du siège",
            "HQ-Übersicht",
            "Обзор головного офиса",
          )}
        </Link>
        <Button
          type="button"
          variant="default"
          size="sm"
          className="gap-1.5 bg-indigo-600 hover:bg-indigo-700"
          onClick={exitWorkContext}
        >
          <XCircle className="h-3.5 w-3.5" />
          {L(
            "업무 모드 종료",
            "End work mode",
            "Kết thúc chế độ làm việc",
            "業務モードを終了",
            "结束工作模式",
            "Salir del modo trabajo",
            "Encerrar modo de trabalho",
            "Quitter le mode travail",
            "Arbeitsmodus beenden",
            "Завершить рабочий режим",
          )}
        </Button>
      </div>
    </div>
  );
}
