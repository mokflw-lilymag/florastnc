import type { Metadata } from "next";
import { Inter, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin", "latin-ext", "vietnamese"], variable: "--font-inter" });
const noto = Noto_Sans_KR({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-noto-sans" });

export const metadata: Metadata = {
  title: "FloXync",
  description: "Next-generation floral management and ribbon printing.",
};

import { cookies } from "next/headers";
import { LOCALE_COOKIE, resolveLocale, toBaseLocale, bcp47LangTag } from "@/i18n/config";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = resolveLocale(localeCookie);
  const baseLocale = toBaseLocale(locale);
  const lang = bcp47LangTag(baseLocale);
  const dir = baseLocale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={lang} dir={dir} translate="no" suppressHydrationWarning className={`${inter.variable} ${noto.variable}`}>
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
      <body suppressHydrationWarning className={`${baseLocale === 'ko' ? 'font-pretendard' : 'font-sans'} antialiased selection:bg-primary/10 selection:text-primary`}>
        {children}
        <Toaster position="top-center" expand={true} richColors />
      </body>
    </html>
  );
}

