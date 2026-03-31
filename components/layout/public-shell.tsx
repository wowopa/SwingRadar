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
      <div className="mx-auto min-h-screen w-full max-w-[1680px] px-4 pb-12 pt-4 sm:px-6 lg:px-8">
        <header className="sticky top-4 z-40">
          <div className="mx-auto flex items-center justify-between gap-4 rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(18,25,38,0.88),rgba(24,31,45,0.72))] px-4 py-3 shadow-[0_24px_70px_hsl(220_26%_8%_/_0.22)] backdrop-blur-xl sm:px-5">
            <Link href="/" className="min-w-0">
              <BrandSignature compact className="gap-3" tone="light" />
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

        <main className="pt-8 sm:pt-10">{children}</main>

        <footer className="mt-16 border-t border-border/60 px-2 pt-6">
          <div className="flex flex-col gap-3 text-sm md:flex-row md:items-center md:justify-between">
            <p className="public-shell-copy">SWING-RADAR는 로그인 전에는 철학과 흐름을, 로그인 후에는 개인 운용 대시보드를 보여줍니다.</p>
            <p className="public-shell-copy-soft text-xs tracking-[0.18em]">COPYRIGHT {currentYear} SWING-RADAR</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
