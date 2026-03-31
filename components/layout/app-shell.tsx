import type { Route } from "next";
import Link from "next/link";
import { ChartNoAxesCombined, HandHeart, Medal, ShieldCheck, Sparkles } from "lucide-react";

import { AuthCta } from "@/components/layout/auth-cta";
import { BrandSignature } from "@/components/layout/brand-signature";
import { GlobalSymbolSearch } from "@/components/layout/global-symbol-search";
import { RouteScrollReset } from "@/components/layout/route-scroll-reset";
import { ScrollToTopButton } from "@/components/layout/scroll-to-top-button";
import { SitePopupNotice } from "@/components/layout/site-popup-notice";
import { SiteVisitTracker } from "@/components/layout/site-visit-tracker";
import { getCurrentUserSession } from "@/lib/server/user-auth";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/recommendations", label: "후보 보드", mobileLabel: "후보", icon: Sparkles },
  { href: "/ranking", label: "추천 랭킹", mobileLabel: "랭킹", icon: Medal },
  { href: "/tracking", label: "추적", mobileLabel: "추적", icon: ChartNoAxesCombined },
  { href: "/guide", label: "이용 가이드", mobileLabel: "가이드", icon: ShieldCheck },
  { href: "/support", label: "후원", mobileLabel: "후원", icon: HandHeart }
] as const;

export async function AppShell({ children }: { children: React.ReactNode }) {
  const currentYear = new Date().getFullYear();
  const session = await getCurrentUserSession();

  return (
    <div className="min-h-screen">
      <RouteScrollReset />
      <SitePopupNotice />
      <SiteVisitTracker />
      <div className="mx-auto flex min-h-screen w-full max-w-[1480px] flex-col px-4 pb-12 pt-5 sm:px-6 lg:px-8">
        <header className="relative z-50 mb-5 overflow-visible rounded-[36px] border border-border/80 bg-white/78 px-5 py-6 shadow-panel backdrop-blur-xl sm:px-7 sm:py-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(38_38%_74%_/_0.18),transparent_34%),linear-gradient(135deg,hsl(38_20%_82%_/_0.18),transparent_42%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/55 to-transparent" />

          <div className="relative flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl space-y-5">
              <BrandSignature />

              <div className="max-w-[960px] border-b border-border/70 pb-5">
                <h1 className="text-xl font-semibold leading-[1.08] tracking-[-0.05em] text-foreground sm:text-[1.8rem] lg:text-[2.05rem]">
                  국내 스윙 후보를 구조화하고 검증합니다
                </h1>
                <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
                  오늘의 후보, 무효화 기준, 검증 이력까지 한 화면 안에서 이어보는 KRX 기반 기술적 스윙 워크스페이스입니다.
                </p>
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

        <div className="sticky top-2 z-40 mb-8 sm:top-3 lg:top-4">
          <div className="overflow-hidden rounded-[26px] border border-border/90 bg-white/94 px-3 py-3 shadow-[0_14px_32px_hsl(33_32%_22%_/_0.12)] backdrop-blur-md sm:rounded-[30px] sm:px-5 sm:py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <nav className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 scrollbar-none sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href as Route}
                      aria-label={item.label}
                      className={cn(
                        "inline-flex h-10 shrink-0 snap-start items-center gap-1.5 rounded-full border border-border/80 bg-white px-3 py-2 text-xs font-medium text-foreground/88 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/45 hover:bg-white sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm"
                      )}
                    >
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="sm:hidden">{item.mobileLabel}</span>
                      <span className="hidden sm:inline">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="hidden gap-3 md:grid md:grid-cols-3">
                <MetricCard label="Universe" value="KRX Daily" />
                <MetricCard label="Focus" value="Technical Swing" />
                <MetricCard label="Method" value="Signal with History" />
              </div>
            </div>
          </div>
        </div>

        <main className="flex-1">{children}</main>

        <footer className="mt-12 border-t border-border/75 px-2 pt-6 text-center">
          <p className="text-xs tracking-[0.18em] text-muted-foreground">
            Copyright {currentYear} SWING-RADAR. All rights reserved.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            SWING-RADAR의 데이터와 분석 정보는 투자 참고용으로 제공됩니다.
          </p>
        </footer>
      </div>
      <ScrollToTopButton />
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/85 bg-white px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
