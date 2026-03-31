import type { ReactNode } from "react";
import Link from "next/link";

import { BrandSignature } from "@/components/layout/brand-signature";
import { Button } from "@/components/ui/button";

export function PublicShell({ children }: { children: ReactNode }) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-[1480px] flex-col px-4 pb-12 pt-5 sm:px-6 lg:px-8">
        <header className="surface-panel relative overflow-hidden rounded-[36px] px-5 py-6 sm:px-7 sm:py-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(38_38%_74%_/_0.18),transparent_32%),linear-gradient(135deg,hsl(38_20%_82%_/_0.18),transparent_42%)]" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl space-y-4">
              <BrandSignature />
              <div className="max-w-3xl">
                <p className="text-base leading-7 text-muted-foreground sm:text-lg">
                  많은 종목을 나열하는 대신, 오늘 실제로 검토할 0~2개의 행동만 남기는 스윙 운용 경험으로 재구성했습니다.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button asChild variant="secondary">
                <Link href="/auth">로그인</Link>
              </Button>
              <Button asChild>
                <Link href="/auth">가입하고 시작하기</Link>
              </Button>
            </div>
          </div>
        </header>

        <main className="mt-8 flex-1">{children}</main>

        <footer className="mt-12 border-t border-border/75 px-2 pt-6 text-center">
          <p className="text-xs tracking-[0.18em] text-muted-foreground">Copyright {currentYear} SWING-RADAR. All rights reserved.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            로그인 전에는 서비스 철학과 운영 방식을 먼저 설명하고, 로그인 후에만 개인 대시보드를 엽니다.
          </p>
        </footer>
      </div>
    </div>
  );
}
