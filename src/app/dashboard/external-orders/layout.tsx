import Link from "next/link";
import { Share2 } from "lucide-react";
import { getPartnerOrdersEnabled } from "@/lib/platform-config-server";
import { createClient } from "@/utils/supabase/server";
import { effectiveIsSuperAdmin } from "@/lib/auth-api-guards";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, resolveLocale, toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";

export default async function ExternalOrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const enabled = await getPartnerOrdersEnabled();
  if (enabled) return <>{children}</>;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let isSuperAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    isSuperAdmin = effectiveIsSuperAdmin(profile, user.email ?? undefined);
  }
  if (isSuperAdmin) return <>{children}</>;

  const localeCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  const base = toBaseLocale(resolveLocale(localeCookie));

  const title = pickUiText(
    base,
    "협력사 수발주 — 준비 중",
    "Partner orders — coming soon",
    "Đơn đối tác — sắp ra mắt",
    "取引先発注 — 準備中",
    "合作订单 — 即将开放",
    "Pedidos de socios — próximamente",
    "Pedidos de parceiros — em breve",
    "Commandes partenaires — bientôt",
    "Partnerbestellungen — demnächst",
    "Заказы партнёров — скоро",
  );
  const body = pickUiText(
    base,
    "이 기능은 아직 일반 매장에 공개되지 않았습니다. FloXync 슈퍼관리자가 전역 설정에서 기능을 켜면 메뉴가 표시됩니다.",
    "This feature is not open to all stores yet. A super admin can enable it in global settings.",
    "Tính năng chưa mở cho mọi cửa hàng. Super admin bật trong cài đặt toàn cục.",
    "一般店舗にはまだ公開されていません。スーパー管理者が全体設定で有効にできます。",
    "该功能尚未对所有门店开放。超级管理员可在全局设置中开启。",
    "Aún no está abierto para todas las tiendas. El super admin puede activarlo en ajustes globales.",
    "Ainda não está aberto para todas as lojas. O super admin pode ativar nas configurações globais.",
    "Pas encore ouvert à toutes les boutiques. Le super admin peut l’activer dans les paramètres globaux.",
    "Noch nicht für alle Shops freigegeben. Super-Admin kann es in den globalen Einstellungen aktivieren.",
    "Функция ещё не открыта для всех магазинов. Супер-админ включает в глобальных настройках.",
  );
  const back = pickUiText(
    base,
    "대시보드로",
    "Back to dashboard",
    "Về bảng điều khiển",
    "ダッシュボードへ",
    "返回仪表盘",
    "Al panel",
    "Ao painel",
    "Tableau de bord",
    "Zum Dashboard",
    "На панель",
  );

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
        <Share2 className="h-7 w-7" />
      </div>
      <h1 className="text-xl font-bold text-slate-900">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">{body}</p>
      <Link
        href="/dashboard"
        className="mt-8 inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        {back}
      </Link>
    </div>
  );
}
