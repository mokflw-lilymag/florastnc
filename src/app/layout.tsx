import type { Metadata } from "next";
import { Inter, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const noto = Noto_Sans_KR({ 
  subsets: ["latin"], 
  weight: ["300", "400", "500", "700", "900"],
  variable: "--font-noto-sans"
});

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
    <html lang="ko" className={`${inter.variable} ${noto.variable}`}>
      <head>
        <link rel="stylesheet" as="style" crossOrigin="anonymous" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
      </head>
      <body className="font-pretendard antialiased selection:bg-primary/10 selection:text-primary">
        {children}
        <Toaster position="top-center" expand={true} richColors />
      </body>
    </html>
  );
}
