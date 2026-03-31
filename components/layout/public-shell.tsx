import type { ReactNode } from "react";
import Link from "next/link";

import { BrandSignature } from "@/components/layout/brand-signature";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/#overview", label: "Overview" },
  { href: "/#workflow", label: "Workflow" },
  { href: "/#product", label: "Product" },
  { href: "/#faq", label: "FAQ" }
] as const;

export function PublicShell({ children }: { children: ReactNode }) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,hsl(38_35%_24%_/_0.22),transparent_26%),linear-gradient(180deg,hsl(220_22%_11%)_0%,hsl(220_20%_14%)_18%,hsl(34_15%_92%)_46%,hsl(33_17%_95%)_100%)] text-foreground">
      <div className="fixed inset-x-0 top-0 z-50 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1680px]">
          <header className="relative overflow-hidden rounded-b-[32px] border-x border-b border-white/10 bg-[linear-gradient(180deg,rgba(16,22,35,0.96),rgba(23,31,46,0.9))] shadow-[0_22px_60px_hsl(220_26%_8%_/_0.18)] backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,hsl(39_76%_70%_/_0.12),transparent_18%),radial-gradient(circle_at_88%_22%,hsl(196_90%_72%_/_0.08),transparent_20%)]" />
            <div className="relative mx-auto flex min-h-[84px] items-center justify-between gap-4 px-4 py-4 sm:px-5 lg:px-6">
              <Link href="/" className="min-w-0">
                <BrandSignature compact className="gap-3" tone="light" markMode="plain" />
              </Link>

              <nav className="hidden items-center gap-6 lg:flex">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="public-shell-link text-sm font-medium transition"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" className="hidden border-white/10 bg-white/4 text-white hover:bg-white/8 sm:inline-flex">
                  <Link href="/auth">로그인</Link>
                </Button>
                <Button asChild className="bg-white text-slate-950 hover:bg-white/92">
                  <Link href="/auth">시작하기</Link>
                </Button>
              </div>
            </div>
          </header>
        </div>
      </div>

      <div className="mx-auto min-h-screen w-full max-w-[1680px] px-4 pb-12 pt-[108px] sm:px-6 sm:pt-[116px] lg:px-8 lg:pt-[124px]">
        <main className="pt-2 sm:pt-4">{children}</main>

        <footer className="mt-16 border-t border-border/60 px-2 pt-6">
          <div className="flex flex-col gap-3 text-sm md:flex-row md:items-center md:justify-between">
            <p className="public-shell-copy">
              투자 유의: 본 서비스는 투자 판단을 보조하는 참고 도구이며, 최종 투자 결정과 그에 따른 책임은 사용자에게
              있습니다.
            </p>
            <p className="public-shell-copy-soft text-xs tracking-[0.18em]">COPYRIGHT {currentYear} SWING-RADAR</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
