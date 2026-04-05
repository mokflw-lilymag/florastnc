import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Florasync Kiosk | 고객 주문 입력",
  description: "고객이 직접 배송/메시지 정보를 입력하는 키오스크 화면입니다.",
};

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
