import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";

import { AppShell } from "@/components/layout/app-shell";

import "./globals.css";

const bodyFont = Noto_Sans_KR({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "700"]
});

export const metadata: Metadata = {
  title: "SwingRadar",
  description: "스윙 후보 선정, 무효화 기준, 히스토릭 검증을 한곳에서 보는 스윙 트레이딩 워크벤치"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="dark">
      <body className={bodyFont.variable}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
