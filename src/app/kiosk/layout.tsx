import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, resolveLocale, toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value ?? null);
  const bl = toBaseLocale(locale);
  return {
    title: pickUiText(
      bl,
      "Floxync Kiosk | 고객 주문 입력",
      "Floxync Kiosk | Customer order entry",
      "Floxync Kiosk | Nhập đơn cho khách",
      "Floxync Kiosk | お客様注文入力",
      "Floxync Kiosk | 顾客自助下单",
      "Floxync Kiosk | Entrada de pedidos del cliente",
      "Floxync Kiosk | Entrada de pedidos do cliente",
      "Floxync Kiosk | Saisie commande client",
      "Floxync Kiosk | Kundenbestellung",
      "Floxync Kiosk | Ввод заказа клиентом",
    ),
    description: pickUiText(
      bl,
      "고객이 직접 배송/메시지 정보를 입력하는 키오스크 화면입니다.",
      "Kiosk screen where customers enter delivery and message details.",
      "Màn hình kiosk để khách nhập thông tin giao hàng và lời nhắn.",
      "お客様が配送・メッセージ情報を直接入力するキオスク画面です。",
      "供顾客自行填写配送与贺卡/留言信息的自助终端界面。",
      "Pantalla táctil donde el cliente introduce entrega y mensaje.",
      "Tela de kiosk em que o cliente informa entrega e mensagem.",
      "Écran kiosque où le client saisit livraison et message.",
      "Kiosk-Oberfläche: Kunden erfassen Lieferung und Nachricht.",
      "Экран киоска: клиент вводит доставку и текст сообщения.",
    ),
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function KioskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-dvh flex flex-col bg-slate-50 overflow-hidden">
      {children}
    </div>
  );
}
