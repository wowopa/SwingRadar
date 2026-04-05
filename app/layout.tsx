import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";

import { RouteScrollReset } from "@/components/layout/route-scroll-reset";
import { ScrollToTopButton } from "@/components/layout/scroll-to-top-button";
import { SitePopupNotice } from "@/components/layout/site-popup-notice";
import { SiteVisitTracker } from "@/components/layout/site-visit-tracker";
import { ThemeController } from "@/components/theme/theme-controller";
import { createThemeInitScript } from "@/lib/theme/theme-preference";

import "./globals.css";

const bodyFont = Noto_Sans_KR({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "700"]
});

export const metadata: Metadata = {
  title: "SWING-RADAR",
  description: "오늘 먼저 볼 종목, 장초 확인, 당일 행동까지 연결하는 KRX 스윙 운용 대시보드"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: createThemeInitScript() }} />
      </head>
      <body className={bodyFont.variable}>
        <ThemeController />
        <RouteScrollReset />
        <SitePopupNotice />
        <SiteVisitTracker />
        {children}
        <ScrollToTopButton />
      </body>
    </html>
  );
}

