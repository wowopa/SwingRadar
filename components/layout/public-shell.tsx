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
    <div className="min-h-screen">
      <div className="mx-auto min-h-screen w-full max-w-[1520px] px-4 pb-12 pt-4 sm:px-6 lg:px-8">
        <header className="sticky top-4 z-40">
          <div className="mx-auto flex items-center justify-between gap-4 rounded-full border border-border/70 bg-white/72 px-4 py-3 shadow-[0_24px_70px_hsl(33_24%_22%_/_0.08)] backdrop-blur-xl sm:px-5">
            <Link href="/" className="min-w-0">
              <BrandSignature compact className="gap-3" />
            </Link>

            <nav className="hidden items-center gap-6 lg:flex">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium text-foreground/72 transition hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" className="hidden sm:inline-flex">
                <Link href="/auth">로그인</Link>
              </Button>
              <Button asChild>
                <Link href="/auth">시작하기</Link>
              </Button>
            </div>
          </div>
        </header>

        <main className="pt-6 sm:pt-8">{children}</main>

        <footer className="mt-16 border-t border-border/70 px-2 pt-6">
          <div className="flex flex-col gap-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
            <p>SWING-RADAR는 로그인 전에는 설명을, 로그인 후에는 개인 운용 대시보드를 보여줍니다.</p>
            <p className="text-xs tracking-[0.18em]">COPYRIGHT {currentYear} SWING-RADAR</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
