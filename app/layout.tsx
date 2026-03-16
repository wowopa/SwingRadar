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
  title: "SWING-RADAR",
  description: "국내 스윙 후보 선정, 무효화 기준, 히스토리 검증을 한 화면에서 읽는 기술 중심 스윙 시그널 워크스페이스"
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
