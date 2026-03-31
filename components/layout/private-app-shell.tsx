import type { ReactNode } from "react";

import { AuthCta } from "@/components/layout/auth-cta";
import { BrandSignature } from "@/components/layout/brand-signature";
import { GlobalSymbolSearch } from "@/components/layout/global-symbol-search";
import { PrivateNav } from "@/components/layout/private-nav";
import { Badge } from "@/components/ui/badge";
import type { AuthSession } from "@/types/auth";

export function PrivateAppShell({
  children,
  session
}: {
  children: ReactNode;
  session: AuthSession;
}) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-[1480px] flex-col px-4 pb-12 pt-5 sm:px-6 lg:px-8">
        <header className="surface-panel relative overflow-hidden rounded-[36px] px-5 py-6 sm:px-7 sm:py-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(38_38%_74%_/_0.18),transparent_30%),linear-gradient(135deg,hsl(38_20%_82%_/_0.18),transparent_42%)]" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl space-y-5">
              <BrandSignature compact />
              <div className="space-y-3">
                <Badge variant="positive">Logged In</Badge>
                <div className="space-y-2">
                  <h1 className="text-2xl font-semibold leading-tight tracking-[-0.05em] text-foreground sm:text-[2.6rem]">
                    장전 계획, 장초 재판정, 보유 관리만 남긴 개인 운용 대시보드
                  </h1>
                  <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
                    이제는 분석 리포트를 읽는 대신, 오늘 매수 검토 종목과 보유 관리 우선순위를 먼저 보는 구조로 정리했습니다.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="data-chip">장전 후보 선별</span>
                  <span className="data-chip">장초 재판정 기록</span>
                  <span className="data-chip">포트폴리오 슬롯 제한</span>
                  <span className="data-chip">보유 종목 관리 보드</span>
                </div>
              </div>
            </div>

            <div className="w-full max-w-xl space-y-3 xl:min-w-[420px]">
              <div className="flex justify-end">
                <AuthCta session={session} />
              </div>
              <GlobalSymbolSearch />
            </div>
          </div>
        </header>

        <div className="sticky top-2 z-40 mt-5 sm:top-3 lg:top-4">
          <div className="overflow-hidden rounded-[28px] border border-border/90 bg-white/94 px-3 py-3 shadow-[0_14px_32px_hsl(33_32%_22%_/_0.12)] backdrop-blur-md sm:px-5 sm:py-4">
            <PrivateNav />
          </div>
        </div>

        <main className="mt-8 flex-1">{children}</main>

        <footer className="mt-12 border-t border-border/75 px-2 pt-6 text-center">
          <p className="text-xs tracking-[0.18em] text-muted-foreground">Copyright {currentYear} SWING-RADAR. All rights reserved.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {session.user.displayName}님의 계정 기준으로 오늘 행동 보드와 보유 관리 보드를 계산하고 있습니다.
          </p>
        </footer>
      </div>
    </div>
  );
}
