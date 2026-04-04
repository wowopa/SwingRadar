import type { ReactNode } from "react";
import Link from "next/link";

import { PublicAuthDialog } from "@/components/auth/public-auth-dialog";
import { BrandSignature } from "@/components/layout/brand-signature";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/#overview", label: "이점" },
  { href: "/#workflow", label: "흐름" },
  { href: "/#product", label: "제품" },
  { href: "/#faq", label: "FAQ" }
] as const;

export function PublicShell({ children }: { children: ReactNode }) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="fixed inset-x-0 top-0 z-50 px-4 sm:px-6 lg:px-8">
        <header className="relative overflow-hidden rounded-b-[32px] border-x border-b border-white/10 bg-[linear-gradient(180deg,rgba(18,24,36,0.98),rgba(27,34,49,0.94))] shadow-[0_22px_60px_hsl(220_26%_8%_/_0.18)] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,hsl(42_76%_66%_/_0.13),transparent_18%),radial-gradient(circle_at_88%_22%,hsl(196_90%_72%_/_0.06),transparent_20%)]" />
          <div className="relative flex min-h-[84px] items-center justify-between gap-4 px-4 py-4 sm:px-5 lg:px-6">
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
              <Button
                asChild
                variant="ghost"
                className="hidden border-white/10 bg-white/4 text-white hover:bg-white/8 sm:inline-flex"
              >
                <Link href="/?auth=login">로그인</Link>
              </Button>
              <Button asChild className="bg-white text-slate-950 hover:bg-white/92">
                <Link href="/?auth=signup">시작하기</Link>
              </Button>
            </div>
          </div>
        </header>
      </div>

      <PublicAuthDialog />

      <div className="min-h-screen w-full px-4 pb-12 pt-[108px] sm:px-6 sm:pt-[116px] lg:px-8 lg:pt-[124px]">
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
