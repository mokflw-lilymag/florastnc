"use client";

import Link from "next/link";
import { UserPlus } from "lucide-react";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";
import { cn } from "@/lib/utils";

type BrowseOnlyBannerProps = {
  className?: string;
  /** 온보딩(매장 등록) 미완료 */
  needsOnboarding?: boolean;
};

export function BrowseOnlyBanner({ className, needsOnboarding }: BrowseOnlyBannerProps) {
  const base = toBaseLocale(usePreferredLocale());

  const title = needsOnboarding
    ? pickUiText(
        base,
        "매장 등록 후 출력·저장이 가능합니다",
        "Register your shop to print and save",
        "Đăng ký cửa hàng để in và lưu",
        "店舗登録後に印刷・保存できます",
        "完成门店注册后可打印与保存",
        "Registre su tienda para imprimir",
        "Cadastre a loja para imprimir",
        "Inscrivez votre boutique pour imprimer",
        "Shop registrieren zum Drucken",
        "Зарегистрируйте магазин для печати",
      )
    : pickUiText(
        base,
        "회원가입 후 리본 출력을 이용할 수 있습니다",
        "Sign up to use ribbon printing",
        "Đăng ký để in ruy băng",
        "会員登録後にリボン印刷が利用できます",
        "注册后可使用丝带打印",
        "Regístrate para imprimir cintas",
        "Cadastre-se para imprimir fitas",
        "Inscrivez-vous pour imprimer",
        "Registrieren für Banddruck",
        "Зарегистрируйтесь для печати лент",
      );

  const body = pickUiText(
    base,
    "지금은 메뉴와 화면만 둘러볼 수 있어요. 가입·매장 등록을 완료하면 무료 체험 출력(하루 3회)을 쓸 수 있습니다.",
    "You can browse menus and screens only. After sign-up and shop setup, you get 3 free prints per day.",
    "Chỉ xem menu và màn hình. Sau đăng ký và tạo cửa hàng: 3 lần in miễn phí/ngày.",
    "メニューと画面の閲覧のみ。登録・店舗設定後、1日3回まで無料印刷。",
    "目前仅可浏览菜单与界面。注册并完成门店设置后，每日可免费打印 3 次。",
    "Solo puede explorar menús. Tras registrarse: 3 impresiones gratis/día.",
    "Apenas navegação. Após cadastro: 3 impressões grátis/dia.",
    "Navigation seulement. Après inscription : 3 impressions gratuites/jour.",
    "Nur Menüs ansehen. Nach Registrierung: 3 Gratisdrucke/Tag.",
    "Только просмотр. После регистрации: 3 бесплатные печати в день.",
  );

  const cta = needsOnboarding
    ? pickUiText(base, "매장 등록하기", "Complete shop setup", "Đăng ký cửa hàng", "店舗登録", "完成注册", "Registrar tienda", "Cadastrar loja", "Inscrire la boutique", "Shop einrichten", "Регистрация")
    : pickUiText(base, "무료 회원가입", "Sign up free", "Đăng ký", "無料登録", "免费注册", "Registrarse", "Cadastrar", "S'inscrire", "Registrieren", "Регистрация");

  const href = needsOnboarding ? "/onboarding" : "/login";

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm",
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-2">
          <UserPlus className="mt-0.5 h-5 w-5 shrink-0 text-slate-600" />
          <div>
            <p className="text-sm font-bold text-slate-900">{title}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{body}</p>
          </div>
          </div>
        <Link
          href={href}
          className="inline-flex shrink-0 items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          {cta}
        </Link>
      </div>
    </div>
  );
}
