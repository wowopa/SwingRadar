import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";

import "./globals.css";

export const metadata: Metadata = {
  title: "SWING-RADAR",
  description: "관찰 신호, 무효화 조건, 검증 통계, 사후 추적을 중심으로 보는 스윙 트레이딩 워크스페이스"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="dark">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
