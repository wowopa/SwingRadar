import type { Route } from "next";
import Link from "next/link";
import { ArrowUpRight, ChartNoAxesCombined, ShieldCheck, Sparkles } from "lucide-react";

import { GlobalSymbolSearch } from "@/components/layout/global-symbol-search";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/recommendations", label: "관찰 신호", icon: Sparkles },
  { href: "/tracking", label: "사후 추적", icon: ChartNoAxesCombined },
  { href: "/analysis/005930", label: "분석 예시", icon: ArrowUpRight }
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-radar-grid">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-4 pb-10 pt-5 sm:px-6 lg:px-8">
        <header className="relative z-40 mb-8 overflow-hidden rounded-[36px] border border-border/70 bg-white/72 px-5 py-5 shadow-panel backdrop-blur-xl sm:px-7 sm:py-7">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-accent/60 via-transparent to-primary/10" />
          <div className="relative flex flex-col gap-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-white/70 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-foreground/72">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  Swing Radar Workspace
                </div>
                <div className="space-y-3">
                  <h1 className="max-w-2xl text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl lg:text-[3.1rem] lg:leading-[1.04]">
                    신호와 추적을 한곳에서
                  </h1>
                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                    근거, 무효화, 검증, 운영 상태를 간결하게 이어보는 스윙 대시보드입니다.
                  </p>
                </div>
              </div>
              <div className="w-full max-w-xl xl:min-w-[420px]">
                <GlobalSymbolSearch />
              </div>
            </div>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <nav className="flex flex-wrap gap-2.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href as Route}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border border-border/70 bg-white/72 px-4 py-2.5 text-sm font-medium text-foreground/88 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:bg-white"
                      )}
                    >
                      <Icon className="h-4 w-4 text-primary" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-border/70 bg-white/68 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Mode</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">Snapshot First</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-white/68 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Universe</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">KRX Daily Cycle</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-white/68 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Ops</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">자동 운영 추적</p>
                </div>
              </div>
            </div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
