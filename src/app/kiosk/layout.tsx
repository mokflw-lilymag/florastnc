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
    ),
    description: pickUiText(
      bl,
      "고객이 직접 배송/메시지 정보를 입력하는 키오스크 화면입니다.",
      "Kiosk screen where customers enter delivery and message details.",
      "Màn hình kiosk để khách nhập thông tin giao hàng và lời nhắn.",
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
