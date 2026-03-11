import type { Route } from "next";
import Link from "next/link";
import { ArrowUpRight, ChartNoAxesCombined, ShieldCheck, Sparkles } from "lucide-react";

import { GlobalSymbolSearch } from "@/components/layout/global-symbol-search";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/recommendations", label: "관찰 종목", icon: Sparkles },
  { href: "/ranking", label: "추천 랭킹", icon: ChartNoAxesCombined },
  { href: "/tracking", label: "추적", icon: ChartNoAxesCombined },
  { href: "/guide", label: "이용 가이드", icon: ShieldCheck },
  { href: "/analysis/005930", label: "분석 예시", icon: ArrowUpRight }
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-[1480px] flex-col px-4 pb-12 pt-5 sm:px-6 lg:px-8">
        <header className="relative z-40 mb-10 overflow-visible rounded-[36px] border border-border/80 bg-white/72 px-5 py-6 shadow-panel backdrop-blur-xl sm:px-7 sm:py-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(38_38%_74%_/_0.18),transparent_34%),linear-gradient(135deg,hsl(38_20%_82%_/_0.18),transparent_42%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/55 to-transparent" />

          <div className="relative flex flex-col gap-8">
            <div className="flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-4xl space-y-5">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="brand-mark flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-semibold tracking-[0.18em] text-primary-foreground">
                    SR
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-muted-foreground">KRX Swing Research</p>
                    <p className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-3xl">SwingRadar</p>
                  </div>
                </div>

                <div className="max-w-3xl border-b border-border/70 pb-5">
                  <h1 className="text-balance text-3xl font-semibold leading-[0.98] tracking-[-0.05em] text-foreground sm:text-4xl lg:text-[3.35rem]">
                    국내 스윙 후보를 선별하고 검증합니다
                  </h1>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
                    당일 후보, 무효화 기준, 검증 이력을 한 화면에서 점검하는 KRX 스윙 리서치 워크스페이스입니다.
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
                        "inline-flex items-center gap-2 rounded-full border border-border/80 bg-white/72 px-4 py-2.5 text-sm font-medium text-foreground/88 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/45 hover:bg-white"
                      )}
                    >
                      <Icon className="h-4 w-4 text-primary" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="grid gap-3 sm:grid-cols-3">
                <MetricCard label="Universe" value="KRX Daily" />
                <MetricCard label="Focus" value="Candidate Validation" />
                <MetricCard label="Method" value="Signal with History" />
              </div>
            </div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/80 bg-white/70 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
