import type { Route } from "next";
import Link from "next/link";
import { LineChart, Radar, ShieldCheck, Target } from "lucide-react";

import { GlobalSymbolSearch } from "@/components/layout/global-symbol-search";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/recommendations", label: "관찰 신호", icon: Radar },
  { href: "/tracking", label: "사후 추적", icon: LineChart },
  { href: "/analysis/005930", label: "분석 예시", icon: Target }
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-radar-grid bg-radar-grid">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <header className="relative z-40 mb-8 flex flex-col gap-6 rounded-3xl border border-border/80 bg-card/70 px-6 py-5 shadow-glow backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                <ShieldCheck className="h-3.5 w-3.5" />
                Swing-Radar
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  관찰 신호 기반 스윙 트레이딩 워크스페이스
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                  직접 매수 추천이 아니라 신호의 근거, 무효화 조건, 검증 통계, 사후 추적까지 구조적으로
                  남기는 화면입니다.
                </p>
              </div>
            </div>
            <GlobalSymbolSearch />
          </div>
          <nav className="flex flex-wrap gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href as Route}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl border border-border bg-secondary/60 px-4 py-2 text-sm text-secondary-foreground transition-colors hover:border-primary/30 hover:bg-accent"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}
