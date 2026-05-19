"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function BrowseOnlyPrintModal({ open, onClose }: Props) {
  const base = toBaseLocale(usePreferredLocale());

  const title = pickUiText(
    base,
    "회원가입 후 출력할 수 있어요",
    "Sign up to print",
    "Đăng ký để in",
    "印刷には会員登録が必要です",
    "注册后可打印",
    "Regístrate para imprimir",
    "Cadastre-se para imprimir",
    "Inscrivez-vous pour imprimer",
    "Registrieren zum Drucken",
    "Зарегистрируйтесь для печати",
  );

  const desc = pickUiText(
    base,
    "지금은 화면과 메뉴만 둘러볼 수 있습니다. 무료 회원가입·매장 등록을 완료하면 하루 3회 무료 리본 출력을 이용할 수 있습니다.",
    "You can browse screens only. After free sign-up and shop setup, you get 3 free ribbon prints per day.",
    "Chỉ xem giao diện. Sau đăng ký: 3 lần in miễn phí/ngày.",
    "画面の閲覧のみ。登録・店舗設定後、1日3回まで無料印刷。",
    "目前仅可浏览。注册并完成门店设置后，每日可免费打印 3 次。",
    "Solo exploración. Tras registrarse: 3 impresiones gratis/día.",
    "Apenas navegação. Após cadastro: 3 impressões grátis/dia.",
    "Navigation seulement. Après inscription : 3 essais gratuits/jour.",
    "Nur ansehen. Nach Registrierung: 3 Gratisdrucke/Tag.",
    "Только просмотр. После регистрации: 3 бесплатные печати в день.",
  );

  const cta = pickUiText(
    base,
    "무료 회원가입",
    "Sign up free",
    "Đăng ký",
    "無料登録",
    "免费注册",
    "Registrarse",
    "Cadastrar",
    "S'inscrire",
    "Registrieren",
    "Регистрация",
  );

  const later = pickUiText(
    base,
    "닫기",
    "Close",
    "Đóng",
    "閉じる",
    "关闭",
    "Cerrar",
    "Fechar",
    "Fermer",
    "Schließen",
    "Закрыть",
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-left leading-relaxed">{desc}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Link
            href="/login"
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {cta}
          </Link>
          <Button type="button" variant="ghost" className="w-full" onClick={onClose}>
            {later}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
