import type { ReactNode } from "react";
import Link from "next/link";

import { AuthCta } from "@/components/layout/auth-cta";
import { BrandMark, BrandSignature } from "@/components/layout/brand-signature";
import { GlobalSymbolSearch } from "@/components/layout/global-symbol-search";
import { PrivateNav } from "@/components/layout/private-nav";
import { AppTutorialController } from "@/components/tutorial/app-tutorial-controller";
import { TutorialLauncherButton } from "@/components/tutorial/tutorial-launcher-button";
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
    <div className="min-h-screen bg-background text-foreground">
      <div className="fixed inset-x-0 top-0 z-50 px-3 sm:px-4 lg:px-6">
        <header className="relative overflow-visible rounded-b-[28px] border-x border-b border-white/12 bg-[linear-gradient(180deg,rgba(15,20,31,0.985),rgba(24,31,45,0.965))] shadow-[0_22px_60px_hsl(220_26%_8%_/_0.18)] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,hsl(42_76%_66%_/_0.13),transparent_18%),radial-gradient(circle_at_88%_22%,hsl(196_90%_72%_/_0.05),transparent_20%)]" />

          <div className="relative grid min-h-[72px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 lg:hidden">
            <Link href="/recommendations" className="justify-self-start">
              <BrandMark compact mode="plain" className="h-11 w-11" />
            </Link>
            <div className="min-w-0">
              <GlobalSymbolSearch compact />
            </div>
            <div className="flex items-center justify-end gap-1.5">
              <TutorialLauncherButton iconOnly tone="light" />
              <PrivateNav iconOnly />
            </div>
          </div>

          <div className="relative hidden min-h-[76px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 px-5 py-3 lg:grid xl:px-6">
            <Link href="/recommendations" className="min-w-0 justify-self-start">
              <BrandSignature compact className="min-w-0 gap-3" tone="light" markMode="plain" />
            </Link>

            <div className="justify-self-center">
              <PrivateNav />
            </div>

            <div className="flex min-w-0 items-center justify-self-end gap-3">
              <div className="w-[280px] xl:w-[320px]">
                <GlobalSymbolSearch compact />
              </div>
              <TutorialLauncherButton tone="light" />
              <AuthCta session={session} compact tone="light" />
            </div>
          </div>
        </header>
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-[1480px] flex-col px-4 pb-12 pt-[96px] sm:px-6 sm:pt-[102px] lg:px-8 lg:pt-[108px]">
        <main className="flex-1 pt-2 sm:pt-4">{children}</main>

        <footer className="mt-12 border-t border-border/75 px-2 pt-6 text-center">
          <p className="text-xs tracking-[0.18em] text-muted-foreground">Copyright {currentYear} SWING-RADAR. All rights reserved.</p>
        </footer>
      </div>

      <AppTutorialController />
    </div>
  );
}
