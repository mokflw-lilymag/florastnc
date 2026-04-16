import type { Metadata } from "next";
import { Inter, Noto_Sans_KR, Bagel_Fat_One, Black_Han_Sans, Do_Hyeon, Gowun_Batang, Yeon_Sung, Nanum_Pen_Script, Gaegu, Jua } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const noto = Noto_Sans_KR({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-noto-sans" });
const bagel = Bagel_Fat_One({ weight: "400", subsets: ["latin"], variable: "--font-bagel" });
const blackHan = Black_Han_Sans({ weight: "400", subsets: ["latin"], variable: "--font-black-han" });
const doHyeon = Do_Hyeon({ weight: "400", subsets: ["latin"], variable: "--font-do-hyeon" });
const gowun = Gowun_Batang({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-gowun" });
const yeonSung = Yeon_Sung({ weight: "400", subsets: ["latin"], variable: "--font-yeon-sung" });
const nanumPen = Nanum_Pen_Script({ weight: "400", subsets: ["latin"], variable: "--font-nanum-pen" });
const gaegu = Gaegu({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-gaegu" });
const jua = Jua({ weight: "400", subsets: ["latin"], variable: "--font-jua" });

export const metadata: Metadata = {
  title: "Florasync SaaS",
  description: "Next-generation floral management and ribbon printing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning className={`${inter.variable} ${noto.variable} ${bagel.variable} ${blackHan.variable} ${doHyeon.variable} ${gowun.variable} ${yeonSung.variable} ${nanumPen.variable} ${gaegu.variable} ${jua.variable}`}>
      <head>
        {/* Pretendard: preload로 비차단 로딩 */}
        <link 
          rel="preload" 
          as="style" 
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" 
        />
        <link 
          rel="stylesheet" 
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body suppressHydrationWarning className="font-pretendard antialiased selection:bg-primary/10 selection:text-primary">
        {children}
        <Toaster position="top-center" expand={true} richColors />
      </body>
    </html>
  );
}

